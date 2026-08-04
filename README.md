# 🚀 ETMIND — AI-Powered Multi-Agent Investment Intelligence Platform

[![ET AI Hackathon 2026](https://img.shields.io/badge/ET%20AI%20Hackathon-2026%20Problem%20%236-blueviolet.svg)](https://github.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **ETMIND** is a production-grade, multi-agent AI investment platform purpose-built for Indian retail investors. It continuously monitors the NSE/BSE markets across the Nifty 500 universe, detects high-signal trading and investment opportunities using custom-trained machine learning models, and delivers plain-English actionable insights directly to users.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Running with Docker Compose](#3-running-with-docker-compose)
- [Deployment Guides](#-deployment-guides)
- [Machine Learning Pipeline](#-machine-learning-pipeline)
- [Verification & Scripts](#-verification--scripts)
- [License & Credits](#-license--credits)

---

## 🌟 Overview

Indian retail investors face massive market noise, complex technical charts, and overwhelming financial statements. **ETMIND** bridges this gap by acting as an autonomous AI co-pilot:

1. **Market Scanning**: Scans Nifty 500 stocks in real-time during market hours.
2. **Machine Learning Predictions**: Evaluates technical and quantitative signals using trained XGBoost, LightGBM, and PyTorch models with back-tested win rates from 5+ years of historical data.
3. **CAMS Mutual Fund Analysis**: Automatically parses CAS/CAMS statements, calculates exact portfolio XIRR, and highlights overlapping holdings across funds.
4. **Plain-English Narratives**: Translates complex quantitative signals into plain-English reasoning powered by LLM integrations.
5. **Real-time Live Pushes**: Delivers signals over WebSockets and multi-channel alerts (WhatsApp / Telegram / Web Push).

---

## 🔥 Key Features

### 1. 📈 Autonomous Real-Time Signal Engine
- Continuous scanning across the Nifty 500 universe.
- Technical, quantitative, and ML-backed pattern detection.
- Live WebSockets for sub-second signal delivery to the dashboard.

### 2. 🤖 Trained Machine Learning Intelligence
- Multi-model ensemble (XGBoost, LightGBM, PyTorch Neural Nets).
- Optuna hyperparameter optimization & MLflow experiment tracking.
- SHAP feature explainability for transparent AI decisions.
- Vector database (Qdrant) pattern matching against historical market setups.

### 3. 💼 Mutual Fund Portfolio & CAMS Analyzer
- Automated CAMS PDF statement parsing.
- Precise XIRR calculation per scheme and overall portfolio.
- Fund overlap detection to highlight redundant holdings and cut expense ratios.

### 4. 📊 Professional Trading & Analytics Dashboard
- Interactive TradingView Lightweight Charts (MIT).
- Recharts for back-test visualization and risk metrics.
- Modern dark-themed UI built with React 18, Vite, and TailwindCSS.

### 5. 🚀 Complete Cloud-Ready Infrastructure
- Containerized backend & worker setup using Docker.
- Ready-to-deploy blueprints for **Render** (FastAPI + Celery + PostgreSQL + Redis) and **Vercel** (React Vite Frontend).

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   NSE / BSE Markets    │
                                  └───────────┬────────────┘
                                              │ Price Feed / Ingestion
                                              ▼
┌─────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│   React 18 + Vite UI    │◄─────►│    FastAPI Backend     │◄─────►│   Celery Task Queue    │
│  (TradingView / Charts) │ Web   │  (REST & WebSockets)   │       │     (Redis Broker)     │
└─────────────────────────┘ Socket└───────────┬────────────┘       └───────────┬────────────┘
                                              │                                │
                                ┌─────────────┴─────────────┐                  │ ML Signals &
                                ▼                           ▼                  │ Scanning Tasks
                      ┌──────────────────┐        ┌──────────────────┐         │
                      │  PostgreSQL 16   │        │     Redis 7      │◄────────┘
                      │  (Primary DB)    │        │  (Live Cache)    │
                      └──────────────────┘        └──────────────────┘
```

---

## 💻 Tech Stack

| Domain | Technology / Framework |
| :--- | :--- |
| **Languages** | Python 3.11, TypeScript 5.x, SQL, Bash |
| **Frontend** | React 18, Vite, TailwindCSS, Zustand, React Query v5, Framer Motion |
| **Charts & Visualization** | TradingView Lightweight Charts v5, Recharts, Lucide Icons |
| **Backend API** | FastAPI 0.110, Uvicorn, Pydantic v2, WebSockets |
| **Task Queue & Scheduling** | Celery 5.3, Redis 7, APScheduler 3.10 |
| **Database & ORM** | PostgreSQL 16, SQLAlchemy 2.0, Alembic, Redis 7 |
| **Machine Learning** | PyTorch, XGBoost, LightGBM, Scikit-learn, SHAP, Optuna, MLflow |
| **Vector Database** | Qdrant Vector Search, Sentence-Transformers |
| **Deployment** | Docker, Render, Vercel |

---

## 📁 Repository Structure

```
et/
├── README.md                      # Main project documentation
├── render.yaml                    # Render Infrastructure as Code definition
├── deployment-check.sh            # Pre-deployment validation script
├── COMPLETE_DEPLOYMENT_GUIDE.md   # Step-by-step master deployment guide
├── RENDER_DEPLOYMENT_GUIDE.md     # Detailed Render deployment instructions
├── QUICK_START_RENDER.md          # 5-minute quick-start guide for Render
├── ENV_VARIABLES_SETUP.md         # Complete environment variable reference
├── DEPLOYMENT_CHECKLIST.md        # Pre-flight and post-deployment checklist
├── DEPLOYMENT_TROUBLESHOOTING.md  # Common errors and solution procedures
├── ETMIND_COMPLETE_MASTER_PROMPT.md # Complete system blueprint and prompt specs
└── etmind/                         # Main application directory
    ├── docker-compose.yml         # Local Docker setup
    ├── backend/                   # FastAPI application & ML agents
    │   ├── main.py                # Main API entrypoint
    │   ├── requirements.txt       # Python dependencies
    │   ├── Dockerfile             # Backend container image
    │   ├── agents/                # AI multi-agent logic
    │   ├── api/                   # REST & WebSocket route handlers
    │   ├── db/                    # SQLAlchemy models & database connection
    │   ├── ml/                    # ML model execution & inference
    │   ├── tasks/                 # Celery background workers
    │   └── utils/                 # CAMS parser & financial calculation utilities
    ├── frontend/                  # React 18 + Vite frontend
    │   ├── package.json           # Frontend dependencies
    │   ├── vite.config.ts         # Vite configuration
    │   ├── Dockerfile             # Frontend web container image
    │   └── src/                   # React components, pages & stores
    └── ml_training/               # Model training scripts & datasets
```

---

## ⚙️ Getting Started

### Prerequisites

Ensure you have the following installed locally:
- **Node.js**: v18.x or later
- **Python**: v3.11.x
- **PostgreSQL**: v16+
- **Redis**: v7+
- **Docker & Docker Compose** *(Optional, but recommended)*

---

### 1. Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd etmind/backend
   ```

2. **Create and activate Python virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Set up Environment Variables**:
   Copy `.env.production.template` from root or create `.env` in `etmind/backend/`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/etmind
   REDIS_URL=redis://localhost:6379/0
   SECRET_KEY=your_secret_key_here
   ```

5. **Run Database Migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Start FastAPI Development Server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The API will be live at http://localhost:8000 (API Docs at http://localhost:8000/docs).*

7. **Start Celery Worker (in a separate terminal)**:
   ```bash
   celery -A tasks.celery_app worker --loglevel=info
   ```

---

### 2. Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd etmind/frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Configure Frontend Environment**:
   Create `.env` inside `frontend/`:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000/ws
   ```

4. **Start Vite Development Server**:
   ```bash
   npm run dev
   ```
   *The frontend UI will be running at http://localhost:5173.*

---

### 3. Running with Docker Compose

To start the complete stack (PostgreSQL, Redis, Backend, Celery Worker, Frontend) with a single command:

```bash
cd etmind
docker-compose up --build
```

---

## 🚀 Deployment Guides

Comprehensive documentation is provided in the repository for deploying ETMIND to production environments:

- 📖 [Complete Deployment Guide](file:///Users/chanakya01/Documents/et/COMPLETE_DEPLOYMENT_GUIDE.md) — Master guide covering Vercel + Render full stack deployment.
- ⚡ [Quick Start Render Guide](file:///Users/chanakya01/Documents/et/QUICK_START_RENDER.md) — 5-minute deployment guide using `render.yaml`.
- 📘 [Render Deployment Guide](file:///Users/chanakya01/Documents/et/RENDER_DEPLOYMENT_GUIDE.md) — Detailed backend, Celery worker, and database deployment steps.
- 🔑 [Environment Variables Setup](file:///Users/chanakya01/Documents/et/ENV_VARIABLES_SETUP.md) — Complete environment reference manual.
- 📋 [Deployment Checklist](file:///Users/chanakya01/Documents/et/DEPLOYMENT_CHECKLIST.md) — Pre-flight and post-deployment checklist.
- 🛠️ [Troubleshooting Guide](file:///Users/chanakya01/Documents/et/DEPLOYMENT_TROUBLESHOOTING.md) — Solutions for common deployment and runtime issues.

To validate your environment before deployment, run:
```bash
./deployment-check.sh
```

---

## 🧠 Machine Learning Pipeline

ETMIND includes offline and online ML model pipelines in `etmind/ml_training/` and `etmind/backend/ml/`:

- **Data Ingestion**: Historical 5-year OHLCV candles for Nifty 500 universe via `yfinance` & market feeds.
- **Feature Engineering**: RSI, MACD, Bollinger Bands, ATR, VWAP, moving average crossovers, and volume profile dynamics.
- **Models Trained**:
  - **XGBoost Classifier**: Pattern success probability prediction.
  - **LightGBM Classifier**: High-speed multi-indicator trend prediction.
  - **PyTorch Neural Network**: Deep representations of multi-timeframe price series.
- **Explainability**: SHAP (SHapley Additive exPlanations) values computed for every generated signal.

---

## 🧪 Verification & Testing

- **Backend Health Check**:
  ```bash
  curl http://localhost:8000/api/health
  ```
- **Trigger Scan Script**:
  ```bash
  python etmind/backend/trigger_scan.py
  ```
- **Frontend Code Quality Check**:
  ```bash
  cd etmind/frontend && npm run lint
  ```

---

## 📄 License & Credits

Developed for the **ET AI Hackathon 2026** (Problem #6: *AI for the Indian Investor*).  
Distributed under the **MIT License**.
