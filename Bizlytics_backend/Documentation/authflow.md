# Bizlytics — Complete Auth & Multi-Tenant System Flowchart (Refined)

> Production-Ready Architecture: Final Authority = JWT schema_name (Not Subdomain)

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph Internet
        U1["company1.bizlytics.com"]
        U2["company2.bizlytics.com"]
        U3["admin.bizlytics.com"]
    end

    subgraph "NGINX Gateway"
        NG["NGINX :443 HTTPS"]
        NG -->|"Extract subdomain → X-Tenant-ID"| FA
    end

    subgraph "FastAPI Backend"
        FA["Tenant Middleware"]
        FA -->|"Create Session"| AUTH["Auth Layer"]
        AUTH -->|"Decode JWT, Validate Tenant,<br/>Switch Schema"| BL["Business Logic"]
    end

    subgraph "PostgreSQL"
        PUB["public schema (shared)<br/>users, companies,<br/>hr_accounts (auth metadata), refresh_tokens"]
        T1["company_abc schema (isolated)<br/>employees, departments,<br/>hr_data (business data)..."]
        T2["company_xyz schema (isolated)<br/>employees, departments,<br/>hr_data (business data)..."]
    end

    U1 --> NG
    U2 --> NG
    U3 --> NG
    BL -->|"admin.* → always uses<br/>public schema"| PUB
    BL -->|"Valid JWT → SET search_path<br/>TO company_abc"| T1
    BL -->|"Valid JWT → SET search_path<br/>TO company_xyz"| T2
```

---

## 2. Complete Request Flow (Production)

```mermaid
sequenceDiagram
    participant User
    participant DNS
    participant NGINX
    participant Middleware
    participant Auth Layer
    participant Route
    participant DB

    User->>DNS: company1.bizlytics.com
    DNS->>NGINX: Resolves to Server IP

    Note over NGINX: Extract subdomain = company1<br/>(Header: X-Tenant-ID = company1)
    NGINX->>Middleware: proxy_pass + X-Tenant-ID

    Note over Middleware: 1. Create DB Session<br/>2. SET search_path TO company1<br/>3. Attach db to request.state.db

    Middleware->>Auth Layer: get_current_user(request)
    
    Note over Auth Layer: 1. Extract session from request.state.db<br/>2. Decode JWT<br/>3. Verify User role and Tenant schema
    
    Auth Layer->>Route: Authenticated Request (w/ switched session)

    Route->>DB: Query executes (e.g., db.add(raw_upload))
    Note over DB: Schema "company1" is already in search_path
    DB-->>Route: Isolated results
    Route-->>User: JSON Response
```

---

## 3. Company Registration Flow

```mermaid
flowchart TD
    A["Company submits registration<br/>name, email, password"] --> B{"Email already exists?"}
    B -->|Yes| B1["400: Already exists"]
    B -->|No| C["Generate schema_name<br/>company_ + sanitized name"]
    C --> D["Save to public.companies<br/>status = pending"]
    D --> E["Save to public.users<br/>role = company"]
    E --> F["CREATE SCHEMA IF NOT EXISTS<br/>company_xyz"]
    F --> G["Create tenant tables inside schema<br/>employees, hr_data, etc."]
    G --> H["Registered — awaiting admin approval"]

    H --> I{"Admin Action"}
    I -->|Approve| J["company.status = approved<br/>Company can now login"]
    I -->|Reject| K["company.status = rejected<br/>Company cannot login"]
```

---

## 4. HR Registration Flow

```mermaid
flowchart TD
    A["HR submits registration<br/>email, password, company_email"] --> B{"Company exists?"}
    B -->|No| B1["404: Company not found"]
    B -->|Yes| C{"Company approved?"}
    C -->|No| C1["400: Company not approved yet"]
    C -->|Yes| D{"HR email already exists?"}
    D -->|Yes| D1["400: Already registered"]
    D -->|No| E["Save to public.users<br/>role = hr, schema_name = company_xyz"]
    E --> F["Save to public.hr_accounts<br/>status = pending<br/>(Auth metadata only)"]
    F --> G["Registered — awaiting company approval"]

    G --> H{"Company Action"}
    H -->|Approve| I["hr.status = approved<br/>HR can now login"]
    H -->|Reject| J["hr.status = rejected<br/>HR cannot login"]
```

---

## 5. Login Flow

```mermaid
flowchart TD
    A["User submits email + password"] --> B{"User exists?"}
    B -->|No| B1["401: Invalid credentials"]
    B -->|Yes| C{"Password correct?"}
    C -->|No| C1["401: Invalid credentials"]
    C -->|Yes| D{"Check Role"}

    D -->|Admin| G["Generate JWT"]
    D -->|Company| E{"Company approved?"}
    D -->|HR| F{"HR approved?"}

    E -->|Pending| E1["403: Pending admin approval"]
    E -->|Rejected| E2["403: Registration rejected"]
    E -->|Approved| G

    F -->|Pending| F1["403: Pending company approval"]
    F -->|Rejected| F2["403: Registration rejected"]
    F -->|Approved| G

    G --> H["JWT Payload:<br/>user_id, role, schema_name"]
    H --> I["Return access_token 30min<br/>+ refresh_token 7days"]
```

---

## 6. Authenticated Request Flow (Best Practice Version)

```mermaid
flowchart TD
    A["User visits<br/>company1.bizlytics.com/api/employees"] --> B["NGINX extracts subdomain<br/>tenant = company1"]
    B --> C["Sets X-Tenant-ID: company1<br/>Forwards to FastAPI :8000"]

    C --> D["FastAPI Middleware"]
    D --> D1["Extract tenant (company1)"]
    D1 --> D2["Create DB Session"]
    
    D2 --> E["Auth Dependency"]
    E --> E1["Decode JWT from Bearer token"]
    E1 --> E2{"Validate:<br/>JWT.schema_name == subdomain"}
    E2 -->|Mismatch| E3["403: Tenant mismatch / Forbidden"]
    E2 -->|Match| E4["SET search_path = company1"]
    
    E4 --> F["Route Handler executes"]
    F --> G["DB Query -> company1.employees"]
    G --> H["Return tenant-isolated data"]
```

---

## 7. Multi-Tenant Database Layout

```mermaid
graph LR
    subgraph "PostgreSQL Database"
        subgraph "public schema : Global / Shared"
            U["users"]
            C["companies"]
            HR["hr_accounts<br/>(auth metadata)"]
            RT["refresh_tokens"]
        end

        subgraph "company_abc schema : Isolated Data"
            E1["employees"]
            D1["departments"]
            HR1["hr_data<br/>(business data)"]
        end

        subgraph "company_xyz schema : Isolated Data"
            E2["employees"]
            D2["departments"]
            HR2["hr_data<br/>(business data)"]
        end
    end
```

---

## 8. Complete Approval Chain

```mermaid
flowchart LR
    CR["Company Registers"] -->|pending| AA{"Admin Approves?"}
    AA -->|Yes| CA["Company Active"]
    AA -->|No| CX["Company Rejected"]

    CA --> HRR["HR Registers under Company"]
    HRR -->|pending| CA2{"Company Approves HR?"}
    CA2 -->|Yes| HRA["HR Active - Can Login"]
    CA2 -->|No| HRX["HR Rejected"]
```

---

## 9. Security Layers (Production)

```mermaid
flowchart TD
    A["Incoming Request"] --> B["HTTPS - SSL/TLS"]
    B --> C["NGINX Rate Limiting"]
    C --> D["NGINX extracts tenant from subdomain (Routing)"]
    D --> E["FastAPI Middleware - Create DB Session"]
    E --> F["JWT Decode (Security)"]
    F --> G{"Tenant Validation:<br/>JWT tenant == subdomain tenant?"}
    G -->|Match| H["Role-based access control"]
    H --> I["SET search_path (Schema Isolation)"]
    I --> J["Execute Query in Isolated Schema"]
    G -->|Mismatch| K["403 Forbidden"]
```
