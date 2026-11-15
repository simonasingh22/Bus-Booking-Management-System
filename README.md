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
| 12 | Tests, Security & Documentation | ✅ Complete |

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

### Razorpay sandbox test steps

1. Create a Razorpay account in **Test Mode** and generate a test key pair.
2. Put the key ID and secret only in `server/.env` as `RAZORPAY_KEY_ID` and
   `RAZORPAY_KEY_SECRET`. Put only the public `rzp_test_...` key ID in
   `client/.env` as `VITE_RAZORPAY_KEY_ID`.
3. Start MongoDB, the backend, and the frontend:
   ```
   cd server
   npm install
   npm run seed
   npm start

   cd ../client
   npm install
   npm run dev
   ```
4. Sign in, select seats, and choose **Razorpay Test Gateway** (not
   **Instant Test Payment**). The checkout modal must use a `rzp_test_...` key.
5. Complete checkout with Razorpay's published test card/UPI details. The
   frontend sends the callback values to `POST /api/payments/verify`; the
   backend verifies `HMAC-SHA256(order_id|payment_id)` before the booking is
   confirmed.
6. To test a failed or cancelled checkout, close the Razorpay modal or use a
   failed sandbox instrument. No confirmed booking, captured payment, or
   permanently consumed seat should be created.
7. Retry the same callback or verification request. It must remain idempotent
   and reuse the existing payment record.
8. **Instant Test Payment** is a separate local simulation path. It does not
   contact Razorpay, uses `gateway: test_simulation`, and is useful when no
   sandbox credentials are configured.

The backend never trusts a frontend success callback by itself. Razorpay test
credentials must remain environment variables; never commit the secret or use
`rzp_live_` keys. Refunds are simulated locally by updating the payment refund
state and do not call a Razorpay refund API.

---

## ⚠️ Known Limitations

- Currently in Phase 1 (scaffolding). Full features added in subsequent phases.
- Payment integration is test mode only – never use live keys.
- Refunds are simulated (status updates), not actual bank refunds.

---

## 📄 License

MIT © ALGIONS AI LABS PRIVATE LIMITED
