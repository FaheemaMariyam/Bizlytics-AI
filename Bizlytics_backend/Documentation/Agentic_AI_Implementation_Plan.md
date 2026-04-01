# Agentic AI Analytics Implementation Plan 

This document outlines the architecture for the Bizlytics Agentic AI Assistant, designed to provide high-accuracy business insights by querying multi-tenant data stored in DuckDB.

---

##  1. Core Architecture

### Framework: LangGraph
For a production-grade agent, **LangGraph** is utilized to handle complex, cyclical workflows. 
- **Self-Correction:** If a SQL query fails, the agent can examine the error and regenerate the query automatically.
- **State Management:** The agent maintains a persistent state for each user session, ensuring complete multi-tenant context.

### LLM: Gemini 1.5 Flash
- **Selection:** Optimized for speed, function calling (SQL), and a large context window.
- **Limits (Free Tier):** 15 Requests per Minute (RPM), 1,500 Requests per Day (RPD).

---

##  2. The "Agentic" Toolset
The AI acts as an autonomous data analyst by utilizing specialized Python tools:
1. **`query_company_data(sql)`:** A secure, read-only worker that executes SQL against the company's specific DuckDB tables.
2. **`get_data_dictionary()`:** Provides the agent with the schema and column descriptions for the current company's data.
3. **`generate_visualisation(data)`:** Suggests the best chart type (Bar, Pie, Line) and returns the JSON payload for React.

---

##  3. Execution Roadmap

### Phase 1: Tool Development
- Implement a "Safe SQL Executor" that prevents illegal operations (DELETE, DROP).
- Create a Metadata Fetcher that scans the `company_{id}_profile` table for column insights.

### Phase 2: Agent Logic (The "Brain")
- Initialize the LangGraph flow with cyclical error-handling.
- Define a "System Prompt" that instructs the AI to speak as a "Senior Business Intelligence Analyst."

### Phase 3: All-in-one Chat UI
- Integrate a unified chat box with an **"Upload File"** button.
- Implement an API endpoint `/chat` that routes messages to the LangGraph agent.
- Store conversation history in the `public.chat_history` table.

### Phase 4: Dynamic Visualization
- The agent returns a JSON payload: `{ "type": "bar", "title": "Sales Trend", "data": [...] }`.
- The React frontend uses **Recharts/Chart.js** to render beauty metrics in real-time.

---

##  4. Multi-Tenant Security
Every request is strictly signed with a JWT. The AI tool automatically resolves the `company_id` from the user's session, ensuring no company can ever query another's data.
