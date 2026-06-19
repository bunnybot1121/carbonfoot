# EcoTrack - Zero-Effort Carbon Footprint Tracker

EcoTrack helps individuals understand, track, and reduce their carbon footprint using a **zero manual typing** model. The only user actions required are registering/logging in, selecting a region, and uploading a receipt.

> **Core Flow:** Register/Login &rarr; Grant Location/Region &rarr; Snap Receipt &rarr; Get Footprint (Zero Typing).

---

## 1. What It Does and Why

Manual tracking of carbon footprints is tedious and prone to abandonment. EcoTrack eliminates data entry:
1. **Secure Onboarding**: Provides standard registration/login and Google OAuth credentials authentication. Keeps user sessions active via JWT tokens stored in the browser's local storage.
2. **Location & Region Calibration**: Uses the **Browser Geolocation API** (with a manual selector fallback if permission is denied) to calibrate the user's home coordinates and reverse-geocode country codes, setting regional electricity grid averages.
3. **Bill Scanning**: Extracts text from receipt photos using AI (Gemini, OpenAI, or Anthropic vision models) or fallback local OCR (Tesseract.js) running offline.
4. **Footprint Calculation**: Geocodes the shop address, computes travel distance from home, infers transit mode, categorizes products, and calculates the exact carbon footprint.
5. **Actionable Feedback**: Provides editable chips for user corrections and suggests ranked, quantified monthly savings based on actual transaction patterns.

---

## 2. Architecture Overview

EcoTrack is structured as a Monorepo split between `/client` (Vite frontend) and `/server` (Express backend), compiled and optimized for serverless deployments on **Vercel** with a remote **PostgreSQL** database.

```mermaid
graph TD
    subgraph Client [React + Vite + Tailwind CSS]
        UI[App.jsx] --> Auth[components/Auth.jsx]
        UI --> Onboard[components/Onboarding.jsx]
        UI --> Scanner[components/BillScanner.jsx]
        UI --> Dash[components/CarbonDashboard.jsx]
        UI --> Goals[components/GoalTracker.jsx]
    end

    subgraph Server [Node.js + Express + Prisma + PostgreSQL]
        AuthRouter[routes/auth.js]
        APIRouter[routes/api.js]
        Middleware[config/authMiddleware.js]
        
        subgraph Services
            Parser[AIBillParser.js]
            Geo[GeocodingService.js]
            Calc[CarbonCalcService.js]
            Insights[InsightsService.js]
        end
        
        DB[(PostgreSQL Database)]
        Config[config/emission-factors.js]
    end

    UI -- OAuth / Auth Request --> AuthRouter
    UI -- Secure API Requests --> APIRouter
    APIRouter --> Middleware
    Middleware --> Services
    Services --> DB
    Services --> Config
```

- **`/client/src/components/Auth.jsx`**: Handshakes with the Google Identity Services SDK to initialize Google One-Tap/Sign-In and manages user signup and credentials verification.
- **`/server/routes/auth.js`**: Verifies Google tokens, registers users, hashes passwords with bcrypt, and issues JWT tokens.
- **`/server/config/authMiddleware.js`**: Intercepts requests, validates JWT authorization tokens, and isolates database logs per active user account.
- **`/server/routes/api.js`**: Main API routes layer, fully isolated by user ID.
- **`/server/services/`**: Core logic (AIBillParser, GeocodingService, CarbonCalcService, InsightsService).
- **`/server/prisma/`**: Prisma Schema mapping to PostgreSQL tables.

---

## 3. Local Installation & Development Setup

Bootstrap the application locally with a few simple steps:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
   *This automatically installs dependencies for the root, client, and server, and compiles the Prisma Client.*

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory (based on `.env.example`):
   ```env
   # AI and API Keys
   AI_PROVIDER=openrouter
   AI_API_KEY=your_openrouter_or_openai_api_key
   DEMO_MODE=false

   # Database and Authentication
   DATABASE_URL=postgresql://username:password@localhost:5432/ecotrack
   JWT_SECRET=your_super_secret_session_key
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

3. **Initialize Database Tables**:
   Push the schema to your database and seed defaults:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Launch Dev Server**:
   ```bash
   npm run dev
   ```
   *This starts both the Express server (port 5000) and Vite client (port 3000) concurrently.*

---

## 4. Environment variables for Vercel Deployment

When deploying to Vercel, set these variables in your Vercel Project Settings:

- `DATABASE_URL`: Connection string to your PostgreSQL database (e.g. Supabase, Neon).
- `JWT_SECRET`: Secure random string for session tokens.
- `GOOGLE_CLIENT_ID`: Your Google OAuth credentials Client ID.
- `AI_PROVIDER`: `openrouter` (or `openai`/`gemini`).
- `AI_API_KEY`: Your vision model API key.
- `DEMO_MODE`: `false` (to enable live receipt parsing).

---

## 5. Emission Factor Sources & Citations

All calculation factors are defined in `/server/config/emission-factors.js` and referenced from official environmental agencies:

- **Transport Footprints** (in kg CO₂e / km):
  - `transit`: **0.035** (UK DEFRA 2023 greenhouse gas conversion factors for average bus/rail).
  - `car`: **0.170** (US EPA eGRID & UK DEFRA petrol/diesel medium car average).
  - `flight`: **0.115** (IPCC Fifth Assessment Report average short/long haul passenger flight).
  - `walking`/`cycling`: **0.00** (Zero direct emissions).
- **Food & Product Categories** (in kg CO₂e / kg):
  - `meat`: **20.0** (Poore & Nemecek, Science 2018 - weighted average for beef ~60, pork ~7, poultry ~6).
  - `dairy`: **5.0** (Our World in Data food lifecycle estimates - cheese ~21, milk ~3).
  - `produce`: **0.8** (Our World in Data fruit, veg, and grain average).
  - `packaged_food`: **2.0** (DEFRA average processing intensity).
  - `household`: **1.2** (UK DEFRA household supplies lifecycle assessments).
  - `other`: **1.5** (Global average consumer product intensity fallback).
- **Home Grid Defaults** (in kg CO₂e / kWh):
  - `US`: **0.370** (US EPA eGRID 2023 state averages).
  - `GB`: **0.150** (UK DEFRA 2023 grid emissions).
  - `IN`: **0.710** (India Central Electricity Authority carbon footprint reports).
  - `DEFAULT` (World Average): **0.475** (IEA grid averages).

---

## 6. How Calculations Work

Footprints are computed as:
$$\text{Total Footprint} = \text{Travel Emissions} + \text{Product Emissions}$$

### Travel Emissions
$$\text{Travel } (\text{kg CO}_2\text{e}) = \text{Haversine Distance (km)} \times \text{Transit Mode Factor (kg/km)}$$
Store distance is computed via the haversine formula using shop coordinates and home coordinates. Transit modes are automatically inferred on scan based on distance thresholds:
- $\le 1\text{ km}$: Inferred as `walking` (0 kg CO₂e)
- $1 \text{ to } 3\text{ km}$: Inferred as `cycling` (0 kg CO₂e)
- $3 \text{ to } 15\text{ km}$: Inferred as `transit` (0.035 kg/km)
- $> 15\text{ km}$: Inferred as `car` (0.170 kg/km)

### Product Emissions
$$\text{Product } (\text{kg CO}_2\text{e}) = \sum \left( \text{Item Quantity} \times \text{Category Factor (kg/kg)} \right)$$

---

## 7. Testing

EcoTrack has a suite of integration and unit tests covering all routes, geocoders, footprint calculators, and insights generators. To run them:
```bash
npm run test
```
All tests verify route isolation, authentication token requirements, and calculations correctness.
