document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const deviceId = params.get("id");

  if (!deviceId) {
    document.getElementById("device-details").innerHTML = "<p>No device ID provided.</p>";
    return;
  }

  // Fetch device details
  try {
    const response = await fetch("/devices");
    const devices = await response.json();
    const device = devices.find((d) => d.id === deviceId);

    if (device) {
      document.getElementById("device-name").textContent = device.name;
      document.getElementById("device-id").textContent = `ID: ${device.id}`;
    } else {
      document.getElementById("device-name").textContent = "Device not found";
      document.getElementById("device-id").textContent = `ID: ${deviceId}`;
    }
  } catch (error) {
    console.error("Error fetching device details:", error);
    document.getElementById("device-name").textContent = "Error loading device details";
  }

  // Fetch and render telemetry data
  try {
    const response = await fetch(`/telemetry?deviceId=${deviceId}&limit=100`);
    const telemetryData = await response.json();

    if (telemetryData.length === 0) {
      document.getElementById("charts-container").innerHTML = "<p>No telemetry data available for this device.</p>";
      return;
    }

    // Group data by telemetry key (e.g., temperature, humidity)
    const telemetryByKey = {};
    telemetryData.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== "id" && key !== "timestamp") {
          if (!telemetryByKey[key]) {
            telemetryByKey[key] = {
              labels: [],
              data: [],
            };
          }
          telemetryByKey[key].labels.unshift(new Date(entry.timestamp).toLocaleString());
          telemetryByKey[key].data.unshift(entry[key]);
        }
      });
    });

    const chartsContainer = document.getElementById("charts-container");
    Object.keys(telemetryByKey).forEach(key => {
      const chartWrapper = document.createElement("div");
      chartWrapper.className = "col-md-6 mb-4";
      const canvas = document.createElement("canvas");
      chartWrapper.appendChild(canvas);
      chartsContainer.appendChild(chartWrapper);

      new Chart(canvas, {
        type: "line",
        data: {
          labels: telemetryByKey[key].labels,
          datasets: [{
            label: key,
            data: telemetryByKey[key].data,
            fill: false,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
            },
            title: {
              display: true,
              text: `Chart for ${key}`,
            },
          },
        },
      });
    });
  } catch (error) {
    console.error("Error fetching or rendering telemetry data:", error);
    document.getElementById("charts-container").innerHTML = "<p>Error loading telemetry data.</p>";
  }
});
