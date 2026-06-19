/* ============================================================
   SMARTGRID MONITOR — main.js
   Entry point. Ties all components together.
   ============================================================ */

/* --- Shared state --- */
var totalAlarmsToday = 0;
var faultLog         = [];
var peakLoad         = 0;
var valleyLoad       = 99999;
var loadHistory      = [];
var lastReading      = null;

/* ----------------------------
   CLOCK
   ---------------------------- */
function startClock() {
  var timeEl = document.getElementById("current-time");
  if (!timeEl) { return; }

  function tick() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();
    timeEl.textContent =
      (h < 10 ? "0" + h : h) + ":" +
      (m < 10 ? "0" + m : m) + ":" +
      (s < 10 ? "0" + s : s);
  }
  tick();
  setInterval(tick, 1000);
}

/* ----------------------------
   KPI CARDS (index.html)
   ---------------------------- */
function updateKPICards(reading) {
  var freqEl    = document.getElementById("kpi-frequency");
  var freqBadge = document.getElementById("kpi-frequency-status");
  var voltEl    = document.getElementById("kpi-voltage");
  var voltBadge = document.getElementById("kpi-voltage-status");
  var faultEl   = document.getElementById("kpi-faults");
  var faultBadge= document.getElementById("kpi-faults-status");
  var loadEl    = document.getElementById("kpi-load");
  var loadBadge = document.getElementById("kpi-load-status");

  if (freqEl) { freqEl.textContent = reading.frequency + " Hz"; }
  if (freqBadge) {
    if (reading.frequency < GRID.FREQUENCY_MIN || reading.frequency > GRID.FREQUENCY_MAX) {
      freqBadge.textContent = "FAULT";    freqBadge.className = "badge badge--red";
    } else if (reading.frequency < GRID.FREQUENCY_MIN + 0.2 || reading.frequency > GRID.FREQUENCY_MAX - 0.2) {
      freqBadge.textContent = "Warning";  freqBadge.className = "badge badge--yellow";
    } else {
      freqBadge.textContent = "Normal";   freqBadge.className = "badge badge--green";
    }
  }

  if (voltEl) { voltEl.textContent = reading.avgVoltage + " V"; }
  if (voltBadge) {
    if (reading.avgVoltage < GRID.VOLTAGE_MIN || reading.avgVoltage > GRID.VOLTAGE_MAX) {
      voltBadge.textContent = "FAULT";    voltBadge.className = "badge badge--red";
    } else if (reading.avgVoltage < GRID.VOLTAGE_MIN + 8 || reading.avgVoltage > GRID.VOLTAGE_MAX - 8) {
      voltBadge.textContent = "Warning";  voltBadge.className = "badge badge--yellow";
    } else {
      voltBadge.textContent = "Nominal";  voltBadge.className = "badge badge--blue";
    }
  }

  if (faultEl) { faultEl.textContent = reading.activeFaults; }
  if (faultBadge) {
    if (reading.activeFaults === 0)      { faultBadge.textContent = "Monitoring"; faultBadge.className = "badge badge--green"; }
    else if (reading.activeFaults === 1) { faultBadge.textContent = "1 Fault";    faultBadge.className = "badge badge--yellow"; }
    else                                 { faultBadge.textContent = reading.activeFaults + " Faults"; faultBadge.className = "badge badge--red"; }
  }

  if (loadEl) { loadEl.textContent = reading.totalLoad + " MW"; }
  if (loadBadge) {
    if (reading.totalLoad > 1100)      { loadBadge.textContent = "High Demand"; loadBadge.className = "badge badge--red"; }
    else if (reading.totalLoad > 950)  { loadBadge.textContent = "Elevated";    loadBadge.className = "badge badge--yellow"; }
    else                               { loadBadge.textContent = "Normal";      loadBadge.className = "badge badge--blue"; }
  }
}

/* ----------------------------
   SUBSTATION LIST (index.html)
   ---------------------------- */
function updateSubstationList(substations) {
  var listEl = document.getElementById("substation-list");
  if (!listEl) { return; }

  var html = "";
  for (var i = 0; i < substations.length; i++) {
    var sub = substations[i];
    var cardClass   = "substation-card substation-card--" + sub.status;
    var statusLabel = sub.status === "healthy" ? "● Healthy" : sub.status === "warning" ? "⚠ Warning" : "✕ Fault";
    html +=
      '<div class="' + cardClass + '">' +
        '<div class="substation-card__info">' +
          '<span class="substation-card__name">' + sub.name + '</span>' +
          '<span class="substation-card__location">' + sub.location + ' — ' + sub.voltage + ' V</span>' +
        '</div>' +
        '<span class="substation-card__status">' + statusLabel + '</span>' +
      '</div>';
  }
  listEl.innerHTML = html;
}

/* ----------------------------
   FAULT PAGE (faults.html)
   ---------------------------- */
function updateFaultPage(reading) {
  var faultCountEl   = document.getElementById("fault-count");
  var warnCountEl    = document.getElementById("warning-count");
  var healthyCountEl = document.getElementById("healthy-count");
  var totalEl        = document.getElementById("total-alarms-count");
  var tbody          = document.getElementById("fault-tbody");

  if (!tbody) { return; }

  var faults   = reading.substations.filter(function(s){ return s.status === "fault";   }).length;
  var warnings = reading.substations.filter(function(s){ return s.status === "warning"; }).length;
  var healthy  = reading.substations.filter(function(s){ return s.status === "healthy"; }).length;

  if (faultCountEl)   { faultCountEl.textContent   = faults;   }
  if (warnCountEl)    { warnCountEl.textContent     = warnings; }
  if (healthyCountEl) { healthyCountEl.textContent  = healthy;  }

  if (reading.alerts && reading.alerts.length > 0) {
    for (var i = 0; i < reading.alerts.length; i++) {
      faultLog.unshift(reading.alerts[i]);
      totalAlarmsToday++;
    }
    if (faultLog.length > 50) { faultLog = faultLog.slice(0, 50); }
  }

  if (totalEl) { totalEl.textContent = totalAlarmsToday; }

  if (faultLog.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">No faults detected — grid is healthy</td></tr>';
    return;
  }

  tbody.innerHTML = faultLog.map(function(alarm) {
    var badgeClass = alarm.severity === "critical" ? "badge--red" : "badge--yellow";
    var t = alarm.time;
    var timeStr = (t.getHours()<10?"0"+t.getHours():t.getHours()) + ":" +
                  (t.getMinutes()<10?"0"+t.getMinutes():t.getMinutes()) + ":" +
                  (t.getSeconds()<10?"0"+t.getSeconds():t.getSeconds());
    return "<tr><td>" + timeStr + "</td>" +
      '<td><span class="badge ' + badgeClass + '">' + alarm.severity.toUpperCase() + "</span></td>" +
      "<td>" + alarm.icon + " " + alarm.title + "</td>" +
      "<td>" + alarm.detail + "</td>" +
      '<td><span class="badge badge--blue">Logged</span></td></tr>';
  }).join("");
}

function clearFaultLog() {
  faultLog = [];
  totalAlarmsToday = 0;
  var tbody = document.getElementById("fault-tbody");
  if (tbody) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Log cleared</td></tr>'; }
  var totalEl = document.getElementById("total-alarms-count");
  if (totalEl) { totalEl.textContent = "0"; }
}

/* ----------------------------
   ANALYTICS PAGE (analytics.html)
   ---------------------------- */
function updateAnalyticsPage(reading) {
  var currentEl = document.getElementById("analytics-current-load");
  var peakEl    = document.getElementById("analytics-peak");
  var valleyEl  = document.getElementById("analytics-valley");
  var avgEl     = document.getElementById("analytics-avg");

  if (!currentEl) { return; }

  if (reading.totalLoad > peakLoad)   { peakLoad   = reading.totalLoad; }
  if (reading.totalLoad < valleyLoad) { valleyLoad = reading.totalLoad; }

  loadHistory.push(reading.totalLoad);
  if (loadHistory.length > 3600) { loadHistory = loadHistory.slice(-3600); }

  var sum = loadHistory.reduce(function(a, b) { return a + b; }, 0);
  var avg = parseFloat((sum / loadHistory.length).toFixed(1));

  currentEl.textContent = reading.totalLoad + " MW";
  if (peakEl)   { peakEl.textContent   = peakLoad   + " MW"; }
  if (valleyEl) { valleyEl.textContent = valleyLoad  + " MW"; }
  if (avgEl)    { avgEl.textContent    = avg         + " MW"; }

  updateSubstationBarChart(reading.substations);
}

/* ----------------------------
   POWER QUALITY PAGE (quality.html)
   ---------------------------- */
function updateQualityPage(reading) {
  var pfEl   = document.getElementById("pq-pf");
  var thdEl  = document.getElementById("pq-thd");
  var vdevEl = document.getElementById("pq-vdev");
  var freqEl = document.getElementById("pq-freq");

  if (!pfEl) { return; }

  var thd  = parseFloat((5.5 - reading.powerFactor * 4).toFixed(2));
  if (thd < 0.1) { thd = 0.1; }
  var vdev = parseFloat((((reading.avgVoltage - GRID.VOLTAGE_NOMINAL) / GRID.VOLTAGE_NOMINAL) * 100).toFixed(2));

  pfEl.textContent   = reading.powerFactor;
  thdEl.textContent  = thd  + " %";
  vdevEl.textContent = vdev + " %";
  freqEl.textContent = reading.frequency + " Hz";

  var pfBadge   = document.getElementById("pq-pf-badge");
  var thdBadge  = document.getElementById("pq-thd-badge");
  var vdevBadge = document.getElementById("pq-vdev-badge");
  var freqBadge = document.getElementById("pq-freq-badge");

  if (pfBadge) {
    pfBadge.textContent = reading.powerFactor >= 0.90 ? "Good" : reading.powerFactor >= 0.85 ? "Fair" : "Poor";
    pfBadge.className   = reading.powerFactor >= 0.90 ? "badge badge--green" : reading.powerFactor >= 0.85 ? "badge badge--yellow" : "badge badge--red";
  }
  if (thdBadge) {
    thdBadge.textContent = thd < 5 ? "Acceptable" : "High THD";
    thdBadge.className   = thd < 5 ? "badge badge--green" : "badge badge--red";
  }
  if (vdevBadge) {
    var av = Math.abs(vdev);
    vdevBadge.textContent = av < 5 ? "Within Limit" : "Out of Limit";
    vdevBadge.className   = av < 5 ? "badge badge--green" : "badge badge--red";
  }
  if (freqBadge) {
    freqBadge.textContent = Math.abs(reading.frequency - 50) < 0.3 ? "Stable" : "Unstable";
    freqBadge.className   = Math.abs(reading.frequency - 50) < 0.3 ? "badge badge--green" : "badge badge--red";
  }

  updatePFTrendChart(reading.powerFactor);
  updateHarmonicChart();
}

/* ----------------------------
   REPORTS PAGE (reports.html)
   ---------------------------- */
function updateReportsPage(reading) {
  lastReading = reading;

  var tbody    = document.getElementById("report-tbody");
  var subTbody = document.getElementById("sub-summary-tbody");
  var tsEl     = document.getElementById("report-timestamp");

  if (!tbody) { return; }

  var now = reading.timestamp;
  var timeStr =
    (now.getHours()  <10?"0"+now.getHours()  :now.getHours())   + ":" +
    (now.getMinutes()<10?"0"+now.getMinutes():now.getMinutes()) + ":" +
    (now.getSeconds()<10?"0"+now.getSeconds():now.getSeconds());

  if (tsEl) { tsEl.textContent = "Snapshot at " + timeStr; }

  var rows = [
    ["Grid Frequency",  reading.frequency,   "Hz", reading.frequency >= GRID.FREQUENCY_MIN && reading.frequency <= GRID.FREQUENCY_MAX ? "Normal" : "FAULT"],
    ["Average Voltage", reading.avgVoltage,  "V",  reading.avgVoltage >= GRID.VOLTAGE_MIN  && reading.avgVoltage <= GRID.VOLTAGE_MAX  ? "Nominal": "FAULT"],
    ["Total Load",      reading.totalLoad,   "MW", reading.totalLoad > 1100 ? "High" : "Normal"],
    ["Power Factor",    reading.powerFactor, "",   reading.powerFactor >= 0.90 ? "Good" : "Poor"],
    ["Active Faults",   reading.activeFaults,"",   reading.activeFaults === 0 ? "None" : "Active"],
  ];

  tbody.innerHTML = rows.map(function(r) {
    var ok    = r[3] === "Normal" || r[3] === "Nominal" || r[3] === "Good" || r[3] === "None";
    var color = ok ? "var(--accent-green)" : "var(--accent-red)";
    return "<tr><td>" + r[0] + "</td><td><strong>" + r[1] + "</strong></td><td>" + r[2] + "</td>" +
      '<td style="color:' + color + ';font-weight:600;">' + r[3] + "</td></tr>";
  }).join("");

  if (subTbody) {
    subTbody.innerHTML = reading.substations.map(function(sub) {
      var color = sub.status === "healthy" ? "var(--accent-green)" : sub.status === "warning" ? "var(--accent-yellow)" : "var(--accent-red)";
      var label = sub.status === "healthy" ? "● Healthy" : sub.status === "warning" ? "⚠ Warning" : "✕ Fault";
      return "<tr><td>" + sub.name + "</td><td>" + sub.location + "</td><td>" + sub.voltage + "</td>" +
        "<td>" + sub.current + "</td><td>" + sub.activePower + "</td>" +
        '<td style="color:' + color + ';font-weight:600;">' + label + "</td></tr>";
    }).join("");
  }
}

function exportCSV() {
  if (!lastReading) { alert("No data yet — wait 1 second."); return; }
  var r   = lastReading;
  var now = r.timestamp;

  var lines = [
    "SmartGrid Monitor Export",
    "Generated: " + now.toLocaleDateString() + " " + now.toLocaleTimeString(),
    "",
    "GRID PARAMETERS",
    "Parameter,Value,Unit",
    "Frequency,"    + r.frequency    + ",Hz",
    "Avg Voltage,"  + r.avgVoltage   + ",V",
    "Total Load,"   + r.totalLoad    + ",MW",
    "Power Factor," + r.powerFactor  + ",",
    "Active Faults,"+ r.activeFaults + ",",
    "",
    "SUBSTATION DATA",
    "Name,Location,Voltage(V),Current(A),Power(kW),Status",
  ];

  r.substations.forEach(function(sub) {
    lines.push(sub.name + "," + sub.location + "," + sub.voltage + "," + sub.current + "," + sub.activePower + "," + sub.status);
  });

  var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement("a");
  a.href     = url;
  a.download = "smartgrid-report-" + now.getFullYear() + "-" + (now.getMonth()+1) + "-" + now.getDate() + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printReport() { window.print(); }

/* ----------------------------
   MAIN UPDATE LOOP
   ---------------------------- */
function runUpdate() {
  var reading = generateGridReading();
  updateKPICards(reading);
  updateSubstationList(reading.substations);
  updateLoadChart(reading.totalLoad);
  updateAlarms(reading.alerts);
  updateGauges(reading);
  updateFaultPage(reading);
  updateAnalyticsPage(reading);
  updateQualityPage(reading);
  updateReportsPage(reading);
}

/* ----------------------------
   BOOT
   ---------------------------- */
function boot() {
  startClock();
  initLoadChart();
  initSubstationBarChart();
  initPFTrendChart();
  initHarmonicChart();
  runUpdate();
  setInterval(runUpdate, 1000);
}

document.addEventListener("DOMContentLoaded", boot);