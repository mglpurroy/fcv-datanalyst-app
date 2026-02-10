# 🧪 Test Prompts for FCV Data Analyst

Use these prompts to test different features of the chatbot application.

---

## 📊 **Basic Data Exploration**

### Simple Overview
```
What is the total number of conflict events in the dataset?
```

```
Show me a summary of the data including total rows, columns, and date range
```

```
What are the main columns in this dataset?
```

---

## 📈 **Trend Analysis**

### Time Series Trends
```
Show me fatalities trends over time with a line chart
```

```
Analyze how conflict events have changed year by year from 2017 to 2024
```

```
Create a monthly breakdown of fatalities for the last 2 years
```

```
What is the trend in violence against civilians over the past 5 years?
```

---

## 🗺️ **Geographic Analysis**

### Regional Patterns
```
Show me the geographic distribution of conflict events by country
```

```
Which countries have the highest number of fatalities? Create a bar chart
```

```
Compare conflict intensity between different regions
```

```
Show me a breakdown of events by admin1 (province/state) for the top 5 countries
```

---

## 👥 **Actor Analysis**

### Conflict Actors
```
Who are the main conflict actors in the dataset? Show top 10
```

```
Analyze which actors are responsible for the most fatalities
```

```
Compare the activities of different armed groups over time
```

```
Show me actor interactions - which actors frequently clash with each other?
```

---

## 📅 **Temporal Patterns**

### Seasonal/Time Patterns
```
Are there seasonal patterns in conflict events? Show monthly trends
```

```
Which months typically see the highest violence?
```

```
Compare conflict patterns between different years
```

```
Show me fatalities by quarter for the last 3 years
```

---

## 🔥 **Hotspot Analysis**

### High-Intensity Areas
```
Identify conflict hotspots - which provinces have the most events?
```

```
Show me areas with the highest fatality rates
```

```
Which locations have experienced the most violence in 2024?
```

```
Find regions with increasing conflict trends over the last 2 years
```

---

## 📊 **Event Type Analysis**

### Violence Categories
```
Break down conflict events by type (battles, explosions, violence against civilians, etc.)
```

```
Which event types result in the most fatalities?
```

```
Show me the distribution of different sub-event types
```

```
Compare fatalities from different types of violence
```

---

## 🔍 **Comparative Analysis**

### Cross-Country/Region Comparison
```
Compare conflict patterns between Afghanistan and Nigeria
```

```
Which countries have similar conflict profiles?
```

```
Show me a comparison of fatalities per event across different countries
```

```
Compare civilian targeting rates between different regions
```

---

## 📉 **Statistical Analysis**

### Advanced Analytics
```
Calculate the average fatalities per event by country
```

```
Show me the distribution of fatalities - are most events low or high intensity?
```

```
What percentage of events result in zero fatalities?
```

```
Identify outliers - which events have unusually high fatality counts?
```

---

## 🎯 **Specific Queries**

### Targeted Questions
```
Show me all events in Afghanistan from 2023 with more than 10 fatalities
```

```
What happened in Nigeria in 2024? Show me a summary
```

```
Analyze conflict patterns in Somalia focusing on actor dynamics
```

```
Show me events involving specific actors (e.g., Taliban, Boko Haram)
```

---

## 📈 **Visualization Requests**

### Chart-Specific Requests
```
Create a stacked bar chart showing fatalities by event type and year
```

```
Make a pie chart of event distribution by country
```

```
Show me a heatmap of conflict intensity by month and country
```

```
Create a scatter plot of events vs fatalities to identify patterns
```

---

## 🔄 **Complex Multi-Part Analysis**

### Comprehensive Analysis
```
Provide a comprehensive security assessment for Afghanistan including:
- Overall trends
- Geographic hotspots
- Main actors
- Event type breakdown
- Recommendations
```

```
Analyze the evolution of conflict in Nigeria:
- How has it changed over time?
- Which regions are most affected?
- What are the main drivers?
```

```
Compare conflict dynamics between 2020 and 2024:
- What has changed?
- What has stayed the same?
- What are the implications?
```

---

## 💡 **Tips for Testing**

1. **Start Simple**: Begin with basic queries to ensure data is loaded correctly
2. **Test Visualizations**: Try different chart types (bar, line, pie, scatter)
3. **Test Narratives**: Ask analytical questions to trigger narrative generation
4. **Test SQL**: If using SQL database, test with complex queries
5. **Test Error Handling**: Try invalid queries to see error messages
6. **Test Templates**: Use the query templates feature
7. **Test Export**: Try downloading charts and exporting chat history

---

## 🎯 **Quick Test Sequence**

Run these in order to test all features:

1. `What is the total number of events?` (Basic)
2. `Show me fatalities trends over time` (Visualization)
3. `Analyze conflict hotspots` (Complex analysis + narrative)
4. `Compare conflict between top 5 countries` (Comparison)
5. `Download the chart` (Export feature)
6. `Export chat history` (Export feature)

---

## 📝 **Expected Behaviors**

✅ **Code Generation**: Every response should include Python code  
✅ **Visualizations**: Charts should appear for analytical queries  
✅ **Narratives**: 2-3 paragraph summaries for complex analyses  
✅ **Error Handling**: Clear error messages for invalid queries  
✅ **Copy/Download**: All results should be copyable/downloadable  

---

## 🐛 **What to Watch For**

- ❌ LLM returning plain text instead of code
- ❌ Charts not displaying
- ❌ Narrative too long (should be 2-3 paragraphs)
- ❌ SQL queries failing
- ❌ Export features not working
- ❌ Copy to clipboard not working

---

**Happy Testing! 🚀**
