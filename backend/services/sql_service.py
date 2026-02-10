"""
SQL Database Connection Service
Handles connections to SQL Server, PostgreSQL, and MySQL
"""

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from typing import Dict, Optional, Any
import urllib.parse

class SQLService:
    def __init__(self):
        self.connections = {}  # Store connections by session_id
    
    def build_connection_string(self, db_type: str, **kwargs) -> str:
        """Build SQLAlchemy connection string"""
        connection_string = kwargs.get('connection_string')
        if connection_string:
            return connection_string
        
        host = kwargs.get('host', 'localhost')
        port = kwargs.get('port')
        database = kwargs.get('database')
        username = kwargs.get('username')
        password = kwargs.get('password', '')
        
        # URL encode password to handle special characters
        if password:
            password = urllib.parse.quote_plus(password)
        
        if db_type.lower() == 'sqlserver':
            driver = kwargs.get('driver', 'ODBC Driver 17 for SQL Server')
            if port:
                return f"mssql+pyodbc://{username}:{password}@{host}:{port}/{database}?driver={urllib.parse.quote_plus(driver)}"
            else:
                return f"mssql+pyodbc://{username}:{password}@{host}/{database}?driver={urllib.parse.quote_plus(driver)}"
        
        elif db_type.lower() == 'postgresql':
            sslmode = kwargs.get('sslmode', 'prefer')
            if port:
                return f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}?sslmode={sslmode}"
            else:
                return f"postgresql+psycopg2://{username}:{password}@{host}/{database}?sslmode={sslmode}"
        
        elif db_type.lower() == 'mysql':
            if port:
                return f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}"
            else:
                return f"mysql+pymysql://{username}:{password}@{host}/{database}"
        
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
    
    def connect(self, session_id: str, db_type: str, **kwargs) -> Dict[str, Any]:
        """Create and store database connection"""
        try:
            connection_string = self.build_connection_string(db_type, **kwargs)
            engine = create_engine(connection_string, pool_pre_ping=True)
            
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self.connections[session_id] = {
                'engine': engine,
                'db_type': db_type,
                'connection_string': connection_string
            }
            
            return {
                'success': True,
                'message': f'Successfully connected to {db_type} database',
                'session_id': session_id
            }
        except SQLAlchemyError as e:
            return {
                'success': False,
                'error': f'Database connection error: {str(e)}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error: {str(e)}'
            }
    
    def execute_query(self, session_id: str, query: str) -> Dict[str, Any]:
        """Execute SQL query and return results as DataFrame"""
        if session_id not in self.connections:
            return {
                'success': False,
                'error': 'No database connection found. Please connect first.',
                'data': None
            }
        
        try:
            engine = self.connections[session_id]['engine']
            
            # Execute query
            with engine.connect() as conn:
                df = pd.read_sql(text(query), conn)
            
            return {
                'success': True,
                'data': df,
                'rows': len(df),
                'columns': list(df.columns)
            }
        except SQLAlchemyError as e:
            return {
                'success': False,
                'error': f'SQL execution error: {str(e)}',
                'data': None
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error: {str(e)}',
                'data': None
            }
    
    def disconnect(self, session_id: str):
        """Close database connection"""
        if session_id in self.connections:
            try:
                engine = self.connections[session_id]['engine']
                engine.dispose()
            except:
                pass
            del self.connections[session_id]
    
    def list_tables(self, session_id: str) -> Dict[str, Any]:
        """List all tables in the database"""
        if session_id not in self.connections:
            return {
                'success': False,
                'error': 'No database connection found',
                'tables': []
            }
        
        try:
            engine = self.connections[session_id]['engine']
            db_type = self.connections[session_id]['db_type'].lower()
            
            if db_type == 'sqlserver':
                query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
            elif db_type == 'postgresql':
                query = "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            elif db_type == 'mysql':
                query = "SHOW TABLES"
            else:
                return {
                    'success': False,
                    'error': f'Table listing not supported for {db_type}',
                    'tables': []
                }
            
            with engine.connect() as conn:
                result = conn.execute(text(query))
                tables = [row[0] for row in result]
            
            return {
                'success': True,
                'tables': tables
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error listing tables: {str(e)}',
                'tables': []
            }
