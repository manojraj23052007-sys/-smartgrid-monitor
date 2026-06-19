/* ============================================================
   SMARTGRID MONITOR — alarms.js
   Manages the Active Alarms panel on the dashboard
   ============================================================ */

/* ----------------------------
   1. ALARM STORAGE
   We keep a list of recent alarms in memory.
   Max 20 alarms shown at once — oldest drop off.
   ---------------------------- */
var activeAlarms = [];
var MAX_ALARMS = 20;

/* ----------------------------
   2. FORMAT TIME
   Takes a Date object and returns "HH:MM:SS" string.
   Used to display when each alarm triggered.
   ---------------------------- */
function formatTime(dateObj) {
  var h = dateObj.getHours();
  var m = dateObj.getMinutes();
  var s = dateObj.getSeconds();

  var hStr = h < 10 ? "0" + h : "" + h;
  var mStr = m < 10 ? "0" + m : "" + m;
  var sStr = s < 10 ? "0" + s : "" + s;

  return hStr + ":" + mStr + ":" + sStr;
}

/* ----------------------------
   3. ADD ALARMS
   Takes the alerts array from generateGridReading().
   Adds new alerts to the top of activeAlarms.
   Trims list to MAX_ALARMS.

   Parameter:
     newAlerts — array of alert objects from sensor-mock.js
   ---------------------------- */
function addAlarms(newAlerts) {
  if (!newAlerts || newAlerts.length === 0) { return; }

  // Add each new alert to the beginning of the array
  for (var i = 0; i < newAlerts.length; i++) {
    activeAlarms.unshift(newAlerts[i]);
  }

  // Keep only the most recent MAX_ALARMS entries
  if (activeAlarms.length > MAX_ALARMS) {
    activeAlarms = activeAlarms.slice(0, MAX_ALARMS);
  }
}

/* ----------------------------
   4. BUILD ONE ALARM ROW (HTML string)
   Takes a single alert object and returns
   an HTML string for one alarm row.

   Parameter:
     alarm — one alert object from generateAlerts()
   ---------------------------- */
function buildAlarmRow(alarm) {
  // Map severity to CSS modifier class
  var rowClass = "alarm-row";
  if (alarm.severity === "critical") { rowClass += " alarm-row--critical"; }
  if (alarm.severity === "warning")  { rowClass += " alarm-row--warning"; }
  if (alarm.severity === "info")     { rowClass += " alarm-row--info"; }

  // Map severity to badge color
  var badgeClass = "badge";
  if (alarm.severity === "critical") { badgeClass += " badge--red"; }
  if (alarm.severity === "warning")  { badgeClass += " badge--yellow"; }
  if (alarm.severity === "info")     { badgeClass += " badge--blue"; }

  var timeString = formatTime(alarm.time);

  // Build and return the HTML string
  return (
    '<div class="' + rowClass + '">' +
      '<div class="alarm-row__icon">' + alarm.icon + '</div>' +
      '<div class="alarm-row__body">' +
        '<div class="alarm-row__title">' + alarm.title + '</div>' +
        '<div class="alarm-row__detail">' + alarm.detail + '</div>' +
      '</div>' +
      '<div class="alarm-row__meta">' +
        '<span class="' + badgeClass + '">' + alarm.severity.toUpperCase() + '</span>' +
        '<span class="alarm-row__time">' + timeString + '</span>' +
      '</div>' +
    '</div>'
  );
}

/* ----------------------------
   5. RENDER ALARM LIST
   Reads activeAlarms array and injects HTML
   into the alarm-list element on the page.
   Also updates the alarm count badge.
   ---------------------------- */
function renderAlarms() {
  var listEl = document.getElementById("alarm-list");
  var badgeEl = document.getElementById("alarm-count-badge");

  // Guard — if elements don't exist on this page, stop
  if (!listEl) { return; }

  // If no alarms, show the empty state message
  if (activeAlarms.length === 0) {
    listEl.innerHTML = '<div class="alarm-empty">No active alarms — grid is healthy</div>';
    if (badgeEl) {
      badgeEl.textContent = "0 active";
      badgeEl.className = "badge badge--blue";
    }
    return;
  }

  // Build HTML for all alarm rows
  var html = "";
  for (var i = 0; i < activeAlarms.length; i++) {
    html += buildAlarmRow(activeAlarms[i]);
  }

  // Inject into the DOM all at once
  listEl.innerHTML = html;

  // Update the count badge
  if (badgeEl) {
    var count = activeAlarms.length;
    badgeEl.textContent = count + " active";

    // Badge turns red if any critical alarm exists
    var hasCritical = activeAlarms.some(function (a) {
      return a.severity === "critical";
    });

    badgeEl.className = hasCritical ? "badge badge--red" : "badge badge--yellow";
  }
}

/* ----------------------------
   6. CLEAR ALARMS
   Resets the alarm list. Useful for testing.
   ---------------------------- */
function clearAlarms() {
  activeAlarms = [];
  renderAlarms();
}

/* ----------------------------
   7. UPDATE ALARMS (main entry point)
   Call this every second with the latest alerts.
   It adds new alerts and re-renders the list.

   Parameter:
     newAlerts — alerts array from generateGridReading()
   ---------------------------- */
function updateAlarms(newAlerts) {
  addAlarms(newAlerts);
  renderAlarms();
}