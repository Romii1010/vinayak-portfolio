const DATA_PATH = "../powerbi_exports/powerbi_flights_cleaned.csv";
Chart.register(ChartDataLabels);

const el = {
  year: document.getElementById("yearFilter"),
  airline: document.getElementById("airlineFilter"),
  stops: document.getElementById("stopsFilter"),
  reset: document.getElementById("resetBtn"),
  subtitle: document.getElementById("subtitle"),
  insights: document.getElementById("insightsList"),
  kpiAirlines: document.getElementById("kpiAirlines"),
  kpiFlights: document.getElementById("kpiFlights"),
  kpiAvg: document.getElementById("kpiAvg"),
  kpiRevenue: document.getElementById("kpiRevenue"),
  kpiMax: document.getElementById("kpiMax"),
  routeBody: document.getElementById("routeBody")
};

const state = { raw: [], filtered: [], charts: {} };
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const INT = new Intl.NumberFormat("en-IN");

const chartColors = ["#17c0ff", "#ffb703", "#2bd67b", "#ff5d8f", "#8a7dff", "#00d2d3", "#feca57", "#ff6b6b", "#54a0ff", "#5f27cd"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function unique(values) {
  return [...new Set(values)].filter((v) => String(v).trim() !== "");
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}

function inrCompact(v) {
  const n = num(v);
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(2)}k`;
  return `₹${Math.round(n)}`;
}

function setSelect(select, values) {
  select.innerHTML = "<option>All</option>";
  values.forEach((v) => {
    const op = document.createElement("option");
    op.value = String(v);
    op.textContent = String(v);
    select.appendChild(op);
  });
}

function groupBy(rows, keyFn, valFn) {
  const map = new Map();
  rows.forEach((r) => {
    const key = keyFn(r);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(valFn ? valFn(r) : r);
  });
  return map;
}

function destroyChart(id) {
  if (state.charts[id]) state.charts[id].destroy();
}

function baseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: "#bcd0f0" }, grid: { color: "#1d2b42" } },
      y: {
        ticks: {
          color: "#bcd0f0",
          callback: (value) => {
            const n = Number(value);
            if (!Number.isFinite(n)) return value;
            return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
          }
        },
        grid: { color: "#1d2b42" }
      }
    },
    plugins: {
      legend: { labels: { color: "#d8e6ff" } },
      tooltip: { backgroundColor: "#0b1322", titleColor: "#fff", bodyColor: "#d8e6ff" }
    }
  };
}

function chart(id, type, labels, data, options = {}, datasetOverrides = {}) {
  destroyChart(id);
  const opts = Object.assign(baseOptions(), options);
  state.charts[id] = new Chart(document.getElementById(id), {
    type,
    data: {
      labels,
      datasets: [{
        data,
        borderColor: "#17c0ff",
        backgroundColor: chartColors,
        fill: type === "line",
        tension: 0.35,
        pointRadius: 2.8,
        ...datasetOverrides
      }]
    },
    options: opts
  });
}

function renderInsights(rows, airlineTop, monthData, routes) {
  if (!rows.length) {
    el.insights.innerHTML = "<li>No data available for selected filters.</li>";
    return;
  }

  const topAirline = airlineTop[0] ? `${airlineTop[0].key} (${INR.format(airlineTop[0].value)})` : "N/A";
  const maxMonth = monthData.length ? monthData.reduce((a, b) => (a.value > b.value ? a : b)) : null;
  const topRoute = routes[0] ? `${routes[0].route} (${INT.format(routes[0].flights)} flights)` : "N/A";

  const stopsMap = groupBy(rows, (r) => String(r.stops_num));
  const stopDominant = [...stopsMap.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const stopInsight = stopDominant ? `${stopDominant[0]} stop(s) dominate with ${INT.format(stopDominant[1].length)} flights.` : "N/A";

  el.insights.innerHTML = `
    <li><strong>Top priced airline:</strong> ${topAirline}</li>
    <li><strong>Highest fare month:</strong> ${maxMonth ? `Month ${maxMonth.month} (${INR.format(maxMonth.value)})` : "N/A"}</li>
    <li><strong>Busiest route:</strong> ${topRoute}</li>
    <li><strong>Stops pattern:</strong> ${stopInsight}</li>
  `;
}

function render() {
  const y = el.year.value;
  const a = el.airline.value;
  const s = el.stops.value;

  state.filtered = state.raw.filter((r) =>
    (y === "All" || String(r.journey_year) === y) &&
    (a === "All" || String(r.airline) === a) &&
    (s === "All" || String(r.stops_num) === s)
  );

  const rows = state.filtered;
  const prices = rows.map((r) => num(r.price));
  const airlines = unique(rows.map((r) => r.airline));

  el.kpiAirlines.textContent = INT.format(airlines.length);
  el.kpiFlights.textContent = INT.format(rows.length);
  el.kpiAvg.textContent = INR.format(avg(prices));
  el.kpiRevenue.textContent = INR.format(prices.reduce((x, yv) => x + yv, 0));
  el.kpiMax.textContent = INR.format(prices.length ? Math.max(...prices) : 0);

  const airlineMap = groupBy(rows, (r) => r.airline, (r) => num(r.price));
  const airlineTop = [...airlineMap.entries()]
    .map(([k, vals]) => ({ key: k, value: avg(vals) }))
    .sort((p, q) => q.value - p.value)
    .slice(0, 10);

  chart(
    "airlineBar",
    "bar",
    airlineTop.map((x) => x.key),
    airlineTop.map((x) => x.value),
    {
      indexAxis: "y",
      layout: { padding: { right: 28 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: "#ffffff",
          anchor: "end",
          align: "right",
          offset: 2,
          clip: false,
          clamp: true,
          formatter: (v) => inrCompact(v),
          font: { size: 10, weight: "700" },
          backgroundColor: "rgba(8,16,30,0.88)",
          borderRadius: 4,
          padding: { top: 2, bottom: 2, left: 4, right: 4 }
        }
      }
    },
    { backgroundColor: "#17c0ff" }
  );

  const monthMap = groupBy(rows, (r) => Number(r.journey_month), (r) => num(r.price));
  const months = [...monthMap.keys()].sort((m1, m2) => m1 - m2);
  const monthData = months.map((m) => ({ month: m, value: avg(monthMap.get(m)) }));

  chart(
    "monthLine",
    "line",
    monthData.map((m) => monthNames[Math.max(0, Math.min(11, Number(m.month) - 1))] || String(m.month)),
    monthData.map((m) => m.value),
    {
      plugins: { legend: { display: true }, datalabels: { display: false } },
      scales: {
        x: { ticks: { color: "#bcd0f0", maxRotation: 0 }, grid: { color: "#1d2b42" } },
        y: { ticks: { color: "#bcd0f0" }, grid: { color: "#1d2b42" } }
      }
    },
    { label: "Avg Price", borderColor: "#ffb703", backgroundColor: "rgba(255,183,3,0.18)", pointBackgroundColor: "#ffb703" }
  );

  const stopsMap = groupBy(rows, (r) => String(r.stops_num));
  const stopKeys = [...stopsMap.keys()].sort((p, q) => Number(p) - Number(q));
  const stopValues = stopKeys.map((k) => stopsMap.get(k).length);
  const totalStops = stopValues.reduce((p, q) => p + q, 0) || 1;

  chart(
    "stopsDonut",
    "doughnut",
    stopKeys.map((k) => `${k} stop(s)`),
    stopValues,
    {
      cutout: "48%",
      scales: undefined,
      plugins: {
        legend: {
          display: true,
          position: "right",
          labels: {
            color: "#f4f8ff",
            boxWidth: 14,
            generateLabels: (chartObj) => {
              const labels = chartObj.data.labels || [];
              const data = chartObj.data.datasets[0].data || [];
              const total = data.reduce((a, b) => a + b, 0) || 1;
              return labels.map((label, i) => ({
                text: `${label} (${INT.format(data[i])}, ${Math.round((data[i] / total) * 100)}%)`,
                fillStyle: chartObj.data.datasets[0].backgroundColor[i],
                strokeStyle: chartObj.data.datasets[0].backgroundColor[i],
                lineWidth: 0,
                fontColor: "#f4f8ff",
                textColor: "#f4f8ff",
                hidden: false,
                index: i
              }));
            }
          }
        },
        datalabels: {
          color: "#ffffff",
          font: { weight: "700", size: 11 },
          formatter: (v) => `${INT.format(v)} | ${Math.round((v / totalStops) * 100)}%`
        }
      }
    }
  );

  const weekMap = groupBy(rows, (r) => String(r.journey_weekday || "Unknown"), (r) => num(r.price));
  const weekOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Unknown"];
  const weekKeys = weekOrder.filter((d) => weekMap.has(d));

  chart(
    "weekdayBar",
    "bar",
    weekKeys,
    weekKeys.map((k) => avg(weekMap.get(k))),
    {
      plugins: {
        legend: { display: false },
        datalabels: {
          display: false
        }
      },
      scales: {
        x: { ticks: { color: "#bcd0f0", maxRotation: 0, autoSkip: false }, grid: { color: "#1d2b42" } },
        y: { ticks: { color: "#bcd0f0" }, grid: { color: "#1d2b42" } }
      }
    },
    { backgroundColor: "#8a7dff" }
  );

  const timeMap = groupBy(rows, (r) => String(r.dep_time_block || "Unknown"), (r) => num(r.price));
  const timeKeys = [...timeMap.keys()];

  chart(
    "timeBlockBar",
    "bar",
    timeKeys,
    timeKeys.map((k) => avg(timeMap.get(k))),
    {
      layout: { padding: { top: 18 } },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: "#ffffff",
          anchor: "end",
          align: "end",
          offset: 2,
          clip: false,
          clamp: true,
          formatter: (v) => inrCompact(v),
          font: { size: 10, weight: "700" },
          backgroundColor: "rgba(8,16,30,0.88)",
          borderRadius: 4,
          padding: { top: 2, bottom: 2, left: 4, right: 4 }
        }
      }
    },
    { backgroundColor: "#2bd67b" }
  );

  const routeMap = new Map();
  rows.forEach((r) => {
    const key = `${r.source} -> ${r.destination}`;
    if (!routeMap.has(key)) routeMap.set(key, { flights: 0, total: 0 });
    const rec = routeMap.get(key);
    rec.flights += 1;
    rec.total += num(r.price);
  });

  const routes = [...routeMap.entries()]
    .map(([route, v]) => ({ route, flights: v.flights, avg: v.total / v.flights }))
    .sort((p, q) => q.flights - p.flights)
    .slice(0, 10);

  el.routeBody.innerHTML = routes
    .map((r) => `<tr><td>${r.route}</td><td>${INT.format(r.flights)}</td><td>${INR.format(r.avg)}</td></tr>`)
    .join("");

  renderInsights(rows, airlineTop, monthData, routes);
  el.subtitle.textContent = `Flight Pricing Dashboard | Year: ${y} | Airline: ${a} | Stops: ${s}`;
}

function wireEvents() {
  [el.year, el.airline, el.stops].forEach((x) => x.addEventListener("change", render));
  el.reset.addEventListener("click", () => {
    el.year.value = "All";
    el.airline.value = "All";
    el.stops.value = "All";
    render();
  });
}

Papa.parse(DATA_PATH, {
  download: true,
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  complete: (res) => {
    state.raw = res.data;
    setSelect(el.year, unique(state.raw.map((r) => r.journey_year)).sort());
    setSelect(el.airline, unique(state.raw.map((r) => r.airline)).sort());
    setSelect(el.stops, unique(state.raw.map((r) => r.stops_num)).sort((a, b) => Number(a) - Number(b)));
    wireEvents();
    render();
  },
  error: () => {
    document.body.innerHTML = '<div style="padding:18px;font-family:Inter;color:#fff;background:#0b1020">Data load failed. Run: <code>python -m http.server 8000</code> from project root, then open <code>http://localhost:8000/dashboard/</code>.</div>';
  }
});

