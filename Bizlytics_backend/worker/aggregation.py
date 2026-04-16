# Pre-computes BI metrics for ALL columns immediately after data is loaded.
# This ensures that AI queries and dashboard charts remain lightning-fast regardless of dataset size.
# UNIVERSAL: Works for ANY dataset type (Sales, HR, Finance, Marketing, etc.)

import logging

from app.analytics.duckdb_manager import _db_lock, get_connection

logger = logging.getLogger(__name__)


def run_aggregations(company_id: int, column_mapping: dict = None, upload_id: int = None, is_temporary: bool = False):
    """
    Build pre-computed aggregation tables for fast AI chatbot queries.
    Uses company-specific database file and mapping for business-level reports.

    is_temporary: If True, writes to 'temp_' prefixed tables to support atomic swapping.
    """
    prefix = "temp_" if is_temporary else ""
    source = f"{prefix}raw_data" if is_temporary else "raw_data"
    agg_table = f"{prefix}aggregations"
    profile_table = f"{prefix}profile"
    report_table = f"{prefix}bi_reports"

    try:
        with _db_lock:
            with get_connection(company_id) as con:
                # ──────────────────────────────────────────────
                # 1. Schema Introspection
                # ──────────────────────────────────────────────
                columns = con.execute(f"DESCRIBE {source}").fetchall()
                numeric_cols = [c[0] for c in columns if c[1] in ("BIGINT", "INTEGER", "DOUBLE", "FLOAT", "DECIMAL")]
                varchar_cols = [c[0] for c in columns if c[1] == "VARCHAR"]
                date_cols = [c[0] for c in columns if c[1] in ("DATE", "TIMESTAMP")]
                all_col_names = [c[0] for c in columns]

                # ──────────────────────────────────────────────
                # 2. Data Profile
                # ──────────────────────────────────────────────
                con.execute(f"DROP TABLE IF EXISTS {profile_table}")
                con.execute(f"""
                    CREATE TABLE {profile_table} AS
                    SELECT {len(columns)} as total_columns, COUNT(*) as total_rows
                    FROM {source}
                """)

                # ──────────────────────────────────────────────
                # 3. Column-by-Column Numeric Aggregations
                # ──────────────────────────────────────────────
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

                # ──────────────────────────────────────────────
                # 4. UNIVERSAL BI REPORT GENERATION
                # ──────────────────────────────────────────────
                con.execute(f"DROP TABLE IF EXISTS {report_table}")
                report_parts = []

                if not column_mapping:
                    column_mapping = {}

                # --- RESOLVE COLUMN NAMES FROM MAPPING ---
                rev_col = column_mapping.get("revenue")
                qty_col = column_mapping.get("quantity")
                cost_col = column_mapping.get("cost")
                price_col = column_mapping.get("price")
                discount_col = column_mapping.get("discount")
                profit_col = column_mapping.get("profit")
                date_col = column_mapping.get("date") or column_mapping.get("hiring_date")
                cat_col = column_mapping.get("product")
                reg_col = column_mapping.get("region")
                emp_col = column_mapping.get("employee")
                cust_type_col = column_mapping.get("customer_type")
                channel_col = column_mapping.get("channel")
                payment_col = column_mapping.get("payment")
                dept_col = column_mapping.get("department")
                status_col = column_mapping.get("status") or column_mapping.get("employment_status")
                salary_col = column_mapping.get("salary")
                term_date_col = column_mapping.get("termination_date")
                hire_date_col = column_mapping.get("hiring_date")

                # ─── A) KPI CARDS ───
                # Total Records (always)
                report_parts.append(
                    f"SELECT 'kpi_records' as type, 'Total Records' as label, COUNT(*)::DOUBLE as value FROM {source}"
                )

                if rev_col:
                    report_parts.append(
                        f'SELECT \'kpi_revenue\' as type, \'Total Revenue\' as label, ROUND(SUM(TRY_CAST("{rev_col}" AS DOUBLE)), 2) as value FROM {source}'
                    )
                    report_parts.append(
                        f'SELECT \'kpi_avg_order\' as type, \'Avg Order Value\' as label, ROUND(AVG(TRY_CAST("{rev_col}" AS DOUBLE)), 2) as value FROM {source}'
                    )

                if profit_col:
                    report_parts.append(
                        f'SELECT \'kpi_profit\' as type, \'Total Profit\' as label, ROUND(SUM(TRY_CAST("{profit_col}" AS DOUBLE)), 2) as value FROM {source}'
                    )

                if qty_col:
                    report_parts.append(
                        f'SELECT \'kpi_quantity\' as type, \'Total Quantity Sold\' as label, SUM(TRY_CAST("{qty_col}" AS DOUBLE)) as value FROM {source}'
                    )

                if salary_col:
                    report_parts.append(
                        f'SELECT \'kpi_avg_salary\' as type, \'Avg Salary\' as label, ROUND(AVG(TRY_CAST("{salary_col}" AS DOUBLE)), 2) as value FROM {source}'
                    )

                if dept_col:
                    report_parts.append(
                        f'SELECT \'kpi_headcount\' as type, \'Total Headcount\' as label, COUNT(*)::DOUBLE as value FROM {source}'
                    )

                # ─── B) DISTRIBUTION REPORTS (Categorical Columns → Pie/Donut) ───
                # Auto-generate distribution for every mapped categorical column
                dist_mappings = [
                    ("dist_region", reg_col, "Region Distribution"),
                    ("dist_category", cat_col, "Category Distribution"),
                    ("dist_customer_type", cust_type_col, "Customer Type Distribution"),
                    ("dist_channel", channel_col, "Sales Channel Distribution"),
                    ("dist_payment", payment_col, "Payment Method Distribution"),
                    ("dist_department", dept_col, "Department Distribution"),
                    ("dist_status", status_col, "Status Distribution"),
                ]

                for report_type, col, title in dist_mappings:
                    if col:
                        report_parts.append(
                            f'SELECT \'{report_type}\' as type, CAST("{col}" AS VARCHAR) as label, COUNT(*)::DOUBLE as value FROM {source} GROUP BY 2 ORDER BY 3 DESC LIMIT 10'
                        )

                # ─── C) REVENUE-WEIGHTED BREAKDOWNS (If revenue exists) ───
                rev_cross_mappings = [
                    ("cross_region_revenue", reg_col, "Revenue by Region"),
                    ("cross_category_revenue", cat_col, "Revenue by Category"),
                    ("cross_customer_revenue", cust_type_col, "Revenue by Customer Type"),
                    ("cross_channel_revenue", channel_col, "Revenue by Channel"),
                    ("cross_payment_revenue", payment_col, "Revenue by Payment Method"),
                    ("cross_dept_salary", dept_col, "Salary by Department"),
                ]

                for report_type, dim_col, title in rev_cross_mappings:
                    metric_col = rev_col
                    if "salary" in report_type and salary_col:
                        metric_col = salary_col
                    elif "salary" in report_type:
                        continue

                    if dim_col and metric_col:
                        report_parts.append(
                            f'SELECT \'{report_type}\' as type, CAST("{dim_col}" AS VARCHAR) as label, ROUND(SUM(TRY_CAST("{metric_col}" AS DOUBLE)), 2) as value FROM {source} GROUP BY 2 ORDER BY 3 DESC LIMIT 10'
                        )

                # ─── D) QUANTITY BREAKDOWNS (If quantity exists) ───
                if qty_col:
                    qty_cross_mappings = [
                        ("cross_category_qty", cat_col),
                        ("cross_region_qty", reg_col),
                    ]
                    for report_type, dim_col in qty_cross_mappings:
                        if dim_col:
                            report_parts.append(
                                f'SELECT \'{report_type}\' as type, CAST("{dim_col}" AS VARCHAR) as label, SUM(TRY_CAST("{qty_col}" AS DOUBLE)) as value FROM {source} GROUP BY 2 ORDER BY 3 DESC LIMIT 10'
                            )

                # ─── E) TOP PERFORMERS (Employee/Rep rankings) ───
                if emp_col and rev_col:
                    report_parts.append(
                        f'SELECT \'top_reps_revenue\' as type, CAST("{emp_col}" AS VARCHAR) as label, ROUND(SUM(TRY_CAST("{rev_col}" AS DOUBLE)), 2) as value FROM {source} GROUP BY 2 ORDER BY 3 DESC LIMIT 5'
                    )

                if emp_col and qty_col:
                    report_parts.append(
                        f'SELECT \'top_reps_qty\' as type, CAST("{emp_col}" AS VARCHAR) as label, SUM(TRY_CAST("{qty_col}" AS DOUBLE)) as value FROM {source} GROUP BY 2 ORDER BY 3 DESC LIMIT 5'
                    )

                # ─── F) DATE/TREND REPORTS (Monthly aggregation) ───
                # CRITICAL: DuckDB TRY_CAST defaults to US format (MM-DD-YYYY).
                # Many datasets use DD-MM-YYYY (European). We use strptime for safety
                # with multiple format attempts, falling back to TRY_CAST for ISO dates.
                date_parse_expr = f"""
                    COALESCE(
                        TRY_CAST(strptime("{date_col}", '%d-%m-%Y') AS DATE),
                        TRY_CAST(strptime("{date_col}", '%d/%m/%Y') AS DATE),
                        TRY_CAST(strptime("{date_col}", '%Y-%m-%d') AS DATE),
                        TRY_CAST(strptime("{date_col}", '%m-%d-%Y') AS DATE),
                        TRY_CAST("{date_col}" AS DATE)
                    )
                """ if date_col else None

                hire_parse_expr = f"""
                    COALESCE(
                        TRY_CAST(strptime("{hire_date_col}", '%d-%m-%Y') AS DATE),
                        TRY_CAST(strptime("{hire_date_col}", '%d/%m/%Y') AS DATE),
                        TRY_CAST(strptime("{hire_date_col}", '%Y-%m-%d') AS DATE),
                        TRY_CAST("{hire_date_col}" AS DATE)
                    )
                """ if hire_date_col else None

                if date_col and rev_col:
                    report_parts.append(f"""
                        SELECT 'trend_revenue' as type,
                               CAST(date_trunc('month', {date_parse_expr}) AS VARCHAR) as label,
                               ROUND(SUM(TRY_CAST("{rev_col}" AS DOUBLE)), 2) as value
                        FROM {source}
                        WHERE {date_parse_expr} IS NOT NULL
                        GROUP BY 2 ORDER BY 2 ASC
                    """)

                if date_col and qty_col:
                    report_parts.append(f"""
                        SELECT 'trend_quantity' as type,
                               CAST(date_trunc('month', {date_parse_expr}) AS VARCHAR) as label,
                               SUM(TRY_CAST("{qty_col}" AS DOUBLE)) as value
                        FROM {source}
                        WHERE {date_parse_expr} IS NOT NULL
                        GROUP BY 2 ORDER BY 2 ASC
                    """)

                if date_col:
                    report_parts.append(f"""
                        SELECT 'trend_count' as type,
                               CAST(date_trunc('month', {date_parse_expr}) AS VARCHAR) as label,
                               COUNT(*)::DOUBLE as value
                        FROM {source}
                        WHERE {date_parse_expr} IS NOT NULL
                        GROUP BY 2 ORDER BY 2 ASC
                    """)

                if hire_date_col:
                    report_parts.append(f"""
                        SELECT 'trend_hiring' as type,
                               CAST(date_trunc('month', {hire_parse_expr}) AS VARCHAR) as label,
                               COUNT(*)::DOUBLE as value
                        FROM {source}
                        WHERE {hire_parse_expr} IS NOT NULL
                        GROUP BY 2 ORDER BY 2 ASC
                    """)

                # ─── G) DISCOUNT ANALYSIS ───
                if discount_col and rev_col:
                    # Discount impact: compare avg revenue for different discount tiers
                    report_parts.append(f"""
                        SELECT 'dist_discount_tier' as type,
                               CASE
                                   WHEN TRY_CAST("{discount_col}" AS DOUBLE) = 0 THEN 'No Discount'
                                   WHEN TRY_CAST("{discount_col}" AS DOUBLE) <= 0.1 THEN '1-10%'
                                   WHEN TRY_CAST("{discount_col}" AS DOUBLE) <= 0.2 THEN '11-20%'
                                   ELSE '20%+'
                               END as label,
                               ROUND(SUM(TRY_CAST("{rev_col}" AS DOUBLE)), 2) as value
                        FROM {source}
                        GROUP BY 2 ORDER BY 3 DESC
                    """)

                # ─── EXECUTE ALL REPORT QUERIES ───
                if report_parts:
                    valid_queries = []
                    for q in report_parts:
                        try:
                            # Test the query before adding it to UNION ALL
                            result = con.execute(q).fetchall()
                            # Only add if it returned data
                            if result:
                                valid_queries.append(f"({q})")
                        except Exception as e:
                            logger.warning(f"BI Report Query Skipped: {e}")

                    if valid_queries:
                        # Append metadata about the dataset version (upload_id)
                        if upload_id:
                            valid_queries.append(f"SELECT 'meta_upload_id' as type, 'Upload ID' as label, {upload_id}::DOUBLE as value")
                        
                        final_sql = " UNION ALL ".join(valid_queries)
                        con.execute(f"CREATE TABLE {report_table} AS {final_sql}")
                        logger.info(f"Generated {len(valid_queries)} BI reports for company {company_id}")
                    else:
                        logger.warning(f"All BI Report Queries Failed for company {company_id}")

        return True
    except Exception as e:
        logger.error(f"Aggregation Failed for company {company_id}: {e}")
        return False
