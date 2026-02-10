# 🗄️ SQL Database Support Guide

## Overview

The FCV Data Analyst now supports connecting to **SQL Server**, **PostgreSQL**, and **MySQL** databases to load data directly for analysis.

---

## ✅ Supported Databases

- **SQL Server** (via pyodbc)
- **PostgreSQL** (via psycopg2)
- **MySQL** (via pymysql)

---

## 🚀 How to Use

### Step 1: Install Dependencies

The SQL drivers are already in `requirements.txt`. Install them:

```bash
cd backend
pip install -r requirements.txt
```

**Note:** For SQL Server, you may need to install ODBC drivers:
- Windows: Usually pre-installed
- Linux/Mac: Install Microsoft ODBC Driver for SQL Server

### Step 2: Connect to Database

1. In the Angular app, go to **"📁 Load Data"** panel
2. Click the **"🗄️ SQL Database"** tab
3. Choose connection method:
   - **Individual Parameters** (recommended for first-time users)
   - **Connection String** (for advanced users)

### Step 3: Fill Connection Details

#### Option A: Individual Parameters
- **Database Type**: Select SQL Server, PostgreSQL, or MySQL
- **Host**: Database server address (e.g., `localhost` or `server.example.com`)
- **Port**: Database port (optional, uses default if not specified)
  - SQL Server: 1433
  - PostgreSQL: 5432
  - MySQL: 3306
- **Database**: Database name
- **Username**: Database username
- **Password**: Database password

#### Option B: Connection String
Enter full SQLAlchemy connection string:
- SQL Server: `mssql+pyodbc://user:pass@host:port/db?driver=ODBC+Driver+17+for+SQL+Server`
- PostgreSQL: `postgresql+psycopg2://user:pass@host:port/db?sslmode=prefer`
- MySQL: `mysql+pymysql://user:pass@host:port/db`

### Step 4: Enter SQL Query

Enter your SQL query to load data:
```sql
SELECT * FROM conflict_events WHERE year >= 2020
```

**Tips:**
- Use `LIMIT` or `TOP` to control data size
- Results are loaded into pandas DataFrame
- All standard SQL features work

### Step 5: Test & Load

1. Click **"🔌 Test Connection"** to verify connection
2. If successful, available tables will be shown
3. Click any table name to insert it into your query
4. Click **"📊 Load Data"** to execute query and load data

---

## 📋 Example Queries

### Load Recent Events
```sql
SELECT TOP 10000 * 
FROM acled_data 
WHERE event_date >= '2023-01-01'
ORDER BY event_date DESC
```

### Aggregate Data
```sql
SELECT 
    country,
    year,
    COUNT(*) as event_count,
    SUM(fatalities) as total_fatalities
FROM conflict_events
GROUP BY country, year
ORDER BY year DESC, total_fatalities DESC
```

### Filtered Analysis
```sql
SELECT * 
FROM events 
WHERE country = 'Afghanistan' 
  AND event_type = 'Violence against civilians'
  AND fatalities > 0
```

---

## 🔒 Security Notes

- **Passwords are encrypted in transit** (HTTPS recommended for production)
- **Connection strings are stored in session memory only** (not persisted)
- **Disconnect when done** to close database connections
- **Use read-only database users** when possible

---

## 🛠️ Troubleshooting

### Connection Failed
- ✅ Check database server is accessible
- ✅ Verify username/password
- ✅ Ensure database name is correct
- ✅ Check firewall rules allow connection
- ✅ For SQL Server: Verify ODBC driver is installed

### Query Execution Error
- ✅ Test query in database client first
- ✅ Check table/column names are correct
- ✅ Verify user has SELECT permissions
- ✅ Check for SQL syntax errors

### No Tables Listed
- ✅ Ensure user has permission to list tables
- ✅ Some databases may require schema specification
- ✅ Try connecting with a different user account

---

## 💡 Best Practices

1. **Limit Data Size**: Use `LIMIT` or `TOP` to avoid loading millions of rows
2. **Filter Early**: Apply WHERE clauses in SQL, not after loading
3. **Index Usage**: Queries benefit from indexed columns (date, country, etc.)
4. **Connection Pooling**: Connections are pooled automatically
5. **Disconnect**: Always disconnect when done to free resources

---

## 🔄 Workflow

```
1. Connect to Database → Test Connection
2. View Available Tables (optional)
3. Write SQL Query
4. Load Data → Data appears in chat
5. Ask questions about the data
6. Disconnect when done
```

---

## 📚 Additional Resources

- **SQLAlchemy Documentation**: https://docs.sqlalchemy.org/
- **SQL Server ODBC Drivers**: https://docs.microsoft.com/sql/connect/odbc/
- **PostgreSQL Connection Strings**: https://www.postgresql.org/docs/current/libpq-connect.html
- **MySQL Connection Guide**: https://dev.mysql.com/doc/connector-python/

---

## ⚠️ Important Notes

- **Data is loaded into memory** - Large datasets may consume significant RAM
- **Connections are per-session** - Each user session has its own connection
- **Queries are executed directly** - Ensure queries are safe and tested
- **Production deployment** - Consider connection pooling and rate limiting
