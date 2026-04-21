# Agentic AI Architecture: Bizlytics Technical Overview

This document describes the high-level architecture and implementation details of the Bizlytics Agentic AI system. The system is designed to provide autonomous, high-accuracy business intelligence through the integration of Large Language Models (LLMs) and local analytical engines.

---

## 1. Core Framework: LangGraph
The AI agent is built using **LangGraph**, a framework for building stateful, multi-actor applications with LLMs. This architecture allows the agent to:
- **Self-Correct**: If a SQL query fails or schema discovery is incomplete, the agent can loop back and retry with adjusted parameters.
- **Maintain State**: Data context, conversation history, and tool outputs are preserved throughout a single session.

---

## 2. LLM Infrastructure: The "Smooth Llama" Fallback
To ensure maximum availability and bypass the strict rate limits of free-tier providers, the system implements a **Dynamic Fallback Chain** within `app/ai/agent.py`.

### 2.1 Multi-Model Hierarchy
The system attempts to fulfill requests using the following model priority:
1.  **Primary**: `llama-3.1-8b-instant` (Optimized for speed and initial reasoning).
2.  **Secondary**: `llama-3.1-70b-versatile` (Utilized if the primary model hits a rate limit).
3.  **Tertiary**: `llama-3.3-70b-versatile` (Final fallback check).

### 2.2 Token Management
Requests are capped at **3,000 max tokens** for generation. This provides sufficient headroom for complex dashboard JSON while staying below the 6,000 TPM (Tokens Per Minute) threshold commonly found in free-tier API accounts.

---

## 3. Data Integration & Toolset
The agent acts on the data using a specialized toolset defined in `app/ai/langchain_tools.py`.

### 3.1 Tools
- **`get_schema`**: Retrieves column names and data types from the active DuckDB table. It includes a dummy argument to ensure compatibility with Llama 3's native function calling requirements.
- **`query_data`**: Executes read-only SQL SELECT statements against the company's DuckDB instance.

### 3.2 Context Layer
Beyond manual tool calls, the system automatically injects **Pre-computed BI Summaries** from the `bi_reports` table into the agent's system prompt. This allows the AI to answer high-level questions about trends and distributions instantly, without needing to write a query first.

---

## 4. Frontend-Backend Synchronization
To maintain data integrity during new file uploads, the system implements an asynchronous "Wait-for-ETL" strategy.

### 4.1 Polling Mechanism
The `AIChat.jsx` component includes a polling loop that monitors the status of a newly uploaded file. The user's query is only transmitted to the AI once the background Celery task updates the file status to `completed`.

### 4.2 Visual Rendering
The system uses custom Markdown parsing to identify visual components:
- **` ```dashboard `**: Triggers the `DashboardVisualizer` to render a full suite of charts.
- **Premium Tables**: Analytical summaries in text are rendered using high-end, styled Markdown tables with custom CSS accents.

---

## 5. Security & Multi-Tenancy
Multi-tenancy is enforced at the database driver level. The `company_id` is resolved from the user's JWT-signed session and is hard-coded into the tools at runtime. This prevents "Prompt Injection" from ever accessing data belonging to a different organization.
