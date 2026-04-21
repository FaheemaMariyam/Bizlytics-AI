# Agentic AI Setup: Comprehensive End-to-End Guide

This guide describes the complete, production-grade Agentic AI architecture implemented in Bizlytics. It covers the flow from file upload to real-time analytical insights and visual dashboard generation.

---

## 1. System Overview: The "Analytical Engine"
The AI system is designed as a **Tool-First Agent** using **LangGraph**. Instead of just chatting, the AI acts as a Senior Data Analyst that can:
1.  **See** your data structure (via Schema discovery).
2.  **Query** your data directly (via SQL execution in DuckDB).
3.  **Visualize** insights (via structured JSON dashboard generation).

---

## 2. Phase 1: Environment & Authentication
The system uses **Groq** for high-speed inference.

### 2.1 API Configuration (`.env`)
The system requires these specific variables to enable the "Smooth Llama" experience:
```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant  # Primary model
```

### 2.2 Provider Logic (`agent.py`)
We use the **`ChatGroq`** class from `langchain-groq`. To avoid the strict 6,000 TPM (Tokens Per Minute) limit on free accounts, we have optimized:
*   `temperature=0`: Ensures factual accuracy.
*   `max_tokens=3000`: Provides enough headroom for large dashboards while preventing truncation.
*   `max_retries=0`: Replaces the slow 5-minute freeze with an instant fallback trigger.

---

## 3. Phase 2: The "Smooth Llama" Fallback System
This is our core reliability feature. If a model hits a rate limit or is decommissioned, the system automatically cycles through this hierarchy:

1.  **Start**: Tries the model defined in `.env`.
2.  **Level 1 Fallback**: Switches to `llama-3.1-70b-versatile`.
3.  **Level 2 Fallback**: Switches to `llama-3.3-70b-versatile`.
4.  **Level 3 Fallback**: Reverts to `llama-3.1-8b-instant` (recovery check).

This ensures the user never sees a "Quota Reached" error unless the entire Groq network is exhausted.

---

## 4. Phase 3: Data Knowledge & Context
The AI doesn't just "guess." It uses a layered context approach:

### 4.1 DuckDB Context Injection
Before the AI even reads your message, the backend:
1.  Connects to the company-specific DuckDB file.
2.  Reads the **`bi_reports`** table (Pre-computed summaries like Totals, Trends, and Distributions).
3.  Injects this high-level summary directly into the **System Prompt**.

### 4.2 Freshness & Sync Logic
If a file is currently being processed by Celery (ETL), the AI is informed via a **Freshness Header**:
> *"STATUS: File 'sales.csv' is still processing. Data below is from the PREVIOUS file."*

---

## 5. Phase 4: Frontend-Backend Synchronization
To prevent the AI from analyzing "stale" data during an upload, we implemented a **Polling Strategy** in `AIChat.jsx`.

### 5.1 The Sync Loop
When you attach a file and hit Send:
1.  Frontend uploads the file.
2.  Frontend **waits** (polls the server every 2 seconds).
3.  Only once the backend status is `"completed"`, the chat message is sent to the AI.

---

## 6. Phase 5: Dashboard Visualization
The system uses a custom Markdown tag system to trigger the `DashboardVisualizer`.

### 6.1 The "Dashboard Mandate"
The AI is strictly instructed to follow these rules:
*   **Diverse Charts**: It MUST use a mix of `donut` (for categories), `area` (for trends), `bar` (for rankings), and `kpi` (for metrics).
*   **Markdown Tag**: JSON must be wrapped in ` ```dashboard ` blocks.
*   **Conversational Intro**: AI must always explain the dashboard in text before showing the visuals.

---

## 7. Phase 6: Core AI Files Summary

| File | Purpose |
| :--- | :--- |
| `app/ai/agent.py` | **The Brain**: Contains LangGraph setup, Fallback logic, and Context injection. |
| `app/ai/routes.py` | **The Bridge**: FastAPI endpoints that parse AI replies using Robust Regex. |
| `app/ai/langchain_tools.py` | **The Hands**: SQL and Schema tools that allow AI to interact with DuckDB. |
| `AIChat.jsx` | **The Interface**: Handles the Polling sync and Dashboard rendering. |

---

> [!IMPORTANT]
> **Pro Tip for Testing**: If you ever hit a limit, wait exactly **60 seconds**. Groq's Tokens-Per-Minute limit resets every minute!
