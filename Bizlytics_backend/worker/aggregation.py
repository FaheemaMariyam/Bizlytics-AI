# Pre-computes math (SUM, AVG, etc.) for all numeric columns immediately after data is loaded.
# This ensures that AI queries and dashboard charts remain lightning-fast regardless of dataset size.

from app.analytics.duckdb_manager import _db_lock, get_connection


def run_aggregations(company_id: int):
    """
    Build pre-computed aggregation tables for fast AI chatbot queries.
    Uses company-specific database file.
    """
    # Simplified names since we are now in the company's private DB file
    source = "raw_data"
    agg_table = "aggregations"
    profile_table = "profile"

    try:
        # Cross-process lock handled by get_connection using company-specific lock file
        with _db_lock:
            with get_connection(company_id) as con:
                # Get column schema
                columns = con.execute(f"DESCRIBE {source}").fetchall()

                numeric_cols = [
                    c[0]
                    for c in columns
                    if c[1] in ("BIGINT", "INTEGER", "DOUBLE", "FLOAT", "DECIMAL")
                ]
                text_cols = [c[0] for c in columns if c[1] == "VARCHAR"]
                date_cols = [
                    c[0] for c in columns if "DATE" in c[1] or "TIMESTAMP" in c[1]
                ]

                # 1. Build Data Profile
                con.execute(f"DROP TABLE IF EXISTS {profile_table}")
                con.execute(
                    f"""
                    CREATE TABLE {profile_table} AS
                    SELECT 
                        {len(columns)} as total_columns,
                        COUNT(*) as total_rows,
                        {len(numeric_cols)} as numeric_columns,
                        {len(text_cols)} as text_columns,
                        {len(date_cols)} as date_columns
                    FROM {source}
                """
                )

                # 2. Build summary stats for numeric columns ONLY IF they exist
                con.execute(f"DROP TABLE IF EXISTS {agg_table}")

                if numeric_cols:
                    stats_parts = []
                    for col in numeric_cols:
                        # Use careful quoting for column names with spaces
                        safe_col = col.replace("'", "''")
                        stats_parts.append(
                            f"""
                            SELECT 
                                '{safe_col}' as column_name,
                                CAST(SUM("{col}") AS DOUBLE) as total,
                                CAST(AVG("{col}") AS DOUBLE) as average,
                                CAST(MIN("{col}") AS DOUBLE) as minimum,
                                CAST(MAX("{col}") AS DOUBLE) as maximum,
                                COUNT("{col}") as non_null_count
                            FROM {source}
                        """
                        )

                    union_query = " UNION ALL ".join(stats_parts)
                    con.execute(f"CREATE TABLE {agg_table} AS {union_query}")

        return True

    except Exception as e:
        print(f"Aggregation Failed for company {company_id}: {e}")
        return False
