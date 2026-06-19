/* ============================================================
   SMARTGRID MONITOR — charts.js
   Creates and updates the Load Trend chart using Chart.js
   ============================================================ */

/* ----------------------------
   1. CHART INSTANCE
   We store the chart here so we can update it later.
   A variable declared outside functions is accessible
   from any function in this file.
   ---------------------------- */
var loadChartInstance = null;

/* ----------------------------
   2. INITIALIZE LOAD CHART
   Call this once when the page first loads.
   Creates the chart with historical data.
   ---------------------------- */
function initLoadChart() {
  var canvas = document.getElementById("load-chart");

  // If the canvas element doesn't exist on this page, stop here.
  // This prevents errors when charts.js is loaded on pages
  // that don't have a load chart (like faults.html).
  if (!canvas) { return; }

  var historical = generateHistoricalLoad();

  var ctx = canvas.getContext("2d");

  loadChartInstance = new Chart(ctx, {
    type: "line",

    data: {
      labels: historical.labels,
      datasets: [
        {
          label: "Load (MW)",
          data: historical.data,

          // Line color
          borderColor: "#58a6ff",
          borderWidth: 2,

          // Fill under the line
          fill: true,
          backgroundColor: function (context) {
            var chart = context.chart;
            var ctx2 = chart.ctx;
            var chartArea = chart.chartArea;
            if (!chartArea) { return "transparent"; }

            // Gradient fill — blue at top fading to transparent
            var gradient = ctx2.createLinearGradient(
              0, chartArea.top,
              0, chartArea.bottom
            );
            gradient.addColorStop(0, "rgba(88, 166, 255, 0.3)");
            gradient.addColorStop(1, "rgba(88, 166, 255, 0.0)");
            return gradient;
          },

          // Dot on each data point
          pointRadius: 3,
          pointBackgroundColor: "#58a6ff",
          pointBorderColor: "#0d1117",
          pointBorderWidth: 2,
          pointHoverRadius: 6,

          // Smooth curved line
          tension: 0.4,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      animation: {
        duration: 400,
        easing: "easeInOutQuart",
      },

      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#21262d",
          borderColor: "#30363d",
          borderWidth: 1,
          titleColor: "#e6edf3",
          bodyColor: "#8b949e",
          padding: 10,
          callbacks: {
            label: function (context) {
              return " " + context.parsed.y + " MW";
            },
          },
        },
      },

      scales: {
        x: {
          grid: {
            color: "#21262d",
            drawBorder: false,
          },
          ticks: {
            color: "#8b949e",
            font: { size: 11 },
            maxTicksLimit: 8,
          },
        },
        y: {
          grid: {
            color: "#21262d",
            drawBorder: false,
          },
          ticks: {
            color: "#8b949e",
            font: { size: 11 },
            callback: function (value) {
              return value + " MW";
            },
          },
          min: 400,
          max: 1400,
        },
      },
    },
  });
}

/* ----------------------------
   3. UPDATE LOAD CHART
   Call this every second with the new load value.
   It removes the oldest data point and adds the new one.
   This creates a real-time scrolling effect.

   Parameters:
     newLoad  — the latest load reading in MW (a number)
   ---------------------------- */
function updateLoadChart(newLoad) {
  if (!loadChartInstance) { return; }

  var now = new Date();
  var hours = now.getHours();
  var minutes = now.getMinutes();
  var seconds = now.getSeconds();

  // Build a time label like "14:23:07"
  var hStr = hours   < 10 ? "0" + hours   : "" + hours;
  var mStr = minutes < 10 ? "0" + minutes : "" + minutes;
  var sStr = seconds < 10 ? "0" + seconds : "" + seconds;
  var timeLabel = hStr + ":" + mStr + ":" + sStr;

  // Remove the oldest label and data point (front of array)
  loadChartInstance.data.labels.shift();
  loadChartInstance.data.datasets[0].data.shift();

  // Add the new label and value (end of array)
  loadChartInstance.data.labels.push(timeLabel);
  loadChartInstance.data.datasets[0].data.push(newLoad);

  // Tell Chart.js to re-render without full reset animation
  loadChartInstance.update("none");
}
/* ----------------------------
   SUBSTATION BAR CHART
   Shows active power per substation.
   Called once on analytics page load.
   ---------------------------- */
var substationBarChart = null;

function initSubstationBarChart() {
  var canvas = document.getElementById("substation-bar-chart");
  if (!canvas) { return; }

  var ctx = canvas.getContext("2d");

  substationBarChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Substation A", "Substation B", "Substation C", "Substation D"],
      datasets: [{
        label: "Active Power (kW)",
        data: [0, 0, 0, 0],
        backgroundColor: [
          "rgba(63, 185, 80, 0.7)",
          "rgba(88, 166, 255, 0.7)",
          "rgba(210, 153, 34, 0.7)",
          "rgba(188, 140, 255, 0.7)"
        ],
        borderColor: [
          "#3fb950", "#58a6ff", "#d29922", "#bc8cff"
        ],
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#21262d",
          borderColor: "#30363d",
          borderWidth: 1,
          titleColor: "#e6edf3",
          bodyColor: "#8b949e",
          callbacks: {
            label: function(context) {
              return " " + context.parsed.y + " kW";
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: "#21262d", drawBorder: false },
          ticks: { color: "#8b949e", font: { size: 11 } }
        },
        y: {
          grid: { color: "#21262d", drawBorder: false },
          ticks: {
            color: "#8b949e",
            font: { size: 11 },
            callback: function(v) { return v + " kW"; }
          },
          min: 0
        }
      }
    }
  });
}

function updateSubstationBarChart(substations) {
  if (!substationBarChart) { return; }
  substationBarChart.data.datasets[0].data = substations.map(function(s) {
    return s.activePower;
  });
  substationBarChart.update("none");
}
/* --- Power Factor Trend Chart --- */
var pfTrendChart = null;
var pfHistory = [];
var pfLabels  = [];

function initPFTrendChart() {
  var canvas = document.getElementById("pf-trend-chart");
  if (!canvas) { return; }

  // Pre-fill 60 blank points
  for (var i = 60; i >= 0; i--) { pfHistory.push(null); pfLabels.push(""); }

  var ctx = canvas.getContext("2d");
  pfTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: pfLabels,
      datasets: [{
        label: "Power Factor",
        data: pfHistory,
        borderColor: "#58a6ff",
        borderWidth: 2,
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        spanGaps: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          min: 0.7, max: 1.0,
          grid: { color: "#21262d" },
          ticks: { color: "#8b949e", font: { size: 11 } }
        }
      }
    }
  });
}

function updatePFTrendChart(pf) {
  if (!pfTrendChart) { return; }
  pfTrendChart.data.datasets[0].data.shift();
  pfTrendChart.data.datasets[0].data.push(pf);
  pfTrendChart.update("none");
}

/* --- Harmonic Spectrum Chart --- */
var harmonicChart = null;

function initHarmonicChart() {
  var canvas = document.getElementById("harmonic-chart");
  if (!canvas) { return; }

  var ctx = canvas.getContext("2d");
  harmonicChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Fund.", "2nd", "3rd", "4th", "5th", "6th", "7th"],
      datasets: [{
        label: "Harmonic %",
        data: [100, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          "rgba(88,166,255,0.7)",
          "rgba(63,185,80,0.7)",
          "rgba(63,185,80,0.7)",
          "rgba(210,153,34,0.7)",
          "rgba(210,153,34,0.7)",
          "rgba(248,81,73,0.7)",
          "rgba(248,81,73,0.7)",
        ],
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "#21262d" }, ticks: { color: "#8b949e", font: { size: 11 } } },
        y: { grid: { color: "#21262d" }, ticks: { color: "#8b949e", font: { size: 11 } }, min: 0 }
      }
    }
  });
}

function updateHarmonicChart() {
  if (!harmonicChart) { return; }
  // Simulate harmonic values — mostly small, 5th harmonic is typically largest
  harmonicChart.data.datasets[0].data = [
    100,
    parseFloat((Math.random() * 1.5).toFixed(2)),
    parseFloat((Math.random() * 3.0).toFixed(2)),
    parseFloat((Math.random() * 0.8).toFixed(2)),
    parseFloat((Math.random() * 5.0).toFixed(2)),
    parseFloat((Math.random() * 0.5).toFixed(2)),
    parseFloat((Math.random() * 2.0).toFixed(2)),
  ];
  harmonicChart.update("none");
}