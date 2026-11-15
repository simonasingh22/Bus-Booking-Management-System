# 📊 Database Design & Entity Relationship (ER) Documentation

**ALGIONS AI LABS PRIVATE LIMITED – Bus Booking Management System**  
**Phase 2: Database Design & Schemas**

---

## 1. Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    USER ||--o{ BOOKING : "places"
    USER ||--o{ AUDIT_LOG : "triggers"
    OPERATOR ||--o{ USER : "staff/admin"
    OPERATOR ||--o{ BUS : "operates"
    OPERATOR ||--o{ TRIP : "manages"
    OPERATOR ||--o{ BOOKING : "fulfills"
    BUS ||--o{ TRIP : "assigned_to"
    ROUTE ||--o{ TRIP : "traversed_by"
    TRIP ||--|{ SEAT : "contains_inventory"
    TRIP ||--o{ BOOKING : "reserved_for"
    BOOKING ||--o{ SEAT : "reserves"
    BOOKING ||--|| PAYMENT : "settled_via"
    BOOKING ||--o| CANCELLATION : "refunded_through"

    USER {
        ObjectId _id PK
        String name
        String email UK
        String password
        String phone
        String role "customer | operator | admin"
        ObjectId operatorId FK
        Boolean isActive
        Date createdAt
        Date updatedAt
    }

    OPERATOR {
        ObjectId _id PK
        String name UK
        String contactEmail
        String contactPhone
        String licenseNumber UK
        Object address
        Number rating
        Boolean isActive
        Object cancellationPolicy
        Date createdAt
    }

    BUS {
        ObjectId _id PK
        String busNumber UK
        ObjectId operatorId FK
        String name
        String busType "AC Sleeper | Non-AC Seater | Volvo ..."
        Number totalSeats
        String layoutType "2x2 | 2x1 | 1x2 | sleeper-2x1"
        Array seatTemplate
        Array amenities
        String status "active | maintenance | inactive"
    }

    ROUTE {
        ObjectId _id PK
        String sourceCity
        String sourceState
        String destinationCity
        String destinationState
        Number distanceKm
        Number estimatedDurationMinutes
        Array stops
        Boolean isActive
    }

    TRIP {
        ObjectId _id PK
        String tripCode UK
        ObjectId busId FK
        ObjectId operatorId FK
        ObjectId routeId FK
        Date departureDate
        String departureTime
        Date arrivalDate
        String arrivalTime
        Object fares "seater, sleeper"
        Array boardingPoints
        Array droppingPoints
        Number totalSeats
        Number availableSeats
        String status "scheduled | boarding | in-transit | completed | cancelled"
    }

    SEAT {
        ObjectId _id PK
        ObjectId tripId FK
        ObjectId busId FK
        String seatNumber "UK with tripId"
        String deck "lower | upper"
        String seatType "seater | sleeper"
        Number fare
        String status "available | locked | booked"
        ObjectId lockedBy FK
        Date lockExpiresAt
        ObjectId bookingId FK
        Boolean isLadiesOnly
    }

    BOOKING {
        ObjectId _id PK
        String pnr UK
        ObjectId userId FK
        ObjectId tripId FK
        ObjectId operatorId FK
        ObjectId busId FK
        ObjectId routeId FK
        Array passengers
        Number totalSeats
        Number totalBaseFare
        Number gstAmount
        Number totalAmount
        Object boardingPoint
        Object droppingPoint
        String bookingStatus "pending | confirmed | cancelled | failed"
        String paymentStatus "pending | paid | failed | refunded"
        ObjectId paymentId FK
        String idempotencyKey UK
        Date createdAt
    }

    PAYMENT {
        ObjectId _id PK
        ObjectId bookingId FK
        ObjectId userId FK
        Number amount
        String currency "INR"
        String gateway "razorpay"
        String razorpayOrderId
        String razorpayPaymentId
        String status "created | captured | failed | refunded"
        Object refund
        Date createdAt
    }

    CANCELLATION {
        ObjectId _id PK
        ObjectId bookingId FK
        String pnr
        ObjectId userId FK
        ObjectId tripId FK
        ObjectId operatorId FK
        Array seatsCancelled
        Number refundAmount
        Number cancellationCharge
        Number refundPercentage
        String refundStatus "pending | processed | failed"
        String refundTransactionId
        Date cancellationDate
    }

    AUDIT_LOG {
        ObjectId _id PK
        ObjectId userId FK
        String action
        String entityType
        String entityId
        Object details
        String ipAddress
        Date timestamp
    }
```

---

## 2. Key Data Integrity Guarantees

### A. Duplicate Booking Prevention (Acceptance Test 2)
1. **Compound Unique Index**: `Seat.index({ tripId: 1, seatNumber: 1 }, { unique: true })`
   - Even in simultaneous booking attempts, MongoDB rejects duplicate insertions.
2. **Atomic Conditional Updates / Transactions**:
   - Seat locking or booking performs `Seat.findOneAndUpdate({ tripId, seatNumber, status: 'available' }, { status: 'locked', lockedBy, lockExpiresAt })`.
   - If two requests collide for the same seat, exactly one succeeds and the other receives an HTTP 409 Conflict error.

### B. Unique PNR and Financial Idempotency
- **Unique PNR**: `Booking.index({ pnr: 1 }, { unique: true })`.
- **Idempotency Key**: Prevents double-charging or duplicate bookings during retried network requests.

### C. Scalable Search & Query Indexes
- `Trip.index({ routeId: 1, departureDate: 1, status: 1 })`
- `Route.index({ sourceCity: 1, destinationCity: 1, isActive: 1 })`
- `Booking.index({ userId: 1, createdAt: -1 })`
- `Seat.index({ tripId: 1, status: 1 })`
- `Seat.index({ lockExpiresAt: 1 })` (for automatic lock expiration)
