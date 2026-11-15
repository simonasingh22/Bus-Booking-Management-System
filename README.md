# 🚌 Bus Booking Management System

**ALGIONS AI LABS PRIVATE LIMITED – Internship Assessment Project**

A production-quality, full-stack Bus Booking Management System built on the MERN stack (MongoDB, Express, React, Node.js) with JavaScript only (no TypeScript).

---

## 📋 Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Setup & Scaffolding | ✅ Complete |
| 2 | Database Design & Schemas | ✅ Complete |
| 3 | Backend Foundation & Middleware | ✅ Complete |
| 4 | Authentication & Authorization | ✅ Complete |
| 5 | Operator & Bus Management APIs | ✅ Complete |
| 6 | Routes, Stops & Trip Scheduling | ✅ Complete |
| 7 | Customer Frontend – Landing & Search | ✅ Complete |
| 8 | Seat Selection & Booking Workflow | ✅ Complete |
| 9 | Razorpay Payment Integration | ✅ Complete |
| 10 | Booking History, Cancellation & Refunds | ✅ Complete |
| 11 | Admin Dashboard & Reports | ✅ Complete |
| 12 | Tests, Security & Documentation | 🔜 Next |

---

## 🛠️ Tech Stack

**Frontend:** React 18 · Vite · Tailwind CSS v4 · React Router DOM v6 · Axios · Lucide React · React Hook Form  
**Backend:** Node.js · Express.js · Mongoose · JWT · bcryptjs · Razorpay (test mode)  
**Database:** MongoDB (local or Atlas free tier)  
**Docs:** Swagger/OpenAPI  
**Testing:** Vitest  

---

## 🚀 Local Setup

### Prerequisites

- Node.js ≥ 18
- MongoDB running locally OR MongoDB Atlas account (free tier)
- npm ≥ 9

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/busbooking.git
cd busbooking
```

### 2. Backend setup

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and other values
npm install
npm run dev
```

Server starts at: `http://localhost:5000`  
API Docs: `http://localhost:5000/api/docs`  
Health check: `http://localhost:5000/api/health`

### 3. Frontend setup

```bash
cd client
cp .env.example .env
# Edit .env if needed
npm install
npm run dev
```

Client starts at: `http://localhost:5173`

---

## 🔐 Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@busbooking.com | Admin@123456 |
| Operator | operator@travels.com | Operator@123 |
| Customer | john@example.com | Customer@123 |

---

## 📁 Project Structure

```
busbooking/
├── server/
│   ├── config/          # DB, Swagger config
│   ├── middleware/       # Auth, RBAC, error handler
│   ├── modules/          # Feature modules (auth, buses, trips…)
│   ├── utils/            # PNR generator, helpers
│   ├── seeds/            # Demo seed data
│   └── server.js         # Express entry point
│
├── client/
│   ├── src/
│   │   ├── components/   # Shared UI components
│   │   ├── pages/        # Route-level pages
│   │   ├── context/      # Auth context
│   │   ├── services/     # Axios API calls
│   │   └── App.jsx
│   └── index.html
│
├── .gitignore
└── README.md
```

---

## 🌍 Environment Variables

See `server/.env.example` and `client/.env.example` for all required variables.

**Never commit `.env` files to git.**

---

## 💳 Payment (Razorpay TEST MODE)

This project uses **Razorpay test mode only**. No real money is ever charged.

Add your test keys to `server/.env`:
```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

Add the public key ID to `client/.env`:
```
VITE_RAZORPAY_KEY_ID=rzp_test_...
```

---

## ⚠️ Known Limitations

- Currently in Phase 1 (scaffolding). Full features added in subsequent phases.
- Payment integration is test mode only – never use live keys.
- Refunds are simulated (status updates), not actual bank refunds.

---

## 📄 License

MIT © ALGIONS AI LABS PRIVATE LIMITED
