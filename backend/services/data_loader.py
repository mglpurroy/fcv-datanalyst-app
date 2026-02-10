"""
Data Loading Service
Handles CSV data loading, storage, and schema generation
"""

import pandas as pd
import io
import os
from typing import Dict, List, Optional, Any
import requests

# Default ACLED data path (can override with env ACLED_DEFAULT_PATH)
DEFAULT_ACLED_PATH = os.environ.get(
    "ACLED_DEFAULT_PATH",
    r"C:\Users\wb617270\OneDrive - WBG\FCV\acled_data\data\master\current\acled_data_current.csv"
)

class DataLoaderService:
    def __init__(self):
        self.sessions = {}
    
    def load_from_path(self, path: str) -> pd.DataFrame:
        """Load CSV from a local file path"""
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Data file not found: {path}")
        df = pd.read_csv(path, low_memory=False)
        if 'event_date' in df.columns:
            df['event_date'] = pd.to_datetime(df['event_date'], errors='coerce')
        return df
    
    def load_from_urls(self, urls: List[str]) -> pd.DataFrame:
        """Load and combine data from multiple URLs"""
        dataframes = []
        
        for url in urls:
            try:
                # Handle Dropbox links
                if 'dropbox.com' in url and 'dl=0' in url:
                    url = url.replace('dl=0', 'dl=1')
                
                # Download and load
                if url.startswith('http://') or url.startswith('https://'):
                    response = requests.get(url)
                    response.raise_for_status()
                    df = pd.read_csv(io.StringIO(response.text), low_memory=False)
                else:
                    df = pd.read_csv(url, low_memory=False)
                
                dataframes.append(df)
            except Exception as e:
                print(f"Warning: Failed to load {url}: {str(e)}")
                continue
        
        if not dataframes:
            raise Exception("Failed to load any data files")
        
        # Combine dataframes
        df = pd.concat(dataframes, ignore_index=True)
        
        # Remove duplicates if event_id_cnty exists
        if 'event_id_cnty' in df.columns:
            df = df.drop_duplicates(subset=['event_id_cnty'], keep='first')
        
        # Parse dates
        if 'event_date' in df.columns:
            df['event_date'] = pd.to_datetime(df['event_date'], errors='coerce')
        
        return df
    
    def store_data(self, session_id: str, df: pd.DataFrame):
        """Store dataframe for a session"""
        self.sessions[session_id] = df
    
    def get_data(self, session_id: str) -> Optional[pd.DataFrame]:
        """Retrieve dataframe for a session"""
        return self.sessions.get(session_id)
    
    def delete_session(self, session_id: str):
        """Delete session data"""
        if session_id in self.sessions:
            del self.sessions[session_id]
    
    def list_sessions(self) -> List[str]:
        """List all session IDs"""
        return list(self.sessions.keys())
    
    def get_schema(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate schema description for LLM"""
        if df is None:
            return {"error": "No data available"}
        
        # Convert sample data and replace NaN with None for JSON compatibility
        sample_data = df.head(3).replace({pd.NA: None, float('nan'): None}).to_dict('records')
        
        # Handle date range with NaN values
        date_min = None
        date_max = None
        if 'event_date' in df.columns:
            try:
                date_min_val = df['event_date'].min()
                date_max_val = df['event_date'].max()
                date_min = str(date_min_val) if pd.notna(date_min_val) else None
                date_max = str(date_max_val) if pd.notna(date_max_val) else None
            except:
                pass
        
        # Value sets for key columns (so LLM knows what values exist)
        key_cols = ["event_type", "sub_event_type", "inter1", "inter2", "interaction", "country", "admin1"]
        value_info = {}
        for col in key_cols:
            if col in df.columns:
                try:
                    uniq = df[col].dropna().astype(str).unique()
                    value_info[col] = sorted(uniq)[:30] if len(uniq) > 30 else sorted(uniq)
                except Exception:
                    value_info[col] = []

        schema = {
            "type": "csv",
            "dataframe_name": "df",
            "shape": df.shape,
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "sample_data": sample_data,
            "date_range": {
                "min": date_min,
                "max": date_max
            },
            "value_info": value_info,
        }
        return schema

    def get_column_profile(self, df: pd.DataFrame, column_list: List[str], top_n: int = 25) -> Dict[str, Any]:
        """Tabulate selected columns: dtype and value_counts (or unique count) so the agent can use format and values in code.
        Returns a dict suitable for the LLM: each column -> {dtype, value_counts: {value: count} or unique_count if too many.}
        """
        if df is None:
            return {}
        profile = {}
        for col in column_list:
            if col not in df.columns:
                continue
            try:
                ser = df[col].dropna()
                dtype = str(df[col].dtype)
                vc = ser.astype(str).value_counts()
                if len(vc) <= top_n:
                    value_counts = vc.head(top_n).to_dict()
                else:
                    value_counts = {"_n_unique": int(ser.nunique()), "_top_values": vc.head(15).to_dict()}
                profile[col] = {"dtype": dtype, "value_counts": value_counts}
            except Exception:
                profile[col] = {"dtype": str(df[col].dtype), "value_counts": {}}
        return profile
