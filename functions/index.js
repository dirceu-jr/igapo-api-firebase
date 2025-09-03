const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const crypto = require("crypto");

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

// Expose the devices API
exports.devices = onRequest(async (req, res) => {
  const devicesCol = db.collection("devices");

  try {
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
        const {name} = req.body;
        if (!name) {
          return res.status(400).send("Missing name in request body.");
        }
        const apiKey = crypto.randomBytes(16).toString("hex");
        const docRef = await devicesCol.add({name, apiKey});
        const newDevice = {id: docRef.id, name, apiKey};
        // logger.info("New device added", newDevice);
        res.status(201).json(newDevice);
        break;
      }
      case "PUT": {
        const {id} = req.query;
        const {name} = req.body;
        if (!id) {
          return res.status(400).send("Missing device ID in query string.");
        }
        if (!name) {
          return res.status(400).send("Missing name in request body.");
        }
        const deviceRef = devicesCol.doc(String(id));
        await deviceRef.update({name});
        const updatedDevice = {id, name};
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
  } catch (error) {
    // logger.error("Error managing device:", error);
    res.status(500).send("Internal Server Error");
  }
});
