import logging
import re
from typing import Any, Dict, List

import duckdb

from app.analytics.duckdb_manager import get_connection

logger = logging.getLogger(__name__)


# Tells the AI what columns exist in a company's data. This is crucial for generating accurate SQL queries.
def get_company_schema_info(company_id: int) -> str:
    """
    Returns a string description of the tables and columns available 
    for the specific company in its private DuckDB file.
    """
    try:
        # NEW: Consistent table names across all companies since they are in separate files
        table_name = "raw_data"
        profile_name = "profile"

        # NEW: Pass company_id for isolated access
        with get_connection(company_id, read_only=True) as con:
            # Check if tables exist
            tables = con.execute("SHOW TABLES").fetchall()
            table_list = [t[0] for t in tables]

            if table_name not in table_list:
                return f"No analytics data found for company {company_id}. Please upload a file first."

            # Get columns for the main data table
            columns = con.execute(f"DESCRIBE {table_name}").fetchall()
            col_desc = "\n".join([f"- {c[0]} ({c[1]})" for c in columns])

            schema_info = f"Table: {table_name}\nColumns:\n{col_desc}\n"

            # Add profile info if available
            if profile_name in table_list:
                schema_info += f"\nPre-computed Profile table available: {profile_name}"

            return schema_info

    except Exception as e:
        logger.error(f"Error fetching schema info for company {company_id}: {e}")
        return f"Error retrieving data schema: {str(e)}"


def run_analytics_query(company_id: int, sql_query: str) -> List[Dict[str, Any]]:
    """
    Executes a read-only SQL query on the company's private DuckDB file.
    Returns truncated results for efficiency.
    """
    # 1. Basic Security: Only allow SELECT
    sql_clean = sql_query.strip().lower()
    if not sql_clean.startswith("select"):
        return [{"error": "Only SELECT queries are allowed for safety."}]

    # 2. Compatibility Layer: If the AI uses the old table naming convention, fix it.
    sql_query = re.sub(
        rf"company_{company_id}_data", "raw_data", sql_query, flags=re.IGNORECASE
    )

    try:
        with get_connection(company_id, read_only=True) as con:
            # 3. Efficiency: Limit raw queries that don't have a limit already
            if "limit" not in sql_clean:
                sql_query = f"{sql_query} LIMIT 50"
            
            result_df = con.execute(sql_query).df()
            
            # 4. Truncation for LLM context (Only send first 20 records to the AI)
            total_count = len(result_df)
            truncated_df = result_df.head(20)
            
            # Use a structure that explicitly tells the AI about the total count
            return {
                "total_count": total_count,
                "sample_data": truncated_df.to_dict(orient="records"),
                "is_truncated": total_count > 20
            }

    except Exception as e:
        error_msg = str(e)
        # 5. Correctness Help: If column not found, prompt AI to check schema
        if "not found" in error_msg.lower() or "binder" in error_msg.lower():
            return [{"error": f"SQL Error: {error_msg}. NOTE: Ensure all column names are lowercase with underscores as per the schema."}]
        
        logger.error(f"DuckDB Query Error for company {company_id}: {e}")
        return [{"error": f"Execution failed: {error_msg}"}]
