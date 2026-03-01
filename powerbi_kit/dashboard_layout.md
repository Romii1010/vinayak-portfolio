# Power BI Dashboard Blueprint (Portfolio Grade)

## Data Import
Load from `powerbi_exports`:
- powerbi_flights_cleaned.csv
- powerbi_kpi.csv
- powerbi_airline_summary.csv
- powerbi_route_summary.csv
- powerbi_monthly_summary.csv

Apply theme:
- View -> Themes -> Browse for themes -> `flight_portfolio_theme.json`

## Page 1: Executive Overview
- Cards: Total Flights, Avg Price, Median Price, Max Price
- Line chart: journey_month vs Avg Price
- Bar chart: airline vs Avg Price (Top 10)
- Donut chart: dep_time_block vs Total Flights
- Slicers: journey_year, airline, stops_num

## Page 2: Route Intelligence
- Matrix: source, destination with Total Flights and Avg Price
- Bar: source vs Total Flights
- Bar: destination vs Avg Price
- Table: source, destination, duration_hours, price
- Slicers: journey_month, dep_time_block, is_weekend

## Page 3: Model & Pricing Patterns
- Card: Price Index (100 = overall avg)
- Card: Weekend Premium
- Column: stops_num vs Avg Price
- Matrix heatmap: journey_weekday x journey_month with Avg Price
- Scatter: duration_hours vs price, legend airline

## Style
- Background: #F7F9FC
- Primary: #0F4C81
- Accent: #F4A300
- Title font: Segoe UI Semibold
- Keep 16-20 px spacing between visuals
