# 🌍 EcoTrack — Zero-Effort Carbon Footprint Tracker

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62B)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vercel Serverless](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Google Cloud OAuth](https://img.shields.io/badge/Google_Auth-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://console.cloud.google.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

EcoTrack is a modern, premium web application designed to help individuals automatically log, understand, and reduce their carbon footprint using a **zero-typing user experience**. 

Tracking footprints is historically manual and tedious. EcoTrack eliminates data entry: you register, configure your region, and upload a receipt photo. The system does the rest.

> **Zero-Typing Pipeline:** User Authentication &rarr; Grant Location/Region &rarr; Snap/Upload Receipt &rarr; Haversine Distance &rarr; Food Lifecycle Classification &rarr; Footprint Visualized.

---

## 🚀 Key Features

* 🔐 **Multi-User Authentication**: Standard email/password forms and one-click Google OAuth Sign-In (using the modern Google Identity Services SDK), storing credentials securely with `bcrypt` hashes and issuing signed JSON Web Tokens (JWT).
* 📡 **Onboarding & Location Calibration**: Detects home coordinates using the browser's Geolocation API (with a manual region selector fallback supporting grid constants for US, DE, GB, IN, CA, FR). Country codes are reverse-geocoded via OpenStreetMap Nominatim.
* 📷 **AI Vision Receipt Parsing**: Parses purchase receipts instantly using vision models (Gemini, OpenAI, or Anthropic) and returns structured JSON arrays containing vendor name, address, and purchase items.
* 🤖 **Local Offline OCR Fallback**: If vision API keys are absent or fail, the system automatically falls back to an offline local engine (`Tesseract.js`) utilizing regex price extractions and product keyword mappings.
* 🛣️ **Transit Mode Inference**: Measures distance from the user's home to the geocoded vendor address using the **Haversine formula**. Travel modes are automatically inferred based on distance thresholds:
  * $\le 1\text{ km}$: `walking` (Zero emissions)
  * $1 \text{ to } 3\text{ km}$: `cycling` (Zero emissions)
  * $3 \text{ to } 15\text{ km}$: `transit` (Low intensity)
  * $> 15\text{ km}$: `car` (Standard vehicle intensity)
* 📊 **Interactive Analytics Dashboard**: Interactive charts built with **Recharts** depicting 14-day emission trends, category breakdowns (meat, dairy, produce, packaged food, household, transport, other), goal completion bars, and database-personalized calculation confidence ratings.
* 💡 **Quantified Actionable Insights**: Dynamically generates prioritized recommendations based on the user's shopping history, detailing exactly how many kilograms of CO₂e they will save per month by switching to sustainable habits.

---

## 🛠️ Technology Stack

### Frontend (Client)
* **Framework**: React.js (Vite compiler)
* **Styling**: Tailwind CSS & Glassmorphism design system
* **Icons**: Lucide React
* **Charts**: Recharts

### Backend (Server)
* **Runtime**: Node.js & Express.js (ES Modules)
* **ORM**: Prisma ORM
* **Database**: PostgreSQL (Neon Serverless Pooler / Supabase)
* **Image Processing**: Multer (in-memory buffer parsing)
* **Testing**: Vitest & Supertest (27 active integration tests)

---

## 📚 Emission Factors & Math Formulas

All calculation factors are defined in `/server/config/emission-factors.js` and referenced from official environmental agencies:

### 1. Transport Footprints
Emissions are calculated based on the Haversine distance and the transit mode coefficient:
$$\text{Travel Emissions (kg CO}_2\text{e)} = \text{Distance (km)} \times \text{Transit Mode Factor (kg/km)}$$

* **Walking / Cycling**: `0.00` kg/km
* **Transit (Bus/Train)**: `0.035` kg/km (Source: UK DEFRA 2023 greenhouse gas conversion factors)
* **Car**: `0.170` kg/km (Source: US EPA eGRID & UK DEFRA petrol/diesel average)
* **Flight**: `0.115` kg/km (Source: IPCC Fifth Assessment Report)

### 2. Food & Product Categories
Lifecycle emission calculations are computed as:
$$\text{Product Emissions (kg CO}_2\text{e)} = \sum \left( \text{Item Quantity (kg or Liter)} \times \text{Category Factor (kg/kg)} \right)$$

* **Meat**: `20.0` kg/kg (Source: Poore & Nemecek, Science 2018 - weighted average for beef, pork, poultry)
* **Dairy**: `5.0` kg/kg (Source: Our World in Data food lifecycle estimates)
* **Produce (Fruits/Veg)**: `0.8` kg/kg (Source: Our World in Data agricultural average)
* **Packaged Food**: `2.0` kg/kg (Source: UK DEFRA average processing intensity)
* **Household Items**: `1.2` kg/kg (Source: UK DEFRA household supplies lifecycle assessments)
* **Other Products**: `1.5` kg/kg (Global fallback average)

### 3. Home Electricity Grid Averages
* **United States (US)**: `0.370` kg/kWh (US EPA eGRID 2023)
* **United Kingdom (GB)**: `0.150` kg/kWh (UK DEFRA 2023)
* **India (IN)**: `0.710` kg/kWh (India Central Electricity Authority)
* **World Average (Default)**: `0.475` kg/kWh (IEA World Grid Averages)

---

## 📋 REST API Endpoints

All data-altering and dashboard endpoints are protected by the JWT session interceptor (`/server/config/authMiddleware.js`).

### Authentication (`/api/auth`)
* `GET  /config`: Returns the `googleClientId` dynamically so that frontend forms can load Google One-Tap SDK.
* `POST /register`: Registers a standard email/password user, hashes the credentials with `bcryptjs`, and returns a signed JWT.
* `POST /login`: Validates password credentials, signs a session token, and returns user details.
* `POST /google`: Receives a Google token (`credential`), verifies it via Google API, upserts the passwordless user profile, and returns a session JWT.
* `GET  /me`: Fetches metadata and goals for the currently logged-in user.

### Carbon Entries (`/api`)
* `POST /onboarding`: Sets the user's home coordinates and geolocates their country code.
* `POST /logs/parse`: Accepts image uploads (Multer files or base64) and parses them via AI/OCR, returns inferred travel metrics, vendor locations, and item classifications.
* `POST /logs`: Saves a finalized log entry along with its items to PostgreSQL, recalculating emissions server-side.
* `GET  /logs`: Fetches the reverse-chronological carbon entry logs for the authenticated user.
* `DELETE /logs/:id`: Deletes a specific log (using cascading deletions to delete child items).
* `GET  /dashboard`: Computes 14-day trends, category sums, progress meters, and calculation confidence ratings.
* `GET  /insights`: Generates prioritized recommendations and savings indicators based on historical data logs.
* `POST /user/goal`: Updates the user's monthly carbon allowance target.
* `POST /logs/clear`: Wipes the authenticated user's log history.

---

## ⚙️ Local Development Setup

To run this project locally, execute the following commands in your shell:

### 1. Installation
Clone the repository and run:
```bash
npm install
```
*This installs root CLI packages, backend libraries (Express, Prisma), and client modules (React, Recharts) in one step.*

### 2. Local Environment Variables
Create a file named `.env` in the root folder (use `.env.example` as a template):
```env
# Server configuration
PORT=5000
NODE_ENV=development

# OCR/AI receipt parser settings
AI_PROVIDER=openrouter
AI_API_KEY=your_vision_api_key
DEMO_MODE=false

# PostgreSQL Database Connection (e.g. Docker or local instance)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecotrack

# Session signing key
JWT_SECRET=development-secret-key-12345!

# Google Console Credentials
GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com
```

### 3. Initialize your Database
Run migrations to set up the tables locally:
```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Development Server
Launch both frontend and backend concurrently:
```bash
npm run dev
```
*Your React app will load on [http://localhost:3000](http://localhost:3000) and Express server on [http://localhost:5000](http://localhost:5000).*

---

## ☁️ Vercel Serverless Deployment

This monorepo is fully optimized to deploy client assets and backend Express routes as Vercel Serverless Functions.

1. Create a free PostgreSQL instance on **[Neon.tech](https://neon.tech)** or **[Supabase.com](https://supabase.com)**.
2. Push the schema to your remote database:
   ```bash
   $env:DATABASE_URL="your-remote-postgres-url"
   npm run db:migrate
   npm run db:seed
   ```
3. Connect your GitHub repository to Vercel.
4. Set the following **Environment Variables** in Vercel settings:
   * `DATABASE_URL`: Your remote PostgreSQL connection string.
   * `JWT_SECRET`: A secure random secret string.
   * `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
   * `AI_PROVIDER`: `openrouter` (or `openai`/`gemini`).
   * `AI_API_KEY`: Your vision model API key.
   * `DEMO_MODE`: `false`.
5. Set the **Build Command** to `npm run build` and the **Output Directory** to `client/dist`.
6. Click **Deploy**. Vercel will bundle the static frontend and compile the backend under `api/index.js` as an event-driven serverless function.

---

## 🧪 Testing

To run the Vitest/Supertest suite:
```bash
npm run test
```
All tests are run inside a clean environment, verifying that API endpoints validate headers, reject unauthorized requests, calculate precise emissions, and geocode coordinates correctly.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
