# Pre-computes math (SUM, AVG, etc.) for all numeric columns immediately after data is loaded.
# This ensures that AI queries and dashboard charts remain lightning-fast regardless of dataset size.

from app.analytics.duckdb_manager import _db_lock, get_connection


def run_aggregations(company_id: int, column_mapping: dict = None):
    """
    Build pre-computed aggregation tables for fast AI chatbot queries.
    Uses company-specific database file and mapping for business-level reports.
    """
    source = "raw_data"
    agg_table = "aggregations"
    profile_table = "profile"
    report_table = "bi_reports"

    try:
        with _db_lock:
            with get_connection(company_id) as con:
                # 1. Basic Schema Detection
                columns = con.execute(f"DESCRIBE {source}").fetchall()
                numeric_cols = [c[0] for c in columns if c[1] in ("BIGINT", "INTEGER", "DOUBLE", "FLOAT", "DECIMAL")]
                
                # 2. Build Data Profile
                con.execute(f"DROP TABLE IF EXISTS {profile_table}")
                con.execute(f"""
                    CREATE TABLE {profile_table} AS
                    SELECT {len(columns)} as total_columns, COUNT(*) as total_rows
                    FROM {source}
                """)

                # 3. Build Column-by-Column Aggregations
                con.execute(f"DROP TABLE IF EXISTS {agg_table}")
                if numeric_cols:
                    stats_parts = []
                    for col in numeric_cols:
                        safe_col = col.replace("'", "''")
                        stats_parts.append(f"""
                            SELECT 
                                '{safe_col}' as column_name,
                                CAST(SUM("{col}") AS DOUBLE) as total,
                                CAST(AVG("{col}") AS DOUBLE) as average,
                                CAST(MIN("{col}") AS DOUBLE) as minimum,
                                CAST(MAX("{col}") AS DOUBLE) as maximum,
                                COUNT("{col}") as non_null_count
                            FROM {source}
                        """)
                    con.execute(f"CREATE TABLE {agg_table} AS {' UNION ALL '.join(stats_parts)}")

                # 4. DEEP BI ANALYSIS
                con.execute(f"DROP TABLE IF EXISTS {report_table}")
                
                if column_mapping:
                    # Dimensions & Metrics
                    rev_col = column_mapping.get("revenue")
                    pro_col = column_mapping.get("profit")
                    date_col = column_mapping.get("date") or column_mapping.get("hiring_date")
                    cat_col = column_mapping.get("product")
                    reg_col = column_mapping.get("region")
                    
                    # HR Specific
                    dept_col = column_mapping.get("department")
                    status_col = column_mapping.get("status") or column_mapping.get("employment_status")
                    term_date_col = column_mapping.get("termination_date")
                    hire_date_col = column_mapping.get("hiring_date")

                    report_parts = []
                    
                    # --- SALES/FINANCE SEGMENT ---
                    if rev_col: 
                        report_parts.append(f"SELECT 'kpi_revenue' as type, 'Total Revenue' as label, SUM(TRY_CAST(\"{rev_col}\" AS DOUBLE)) as value FROM {source}")
                    if pro_col: 
                        report_parts.append(f"SELECT 'kpi_profit' as type, 'Total Profit' as label, SUM(TRY_CAST(\"{pro_col}\" AS DOUBLE)) as value FROM {source}")
                    
                    # Generic Order Count
                    report_parts.append(f"SELECT 'kpi_transactions' as type, 'Total Records' as label, COUNT(*)::DOUBLE as value FROM {source}")

                    # Sales Breakdown
                    if rev_col and cat_col:
                        report_parts.append(f"SELECT 'cat_revenue' as type, CAST(\"{cat_col}\" AS VARCHAR) as label, SUM(TRY_CAST(\"{rev_col}\" AS DOUBLE)) as value FROM {source} GROUP BY 2 ORDER BY 3 DESC LIMIT 5")
                    if rev_col and reg_col:
                        report_parts.append(f"SELECT 'reg_revenue' as type, CAST(\"{reg_col}\" AS VARCHAR) as label, SUM(TRY_CAST(\"{rev_col}\" AS DOUBLE)) as value FROM {source} GROUP BY 2 ORDER BY 3 DESC LIMIT 5")

                    # Sales Trend
                    if rev_col and date_col:
                        report_parts.append(f"""
                            SELECT 'trend_revenue' as type, CAST(date_trunc('month', TRY_CAST(\"{date_col}\" AS DATE)) AS VARCHAR) as label, SUM(TRY_CAST(\"{rev_col}\" AS DOUBLE)) as value 
                            FROM {source} WHERE TRY_CAST(\"{date_col}\" AS DATE) IS NOT NULL GROUP BY 2 ORDER BY 2 ASC
                        """)

                    # --- HR SEGMENT ---
                    if dept_col:
                        # Headcount by Dept
                        report_parts.append(f"SELECT 'hr_dept_count' as type, CAST(\"{dept_col}\" AS VARCHAR) as label, COUNT(*)::DOUBLE as value FROM {source} GROUP BY 2 ORDER BY 3 DESC LIMIT 6")
                        report_parts.append(f"SELECT 'hr_kpi_headcount' as type, 'Total Headcount' as label, COUNT(*)::DOUBLE as value FROM {source}")

                    if hire_date_col:
                        # Hiring Trend
                        report_parts.append(f"""
                            SELECT 'hr_trend_hiring' as type, CAST(date_trunc('month', TRY_CAST(\"{hire_date_col}\" AS DATE)) AS VARCHAR) as label, COUNT(*)::DOUBLE as value 
                            FROM {source} WHERE TRY_CAST(\"{hire_date_col}\" AS DATE) IS NOT NULL GROUP BY 2 ORDER BY 2 ASC
                        """)

                    if status_col:
                        # Employment Status Split
                        report_parts.append(f"SELECT 'hr_status_split' as type, CAST(\"{status_col}\" AS VARCHAR) as label, COUNT(*)::DOUBLE as value FROM {source} GROUP BY 2 ORDER BY 3 DESC")

                    if report_parts:
                        final_sql = " UNION ALL ".join([f"({q})" for q in report_parts])
                        con.execute(f"CREATE TABLE {report_table} AS {final_sql}")

        return True
    except Exception as e:
        print(f"Aggregation Failed for company {company_id}: {e}")
        return False
