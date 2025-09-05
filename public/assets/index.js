document.addEventListener('DOMContentLoaded', () => {
  let map;

  if (window.location.hostname === 'localhost') {
    var apiUrl = 'http://127.0.0.1:5002/devices';
  } else {
    var apiUrl = 'https://igapo-api.web.app/devices';
  }

  const addDeviceModalEl = document.getElementById('add-device-modal');
  const addDeviceModal = new bootstrap.Modal(addDeviceModalEl);
  const deviceListEl = document.getElementById('device-list');
  const addDeviceForm = document.getElementById('add-device-form');

  const editDeviceModalEl = document.getElementById('edit-device-modal');
  const editDeviceModal = new bootstrap.Modal(editDeviceModalEl);
  const editDeviceForm = document.getElementById('edit-device-form');

  async function fetchAndRenderDevices() {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const devices = await response.json();

      deviceListEl.innerHTML = '';
      devices.forEach(device => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        let deviceInfo = `<span>${device.name} (<a href="./device.html?id=${device.id}">${device.id}</a>)`;
        if (device.latitude !== undefined && device.longitude !== undefined) {
          deviceInfo += ` - Lat: ${device.latitude}, Lon: ${device.longitude}`;
        }
        deviceInfo += `</span>`;
        const buttons = `
          <div>
            <button class="btn btn-secondary btn-sm edit-btn" 
              data-id="${device.id}" 
              data-name="${device.name}" 
              data-lat="${device.latitude || ''}" 
              data-lon="${device.longitude || ''}"
            >Edit</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${device.id}">Delete</button>
          </div>
        `;
        li.innerHTML = `${deviceInfo} ${buttons}`;
        deviceListEl.appendChild(li);

        // add to map
        if (device.latitude !== undefined && device.longitude !== undefined && map) {
          L.marker([device.latitude, device.longitude]).addTo(map)
            .bindPopup(`<strong><a href="./device.html?id=${device.id}">${device.name}</a></strong><br>Lat: ${device.latitude}, Lon: ${device.longitude}`);
        }
      });
    } catch (error) {
      console.error("Could not fetch devices:", error);
      deviceListEl.innerHTML = '<li class="list-group-item text-danger">Failed to load devices.</li>';
    }
  }

  deviceListEl.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const deviceId = e.target.dataset.id;
      if (confirm('Are you sure you want to delete this device?')) {
        try {
          const response = await fetch(`${apiUrl}?id=${deviceId}`, {
            method: 'DELETE',
            headers: {
              'X-Auth-Token': document.getElementById("auth").value
            },
          });

          if (!response.ok && response.status !== 204) { // 204 No Content is a success status for DELETE
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          await fetchAndRenderDevices(); // Refresh the list
        } catch (error) {
          console.error("Could not delete device:", error);
          alert("Failed to delete device. See console for details.");
        }
      }
    }

    if (e.target.classList.contains('edit-btn')) {
      const { id, name, lat, lon } = e.target.dataset;
      editDeviceForm.elements.deviceId.value = id;
      editDeviceForm.elements.deviceName.value = name;
      editDeviceForm.elements.deviceLat.value = lat;
      editDeviceForm.elements.deviceLon.value = lon;
      editDeviceModal.show();
    }
  });

  addDeviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const deviceName = e.target.elements.deviceName.value;
    const deviceLat = e.target.elements.deviceLat.value;
    const deviceLon = e.target.elements.deviceLon.value;

    if (deviceName) {
      const deviceData = { name: deviceName };
      if (deviceLat && deviceLon) {
        deviceData.latitude = parseFloat(deviceLat);
        deviceData.longitude = parseFloat(deviceLon);
      }

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': document.getElementById("auth").value
          },
          body: JSON.stringify(deviceData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await fetchAndRenderDevices();
        addDeviceForm.reset();
        addDeviceModal.hide();
      } catch (error) {
        console.error("Could not add device:", error);
        alert("Failed to add device. See console for details.");
      }
    }
  });

  editDeviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const deviceId = e.target.elements.deviceId.value;
    const deviceName = e.target.elements.deviceName.value;
    const deviceLat = e.target.elements.deviceLat.value;
    const deviceLon = e.target.elements.deviceLon.value;

    if (deviceName) {
      const deviceData = { name: deviceName };
      if (deviceLat && deviceLon) {
        deviceData.latitude = parseFloat(deviceLat);
        deviceData.longitude = parseFloat(deviceLon);
      } else {
        deviceData.latitude = null;
        deviceData.longitude = null;
      }

      try {
        const response = await fetch(`${apiUrl}?id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': document.getElementById("auth").value
          },
          body: JSON.stringify(deviceData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await fetchAndRenderDevices();
        editDeviceModal.hide();
      } catch (error) {
        console.error("Could not update device:", error);
        alert("Failed to update device. See console for details.");
      }
    }
  });

  function initMap() {
    map = L.map('map').setView([-22.980122, -49.9256042], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
  }

  initMap();
  fetchAndRenderDevices();
});
