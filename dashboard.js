(() => {
  "use strict";

  let dashboardKey = "";
  let latestRows = [];

  const elements = {
    login: document.getElementById("dashboardLogin"),
    content: document.getElementById("dashboardContent"),
    form: document.getElementById("dashboardLoginForm"),
    key: document.getElementById("dashboardKey"),
    error: document.getElementById("dashboardError"),
    refresh: document.getElementById("refreshDashboard"),
    updated: document.getElementById("lastUpdated"),
    total: document.getElementById("metricTotal"),
    participants: document.getElementById("metricParticipants"),
    pretest: document.getElementById("metricPretest"),
    posttest: document.getElementById("metricPosttest"),
    change: document.getElementById("metricChange"),
    pairs: document.getElementById("metricPairs"),
    body: document.getElementById("participantTableBody"),
    csv: document.getElementById("downloadCsvButton")
  };

  function endpointConfigured() {
    return CONFIG.APPS_SCRIPT_URL.startsWith("https://script.google.com/") &&
      CONFIG.APPS_SCRIPT_URL.endsWith("/exec");
  }

  function jsonpRequest(parameters, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      if (!endpointConfigured()) {
        reject(new Error("Google Apps Script URL is not configured."));
        return;
      }

      const callbackName = `egpDashboard_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("The dashboard request timed out."));
      }, timeoutMs);

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = data => {
        cleanup();
        resolve(data);
      };

      const url = new URL(CONFIG.APPS_SCRIPT_URL);
      Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("_", String(Date.now()));
      script.src = url.toString();
      script.onerror = () => {
        cleanup();
        reject(new Error("Could not contact the dashboard server."));
      };
      document.body.appendChild(script);
    });
  }

  function formatNumber(value) {
    return Number.isFinite(value) ? value.toFixed(2) : "—";
  }

  function render(data) {
    const metrics = data.metrics || {};
    latestRows = data.participants || [];

    elements.total.textContent = String(metrics.totalAssessments ?? 0);
    elements.participants.textContent = String(metrics.uniqueParticipants ?? 0);
    elements.pretest.textContent = formatNumber(metrics.averagePretest);
    elements.posttest.textContent = formatNumber(metrics.averagePosttest);
    elements.change.textContent = Number.isFinite(metrics.averagePairedChange)
      ? `${metrics.averagePairedChange >= 0 ? "+" : ""}${metrics.averagePairedChange.toFixed(2)}`
      : "—";
    elements.pairs.textContent = String(metrics.completedPairs ?? 0);
    elements.updated.textContent = `Last updated: ${new Date().toLocaleString()}`;

    elements.body.innerHTML = "";

    if (latestRows.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "empty-row";
      cell.textContent = "No assessment data found.";
      row.appendChild(cell);
      elements.body.appendChild(row);
      return;
    }

    latestRows.forEach(item => {
      const row = document.createElement("tr");
      const change = item.change;
      const cells = [
        item.registrationId,
        item.pretest ?? "—",
        item.posttest ?? "—",
        change == null ? "—" : `${change >= 0 ? "+" : ""}${change}`,
        item.status
      ];

      cells.forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);

        if (index === 3 && change != null) {
          cell.className = change >= 0 ? "change-positive" : "change-negative";
        }

        if (index === 4) {
          cell.className = item.status === "Complete pair" ? "status-complete" : "status-pending";
        }

        row.appendChild(cell);
      });

      elements.body.appendChild(row);
    });
  }

  async function loadDashboard() {
    elements.error.textContent = "";
    elements.refresh.disabled = true;

    try {
      const data = await jsonpRequest({
        action: "dashboard",
        key: dashboardKey
      });

      if (!data || data.success !== true) {
        throw new Error(data?.message || "Dashboard access failed.");
      }

      elements.login.classList.add("hidden");
      elements.content.classList.remove("hidden");
      render(data);
    } catch (error) {
      elements.error.textContent = error.message;
      throw error;
    } finally {
      elements.refresh.disabled = false;
    }
  }

  function downloadCsv() {
    const rows = [
      ["Registration ID", "Pretest", "Post-test", "Change", "Status"],
      ...latestRows.map(item => [
        item.registrationId,
        item.pretest ?? "",
        item.posttest ?? "",
        item.change ?? "",
        item.status
      ])
    ];

    const csv = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `egp-digit-span-dashboard-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  elements.form.addEventListener("submit", async event => {
    event.preventDefault();
    dashboardKey = elements.key.value.trim();

    if (!dashboardKey) {
      elements.error.textContent = "Enter the dashboard key.";
      return;
    }

    try {
      await loadDashboard();
    } catch (_) {}
  });

  elements.refresh.addEventListener("click", async () => {
    try {
      await loadDashboard();
    } catch (_) {}
  });

  elements.csv.addEventListener("click", downloadCsv);
})();
