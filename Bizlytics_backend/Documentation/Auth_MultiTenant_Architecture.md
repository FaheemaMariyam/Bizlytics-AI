# Authentication & Multi-Tenant Architecture

## 1. Overview
The platform utilizes a strict Multi-Tenant architecture where each registered company's data is fundamentally isolated. Authentication is handled via stateless **JWT (JSON Web Tokens)**, allowing scalable and secure endpoint access for both Company Admins and HR personnel.

## 2. Current Multi-Tenant Implementation (`x-tenant-id`)
Currently, tenant routing is achieved via the `x-tenant-id` HTTP header. 

### How it works:
1. **Registration:** When a new `Company` registers, a dedicated PostgreSQL schema (e.g., `company_abc_company`) is automatically generated.
2. **Login:** A user logs in and receives a JWT token.
3. **Requests:** For every authenticated request, the frontend passes the `x-tenant-id` header (containing the company's unique ID).
4. **Middleware:** The FastAPI backend intercepts this header, validates that the user belongs to this company, and explicitly executes `SET search_path TO {schema_name}` on the PostgreSQL connection before fulfilling the request.

## 3. The Authentication Flow
1. **Company Admin Registration:** Direct registration. Creates the company, provisions the isolated schema, and creates the Admin user.
2. **HR Registration:** HR users cannot register independently. They apply for an account under a specific company.
3. **Approval Flow:** The HR account remains inactive until the Company Admin approves the request via their dashboard.
4. **JWT Minting:** Upon successful login, the `/token` endpoint issues an `access_token` valid for 30 minutes, carrying the user's role and ID in the payload.

---

##  4. Future Implementation Plan: Subdomain Routing
As the platform scales, relying on the `x-tenant-id` header will be replaced by a more robust **Subdomain Routing Strategy** (e.g., `apple.bizlytics.ai`).

### Why upgrade?
* **Security:** Prevents header-spoofing attacks natively.
* **UX:** Provides companies with personalized login URLs.
* **Simplicity:** The frontend no longer needs to manually inject headers into every single Axios request.

### Implementation Steps:
1. **DNS & Reverse Proxy:** Configure NGINX to capture wildcard domains (`*.bizlytics.ai`).
2. **Middleware Update:** Update the FastAPI middleware to parse the `Host` header (extracting the subdomain prefix) instead of reading `x-tenant-id`.
3. **Tenant Lookup:** Query the `public.companies` table where `subdomain = extracted_prefix` to find the correct schema dynamically.
4. **Enforced Security:** Reject any request where the JWT's `company_id` does not match the resolved subdomain's ID to prevent cross-tenant access.
