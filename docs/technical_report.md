# 📘 Bus Booking Management System – Technical Report

**ALGIONS AI LABS PRIVATE LIMITED – Advanced Individual Project Assessment**  
**Role:** Full-Stack Web Development  
**Author:** Candidate Submission  
**Stack:** MongoDB, Express.js, React 18, Node.js (JavaScript Only — No TypeScript)

---

## 1. Executive Summary

This report outlines the technical design, architectural patterns, concurrency mechanisms, and data integrity guarantees implemented in the **Bus Booking Management System**. The application is designed as a maintainable, high-performance modular monolith that fulfills all business rules and acceptance criteria specified in the assessment brief, specifically:
1. A passenger can search valid trips and book available seats.
2. Two users cannot confirm the same seat on one trip (guaranteed by compound unique database indexes and atomic locking).
3. Every booking generates a unique PNR (`BUS-YYYYMMDD-XXXXXXXX`) with accurate passenger, route, date, and seat manifests.
4. Cancellations restore seat availability in real time and compute simulated refunds based on configurable operator policies.
5. Operator passenger manifests and vehicle occupancy summaries reconcile accurately with confirmed tickets.

---

## 2. Architecture & Design Principles

```
┌─────────────────────────────────────────────────────────────┐
│                    React 18 Single Page App                 │
│  (Vite • Tailwind CSS • Lucide Icons • React Router v7)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON / Cookies
┌──────────────────────────────▼──────────────────────────────┐
│                    Express.js API Gateway                   │
│   Rate Limiting • Helmet • CORS • CookieParser • Morgan     │
└──────┬───────────────────────┬───────────────────────┬──────┘
       │                       │                       │
┌──────▼──────┐         ┌──────▼──────┐         ┌──────▼──────┐
│ Auth & RBAC │         │ Domain APIs │         │ Audit Trail │
│ JWT verify  │         │ Trips, Buses│         │ Immutable   │
│ restrictTo  │         │ Bookings    │         │ Business    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
┌──────▼───────────────────────▼───────────────────────▼──────┐
│                  MongoDB Persistence Layer                  │
│       Mongoose Schemas • Compound Unique Indexes            │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Clean Modular Monolith
The backend is structured into domain-specific modules (`modules/auth`, `modules/buses`, `modules/routes`, `modules/trips`, `modules/seats`, `modules/bookings`, `modules/payments`, `modules/cancellations`, `modules/reports`, `modules/auditLogs`). Each module encapsulates its Mongoose schema, controller, and route handlers.

### 2.2 Server-Side Authorization (RBAC)
Security is never left to the client UI alone. While the React frontend utilizes `<ProtectedRoute allowedRoles={['admin', 'operator']}>` to deliver smooth user navigation, the Express backend enforces server-side role validation using `protect` and `restrictTo('admin', 'operator')` middleware on every sensitive endpoint.

---

## 3. Critical Engineering Problem: Concurrency & Seat Integrity

### 3.1 The Race Condition Challenge
In ticket booking systems, simultaneous requests from multiple users for the exact same seat on the same bus trip can cause double-booking anomalies if relying solely on application-level checks.

### 3.2 Two-Layer Protection Strategy

#### Layer 1: Compound Unique Database Constraint
At the database layer, the `Seat` collection enforces a unique compound index:
```javascript
seatSchema.index({ tripId: 1, seatNumber: 1 }, { unique: true });
```
This guarantees that duplicate seat records for the same trip cannot exist in MongoDB under any race condition.

#### Layer 2: Atomic Conditional Seat Hold
When a passenger selects a seat during checkout, the system issues an atomic `findOneAndUpdate` with state preconditions:
```javascript
const lockedDoc = await Seat.findOneAndUpdate(
  {
    tripId,
    seatNumber,
    $or: [
      { status: 'available' },
      { status: 'locked', lockExpiresAt: { $lt: now } }, // Takeover expired locks
      { status: 'locked', lockedBy: req.user._id }        // Re-lock by same user
    ]
  },
  {
    status: 'locked',
    lockedBy: req.user._id,
    lockedAt: now,
    lockExpiresAt: new Date(now.getTime() + 10 * 60 * 1000) // 10-minute TTL
  },
  { new: true }
);
```
- If User A and User B concurrently request seat `A1`, MongoDB serializes the operations at the document lock level.
- Exactly one user succeeds; the other receives `null` and is returned an `HTTP 409 Conflict` ("Seat A1 was just taken by another passenger"). Any previously acquired seats in that batch are rolled back immediately.

---

## 4. Tiered Cancellation & Refund Policy Engine

Each bus operator can define customizable cancellation rules. The default tiered model evaluates the time remaining until departure:

$$\text{Hours Remaining} = \frac{T_{\text{departure}} - T_{\text{current}}}{3600 \times 1000}$$

| Time Window | Refund % | Service Deduction % | Policy Designation |
| :--- | :---: | :---: | :--- |
| $\ge 24\text{ hours before departure}$ | **90%** | 10% | Full Refund Window |
| $12\text{ to }24\text{ hours before departure}$ | **50%** | 50% | Partial Refund Window |
| $4\text{ to }12\text{ hours before departure}$ | **25%** | 75% | Late Cancellation |
| $< 4\text{ hours before departure}$ | **0%** | 100% | Non-Refundable Window |

### Immediate Seat Restoration
Upon cancellation confirmation:
1. `Booking.bookingStatus` changes to `'cancelled'`.
2. All seats belonging to that ticket are set back to `'available'` with `bookingId: null` in the `Seat` collection.
3. `Trip.availableSeats` is incremented.
4. A `Cancellation` record is created with a unique `REF-XXXXXXXX` transaction ID.
5. `BOOKING_CANCEL` and `REFUND_PROCESSED` events are appended to the immutable `AuditLog`.

---

## 5. Passenger Manifest Reconciliation (Acceptance Test 5)

Operational staff (conductors, depot managers) require a passenger manifest that reconciles ticket revenue and seat assignments against vehicle capacity.

The `/api/reports/trip-manifest/:tripId` endpoint achieves this by:
1. Fetching the trip's bus capacity ($C$).
2. Querying all `confirmed` bookings for that trip and flattening passenger records.
3. Computing:
   $$\text{Booked Seats } (B) = \sum \text{Confirmed Passengers}$$
   $$\text{Vacant Seats } (V) = C - B$$
   $$\text{Occupancy Rate } (\%) = \left(\frac{B}{C}\right) \times 100$$
4. Generating a sorted passenger list containing: Seat Number, Deck, Passenger Name, Age, Gender, Contact Number, Boarding Point & Time, Dropping Point, and PNR.

---

## 6. Security & Auditability

1. **Password Encryption**: Salted bcrypt hashing with work factor 12. Passwords are set with `select: false` so they are never returned in queries.
2. **Session Integrity**: Dual support for HTTP-only cookies (`sameSite: 'lax'`) and Bearer JWT tokens.
3. **HTTP Protections**: Helmet security headers, rate-limiting (500 requests/15m globally, 20 requests/15m for `/api/auth`), and input sanitization.
4. **Audit Trail**: Every material action (`USER_REGISTER`, `USER_LOGIN`, `BUS_CREATE`, `TRIP_CREATE`, `SEAT_LOCK`, `BOOKING_CONFIRM`, `BOOKING_CANCEL`, `PAYMENT_SUCCESS`, `REFUND_PROCESSED`) writes an immutable entry into `AuditLog` storing actor, entity ID, action, diff details, IP, and timestamp.

---

## 7. Automated Test Suite & Evidence

The test suite runs natively via Node.js (`npm test --prefix server`):

| Test Suite | Tests | Purpose | Status |
| :--- | :---: | :--- | :---: |
| `auth.test.js` | 5 | Password hashing, JWT verification, RBAC `restrictTo`, PNR regex | ✅ Passed |
| `bookings.test.js` | 4 | Unique PNR generation, GST math, double-booking rejection, idempotency | ✅ Passed |
| `buses.test.js` | 4 | 2x2 layout, hybrid upper/lower decks, 2x1 3-col layout, plate regex | ✅ Passed |
| `cancellations.test.js` | 4 | Tiered refund percentages (90%, 50%, 0%), seat restoration | ✅ Passed |
| `payments.test.js` | 2 | Razorpay HMAC SHA256 signature verification, Rupee to Paise conversion | ✅ Passed |
| `reports.test.js` | 3 | Occupancy math, manifest passenger reconciliation, audit log schema | ✅ Passed |
| `trips.test.js` | 4 | Fare offsets, duration formatting, atomic seat lock race condition test | ✅ Passed |
| **Total** | **26** | **Core workflows, concurrency, security, and edge cases** | **✅ 100% Pass** |

---

## 8. Conclusion

The application satisfies all assessment criteria, guarantees data integrity under concurrent traffic, enforces strict role-based controls, provides rich operational reporting, and is fully explainable and ready for reviewer walkthrough.
