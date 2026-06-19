/* ============================================================
   SMARTGRID MONITOR — gauge.js
   Draws semicircular arc gauges on canvas elements.
   ============================================================ */

/* ----------------------------
   HOW A CANVAS GAUGE WORKS:
   We draw two arcs on top of each other.
   Arc 1 (background): grey, full semicircle
   Arc 2 (foreground): colored, length = value percentage
   The text in the center is an HTML element positioned
   over the canvas with CSS.
   ---------------------------- */

/* ----------------------------
   drawGauge()
   Draws one gauge on a canvas element.

   Parameters:
     canvasId  — the id of the canvas element (string)
     value     — current value (number)
     min       — minimum of the scale (number)
     max       — maximum of the scale (number)
     color     — color of the filled arc (CSS color string)
   ---------------------------- */
function drawGauge(canvasId, value, min, max, color) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) { return; }

  var ctx = canvas.getContext("2d");
  var w = canvas.width;
  var h = canvas.height;

  // Clear previous drawing
  ctx.clearRect(0, 0, w, h);

  var cx = w / 2;        // center x
  var cy = h - 10;       // center y (near bottom for semicircle)
  var radius = h - 20;   // radius of the arc

  // Convert value to angle
  // Semicircle goes from Math.PI (left) to 0 (right)
  // We map the value range to this angle range
  var startAngle = Math.PI;
  var endAngle   = 0;
  var range      = max - min;
  var pct        = Math.min(Math.max((value - min) / range, 0), 1);
  var fillAngle  = Math.PI + pct * Math.PI; // goes from PI to 2*PI

  // Draw background arc (grey)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();

  // Draw foreground arc (colored, represents value)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, fillAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();

  // Draw min label
  ctx.font = "10px Segoe UI, sans-serif";
  ctx.fillStyle = "#8b949e";
  ctx.textAlign = "left";
  ctx.fillText(min, cx - radius - 4, cy + 14);

  // Draw max label
  ctx.textAlign = "right";
  ctx.fillText(max, cx + radius + 4, cy + 14);
}

/* ----------------------------
   updateGauges()
   Called every second with the latest reading.
   Redraws all 4 gauges and updates their text values.

   Parameter:
     reading — object from generateGridReading()
   ---------------------------- */
function updateGauges(reading) {

  // Frequency gauge — range 49 to 51 Hz
  drawGauge("gauge-frequency", reading.frequency, 49, 51, "#3fb950");
  var freqValEl = document.getElementById("gauge-freq-value");
  if (freqValEl) { freqValEl.textContent = reading.frequency + " Hz"; }
  var freqBadge = document.getElementById("gauge-freq-badge");
  if (freqBadge) {
    if (reading.frequency < GRID.FREQUENCY_MIN || reading.frequency > GRID.FREQUENCY_MAX) {
      freqBadge.textContent = "FAULT";
      freqBadge.className = "badge badge--red";
    } else {
      freqBadge.textContent = "Normal";
      freqBadge.className = "badge badge--green";
    }
  }

  // Power factor gauge — range 0.7 to 1.0
  drawGauge("gauge-pf", reading.powerFactor, 0.7, 1.0, "#58a6ff");
  var pfValEl = document.getElementById("gauge-pf-value");
  if (pfValEl) { pfValEl.textContent = reading.powerFactor; }
  var pfBadge = document.getElementById("gauge-pf-badge");
  if (pfBadge) {
    if (reading.powerFactor < GRID.POWER_FACTOR_MIN) {
      pfBadge.textContent = "Poor";
      pfBadge.className = "badge badge--red";
    } else if (reading.powerFactor < 0.90) {
      pfBadge.textContent = "Fair";
      pfBadge.className = "badge badge--yellow";
    } else {
      pfBadge.textContent = "Good";
      pfBadge.className = "badge badge--blue";
    }
  }

  // Load gauge — range 400 to 1400 MW
  drawGauge("gauge-load", reading.totalLoad, 400, 1400, "#d29922");
  var loadValEl = document.getElementById("gauge-load-value");
  if (loadValEl) { loadValEl.textContent = reading.totalLoad + " MW"; }
  var loadBadge = document.getElementById("gauge-load-badge");
  if (loadBadge) {
    if (reading.totalLoad > 1100) {
      loadBadge.textContent = "High";
      loadBadge.className = "badge badge--red";
    } else {
      loadBadge.textContent = "Normal";
      loadBadge.className = "badge badge--yellow";
    }
  }

  // Voltage gauge — range 200 to 260 V
  drawGauge("gauge-voltage", reading.avgVoltage, 200, 260, "#58a6ff");
  var voltValEl = document.getElementById("gauge-volt-value");
  if (voltValEl) { voltValEl.textContent = reading.avgVoltage + " V"; }
  var voltBadge = document.getElementById("gauge-volt-badge");
  if (voltBadge) {
    if (reading.avgVoltage < GRID.VOLTAGE_MIN || reading.avgVoltage > GRID.VOLTAGE_MAX) {
      voltBadge.textContent = "FAULT";
      voltBadge.className = "badge badge--red";
    } else {
      voltBadge.textContent = "Nominal";
      voltBadge.className = "badge badge--blue";
    }
  }

  // Per-substation detail cards
  reading.substations.forEach(function (sub) {
    var voltEl   = document.getElementById("sub-volt-"   + sub.id);
    var currEl   = document.getElementById("sub-curr-"   + sub.id);
    var powerEl  = document.getElementById("sub-power-"  + sub.id);
    var statusEl = document.getElementById("sub-status-" + sub.id);
    var badgeEl  = document.getElementById("sub-badge-"  + sub.id);

    if (voltEl)   { voltEl.textContent   = sub.voltage + " V"; }
    if (currEl)   { currEl.textContent   = sub.current + " A"; }
    if (powerEl)  { powerEl.textContent  = sub.activePower + " kW"; }

    if (statusEl) {
      if (sub.status === "healthy") { statusEl.textContent = "✓ Healthy"; statusEl.style.color = "#3fb950"; }
      if (sub.status === "warning") { statusEl.textContent = "⚠ Warning"; statusEl.style.color = "#d29922"; }
      if (sub.status === "fault")   { statusEl.textContent = "✕ Fault";   statusEl.style.color = "#f85149"; }
    }

    if (badgeEl) {
      if (sub.status === "healthy") { badgeEl.textContent = "Healthy"; badgeEl.className = "badge badge--green"; }
      if (sub.status === "warning") { badgeEl.textContent = "Warning"; badgeEl.className = "badge badge--yellow"; }
      if (sub.status === "fault")   { badgeEl.textContent = "Fault";   badgeEl.className = "badge badge--red"; }
    }
  });
}