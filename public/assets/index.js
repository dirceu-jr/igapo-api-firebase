document.addEventListener('DOMContentLoaded', () => {
  if (window.location.hostname === 'localhost') {
    var apiUrl = 'http://127.0.0.1:5001/igapo-api/us-central1/devices';
  } else {
    // IMPORTANT/TODO:
    // - Replace this with your actual Firebase Function URL;
    var apiUrl = 'https://us-central1-your-project-id.cloudfunctions.net/devices';
  }

  const addDeviceModalEl = document.getElementById('add-device-modal');
  const addDeviceModal = new bootstrap.Modal(addDeviceModalEl);
  const deviceListEl = document.getElementById('device-list');
  const addDeviceForm = document.getElementById('add-device-form');

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
        li.innerHTML = `<span>${device.name} (<a href="./device.html?id=${device.id}">${device.id}</a>)</span> <button class="btn btn-danger btn-sm delete-btn" data-id="${device.id}">Delete</button>`;
        deviceListEl.appendChild(li);
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
  });

  addDeviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const deviceName = e.target.elements.deviceName.value;

    if (deviceName) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: deviceName }),
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

  fetchAndRenderDevices();
});
