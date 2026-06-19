/* ============================================================
   SMARTGRID MONITOR — sensor-mock.js
   Simulates real-time power grid sensor readings
   ============================================================ */

/* ----------------------------
   1. GRID CONSTANTS
   ---------------------------- */
const GRID = {
  FREQUENCY_NOMINAL: 50.0,
  FREQUENCY_MIN: 49.5,
  FREQUENCY_MAX: 50.5,

  VOLTAGE_NOMINAL: 230,
  VOLTAGE_MIN: 207,
  VOLTAGE_MAX: 253,

  POWER_FACTOR_MIN: 0.85,

  LOAD_BASE: 850,
  LOAD_PEAK: 1200,
};

/* ----------------------------
   2. SUBSTATION DEFINITIONS
   ---------------------------- */
const SUBSTATIONS = [
  { id: "sub-a", name: "Substation A", location: "Andheri",  voltageBase: 231, currentBase: 420 },
  { id: "sub-b", name: "Substation B", location: "Bandra",   voltageBase: 228, currentBase: 380 },
  { id: "sub-c", name: "Substation C", location: "Kurla",    voltageBase: 225, currentBase: 450 },
  { id: "sub-d", name: "Substation D", location: "Thane",    voltageBase: 232, currentBase: 390 },
];

/* ----------------------------
   3. HELPER — Smooth Fluctuation
   Adds a small random delta to a base value.
   base    = center value (e.g. 230)
   spread  = max deviation (e.g. 8 means range 222–238)
   decimals= decimal places in result
   ---------------------------- */
function fluctuate(base, spread, decimals) {
  if (decimals === undefined) { decimals = 2; }
  var delta = Math.random() * spread * 2 - spread;
  return parseFloat((base + delta).toFixed(decimals));
}

/* ----------------------------
   4. HELPER — Load Multiplier by Hour
   Simulates realistic daily demand curve.
   ---------------------------- */
function getLoadMultiplier() {
  var hour = new Date().getHours();
  if (hour >= 0  && hour < 5)  { return fluctuate(0.60, 0.05, 2); }
  if (hour >= 5  && hour < 9)  { return fluctuate(0.72, 0.06, 2); }
  if (hour >= 9  && hour < 18) { return fluctuate(0.88, 0.07, 2); }
  if (hour >= 18 && hour < 22) { return fluctuate(0.97, 0.04, 2); }
  return fluctuate(0.65, 0.05, 2);
}

/* ----------------------------
   5. ALERT GENERATOR
   Checks readings against thresholds.
   Returns array of alert objects.
   ---------------------------- */
function generateAlerts(frequency, avgVoltage, powerFactor, substations) {
  var alerts = [];
  var now = new Date();

  // Frequency — under
  if (frequency < GRID.FREQUENCY_MIN) {
    alerts.push({
      id: "freq-low-" + Date.now(),
      severity: "critical",
      icon: "⚡",
      title: "Under-Frequency Detected",
      detail: "Frequency dropped to " + frequency + " Hz (min: " + GRID.FREQUENCY_MIN + " Hz)",
      time: now,
    });
  }

  // Frequency — over
  if (frequency > GRID.FREQUENCY_MAX) {
    alerts.push({
      id: "freq-high-" + Date.now(),
      severity: "warning",
      icon: "⚡",
      title: "Over-Frequency Detected",
      detail: "Frequency rose to " + frequency + " Hz (max: " + GRID.FREQUENCY_MAX + " Hz)",
      time: now,
    });
  }

  // Voltage — under
  if (avgVoltage < GRID.VOLTAGE_MIN) {
    alerts.push({
      id: "volt-low-" + Date.now(),
      severity: "critical",
      icon: "🔋",
      title: "Under-Voltage Alarm",
      detail: "Avg voltage dropped to " + avgVoltage + " V (min: " + GRID.VOLTAGE_MIN + " V)",
      time: now,
    });
  }

  // Voltage — over
  if (avgVoltage > GRID.VOLTAGE_MAX) {
    alerts.push({
      id: "volt-high-" + Date.now(),
      severity: "critical",
      icon: "🔋",
      title: "Over-Voltage Alarm",
      detail: "Avg voltage rose to " + avgVoltage + " V (max: " + GRID.VOLTAGE_MAX + " V)",
      time: now,
    });
  }

  // Power factor
  if (powerFactor < GRID.POWER_FACTOR_MIN) {
    alerts.push({
      id: "pf-low-" + Date.now(),
      severity: "warning",
      icon: "📉",
      title: "Poor Power Factor",
      detail: "Power factor at " + powerFactor + " (min recommended: " + GRID.POWER_FACTOR_MIN + ")",
      time: now,
    });
  }

  // Per-substation faults
  substations.forEach(function (sub) {
    if (sub.status === "fault") {
      alerts.push({
        id: "sub-fault-" + sub.id + "-" + Date.now(),
        severity: "critical",
        icon: "🏭",
        title: "Substation Fault — " + sub.name,
        detail: sub.name + " (" + sub.location + ") voltage at " + sub.voltage + " V — outside safe limits",
        time: now,
      });
    }
    if (sub.status === "warning") {
      alerts.push({
        id: "sub-warn-" + sub.id + "-" + Date.now(),
        severity: "warning",
        icon: "⚠️",
        title: "Substation Warning — " + sub.name,
        detail: sub.name + " (" + sub.location + ") voltage at " + sub.voltage + " V — approaching limit",
        time: now,
      });
    }
  });

  return alerts;
}

/* ----------------------------
   6. MAIN FUNCTION — generateGridReading()
   Call this every second.
   Returns one complete snapshot of all grid parameters.
   ---------------------------- */
function generateGridReading() {
  var multiplier = getLoadMultiplier();

  // Frequency dips slightly under high load (realistic)
  var frequencyBase = GRID.FREQUENCY_NOMINAL - (multiplier - 0.85) * 0.3;
  var frequency = fluctuate(frequencyBase, 0.08, 2);

  // Total load in MW
  var totalLoad = parseFloat(
    (GRID.LOAD_BASE + (GRID.LOAD_PEAK - GRID.LOAD_BASE) * (multiplier - 0.5)).toFixed(1)
  );

  // Power factor — worse under higher load
  var powerFactor = fluctuate(0.94 - (multiplier - 0.85) * 0.1, 0.02, 3);

  // Per-substation readings
  var substationReadings = SUBSTATIONS.map(function (sub) {
    var voltage = fluctuate(sub.voltageBase, 8, 1);
    var current = fluctuate(sub.currentBase * multiplier, 20, 1);
    var activePower = parseFloat(((voltage * current * powerFactor) / 1000).toFixed(2));

    var status = "healthy";
    if (voltage < GRID.VOLTAGE_MIN || voltage > GRID.VOLTAGE_MAX) {
      status = "fault";
    } else if (voltage < GRID.VOLTAGE_MIN + 8 || voltage > GRID.VOLTAGE_MAX - 8) {
      status = "warning";
    }

    return {
      id: sub.id,
      name: sub.name,
      location: sub.location,
      voltage: voltage,
      current: current,
      activePower: activePower,
      status: status,
    };
  });

  // Average voltage across substations
  var avgVoltage = parseFloat(
    (substationReadings.reduce(function (sum, s) {
      return sum + s.voltage;
    }, 0) / substationReadings.length).toFixed(1)
  );

  // Count faults
  var activeFaults = substationReadings.filter(function (s) {
    return s.status === "fault";
  }).length;

  return {
    timestamp: new Date(),
    frequency: frequency,
    totalLoad: totalLoad,
    powerFactor: powerFactor,
    avgVoltage: avgVoltage,
    activeFaults: activeFaults,
    substations: substationReadings,
    alerts: generateAlerts(frequency, avgVoltage, powerFactor, substationReadings),
  };
}

/* ----------------------------
   7. HISTORICAL DATA — Last 24 Hours
   Generates fake historical load data for the chart.
   Returns array of 24 values, one per hour.
   ---------------------------- */
function generateHistoricalLoad() {
  var data = [];
  var labels = [];

  for (var i = 23; i >= 0; i--) {
    var hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - i);
    var hour = hoursAgo.getHours();

    // Determine load multiplier per hour of day
    var mult;
    if (hour >= 0  && hour < 5)  { mult = fluctuate(0.60, 0.03, 2); }
    else if (hour >= 5  && hour < 9)  { mult = fluctuate(0.72, 0.04, 2); }
    else if (hour >= 9  && hour < 18) { mult = fluctuate(0.88, 0.05, 2); }
    else if (hour >= 18 && hour < 22) { mult = fluctuate(0.97, 0.03, 2); }
    else { mult = fluctuate(0.65, 0.03, 2); }

    var load = parseFloat(
      (GRID.LOAD_BASE + (GRID.LOAD_PEAK - GRID.LOAD_BASE) * (mult - 0.5)).toFixed(0)
    );

    data.push(load);

    // Label format: "14:00"
    var hourStr = hour < 10 ? "0" + hour : "" + hour;
    labels.push(hourStr + ":00");
  }

  return { labels: labels, data: data };
}