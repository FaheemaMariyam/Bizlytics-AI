# Bizlytics Multi-Tenant Architecture

## 1. The Core Philosophy: "Logical Isolation"
Bizlytics is a **Multi-Tenant SaaS** platform. This means multiple different companies (tenants) use the same application and database, but their data is mathematically and logically locked away from each other. 

We achieve this using **PostgreSQL Schemas**. Instead of putting everyone's data in one giant table with a `company_id` column, every company gets its own private "room" (schema) inside the database.

---

## 2. Shared vs. Private Data
The database is split into two primary areas:

### A. The Shared Space (`public` schema)
This is the "Lobby" of the building. It stores information that the system needs to know *before* it knows which room you belong to.
*   **Users**: Login credentials (emails and password hashes) for everyone.
*   **Companies**: A list of all registered tenants and the name of their private schema.
*   **Refresh Tokens**: For maintaining active login sessions.

### B. The Private Space (Tenant Schemas)
Each company has a schema like `company_apple` or `company_tesla`. These contain:
*   **HR Accounts**: Sensitive profile data for that company's employees.
*   **Analytics Data**: Raw files, metrics, and business intelligence specific to that company.
*   **DuckDB Storage**: High-speed analytical data (CSV/Excel) is indexed by the company's identifier.

---

## 3. The Request Lifecycle (How it Works)

When a user clicks a button in the frontend, the following magic happens:

1.  **Identification**: The frontend includes a specialized header: `X-Tenant-ID: company_abc`.
2.  **Interception (Middleware)**: The backend uses a "Traffic Controller" (`app/middleware/tenant.py`). For every single request, it:
    *   Reads the `X-Tenant-ID`.
    *   Creates a fresh database connection.
    *   Runs the command: `SET search_path TO company_abc, public`.
3.  **Isolation**: Now, if the backend runs `SELECT * FROM hr_accounts`, PostgreSQL **automatically** only looks inside `company_abc`. It is physically impossible for it to see `company_xyz` data during that request.
4.  **Cleanup**: Once the response is sent, the connection is closed, and the "search path" is reset.

---

## 4. Authentication Integration
Multi-tenancy is tightly coupled with our **JWT (JSON Web Token)** system:
*   **Login**: When you log in, the system checks the `public.users` table to find which company you belong to.
*   **The Token**: Your JWT contains your `schema_name` (e.g., `company_apple`).
*   **Validation**: Every request validates that the `X-Tenant-ID` you are sending matches the `schema_name` inside your secure, encrypted JWT. This prevents "Tenant Spoofing."

---

## 5. Why This Architecture?
*   **Security**: Accidental data leaks are nearly impossible because the database engine itself handles the filtering.
*   **Performance**: Queries are faster because the database only has to search through one company's small dataset instead of millions of rows from all companies.
*   **Scalability**: We can easily move a single company's schema to a different server if they grow too large without affecting anyone else.

---

## 6. Future: Subdomain Routing
In the next phase, we will move from headers (`X-Tenant-ID`) to **Subdomains** (e.g., `apple.bizlytics.com`).
*   **NGINX** will automatically extract the `apple` part from the URL.
*   The backend will use that to resolve the tenant, making the implementation even more seamless and professional.
