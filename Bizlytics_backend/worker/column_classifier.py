# This will automatically map the HR's column names to our standard business fields
KNOWN_PATTERNS = {
    # Revenue & Financial
    "revenue": ["revenue", "sales", "income", "turnover", "gross_sales", "net_sales", "amt", "amount", "total"],
    "cost": ["cost", "expense", "expenditure", "cogs", "operating_cost"],
    "profit": ["profit", "margin", "net_income", "ebitda", "gross_profit", "earnings"],
    "price": ["price", "unit_price", "selling_price", "mrp", "rate", "cost_price"],
    "discount": ["discount", "deduction", "rebate", "allowance", "pct"],
    # Quantity & Volume
    "quantity": ["quantity", "qty", "units", "volume", "count", "units_sold", "no_of"],
    # Time & Date
    "date": ["date", "order_date", "sale_date", "transaction_date", "period", "month", "year", "time", "day", "created", "at"],
    # Dimensions
    "product": ["product", "item", "sku", "product_name", "product_id", "category", "type", "description"],
    "region": ["region", "city", "state", "country", "location", "territory", "zone", "branch", "area"],
    "customer": ["customer", "client", "buyer", "customer_name", "customer_id", "user"],
    "employee": ["employee", "emp", "staff", "agent", "salesperson", "rep", "executive", "manager"],
    "department": ["department", "dept", "division", "team", "unit", "section"],
    "channel": ["channel", "source", "medium", "platform", "store", "payment_method", "on_site", "market"],
    # Status
    "status": ["status", "state", "condition", "result", "outcome", "order_status", "active", "terminated"],
    # HR Specific
    "employment_status": ["employee_status", "employment_status", "emp_status", "job_status", "work_type", "employee_type"],
    "termination_date": ["exit_date", "termination_date", "term_date", "end_date", "fired_date", "resigned_date"],
    "hiring_date": ["start_date", "hiring_date", "date_of_hire", "joined_date", "onboarded"],
    "performance": ["rating", "performance", "score", "feedback", "potential", "review"],
    "salary": ["salary", "pay", "compensation", "wage", "stipend", "remuneration"],
}


def classify_columns(columns: list) -> dict:
    """
    Maps each column name to its business category.
    Returns: {"revenue": "Revenue 2026", "date": "Order Date", ...}
    """
    mapping = {}
    for col in columns:
        col_lower = str(col).lower().strip().replace(" ", "_").replace("-", "_")
        for category, patterns in KNOWN_PATTERNS.items():
            if any(p in col_lower for p in patterns) and category not in mapping:
                mapping[category] = col
                break
    return mapping
