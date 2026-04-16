# This will automatically map the HR's column names to our standard business fields
KNOWN_PATTERNS = {
    # Revenue & Financial
    "revenue": ["revenue", "sales", "sales_amount", "total_sales", "net_sales", "gross_sales", "income", "turnover"],
    "cost": ["cost", "unit_cost", "expense", "expenditure", "cogs", "operating_cost"],
    "profit": ["profit", "margin", "net_income", "ebitda", "gross_profit", "earnings"],
    "price": ["price", "unit_price", "selling_price", "mrp", "rate", "cost_price"],
    "discount": ["discount", "deduction", "rebate", "allowance"],
    # Quantity & Volume
    "quantity": ["quantity", "quantity_sold", "qty", "units", "volume", "units_sold", "no_of"],
    # Time & Date
    "date": ["date", "sale_date", "order_date", "transaction_date", "created_at", "period"],
    # Dimensions
    "product": ["product_category", "product", "item", "sku", "product_name", "category"],
    "region": ["region", "city", "state", "country", "location", "territory", "zone", "branch", "area"],
    "customer_type": ["customer_type", "client_type", "buyer_type"],
    "customer": ["customer", "client", "buyer", "customer_name", "customer_id", "user"],
    "employee": ["employee", "emp", "staff", "agent", "salesperson", "sales_rep"],
    "department": ["department", "dept", "division", "team", "unit", "section"],
    "channel": ["sales_channel", "channel", "source", "medium", "platform", "store", "market"],
    "payment": ["payment_method", "payment", "pay_type", "pay_method", "payment_mode"],
    # Status
    "status": ["status", "state", "condition", "result", "outcome", "order_status", "active", "terminated"],
    # HR Specific
    "employment_status": ["employee_status", "employment_status", "emp_status", "job_status", "work_type", "employee_type"],
    "termination_date": ["exit_date", "termination_date", "term_date", "end_date", "fired_date", "resigned_date"],
    "hiring_date": ["start_date", "hiring_date", "date_of_hire", "joined_date", "onboarded"],
    "performance": ["rating", "performance", "score", "feedback", "potential", "review"],
    "salary": ["salary", "pay", "compensation", "wage", "stipend", "remuneration"],
}

# Categories where partial substring matching can cause false positives
# These should ONLY match via exact match (Pass 1), never via substring (Pass 2)
EXACT_MATCH_ONLY = {"date", "customer_type", "payment", "channel"}

# Guards for substring matching: If a column matches a category but ALSO
# contains one of these substrings, skip it to prevent false positives.
SUBSTRING_GUARDS = {
    "revenue": ["rep", "person", "agent", "name", "id", "date", "channel"],
    "date": ["update"],
    "employee": ["type", "status", "id"],
    "customer": ["type", "id"],
}


def classify_columns(columns: list) -> dict:
    """
    Maps each column name to its business category using multi-pass matching.
    Returns: {"revenue": "sales_amount", "date": "sale_date", ...}
    """
    mapping = {}
    used_columns = set()

    # Pass 1: Exact matches (Highest Priority)
    for col in columns:
        col_lower = str(col).lower().strip().replace(" ", "_").replace("-", "_")
        for category, patterns in KNOWN_PATTERNS.items():
            if category not in mapping:
                if col_lower in patterns:
                    mapping[category] = col
                    used_columns.add(col)
                    break

    # Pass 2: Substring matches (Lower Priority, with guards)
    for col in columns:
        if col in used_columns:
            continue

        col_lower = str(col).lower().strip().replace(" ", "_").replace("-", "_")
        for category, patterns in KNOWN_PATTERNS.items():
            if category not in mapping:
                # Skip categories that should only match exactly
                if category in EXACT_MATCH_ONLY:
                    continue

                if any(p in col_lower for p in patterns):
                    # Check guards to prevent false positives
                    guards = SUBSTRING_GUARDS.get(category, [])
                    if any(g in col_lower for g in guards):
                        continue
                    mapping[category] = col
                    used_columns.add(col)
                    break

    return mapping
