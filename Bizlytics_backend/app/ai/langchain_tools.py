# LangGraph needs tools to be decorated with `@tool` from LangChain.
import json

from langchain_core.tools import tool

from app.ai.tools import get_company_schema_info, run_analytics_query

# These will be called with a fixed company_id injected at runtime.
# We create wrapper functions that the agent graph will bind.


def create_tools_for_company(company_id: int):
    """Creates LangChain-compatible tools scoped to a specific company."""

    @tool
    def query_data(sql_query: str) -> str:
        """
        Execute a read-only SQL query on the company's analytics data in DuckDB.
        Only SELECT queries are allowed. Use this to answer questions about the data.
        Returns the query results as a JSON string.
        """
        results = run_analytics_query(company_id, sql_query)
        return json.dumps(results, default=str)

    @tool
    def get_schema(dummy: str = "ignore") -> str:
        """
        Get the table schema (column names and types) for the company's data.
        Always call this FIRST before writing any SQL query so you know what columns exist.
        """
        return get_company_schema_info(company_id)

    return [get_schema, query_data]
