# Implementation Guide: Updates for the Shared Data Analyst Chatbot

This document is for **developers who received the shared package** (`FCV-Data-Analyst-App.zip`) and need to apply the latest changes. All paths are relative to the **root of the extracted zip** (same as `streamlit-deploy/` in the repo).

---

## Part A: What the agentic flow does (and what we’re adding)

The chatbot already uses an **agentic pipeline**:

1. **Plan** – User message → `get_query_spec()` → structured JSON (intent, date_range, filters, groupby, rank_by, top_k, output).
2. **Context** – Backend builds a **column profile** (dtypes + value_counts for relevant columns) and passes it with the schema into code generation.
3. **Act** – `get_analysis_code()` generates Python/pandas code from the user message + schema + optional query spec.
4. **Check** – Code is **validated** (forbidden ops, allowed columns). On failure, **one automatic retry** with the validation error.
5. **Execute** – Valid code runs in a sandbox; results (output, charts, summary_data) are returned.
6. **Summarize** – Optional narrative is generated for analytical questions.

**What this guide adds:**

- **Out-of-scope handling:** When the user asks a non–data question (e.g. “root causes of FCV”), the LLM is instructed to reply with a single remit sentence and **no code**. The backend detects “no code block” and returns that message without executing. If the LLM still generates invalid code (e.g. uses `execute_sql`) and execution fails, the backend returns the same friendly remit message instead of a traceback.
- **Default LLM:** Default provider = Anthropic, default model = `claude-opus-4-6`; startup prefers Anthropic when `LLM_PROVIDER` is not set.
- **Plotly annotation fix:** Backend strips invalid `font.weight` from Plotly annotation fonts (only `color`, `family`, `size` are valid), and the LLM prompt instructs not to use `weight`, so chart code no longer fails with “Invalid property … 'weight'”.
- **UI:** “FCV Data Chatbot” naming, sidebar “What this bot does”, welcome text and example query (Nigeria 2024 map). **Latest zip** also includes: message sections collapsed by default with Copy/Download buttons, suggested prompts as clickable cards, auto-scroll, input focus ring and “Enter to send” hint, thinking-dots indicator, dark code block styling, and collapsible sidebar (☰ in header).

No changes are required to the existing agentic steps (query spec, column profile, validator retry); only the **response handling**, **defaults**, **Plotly fix**, and **UI** are updated.

### Where the agentic pipeline is implemented

Use this as a map to the code that implements each step. All paths are under the **backend/** folder (or **angular-app/** for the UI).

| Step | What it does | File(s) | What to look at |
|------|----------------|---------|------------------|
| **1. Plan** | Turn user message into a structured query spec (JSON: intent, date_range, filters, groupby, rank_by, top_k, output). | `backend/main.py` | In `async def chat(...)`: call to `llm_service.get_query_spec(request.message)` (around line 336). |
| | | `backend/services/llm_service.py` | `get_query_spec(self, user_message)` (around line 161); `_SPEC_SYSTEM` (around line 145) – system prompt that defines the JSON keys. |
| **2. Context** | Build a column profile (dtypes + value_counts) for columns used in analysis and pass it with the schema into code gen. | `backend/main.py` | In `chat(...)`: build `columns_to_profile` from schema + query_spec groupby + common columns; then `schema["column_profile"] = data_loader.get_column_profile(df, columns_to_profile)` (around lines 338–345). |
| | | `backend/services/data_loader.py` | `get_column_profile(self, df, column_list, top_n=25)` (around line 133) – returns dtype and value_counts (or unique_count) per column. |
| **3. Act** | Generate Python/pandas code from user message + schema (with column_profile) + optional query spec. | `backend/main.py` | In `chat(...)`: `llm_response = await llm_service.get_analysis_code(user_message=..., schema=schema, query_spec=query_spec)` (around line 348). |
| | | `backend/services/llm_service.py` | `get_analysis_code(self, user_message, conversation_history, schema, query_spec)` (around line 184); `_create_system_prompt(self, schema)` (around line 107) – builds the system prompt with dataset overview, value_info, column_profile, and instructions. |
| **4. Check** | Validate generated code (forbidden ops, allowed columns). On failure, one automatic retry with the validation error. | `backend/main.py` | In `chat(...)`: `code = code_executor.extract_code(llm_response)` then `valid, validation_error = code_executor.validate_code(code, schema)`; if not valid, retry with a second `get_analysis_code` call and re-validate (around lines 372–398). |
| | | `backend/services/code_executor.py` | `extract_code(self, llm_response)` (around line 61) – pulls Python from ```python blocks; `validate_code(self, code, schema)` (around line 37) – checks FORBIDDEN_PATTERNS and that used columns are in schema. |
| **5. Execute** | Run validated code in a sandbox with `df` and allowed built-ins; capture output, charts, summary_data. | `backend/main.py` | In `chat(...)`: `execution_result = code_executor.execute_safely(code, df)` (around line 399). |
| | | `backend/services/code_executor.py` | `execute_safely(self, code, df)` (around line 82) – builds safe globals (pd, np, plt, px, go, df, etc.), exec’s code, returns dict with output, error, charts, summary_data. |
| **6. Summarize** | Optionally generate a short narrative from the analysis output. | `backend/main.py` | In `chat(...)`: `needs_narrative_response = llm_service.needs_narrative(request.message)`; if true and execution succeeded, `narrative = await llm_service.generate_narrative(...)` (around lines 411–421). |
| | | `backend/services/llm_service.py` | `needs_narrative(self, prompt)` (around line 267) – keyword-based; `generate_narrative(self, user_question, analysis_output, analysis_data)` (around line 282) – builds narrative prompt and calls the LLM. |

**Orchestration:** The single place that wires all steps together is **`backend/main.py`** in the **`POST /api/chat`** handler (`async def chat(request: ChatRequest)`). The frontend calls this endpoint when the user sends a message; the handler runs the pipeline in order (plan → context → act → check → execute → summarize) and returns `ChatResponse`.

---

## Part B: Backend – detailed code changes

All backend paths are under **`backend/`**.

---

### B.1 `backend/services/llm_service.py`

#### B.1.1 Default provider and model

**Location:** Class `LLMService`, method `__init__` (around lines 30–35).

**Find:**
```python
    def __init__(self):
        self.provider = "openai"
        self.api_key = None
        self.model = "gpt-4"
```

**Replace with:**
```python
    def __init__(self):
        self.provider = "anthropic"
        self.api_key = None
        self.model = "claude-opus-4-6"
```

---

#### B.1.2 Out-of-scope instruction and code-only-when-data in system prompt

**Location:** Method `_create_system_prompt`, inside the long `prompt = f"""..."""` string. You need to **add** the “OUT OF SCOPE” block and **edit** the “CRITICAL” and “Code Format” lines.

**Find** (the paragraph that starts with “For state vs non-state” ends, then you have):
```python
**CRITICAL: Output executable code only.**
- Your reply must contain the full Python code that does the work (filter, group, rank, save CSV, or plot). The code block is executed once; there is no second message to "implement" later.
- Do not respond with only a plan, a description of steps, or a print() of what you will do. Include the actual pandas operations (filtering, groupby, to_csv, etc.) so that running the code produces the requested output.
- For greetings or very simple queries, a short print is fine. For any analysis request (e.g. "list top 10... save to CSV"), the code must perform the full pipeline and write the output.

**Code Format:**
ALWAYS wrap your code in ```python and ``` markers. Never respond with plain text only."""
```

**Replace with:**
```python
**OUT OF SCOPE (do not generate code):**
- If the user's question is NOT a quantitative data analysis question (e.g. root causes of conflict, "why did X happen?", policy recommendations, definitions, general knowledge), do NOT output any code. Reply with ONLY this exact sentence, and nothing else: "I am designed to address FCV-focused data queries. Your question is beyond my remit. Please reformulate it as a data-focused question I can help with (e.g. trends, counts, maps, rankings from the dataset)."
- Do not wrap that sentence in a code block. Do not add explanation before or after.

**CRITICAL: Output executable code only when the question is a data query.**
- When the question IS a quantitative data request: your reply must contain the full Python code that does the work (filter, group, rank, save CSV, or plot). The code block is executed once; there is no second message to "implement" later.
- Do not respond with only a plan, a description of steps, or a print() of what you will do. Include the actual pandas operations (filtering, groupby, to_csv, etc.) so that running the code produces the requested output.
- For greetings or very simple queries, a short print is fine. For any analysis request (e.g. "list top 10... save to CSV"), the code must perform the full pipeline and write the output.

**Code Format (when you do output code):**
ALWAYS wrap your code in ```python and ``` markers. When the question is out of scope, output only the remit sentence with no code block."""
```

---

### B.2 `backend/main.py`

#### B.2.1 Add the out-of-remit constant

**Location:** Right after `app = FastAPI(...)` (around line 47).

**Find:**
```python
app = FastAPI(title="FCV Data Analyst API", version="1.0.0")

# CORS configuration
```

**Replace with:**
```python
app = FastAPI(title="FCV Data Analyst API", version="1.0.0")

# Shown when the user's question is out of scope (non-data query)
OUT_OF_REMIT_MESSAGE = (
    "I am designed to address FCV-focused data queries. Your question is beyond my remit. "
    "Please reformulate it as a data-focused question I can help with (e.g. trends, counts, maps, rankings from the dataset)."
)

# CORS configuration
```

---

#### B.2.2 Startup: prefer Anthropic when LLM_PROVIDER is not set

**Location:** In `configure_llm_from_env`, where you set `provider` when it’s not in the environment.

**Find:**
```python
    if not provider:
        if os.getenv("OPENAI_API_KEY"):
            provider = "openai"
        elif os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
```

**Replace with:**
```python
    if not provider:
        if os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
        elif os.getenv("OPENAI_API_KEY"):
            provider = "openai"
```

---

#### B.2.3 Chat endpoint: return remit when there is no code block

**Location:** In `async def chat(request: ChatRequest)`, right after you get `llm_response` from `get_analysis_code(...)` and **before** you call `code_executor.extract_code(...)`.

**Find:**
```python
        llm_response = await llm_service.get_analysis_code(
            user_message=request.message,
            conversation_history=request.history,
            schema=schema,
            query_spec=query_spec
        )
        
        # Extract code and validate (agentic: checker step)
        code = code_executor.extract_code(llm_response)
```

**Replace with:**
```python
        llm_response = await llm_service.get_analysis_code(
            user_message=request.message,
            conversation_history=request.history,
            schema=schema,
            query_spec=query_spec
        )
        
        # Out-of-scope: no code block -> treat as remit message, do not execute
        if "```python" not in llm_response and "```" not in llm_response:
            text = llm_response.strip()
            if not text or len(text) < 20:
                text = OUT_OF_REMIT_MESSAGE
            return ChatResponse(
                response=text,
                code=None,
                execution_result=text,
                execution_success=True,
                error=None,
                charts=[],
                summary_data=None,
                narrative=None
            )
        
        # Extract code and validate (agentic: checker step)
        code = code_executor.extract_code(llm_response)
```

---

#### B.2.4 Chat endpoint: after execution, treat “not defined” / execute_sql as out-of-remit

**Location:** In the same `chat` function, right after `execution_result = code_executor.execute_safely(code, df)` and before you check `needs_narrative` and build `ChatResponse`.

**Find:**
```python
        execution_result = code_executor.execute_safely(code, df)
        
        # Check if narrative is needed
        needs_narrative_response = llm_service.needs_narrative(request.message)
        
        narrative = None
        if needs_narrative_response and execution_result.get("success"):
            # Generate narrative
            narrative = await llm_service.generate_narrative(
                user_question=request.message,
                analysis_output=execution_result.get("output", ""),
                analysis_data=execution_result.get("summary_data")
            )
        
        return ChatResponse(
            response=llm_response,
            code=code,
            execution_result=execution_result.get("output", ""),
            execution_success=execution_result.get("success", False),
            error=execution_result.get("error"),
            charts=execution_result.get("charts", []),
            summary_data=execution_result.get("summary_data"),
            narrative=narrative
        )
```

**Replace with:**
```python
        execution_result = code_executor.execute_safely(code, df)
        out_output = execution_result.get("output", "")
        out_success = execution_result.get("success", False)
        out_error = execution_result.get("error")
        
        # When execution fails with "not defined" (e.g. execute_sql), treat as out-of-remit and show friendly message
        if not out_success and out_error and ("is not defined" in out_error or "execute_sql" in out_error):
            out_output = OUT_OF_REMIT_MESSAGE
            out_error = None
            out_success = True
        
        # Check if narrative is needed
        needs_narrative_response = llm_service.needs_narrative(request.message)
        
        narrative = None
        if needs_narrative_response and out_success:
            # Generate narrative
            narrative = await llm_service.generate_narrative(
                user_question=request.message,
                analysis_output=out_output,
                analysis_data=execution_result.get("summary_data")
            )
        
        return ChatResponse(
            response=llm_response,
            code=code,
            execution_result=out_output,
            execution_success=out_success,
            error=out_error,
            charts=execution_result.get("charts", []),
            summary_data=execution_result.get("summary_data"),
            narrative=narrative
        )
```

---

### B.3 `backend/models.py`

**Location:** Class `ConfigRequest`, field `model`.

**Find:**
```python
    model: Optional[str] = "gpt-4"
```

**Replace with:**
```python
    model: Optional[str] = None  # None => use service default (claude-opus-4-6)
```

---

### B.4 Plotly annotation font fix (avoids "Invalid property … 'weight'" error)

Plotly’s `layout.annotation.Font` only supports `color`, `family`, and `size`. If generated code uses `font=dict(weight='bold')`, execution fails. Apply both changes below.

#### B.4.1 `backend/services/code_executor.py`

**Add** after the existing `import` block and `from typing import ...` (so the new helper is after all imports):

```python
def _sanitize_annotation_font(font: Any) -> Any:
    """Plotly layout.annotation.Font only supports color, family, size — not weight."""
    if font is None or not isinstance(font, dict):
        return font
    return {k: v for k, v in font.items() if k in ('color', 'family', 'size')}
```

**Then**, inside `execute_safely`, right after `plt.savefig = savefig_wrapper` and **before** `safe_globals = {`:

**Find:**
```python
        # Override plt.savefig
        plt.savefig = savefig_wrapper
        
        # Create safe execution environment
        safe_globals = {
```

**Replace with:**
```python
        # Override plt.savefig
        plt.savefig = savefig_wrapper

        # Patch Plotly: annotation Font only supports color, family, size — not weight
        _original_add_annotation = go.Figure.add_annotation
        def _safe_add_annotation(self: Any, *args: Any, **kwargs: Any) -> Any:
            if 'font' in kwargs:
                kwargs = dict(kwargs)
                kwargs['font'] = _sanitize_annotation_font(kwargs['font'])
            return _original_add_annotation(self, *args, **kwargs)
        go.Figure.add_annotation = _safe_add_annotation
        
        # Create safe execution environment
        safe_globals = {
```

**Restore the original** after execution: in the success path (right after `output_text = output.getvalue()`), add:
```python
            go.Figure.add_annotation = _original_add_annotation
```
In the `except Exception as e:` block, add the same line after `plt.savefig = original_savefig`. In the `finally:` block, add:
```python
            try:
                go.Figure.add_annotation = _original_add_annotation
            except NameError:
                pass
```

#### B.4.2 `backend/services/llm_service.py`

**Find** (in the system prompt, Plotly line):
```python
- plotly.graph_objects (as go) - Advanced plotly charts

**IMPORTANT:** All these packages are already imported.
```

**Replace with:**
```python
- plotly.graph_objects (as go) - Advanced plotly charts. For add_annotation(), font only supports color, family, size — do not use font weight.

**IMPORTANT:** All these packages are already imported.
```

---

### B.5 `backend/env.example`

**Find:**
```env
# Optional: which provider to use on startup (openai | anthropic | azure)
# LLM_PROVIDER=openai

# Optional: model to use when using env config (e.g. gpt-4, claude-sonnet-4-5)
# LLM_MODEL=gpt-4
```

**Replace with:**
```env
# Optional: which provider to use on startup (openai | anthropic | azure)
# LLM_PROVIDER=anthropic

# Optional: model to use when using env config (default: claude-opus-4-6)
# LLM_MODEL=claude-opus-4-6
```

---

## Part C: Frontend (Angular) – detailed code changes

All frontend paths are under **`angular-app/`**.

---

### C.1 `angular-app/src/app/app.component.ts`

#### C.1.1 Header title and subtitle

**Find (in the template):**
```html
      <header class="app-header">
        <h1>🌍 FCV Data Analyst Chatbot</h1>
        <p class="subtitle">Analyze conflict and violence data with AI</p>
      </header>
```

**Replace with:**
```html
      <header class="app-header">
        <h1>🌍 FCV Data Chatbot</h1>
        <p class="subtitle">Quantitative conflict and violence data queries</p>
      </header>
```

---

#### C.1.2 Sidebar: add “What this bot does” block

**Find (in the template, inside `<aside class="sidebar">`):**
```html
        <aside class="sidebar">
          <app-data-upload 
            (dataLoaded)="onDataLoaded($event)">
          </app-data-upload>
```

**Replace with:**
```html
        <aside class="sidebar">
          <div class="bot-purpose">
            <h3>📌 What this bot does</h3>
            <p><strong>Purpose:</strong> This is a <strong>data chatbot</strong> for <strong>quantitative queries</strong> only. It runs analysis on the pre-loaded dataset and returns results, charts, or CSV—it does not answer from general knowledge or external sources.</p>
            <p><strong>Data:</strong> Conflict data is <strong>pre-loaded</strong> (ACLED — Armed Conflict Location & Event Data). You do not need to add or upload data to get started.</p>
            <p><strong>✅ Capable of:</strong></p>
            <ul class="cap-list">
              <li>Trends over time (fatalities, events, by country/region)</li>
              <li>Counts, rankings, top-N (e.g. top 10 actors, countries by events)</li>
              <li>Maps of events (specify country or region for best results)</li>
              <li>Comparisons (between regions, time periods, or event types)</li>
              <li>Filtering by date, event type, actor, and exporting to CSV</li>
            </ul>
            <p><strong>❌ Not capable of:</strong></p>
            <ul class="cap-list remit">
              <li>Qualitative or policy questions (e.g. "root causes of FCV", "why did X happen?")</li>
              <li>Recommendations, predictions, or opinions</li>
              <li>General knowledge not in the pre-loaded data</li>
              <li>Editing or changing the underlying dataset—the data is pre-loaded and fixed for your session</li>
            </ul>
            <p class="remit">If your question is outside this scope, the bot will ask you to reformulate as a data-focused question.</p>
            <p class="note">The bot will be enhanced over time and will connect to other data sources; for now it uses pre-loaded ACLED data only.</p>
          </div>
          <app-data-upload 
            (dataLoaded)="onDataLoaded($event)">
          </app-data-upload>
```

---

#### C.1.3 Styles for `.bot-purpose`

**Find (in the component `styles` array, after `.sidebar { ... }` and before `.chat-area`):**
```css
    .sidebar {
      width: 350px;
      background: white;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      padding: 20px;
    }

    .chat-area {
```

**Replace with:**
```css
    .sidebar {
      width: 350px;
      background: white;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
      padding: 20px;
    }

    .bot-purpose {
      margin-bottom: 20px;
      padding: 14px;
      background: #f0f4ff;
      border-radius: 10px;
      border: 1px solid #c5d4f7;
      font-size: 12px;
      line-height: 1.45;
      color: #333;
    }
    .bot-purpose h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #2E86AB;
    }
    .bot-purpose p {
      margin: 0 0 10px 0;
    }
    .bot-purpose p:last-child {
      margin-bottom: 0;
    }
    .bot-purpose .cap-list {
      margin: 4px 0 10px 0;
      padding-left: 18px;
      font-size: 11.5px;
      line-height: 1.4;
    }
    .bot-purpose .cap-list.remit {
      margin-bottom: 8px;
    }
    .bot-purpose .remit {
      color: #555;
      font-style: italic;
      font-size: 11.5px;
    }
    .bot-purpose .note {
      margin-top: 10px;
      font-size: 11px;
      color: #2E86AB;
    }

    .chat-area {
```

---

### C.2 `angular-app/src/app/components/chat-interface/chat-interface.component.ts`

**Find (welcome block in the template):**
```html
        <div class="welcome-message" *ngIf="messages.length === 0">
          <h2>👋 Welcome to FCV Data Analyst</h2>
          <p>Ask me questions about your conflict data, such as:</p>
          <ul>
            <li>"What are the trends in fatalities over time in Nigeria?"</li>
            <li>"Show me a map of violence events in 2024"</li>
            <li>"Compare conflict patterns between different regions"</li>
            <li>"Which actors are most active in armed violence?"</li>
          </ul>
        </div>
```

**Replace with:**
```html
        <div class="welcome-message" *ngIf="messages.length === 0">
          <h2>👋 Welcome to the Data Chatbot</h2>
          <p class="welcome-intro">I answer <strong>quantitative</strong> questions about the <strong>pre-loaded</strong> conflict data (ACLED). I run analysis on the dataset and return results, charts, or CSV—I do not answer from general knowledge or external sources.</p>
          <p><strong>✅ I can:</strong> trends over time, counts and rankings, maps (specify country/region), comparisons, and export to CSV.</p>
          <p><strong>❌ I cannot:</strong> answer qualitative or policy questions (e.g. root causes, "why did X happen?"), give recommendations, or use information not in your data.</p>
          <p class="welcome-note">I will be enhanced over time and connected to other data sources; for now I use pre-loaded ACLED data only.</p>
          <p>Try a question like:</p>
          <ul>
            <li>"What are the trends in fatalities over time in Nigeria?"</li>
            <li>"Show me a map of violence events in Nigeria in 2024"</li>
            <li>"Compare conflict patterns between different regions"</li>
            <li>"Which actors are most active in armed violence?"</li>
          </ul>
        </div>
```

**Optional (for spacing):** In the same component’s `styles` array, after `.welcome-message h2 { ... }` and before `.welcome-message ul`, add:

```css
    .welcome-message p {
      margin: 0 0 10px 0;
      color: #444;
      line-height: 1.5;
    }
    .welcome-message p.welcome-intro {
      margin-bottom: 14px;
    }
    .welcome-message p.welcome-note {
      font-size: 12px;
      color: #2E86AB;
      margin-bottom: 12px;
    }
```

And change `.welcome-message ul { margin-top: 15px; ... }` to `margin-top: 8px;` so the list sits closer to “Try a question like:”.

**Input placeholder (data pre-loaded):** Set the chat input placeholder to "Data is loading..." when disabled and "Ask a question about the data..." when enabled (instead of "Please upload data first..." when disabled).

#### C.2.1 Angular compile fix (keydown handler)

If the frontend fails to compile with: `Argument of type 'Event' is not assignable to parameter of type 'KeyboardEvent'` on the line with `(keydown.enter)="onEnterKey($event)"`:

**Find:**
```html
(keydown.enter)="onEnterKey($event)"
```

**Replace with:**
```html
(keydown.enter)="onEnterKey($any($event))"
```

Keep the method as `onEnterKey(event: KeyboardEvent): void { ... }`.

#### C.2.2 npm start without global Angular CLI

If `npm start` fails with `'ng' is not recognized`, set the start script in `angular-app/package.json` to use the local CLI:

**Find:** `"start": "ng serve",`  
**Replace with:** `"start": "node node_modules/@angular/cli/bin/ng.js serve",`

Then run `npm install` in `angular-app` (if not already done), and `npm start`.

---

### C.3 Running the frontend (for developers)

- **Port 4200 in use:** Run `KILL_PORT_4200.bat` (in the package root), then start the frontend again.
- **npm install fails** (e.g. long paths or permissions): Copy the `angular-app` folder to a location where install works, run `npm install` and `npm start` there.

---

### C.4 Optional UI enhancements (included in latest zip)

The **latest shared zip** includes these frontend updates. If you have an older zip, either re-extract the latest package or manually update the following files from the repo:

- **app.component.ts** – Header toggle (☰) to collapse/expand sidebar; sidebar uses `sidebarOpen` and `.sidebar-collapsed` for width transition.
- **chat-interface.component.ts** – Suggested prompts as clickable cards (grid), auto-scroll to bottom on new messages, input focus ring and “Enter to send · Shift+Enter for new line” hint, thinking indicator with animated dots instead of spinner.
- **message.component.ts** – Code / Results / Narrative sections collapsed by default (click header to expand); Copy buttons for Results and Narrative; “Download outputs” button; dark theme for code block (e.g. `#1e2235` background).
- **Layout/scroll** – `:host` and `.messages-area` use `min-height: 0` and `overflow-y: auto` so long chat output scrolls correctly.

No separate find/replace steps are given here; use the packaged `angular-app/` from the latest zip or copy the updated component files from the repo.

---

## Part D: Verification

1. **Backend**
   - Set only `ANTHROPIC_API_KEY` in `backend/.env` (no `LLM_PROVIDER` / `LLM_MODEL`). Start backend; logs should show `provider=anthropic`.
   - Send a non–data question (e.g. “What are the root causes of FCV in Nigeria?”). You should get the remit message and no code execution or `execute_sql` traceback.
   - If you applied B.4 (Plotly fix): a query that produces a Plotly chart with annotations should run without “Invalid property … 'weight'” errors.

2. **Frontend**
   - Header shows “FCV Data Chatbot” and “Quantitative conflict and violence data queries”; ☰ toggles sidebar if you have the latest UI.
   - Sidebar shows the “What this bot does” box with **Capable of** / **Not capable of** lists.
   - Welcome shows “Welcome to the Data Chatbot”, the short “I can” / “I cannot” lines, and either the example list or clickable suggested prompt cards (latest zip). Long chat output scrolls; message sections can be collapsed/expanded with Copy/Download where applicable.

---

## Part E: Re-packaging for sharing

From the folder that contains `backend/`, `angular-app/`, and the batch files:

- Run: `python create_zip.py`  
  The zip is created in your Documents folder as `FCV-Data-Analyst-App.zip`.

Or manually zip: `backend/`, `angular-app/`, `START_BACKEND.bat`, `START_FRONTEND.bat`, `START_BOTH.bat`, `KILL_PORT_4200.bat`, `QUICK_START_ANGULAR.md`, `README_ANGULAR.md`, `TEST_PROMPTS.md`, `SQL_DATABASE_GUIDE.md`, `SHARED_PACKAGE_UPDATE_GUIDE.md`.

Point recipients to `QUICK_START_ANGULAR.md`; if they have an older zip, point them to this guide to apply the updates.
