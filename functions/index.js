const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// for Firestore
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Mandatory for Firestore
initializeApp();
const db = getFirestore();

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

const X_AUTH_TOKEN = 'your-auth-token';

// Expose the devices API
exports.devices = onRequest(async (req, res) => {
  const devicesCol = db.collection("devices");

  if (["POST", "PUT", "DELETE"].includes(req.method) && req.get('X-Auth-Token') !== X_AUTH_TOKEN) {
    return res.status(403).send("Forbidden");
  }

  switch (req.method) {
    case "GET": {
      const snapshot = await devicesCol.get();
      const devices = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).json(devices);
      break;
    }
    case "POST": {
      const {name, latitude, longitude} = req.body;
      if (!name) {
        return res.status(400).send("Missing name in request body.");
      }
      const newDeviceData = {name};
      if (latitude !== undefined && longitude !== undefined) {
        newDeviceData.latitude = Number(latitude);
        newDeviceData.longitude = Number(longitude);
      }
      const docRef = await devicesCol.add(newDeviceData);
      const newDevice = {id: docRef.id, ...newDeviceData};
      // logger.info("New device added", newDevice);
      res.status(201).json(newDevice);
      break;
    }
    case "PUT": {
      const {id} = req.query;
      const {name, latitude, longitude} = req.body;
      if (!id) {
        return res.status(400).send("Missing device ID in query string.");
      }
      if (!name) {
        return res.status(400).send("Missing name in request body.");
      }
      const deviceRef = devicesCol.doc(String(id));
      const updateData = {};
      if (name) updateData.name = name;
      if (latitude !== undefined) updateData.latitude = Number(latitude);
      if (longitude !== undefined) updateData.longitude = Number(longitude);

      await deviceRef.update(updateData);
      const updatedDevice = {id, ...updateData};
      // logger.info(`Device ${id} updated.`, updatedDevice);
      res.status(200).json(updatedDevice);
      break;
    }
    case "DELETE": {
      const {id} = req.query;
      if (!id) {
        return res.status(400).send("Missing device ID in query string.");
      }
      const deviceRef = devicesCol.doc(String(id));
      await deviceRef.delete();
      // logger.info(`Device ${id} deleted.`);
      res.status(204).send();
      break;
    }
    default:
      res.status(405).send("Method Not Allowed");
      break;
  }
});

exports.telemetry = onRequest(async (req, res) => {
  if (req.method === "POST") {
    const {"API-Key": apiKey, ...telemetryData} = req.body;
    if (!apiKey) {
      return res.status(401).send("Unauthorized: Missing API-Key in request body.");
    }

    if (!telemetryData || Object.keys(telemetryData).length === 0) {
      return res.status(400).send("Bad Request: Missing telemetry data.");
    }

    const deviceRef = db.collection("devices").doc(apiKey);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return res.status(403).send("Forbidden: Invalid API Key.");
    }

    const telemetryCol = deviceDoc.ref.collection("telemetry");

    await telemetryCol.add({
      ...telemetryData,
      timestamp: FieldValue.serverTimestamp(),
    });

    return res.status(202).send("Accepted");
  }

  if (req.method === "GET") {
    const {deviceId, limit = 100, format} = req.query;
    if (!deviceId) {
      return res.status(400).send("Bad Request: Missing deviceId query parameter.");
    }

    const telemetryCol = db.collection("devices").doc(deviceId).collection("telemetry");
    const snapshot = await telemetryCol.orderBy("timestamp", "desc").limit(Number(limit)).get();

    const telemetryData = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for easier use in JS
        timestamp: data.timestamp.toDate().toISOString(),
      };
    });

    if (format === "csv") {
      if (telemetryData.length === 0) {
        res.status(200).header("Content-Type", "text/csv").send("");
        return;
      }

      const allKeys = new Set();
      telemetryData.forEach((item) => {
        Object.keys(item).forEach((key) => allKeys.add(key));
      });
      const headers = Array.from(allKeys);

      const csvRows = [headers.join(",")];

      telemetryData.forEach((item) => {
        const row = headers.map((header) => {
          const value = item[header];
          if (value === null || value === undefined) {
            return "";
          }
          const stringValue = String(value);
          // Escape quotes and handle commas
          if (stringValue.includes('"') || stringValue.includes(",")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(",");
        csvRows.push(row);
      });

      res.status(200).header("Content-Type", "text/csv").send(csvRows.join("\n"));
      return;
    }

    return res.status(200).json(telemetryData);
  }

  return res.status(405).send("Method Not Allowed");
});
