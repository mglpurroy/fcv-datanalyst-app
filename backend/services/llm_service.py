"""
LLM Service
Handles interaction with OpenAI, Azure OpenAI, and Anthropic APIs
"""

from typing import List, Dict, Any, Optional, Tuple
import os
import json
from pathlib import Path

# Optional imports
try:
    from openai import OpenAI, AzureOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    from itsai.platform.authentication import DesktopToken
    AZURE_ITSAI_AVAILABLE = True
except ImportError:
    AZURE_ITSAI_AVAILABLE = False

class LLMService:
    def __init__(self):
        self.provider = "anthropic"
        self.api_key = None
        self.model = "claude-sonnet-4-5"
        self.azure_endpoint = None
        self.client = None
    
    def _ensure_env_loaded(self):
        """Load .env from backend directory so keys are available regardless of process CWD."""
        try:
            from dotenv import load_dotenv
            backend_dir = Path(__file__).resolve().parent.parent
            load_dotenv(backend_dir / ".env")
        except Exception:
            pass

    def configure(self, provider: str, api_key: Optional[str] = None,
                  model: Optional[str] = None, azure_endpoint: Optional[str] = None):
        """Configure LLM service. API keys can be passed here or set in the environment."""
        self.provider = provider
        self.model = model or self.model
        # Endpoint: explicit > env AZURE_OPENAI_ENDPOINT > default
        self.azure_endpoint = azure_endpoint or os.getenv("AZURE_OPENAI_ENDPOINT")

        # API key: explicit > environment variable (re-load .env when key not provided)
        if api_key and api_key.strip():
            self.api_key = api_key.strip()
        else:
            self._ensure_env_loaded()
            if provider == "openai":
                self.api_key = os.getenv("OPENAI_API_KEY")
            elif provider == "anthropic":
                self.api_key = os.getenv("ANTHROPIC_API_KEY")
        
        # Initialize client based on provider
        if provider == "openai" and OPENAI_AVAILABLE:
            if not self.api_key:
                _env_path = Path(__file__).resolve().parent.parent / ".env"
                raise Exception(
                    "OpenAI API key is required. Set OPENAI_API_KEY in your environment or in %s"
                    % _env_path
                )
            self.client = OpenAI(api_key=self.api_key)
        elif provider == "anthropic" and ANTHROPIC_AVAILABLE:
            if not self.api_key:
                _env_path = Path(__file__).resolve().parent.parent / ".env"
                raise Exception(
                    "Anthropic API key is required. Set ANTHROPIC_API_KEY in your environment or in %s"
                    % _env_path
                )
            self.client = Anthropic(api_key=self.api_key)
        elif provider == "azure" and OPENAI_AVAILABLE:
            self._setup_azure_client()
        else:
            raise Exception(f"Provider '{provider}' is not available or API key missing")
    
    def _setup_azure_client(self):
        """Setup Azure OpenAI client with ITSAI Platform"""
        if not AZURE_ITSAI_AVAILABLE:
            return None, "ITSAI Platform not available"
        
        try:
            token_class = DesktopToken()
            token_provider_func = lambda: token_class.token_provider(env="DEV")
            
            api_version = "2025-01-01-preview" if self.model.startswith("gpt-5") else "2025-04-01-preview"
            
            self.client = AzureOpenAI(
                api_version=api_version,
                azure_endpoint=self.azure_endpoint or "https://azapimdev.worldbank.org/conversationalai/v2/",
                azure_ad_token_provider=token_provider_func,
                timeout=60.0
            )
        except Exception as e:
            print(f"Failed to setup Azure client: {str(e)}")
    
    def _create_system_prompt(self, schema: Dict[str, Any]) -> str:
        """Create system prompt for the LLM"""
        columns_str = ", ".join(str(col) for col in schema['columns'][:20])
        
        prompt = f"""You are a data analyst assistant. You have access to a dataset loaded in a pandas DataFrame called 'df'. Your job is to understand the data (using the schema and value_info below) and then write code that answers the user's request. Do not assume column names, encodings, or value schemes—inspect and use what the data actually contains.

**Dataset Overview:**
- Shape: {schema['shape'][0]:,} rows × {schema['shape'][1]} columns
- Date range: {schema['date_range']['min']} to {schema['date_range']['max']}
- Columns: {columns_str}
- Value info (use only these values when filtering): {schema.get('value_info', {})}
- Column profile (dtype and value_counts for analysis-relevant columns; use this to see actual format and values before writing filters): {schema.get('column_profile', {})}
- Optional auxiliary dataframes: {schema.get('aux_dataframes', {})}
- Optional auxiliary warnings: {schema.get('aux_warnings', [])}

**Available Python Packages (already imported - DO NOT import them):**
- pandas (as pd) - Data manipulation and analysis
- numpy (as np) - Numerical operations
- matplotlib.pyplot (as plt) - Static plotting
- plotly.express (as px) - Interactive plotting and maps
- plotly.graph_objects (as go) - Advanced plotly charts. For add_annotation(), font only supports color, family, size — do not use font weight.

**IMPORTANT:** All these packages are already imported. DO NOT use import statements in your code.

**HOW TO WORK (understand first, then execute):**
- Use only column names and values that exist in the schema and value_info above. Do not assume column names or coding schemes; use what the data actually has. If a column you filter on is string-typed (e.g. value_info shows '1', '2', '3' or text labels), coerce with pd.to_numeric(..., errors='coerce') when you need numeric comparison, or filter using the exact string values from value_info.
- When the request involves filtering, grouping, or ranking: first understand the data. In your code, inspect relevant columns (e.g. dtypes, value_counts, or unique values) so you use the right names and values. If you need to filter by date, check whether a date column exists and its format; derive year/month if needed (e.g. pd.to_datetime(..., errors='coerce').dt.year).
- If a filter or aggregation yields 0 rows: print diagnostics (row count after each filter step, and value_counts for columns you used). Then adapt: try a different column (e.g. 'interaction' if inter1/inter2 gave no rows), coerce types, or an alternative definition. Do not save a CSV with 0 rows—either fix the pipeline so it produces rows or print a clear message that no data matched.
- When building boolean masks from string columns (e.g. .str.contains), handle missing values so operations like negation don't fail (e.g. na=False or .fillna(False)).
- For state vs non-state (or actor-type) analysis: do not assume actor1 is always non-state or actor2 always state—both columns can contain either. Use the type columns (inter1, inter2) from the column profile to identify which value(s) mean state, civilians, and non-state armed. Build a long-format table by taking actor names only when the corresponding type column matches the desired type: (A) rows where inter1 is non-state armed (and not state, not civilians): select [country, admin1, actor1, event_id_cnty, fatalities], rename actor1 to actor; (B) rows where inter2 is non-state armed: select [country, admin1, actor2, event_id_cnty, fatalities], rename actor2 to actor. Do not filter the whole dataframe to "drop state rows" and then take all actor1 and actor2—that counts the wrong set. After concat, drop rows where actor is missing or in ['Unidentified', 'Unknown', ''] (or similar). Then groupby(['country', 'admin1', 'actor']).agg(...).
- If auxiliary dataframe `df_pop` is available and the user asks for population or per-capita rates, use `df_pop` for the join. Build `year` from `event_date` in `df`, join on `['country', 'year']`, and guard against divide-by-zero/null population.
- If auxiliary dataframe `df_wdi` is available, use it for Data360/WDI-only requests (e.g., poverty trend). `df_wdi` contains `iso3`, `year`, `value`, and `indicator`. If the request includes a country, map/filter to that country's ISO3 and then trend `value` by year.

**OUT OF SCOPE (do not generate code):**
- If the user's question is NOT a quantitative data analysis question (e.g. root causes of conflict, "why did X happen?", policy recommendations, definitions, general knowledge), do NOT output any code. Reply with ONLY this exact sentence, and nothing else: "I am designed to address FCV-focused data queries. Your question is beyond my remit. Please reformulate it as a data-focused question I can help with (e.g. trends, counts, maps, rankings from the dataset)."
- Do not wrap that sentence in a code block. Do not add explanation before or after.

**CRITICAL: Output executable code only when the question is a data query.**
- When the question IS a quantitative data request: your reply must contain the full Python code that does the work (filter, group, rank, save CSV, or plot). The code block is executed once; there is no second message to "implement" later.
- Do not respond with only a plan, a description of steps, or a print() of what you will do. Include the actual pandas operations (filtering, groupby, to_csv, etc.) so that running the code produces the requested output.
- For greetings or very simple queries, a short print is fine. For any analysis request (e.g. "list top 10... save to CSV"), the code must perform the full pipeline and write the output.

**Code Format (when you do output code):**
ALWAYS wrap your code in ```python and ``` markers. When the question is out of scope, output only the remit sentence with no code block.

**IMPORTANT: Do NOT write "Key takeaways" or any narrative summary after the code block.** The system will generate an accurate narrative from the actual execution results. Your job is ONLY to produce correct, executable Python code."""
        return prompt

    _SPEC_SYSTEM = """You are a query specifier for conflict/ACLED data. Given the user's request, output ONLY a single valid JSON object. No markdown, no explanation, no code block wrapper.
Use only these keys (omit or set null if not applicable):
- intent: short string summarizing what they want (e.g. "top non-state actors per country-admin1")
- date_range: string like "2020-2024" or null
- event_type_filter: "violent_only" | "all" | null
- actor_filter: "non_state" | "state" | "all" | null
- groupby: array of column names e.g. ["country","admin1"] or null
- rank_by: "event_count" | "fatalities" | null
- top_k: number (e.g. 10) or null
- output: "csv" | "chart" | "both" | null
Example: {"intent":"top 10 non-state actors per country-admin1","date_range":"2020-2024","event_type_filter":"violent_only","actor_filter":"non_state","groupby":["country","admin1"],"rank_by":"event_count","top_k":10,"output":"csv"}"""

    async def get_query_spec(self, user_message: str) -> Optional[Dict[str, Any]]:
        """Get a structured query spec from the user's request (agentic: planning step). Returns None if parsing fails."""
        messages = [
            {"role": "system", "content": self._SPEC_SYSTEM},
            {"role": "user", "content": user_message}
        ]
        try:
            if self.provider == "openai":
                raw = await self._call_openai(messages)
            elif self.provider == "anthropic":
                raw = await self._call_anthropic(messages)
            elif self.provider == "azure":
                raw = await self._call_azure(messages)
            else:
                return None
            raw = raw.strip()
            start, end = raw.find("{"), raw.rfind("}")
            if start != -1 and end != -1 and end > start:
                return json.loads(raw[start : end + 1])
            return json.loads(raw)
        except (json.JSONDecodeError, KeyError, TypeError):
            return None
    
    async def get_analysis_code(self, user_message: str,
                               conversation_history: List[Dict[str, str]],
                               schema: Dict[str, Any],
                               query_spec: Optional[Dict[str, Any]] = None) -> str:
        """Get analysis code from LLM based on user question and optional structured spec."""
        system_prompt = self._create_system_prompt(schema)
        if query_spec:
            user_message = user_message + "\n\n[Structured spec to implement: " + json.dumps(query_spec) + "]"
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history or [])
        messages.append({"role": "user", "content": user_message})
        
        # Call LLM based on provider
        if self.provider == "openai":
            return await self._call_openai(messages)
        elif self.provider == "anthropic":
            return await self._call_anthropic(messages)
        elif self.provider == "azure":
            return await self._call_azure(messages)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")
    
    async def _call_openai(self, messages: List[Dict[str, str]]) -> str:
        """Call OpenAI API"""
        if not self.client:
            raise Exception("OpenAI client not configured")
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.1
        )
        return response.choices[0].message.content
    
    async def _call_anthropic(self, messages: List[Dict[str, str]]) -> str:
        """Call Anthropic API"""
        if not self.client:
            raise Exception("Anthropic client not configured")
        
        # Convert messages for Claude
        claude_messages = []
        system_message = None
        
        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            elif msg["role"] in ["user", "assistant"]:
                claude_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        request_params = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": claude_messages
        }
        
        if system_message:
            request_params["system"] = [{
                "type": "text",
                "text": system_message,
                "cache_control": {"type": "ephemeral"}
            }]
        
        response = self.client.messages.create(**request_params)
        
        # Extract text
        text_content = ""
        for block in response.content:
            if hasattr(block, 'text'):
                text_content += block.text
        
        return text_content
    
    async def _call_azure(self, messages: List[Dict[str, str]]) -> str:
        """Call Azure OpenAI API"""
        if not self.client:
            raise Exception("Azure OpenAI client not configured")
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.1
        )
        return response.choices[0].message.content
    
    def needs_narrative(self, prompt: str) -> bool:
        """Determine if a narrative summary would be helpful"""
        # Generate narrative for most analytical queries
        narrative_keywords = [
            'trend', 'change', 'pattern', 'over time', 'compare', 'comparison',
            'increase', 'decrease', 'evolution', 'shift', 'regional', 'geographic',
            'analysis', 'analyze', 'assessment', 'assess', 'summary', 'summarize',
            'overview', 'situation', 'development', 'developments', 'security',
            'conflict', 'violence', 'fatalities', 'events', 'what happened'
        ]
        # Also generate narrative if the prompt is longer (indicates analytical question)
        if len(prompt.split()) > 5:
            return True
        return any(keyword in prompt.lower() for keyword in narrative_keywords)
    
    async def generate_narrative(self, user_question: str, analysis_output: str,
                                analysis_data: Optional[Dict[str, Any]] = None) -> str:
        """Generate key takeaways from the ACTUAL execution output (post-execution, grounded in real numbers)."""
        narrative_prompt = f"""You are summarising ACTUAL data analysis results. Write 2-4 key takeaways.

CRITICAL RULES:
- Use ONLY the numbers, names, and dates that appear in the "Analysis Results" below.
- Do NOT invent, extrapolate, or round numbers beyond what the output shows.
- If the output shows a date range (e.g. 2018-2026), do NOT claim data from outside that range.
- If unsure about a number, omit it rather than guess.

Format — use exactly this structure:
Key takeaways:
- [One punchy sentence with the main finding and exact number from the output.]
- [Another sentence citing a specific number or ranking from the output.]
- [Optional: a brief observation about a trend visible in the output.]

User Question: {user_question}

Analysis Results (this is the ACTUAL output from executed code — treat these numbers as ground truth):
{analysis_output[:3000]}

{f"Key Data Points: {analysis_data}" if analysis_data else ""}

Output ONLY the "Key takeaways:" block. No other text, no preamble, no code."""
        
        messages = [{"role": "user", "content": narrative_prompt}]
        
        if self.provider == "openai":
            return await self._call_openai(messages)
        elif self.provider == "anthropic":
            return await self._call_anthropic(messages)
        elif self.provider == "azure":
            return await self._call_azure(messages)
