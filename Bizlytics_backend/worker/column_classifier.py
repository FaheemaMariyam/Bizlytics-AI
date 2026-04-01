# This will automatically map the HR's column names to our standard business fields
KNOWN_PATTERNS = {
    # Revenue & Financial
    "revenue": ["revenue", "sales", "income", "turnover", "gross_sales", "net_sales"],
    "cost": ["cost", "expense", "expenditure", "cogs", "operating_cost"],
    "profit": ["profit", "margin", "net_income", "ebitda", "gross_profit"],
    "price": ["price", "unit_price", "selling_price", "mrp", "rate"],
    "discount": ["discount", "deduction", "rebate", "allowance"],
    # Quantity & Volume
    "quantity": ["quantity", "qty", "units", "volume", "count", "units_sold"],
    # Time & Date
    "date": [
        "date",
        "order_date",
        "sale_date",
        "transaction_date",
        "period",
        "month",
        "year",
    ],
    # Dimensions
    "product": ["product", "item", "sku", "product_name", "product_id", "category"],
    "region": ["region", "city", "state", "country", "location", "territory", "zone"],
    "customer": ["customer", "client", "buyer", "customer_name", "customer_id"],
    "employee": ["employee", "emp", "staff", "agent", "salesperson", "rep"],
    "department": ["department", "dept", "division", "team", "unit"],
    "channel": ["channel", "source", "medium", "platform", "store", "payment_method"],
    # Status
    "status": ["status", "state", "condition", "result", "outcome", "order_status"],
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
