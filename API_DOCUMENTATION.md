# CalGenie Application & Backend Flow

This document details the overarching data flow between the CalGenie mobile application (frontend) and its backend services, followed by comprehensive documentation of all backend API endpoints and instructions on how to test them using Swagger/OpenAPI.

---

## 1. System Architecture & Conceptual Flow

### The "CalGenie" Pipeline
The CalGenie experience relies on **predictive AI image scanning** paired with a **reference calibration step** to map pixel distances into real-world physical volumes (estimating depth and footprint).

**A. User Registration & Setup Flow:**
1. **Sign Up/Login**: The user creates an account (`/api/auth/register`). A JWT token is issued upon authentication (`/api/auth/login`).
2. **Initial Calibration (Crucial)**: Before scanning food, the user must perform a one-time calibration (`/api/calibrate`).
   - The user places a universally known object (like a Credit Card or standard A4 paper) and captures an image.
   - The backend runs a bounding-box scanner on the reference object to figure out **Pixel-to-Millimeter** ratios and device **Sensor/Focal Length** details. This ensures all future food scans correctly translate device-pixels into actual volume sizes.

**B. Normal Usage Pipeline (Food Scanning):**
1. **Snap Food Image**: The user snaps a picture of their meal and sends it to (`/api/scan/analyze`).
2. **AI Processing**:
   - The backend proxies the image to the **YOLOv5 Model** (running on port `8000`) for food boundary detection.
   - Using the stored calibration ratios and relative depth mapped from MiDaS via Python, the Node.js backend calculates the exact geometric **volume in cubic centimeters (cm³)** of the food detected.
   - The volume mapped with known food density dictionaries estimates the **Total Calories** automatically.
3. **User Confirmation**: The AI responds with the detection list (e.g. `Chicken Breast: 165 kcal`). The app presents this to the user to either accept or edit.
4. **Log Storage**: Upon user confirmation/editing, the payload is persisted inside the user's diary via `POST /api/food-logs`.

**C. Tracking & Summary (Dashboard):**
1. **Daily View**: On the app home screen, `GET /api/dashboard` is requested to show remaining macro allowances, progress percentages, and current logs comparing them safely against their configured physiological goals (`/api/goals`).

---

## 2. API Endpoint Documentation

> **Note on Authentication:** Endpoints requiring an `Authorization` header must use the Bearer scheme:
> `Authorization: Bearer <Your_JWT_Token>`

### Auth & User Verification
#### 1. Register
- **URL**: `POST /api/auth/register`
- **Auth Required**: No
- **Request Body (JSON)**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response**: `{ "token": "eyJh..." }`

#### 2. Login
- **URL**: `POST /api/auth/login`
- **Auth Required**: No
- **Request Body (JSON)**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Response**: `{ "token": "eyJh..." }`

### Calibration & AI Scanning
#### 3. Image Calibration
- **URL**: `POST /api/calibrate`
- **Auth Required**: No (Uses `userId` directly in body payload currently)
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `image`: [File] Image containing the reference object.
  - `userId`: 1 (String/Int corresponding to user)
  - `referenceObject`: `"credit_card"` or `"a4_paper"`
- **Response**:
  ```json
  {
    "success": true,
    "calibration": {
      "focalLengthPx": 3054.3,
      "pixelsPerMmAtCalibration": 12.4,
      ...
    }
  }
  ```

#### 4. Scan & Analyze Food
- **URL**: `POST /api/scan/analyze`
- **Auth Required**: No (Uses `userId` directly in body payload currently)
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `image`: [File] Image of the food.
  - `userId`: 1 (The AI needs their calibration ratios)
- **Response**:
  ```json
  {
     "success": true,
     "results": [
         {
             "food_name": "pizza",
             "calories": 285.4,
             "confidence": "92.5%",
             "bbox": [...]
         }
     ],
     "total_calories": 285.4
  }
  ```

### Diary & Food Logs (Auth Required)
#### 5. Save Food Log
- **URL**: `POST /api/food-logs`
- **Auth Required**: Yes
- **Request Body (JSON)**:
  ```json
  {
    "foodName": "pizza slice",
    "calories": 285,
    "weight": 110.5,     // Optional
    "volume": 204.3,     // Optional
    "mealType": "LUNCH"  // Optional
  }
  ```
- **Response**: The created Prisma log object.

#### 6. Get Diary Logs
- **URL**: `GET /api/food-logs?filter=daily`
- **Auth Required**: Yes
- **Query Params**: `filter` can be `daily`, `monthly`, or `yearly`.
- **Response**: Returns an array of logs matching the timeframe.

#### 7. Update Food Log
- **URL**: `PUT /api/food-logs/:id`
- **Auth Required**: Yes
- **Request Body (JSON)**: Any fields you wish to update (e.g. `{"calories": 300}`).

#### 8. Delete Food Log
- **URL**: `DELETE /api/food-logs/:id`
- **Auth Required**: Yes
- **Response**: `{ "message": "Food log deleted successfully" }`

### Dashboard & Goals (Auth Required)
#### 9. Set/Update Goal
- **URL**: `POST /api/goals` (or `PUT /api/goals`)
- **Auth Required**: Yes
- **Request Body (JSON)**:
  ```json
  {
    "dailyCalorieGoal": 2300
  }
  ```

#### 10. Dashboard Overview
- **URL**: `GET /api/dashboard`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "totalConsumed": 850,
    "dailyGoal": 2300,
    "remaining": 1450,
    "progressPercentage": 37,
    "alertMessage": null,
    "top10Foods": [{ "foodName": "apple", "count": 12 }],
    "recentLogs": [{ "id": 1, "foodName": "udon snippet", "...": "..." }]
  }
  ```

---

## 3. How to Test Endpoints using Swagger or Postman

While standard Express setups do not automatically render an OpenAPI/Swagger UI out of the box (requires setting up `swagger-ui-express`), you can easily visualize and test all of these using tools like **Postman** or **Swagger Editor**.

### Method A: Postman App (Highly Recommended for Multipart/Files)
1. **Download & Open Postman**.
2. **Create Registration:** Send a JSON `POST` request to `http://localhost:5000/api/auth/register`.
3. **Secure Your Token:** Copy the `token` string resulting from a successful login.
4. Set up an environment variable in Postman called `token`.
5. For any restricted endpoint (like Dashboard or Logs), go to the request's **Authorization Tab**, select **Bearer Token**, and inject your copied token.
6. **Testing Scans:** For testing `/api/calibrate` or `/api/scan/analyze`, go to the **Body** tab in Postman, select **form-data**. Change the key type from "Text" to "File", name the key `image`, and browse for a JPG/PNG. Add a text key `userId` mapped to your user's integer ID.

### Method B: Generating a Swagger UI locally
If you definitively want an interactive `/api-docs` interface hosted locally via your Express app:
1. Run `npm install swagger-ui-express yamljs` in your backend map.
2. In your `server.js`, inject the following:
   ```javascript
   const swaggerUi = require('swagger-ui-express');
   const YAML = require('yamljs');
   const swaggerDocument = YAML.load('./swagger.yaml');

   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
   ```
3. You will need to create a `swagger.yaml` file manually matching the parameters above. Currently, testing straight inside Postman provides the quickest pipeline debugging available due to Postman's robust raw-file bridging behaviors.
