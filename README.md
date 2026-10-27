# WindSight — UK Wind Forecast Accuracy Dashboard

A full-stack web application for UK energy procurement teams to visualise and evaluate wind generation forecasts against actuals for January 2026.

> **AI Tool Disclosure**: This application was built with assistance from Google Antigravity (Gemini/Claude). The AI helped scaffold, design, and implement the codebase based on the product requirements.

---

## 📁 Project Structure

```
wind-forecast-dashboard/
├── backend/
│   ├── main.py          # FastAPI app — 4 REST endpoints
│   ├── elexon.py        # Elexon BMRS API client (FUELHH + WINDFOR)
│   ├── analytics.py     # Accuracy metrics: MAE, RMSE, MAPE, Bias
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile       # Python 3.11 slim image
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── useWindData.ts      # React Query hooks
│   │   ├── components/
│   │   │   ├── KPICard.tsx         # Animated metric card
│   │   │   ├── TimeSeriesChart.tsx # Actual vs. forecast line chart
│   │   │   ├── ErrorChart.tsx      # Error area + signed error line
│   │   │   ├── HourlyProfile.tsx   # Avg error by hour-of-day bar chart
│   │   │   └── DailyTable.tsx      # Sortable daily accuracy table
│   │   ├── pages/
│   │   │   └── Dashboard.tsx       # Main dashboard page
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css               # Design system (glassmorphism, navy/teal)
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🚀 How to Start

### Option A — Docker (recommended)

```bash
# From the project root:
docker-compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- API docs (Swagger) → http://localhost:8000/docs

### Option B — Manual

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (in a separate terminal)
```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

---

## 🌐 Deployed App

| Service  | URL |
|----------|-----|
| Frontend | _[Add Vercel URL here]_ |
| Backend  | _[Add Render URL here]_ |

---

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Service health check |
| `GET /api/actuals` | Actual FUELHH WIND generation (Jan 2026, 30-min) |
| `GET /api/forecasts` | Day-ahead relevant WINDFOR forecasts (Jan 2026) |
| `GET /api/accuracy` | MAE, RMSE, MAPE, Bias — overall, daily & hourly |

Interactive docs: `/docs` (Swagger UI)

---

## 📊 Data Sources

Both datasets come from **Elexon BMRS** (British National Grid's Balancing Mechanism Reporting System):

- **FUELHH** — Half-hourly actual generation by fuel type (`fuelType=WIND`)
- **WINDFOR** — Wind generation forecasts with publish timestamps

### Forecast Selection Logic

For each 30-minute delivery period on day `D`, the "day-ahead relevant" forecast is:

> The WINDFOR record with the **latest `publishTime` ≤ D-1 23:00 UTC** (UK EPEX gate closure)

This simulates the information actually available to procurement teams when making day-ahead purchase decisions.

---

## 🧮 Accuracy Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **MAE** | `mean(|actual − forecast|)` | Average absolute error in MW |
| **RMSE** | `sqrt(mean((actual − forecast)²))` | Penalises large errors; always ≥ MAE |
| **MAPE** | `mean(|error|/actual × 100)` | Scale-independent % error |
| **Bias** | `mean(actual − forecast)` | Positive = under-forecast; Negative = over-forecast |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript |
| Charts | Recharts |
| State / Data | TanStack React Query |
| Animation | Framer Motion |
| Backend | Python 3.11, FastAPI, uvicorn |
| HTTP client | httpx (async) |
| Caching | cachetools (TTL in-memory) |
| Containerisation | Docker, Docker Compose |
| Deployment | Vercel (FE) + Render (BE) |
