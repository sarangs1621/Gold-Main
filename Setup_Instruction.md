# Gold Inventory Management System

A full-stack Gold Inventory Management System built using FastAPI, React, and MongoDB.

---

## Tech Stack

### Backend
- Python 3.9+
- FastAPI
- Motor (MongoDB async driver)
- JWT Authentication
- Uvicorn

### Frontend
- React
- Node.js (v16+)
- npm
- jsPDF
- jspdf-autotable

### Database
- MongoDB Community Edition 8.2.3
- Standalone (Local)

---

## Project Structure

Gold_Inventory/
├── backend/
│   ├── server.py
│   ├── init_db.py
│   ├── requirements.txt
│   ├── .env
│   └── venv/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md

---

## Prerequisites

- Python 3.9+
- Node.js v16+
- npm
- MongoDB 8.2.3 Community Edition
- Git (optional)

---

## Database Setup (MongoDB) — REQUIRED

- Edition: MongoDB Community
- Version: 8.2.3
- Host: localhost
- Port: 27017
- Cluster: Standalone

---

## Backend Setup

cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python init_db.py
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

---

## Frontend Setup

cd frontend
npm install
npm install jspdf jspdf-autotable
npm start

---

## Running URLs

Backend: http://localhost:8001  
Frontend: http://localhost:3000  
MongoDB: mongodb://localhost:27017

---

# File path for frontend .env file - \GOLD-main\GOLD-main\frontend\.env
REACT_APP_BACKEND_URL=http://localhost:8001

# File path for backend .env file - \GOLD-main\GOLD-main\backend\.env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="gold_shop_erp"
CORS_ORIGINS=http://localhost:3000 
JWT_SECRET="gs-erp-2025-prod-secret-key-a8f3e9c2b7d4f1a6e9b3c8d2f7a4e1b9c6d3f8a2e7b4c9d6f1a8e3b7c2d9f4a6"
# REACT_APP_BACKEND_URL=http://192.168.1.21:5000

Happy Coding 🚀
