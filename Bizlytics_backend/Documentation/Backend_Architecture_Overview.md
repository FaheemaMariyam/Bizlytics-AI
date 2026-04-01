# Bizlytics AI: Backend Architectural Overview 

This document provides a comprehensive, step-by-step breakdown of the Bizlytics multi-tenant backend architecture, encompassing infrastructure, data foundation, security, and the high-speed analytics engine.

---

##  Step 1: Infrastructure & The Single Gateway (Nginx)
The platform is built on a **Containerized Microservice Architecture** to ensure production readiness, scalability, and security.

### The Role of Nginx
Nginx serves as the **Single Gateway (Reverse Proxy)** for the entire system. Instead of exposing multiple ports (API, Database, Flower) to the public internet, all traffic enters through **Port 80 (HTTP)**. 
- **Security:** Nginx acts as a "Bouncer," protecting the internal FastAPI server and database from direct attacks.
- **Routing:** It intelligently routes traffic to the correct service (e.g., `/` goes to the Backend, while `/flower/` goes to the Monitoring Dashboard).
- **Subdomain Ready:** The configuration is designed to detect and forward tenant-specific subdomains (e.g., `company_a.bizlytics.ai`) to the backend via headers.

---

##  Step 2: Data Foundation & Multi-Tenant Isolation (PostgreSQL)
To ensure strict security, the platform utilizes a **"Shared Database, Separate Schemas"** strategy. This is the optimal balance between cost-efficiency and data privacy.

### The Schema Strategy
- **Public Schema (Global Directory):** Contains global information such as **Users** and **Company Profiles**.
- **Tenant Schemas (Private Rooms):** For every approved company, a dedicated PostgreSQL schema (e.g., `company_3`) is created. This schema holds private tables like `hr_accounts` and `raw_uploads`.
- **The Search Path:** Isolation is achieved by dynamically switching the PostgreSQL **`search_path`** for every request. This ensures that the database literally cannot "see" data belonging to other companies than the one being queried.

---

##  Step 3: Security, JWT Flow & RBAC
The system implements **Role-Based Access Control (RBAC)** to ensure that different users (Admins, Company Admins, and HRs) have appropriate permissions within their authorized scope.

### Authentication & Authorization
- **JWT (Digital Keycards):** After a secure login (using Bcrypt hashing), the system issues a **JSON Web Token (JWT)**. This token contains the user's ID, Role, and assigned **Schema Name**.
- **Bearer Authentication:** This token must be presented in the authorization header of every request.
- **Role Scoping:** Each API endpoint is protected by a **FastAPI Dependency** (e.g., `require_admin`, `require_hr`). This ensures that an HR user cannot access administrative endpoints or other companies' data.

---

##  Step 4: The ETL Engine & Analytical Data Store (DuckDB)
The platform differentiates between **Transactional Data** (PostgreSQL) and **Analytical Data** (DuckDB) to achieve lightning-fast response times for large datasets.

### The ETL Pipeline (Celery + Pandas)
1. **Asynchronous Processing:** Long-running ETL tasks are offloaded to **Celery Background Workers** via **Redis**. This prevents the main API from freezing during large file uploads.
2. **Data Sanitization:** The engine uses **Pandas** to clean, normalize, and validate raw files (CSV/Excel) from S3, preventing data corruption.
3. **DuckDB Analytics:** Cleaned data is stored in **DuckDB**, a high-performance, columnar database. DuckDB is designed specifically for analytical queries (O(1) aggregations) and is isolated by company-specific table names (e.g., `company_3_data`).
4. **Pre-computation:** The engine immediately generates a **"Profile"** of every dataset (Min, Max, Counts), allowing an AI Agent to answer business questions instantly without scanning millions of rows.

---

##  Summary
The Bizlytics architecture is designed to be a **Production-Ready, Non-Blocking, Secure SaaS Platform.** By separating the Gateway, the Relational Meta-Data, the Security layer, and the Big Data Engine, the system remains fast and secure even as the number of tenants grows.
