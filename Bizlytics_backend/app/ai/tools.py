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


# Executes safe, read-only SQL on the company's data. This is the core function that allows the AI to query the data without risking security or data integrity.
def run_analytics_query(company_id: int, sql_query: str) -> List[Dict[str, Any]]:
    """
    Executes a read-only SQL query on the company's private DuckDB file.
    """
    # 1. Basic Security: Only allow SELECT
    if not sql_query.strip().lower().startswith("select"):
        return [{"error": "Only SELECT queries are allowed for safety."}]

    # 2. Compatibility Layer: If the AI uses the old table naming convention, fix it.
    # Old: company_5_data -> New: raw_data
    # Old: company_5_profile -> New: profile
    sql_query = re.sub(
        rf"company_{company_id}_data", "raw_data", sql_query, flags=re.IGNORECASE
    )
    sql_query = re.sub(
        rf"company_{company_id}_profile", "profile", sql_query, flags=re.IGNORECASE
    )

    try:
        # NEW: Open the company-specific database file
        with get_connection(company_id, read_only=True) as con:
            result = con.execute(sql_query).df()
            return result.to_dict(orient="records")

    except Exception as e:
        logger.error(f"DuckDB Query Error for company {company_id}: {e}")
        return [{"error": f"SQL Execution failed: {str(e)}"}]
