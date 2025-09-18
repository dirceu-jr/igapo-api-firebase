# Igapó API

This is a simple IoT data platform based on Firebase Functions and Firestore.

# API

The API is exposed via Firebase Functions. The base URL will be your Firebase project's function URL.

A demonstration is hosted at https://igapo-api.web.app/.

## Authentication

-   The `/devices` endpoint requires an `X-Auth-Token` header for `POST`, `PUT`, and `DELETE` requests. The token should be set in `X_AUTH_TOKEN` constant in  `functions/index.js`.
-   The `/telemetry` endpoint for submitting data (`POST`) requires an `X-API-Key` in the request body, which corresponds to the device's ID.

## `/devices`

This endpoint manages the devices in the platform.

### `GET /devices`

Retrieves a list of all registered devices.

### `POST /devices`

Creates a new device.

-   **Method**: `POST`
-   **Headers**:
    -   `X-Auth-Token`: `your-auth-token`
-   **Body**:
    ```json
    {
      "name": "New Device",
      "latitude": 12.34,
      "longitude": 56.78
    }
    ```
    -   `name` (string, required): The name of the device.
    -   `latitude`, `longitude` (number, optional): The location of the device.

### `PUT /devices?id=<device_id>`

Updates an existing device.

-   **Method**: `PUT`
-   **Headers**:
    -   `X-Auth-Token`: `your-auth-token`
-   **Query Parameters**:
    -   `id` (string, required): The ID of the device to update.
-   **Body**:
    ```json
    {
      "name": "Updated Device Name",
      "latitude": 43.21,
      "longitude": 87.65
    }
    ```
    -   `name` (string, required): The new name for the device.
    -   `latitude`, `longitude` (number, optional): The new location for the device.

### `DELETE /devices?id=<device_id>`

Deletes a device.

-   **Method**: `DELETE`
-   **Headers**:
    -   `X-Auth-Token`: `your-auth-token`
-   **Query Parameters**:
    -   `id` (string, required): The ID of the device to delete.

---

## `/telemetry`

This endpoint manages telemetry data from devices.

### `POST /telemetry`

Submits telemetry data from a device. The device ID is used as the API key.

-   **Method**: `POST`
-   **Body**:
    ```json
    {
      "X-API-Key": "<your_device_id>",
      "temperature": 25.5,
      "humidity": 60
    }
    ```
    -   `X-API-Key` (string, required): The ID of the device sending data.
    -   Any other key-value pairs are stored as telemetry data. A server-side timestamp is automatically added.

### `GET /telemetry`

Retrieves telemetry data for a specific device.

-   **Method**: `GET`
-   **Query Parameters**:
    -   `deviceId` (string, required): The ID of the device.
    -   `limit` (number, optional, default: `100`): The maximum number of records to return.
    -   `format` (string, optional): Set to `csv` to get the data in CSV format.
