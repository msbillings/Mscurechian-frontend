# Multi-Hospital Admin Dashboard: Complete Upgrade & Architecture Guide

**Document Version:** 1.0  
**Last Updated:** January 7, 2026  
**Author:** CureChain Development Team

---

## 📚 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Data Handling & Management](#2-data-handling--management)
3. [Security Architecture](#3-security-architecture)
4. [API Design & Implementation](#4-api-design--implementation)
5. [Data Isolation & Multi-Tenancy](#5-data-isolation--multi-tenancy)
6. [Hospital Admin Dashboard Upgrade](#6-hospital-admin-dashboard-upgrade)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Best Practices & Patterns](#8-best-practices--patterns)
9. [Monitoring & Maintenance](#9-monitoring--maintenance)
10. [Troubleshooting & FAQs](#10-troubleshooting--faqs)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Super Admin  │  │ Hospital     │  │   Doctor     │          │
│  │  Dashboard   │  │   Admin      │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Helpdesk   │  │    Pharma    │  │    Labs      │          │
│  │  Dashboard   │  │   Dashboard  │  │  Dashboard   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Centralized API Integration (lib/integrations)        │     │
│  │  ├── Services (Client-side)                            │     │
│  │  ├── Actions (Server-side)                             │     │
│  │  ├── Types (TypeScript Definitions)                    │     │
│  │  └── Config (Endpoints, API Configuration)             │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │   Rate   │  │  Request │  │  Schema  │       │
│  │  Filter  │  │ Limiting │  │  Logger  │  │Validation│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Admin Routes   │  │   Auth Routes   │  │  Doctor Routes │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ Hospital Admin  │  │ Helpdesk Routes │  │  Pharma/Labs   │  │
│  │     Routes      │  │                 │  │     Routes     │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Controllers  │  │   Services   │  │  Validators  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Middleware   │  │   Helpers    │  │   Utils      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐     │
│  │  MongoDB Models & Schemas                              │     │
│  │  ├── User Model                                        │     │
│  │  ├── Hospital Model                                    │     │
│  │  ├── Appointment Model                                 │     │
│  │  ├── Prescription Model                                │     │
│  │  └── AuditLog Model                                    │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                              ↓↑
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   MongoDB        │  │   Redis Cache    │  │  File Store  │  │
│  │  (Primary DB)    │  │   (Sessions)     │  │   (AWS S3)   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Principles

#### **Separation of Concerns**

- Each layer has a distinct responsibility
- Frontend focuses on UI/UX
- Integration layer handles API communication
- Backend manages business logic
- Database layer handles data persistence

#### **Modularity**

- Each module (Admin, Hospital Admin, Doctor, etc.) is independent
- Shared components and utilities are centralized
- Easy to add new modules without affecting existing ones

#### **Scalability**

- Horizontal scaling capability
- Microservices-ready architecture
- Caching at multiple levels
- Database sharding support

---

## 2. Data Handling & Management

### 2.1 Data Flow Architecture

```
User Action (Frontend)
        ↓
State Management (React State/Zustand)
        ↓
Integration Layer (Services/Actions)
        ↓
API Request (HTTP/WebSocket)
        ↓
API Gateway (Validation, Auth)
        ↓
Route Handler (Express)
        ↓
Controller (Business Logic)
        ↓
Service Layer (Data Processing)
        ↓
Model/Schema (Mongoose)
        ↓
Database (MongoDB)
        ↓
Response Flow (Reverse)
```

### 2.2 Data Management Strategies

#### **2.2.1 Hospital-Specific Data Isolation**

Each hospital's data is isolated using the `hospitalId` field:

```typescript
// Schema Design
const UserSchema = new Schema({
  _id: ObjectId,
  name: String,
  email: String,
  role: String, // 'hospital-admin', 'doctor', 'helpdesk', etc.

  // CRITICAL: Hospital Association
  hospital: {
    type: ObjectId,
    ref: "Hospital",
    index: true, // Indexed for fast queries
  },

  // Additional fields
  createdAt: Date,
  updatedAt: Date,
});

// Compound index for role-hospital queries
UserSchema.index({ role: 1, hospital: 1 });

// Example: Fetching doctors for a specific hospital
const doctors = await User.find({
  role: "doctor",
  hospital: hospitalId,
  status: "active",
});
```

#### **2.2.2 Data Scoping by Role**

```typescript
// Middleware to automatically scope queries by hospital
const hospitalScopeMiddleware = async (req, res, next) => {
  const user = req.user; // From auth middleware

  if (user.role === "hospital-admin") {
    // Hospital admins only see their hospital's data
    req.hospitalFilter = { hospital: user.hospital };
  } else if (user.role === "doctor") {
    // Doctors only see their hospital's data
    req.hospitalFilter = { hospital: user.hospital };
  } else if (user.role === "super-admin" || user.role === "admin") {
    // Super admins see all data
    req.hospitalFilter = {};
  }

  next();
};

// Usage in routes
router.get("/doctors", protect, hospitalScopeMiddleware, async (req, res) => {
  const doctors = await User.find({
    role: "doctor",
    ...req.hospitalFilter, // Automatically applied
  });

  res.json(doctors);
});
```

#### **2.2.3 Data Aggregation for Hospital Admins**

```typescript
// Hospital Admin Dashboard Data
const getHospitalAdminDashboard = async (hospitalId) => {
  const [stats, doctors, appointments, patients] = await Promise.all([
    // Get stats
    {
      totalDoctors: await User.countDocuments({
        hospital: hospitalId,
        role: "doctor",
      }),
      totalHelpdesk: await User.countDocuments({
        hospital: hospitalId,
        role: "helpdesk",
      }),
      totalPatients: await getUniquePatientCount(hospitalId),
      todayAppointments: await Appointment.countDocuments({
        hospital: hospitalId,
        date: { $gte: startOfToday, $lte: endOfToday },
      }),
    },

    // Get doctors list
    User.find({
      hospital: hospitalId,
      role: "doctor",
    }).select("name email specialties status"),

    // Get today's appointments
    Appointment.find({
      hospital: hospitalId,
      date: { $gte: startOfToday, $lte: endOfToday },
    }).populate("doctor patient"),

    // Get recent patients
    getRecentPatients(hospitalId, 10),
  ]);

  return { stats, doctors, appointments, patients };
};
```

#### **2.2.4 Caching Strategy**

```typescript
// Redis caching for frequently accessed data
const getCachedData = async (key, fetcher, ttl = 300) => {
  // Try to get from cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const data = await fetcher();

  // Store in cache
  await redis.setex(key, ttl, JSON.stringify(data));

  return data;
};

// Usage
const hospitalStats = await getCachedData(
  `hospital:${hospitalId}:stats`,
  () => calculateHospitalStats(hospitalId),
  60 // 1 minute TTL
);
```

### 2.3 Real-Time Data Synchronization

#### **2.3.1 WebSocket Implementation**

```typescript
// Backend: Socket.io setup
import { Server } from "socket.io";

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Socket authentication
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    socket.user = user;
    socket.hospitalId = user.hospital;
    socket.role = user.role;

    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// Join hospital-specific rooms
io.on("connection", (socket) => {
  const { hospitalId, role } = socket;

  // Join hospital room
  socket.join(`hospital:${hospitalId}`);

  // Join role-specific room
  socket.join(`hospital:${hospitalId}:${role}`);

  console.log(`User ${socket.user.name} joined hospital ${hospitalId}`);
});

// Emit events to specific hospital
const emitToHospital = (hospitalId, event, data) => {
  io.to(`hospital:${hospitalId}`).emit(event, data);
};

// Example: New appointment created
router.post("/appointments", async (req, res) => {
  const appointment = await Appointment.create(req.body);

  // Emit to all users in the hospital
  emitToHospital(req.user.hospital, "appointment:created", appointment);

  res.json(appointment);
});
```

#### **2.3.2 Frontend WebSocket Integration**

```typescript
// Frontend: Socket client
import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      auth: { token },
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      console.log("Socket connected");
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export const socketService = new SocketService();

// Usage in React component
useEffect(() => {
  socketService.connect(authToken);

  socketService.on("appointment:created", (appointment) => {
    toast.success("New appointment created!");
    // Update local state
    setAppointments((prev) => [...prev, appointment]);
  });

  return () => socketService.disconnect();
}, [authToken]);
```

---

## 3. Security Architecture

### 3.1 Authentication & Authorization

#### **3.1.1 JWT-Based Authentication**

```typescript
// Token Structure
interface JWTPayload {
  id: string; // User ID
  email: string; // User email
  role: string; // User role
  hospital?: string; // Hospital ID (if applicable)
  permissions: string[]; // User permissions
  iat: number; // Issued at
  exp: number; // Expiration
}

// Token Generation
const generateToken = (user: User) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      hospital: user.hospital,
      permissions: user.permissions,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "24h" }
  );
};

// Token Verification Middleware
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ error: "User not found" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
```

#### **3.1.2 Role-Based Access Control (RBAC)**

```typescript
// Permission definitions
const PERMISSIONS = {
  // Super Admin
  "super-admin": [
    "hospital.create",
    "hospital.read",
    "hospital.update",
    "hospital.delete",
    "user.create",
    "user.read",
    "user.update",
    "user.delete",
    "analytics.view",
    "settings.manage",
  ],

  // Hospital Admin
  "hospital-admin": [
    "hospital.read", // Can view their own hospital
    "hospital.update", // Can update their own hospital
    "doctor.create", // Can create doctors
    "doctor.read", // Can view doctors
    "doctor.update", // Can update doctors
    "helpdesk.create", // Can create helpdesk staff
    "helpdesk.read", // Can view helpdesk staff
    "pharma.create", // Can create pharma staff
    "labs.create", // Can create labs staff
    "analytics.view", // Can view hospital analytics
    "appointment.read", // Can view appointments
  ],

  // Doctor
  doctor: [
    "appointment.read",
    "appointment.update",
    "patient.read",
    "prescription.create",
    "prescription.read",
    "prescription.update",
  ],

  // Helpdesk
  helpdesk: [
    "appointment.create",
    "appointment.read",
    "patient.create",
    "patient.read",
    "patient.update",
    "doctor.read",
  ],

  // Pharma
  pharma: ["prescription.read", "medication.dispense", "inventory.manage"],

  // Labs
  labs: ["test.create", "test.read", "result.create", "result.read"],
};

// Authorization middleware
const authorize = (...permissions: string[]) => {
  return (req, res, next) => {
    const userPermissions = PERMISSIONS[req.user.role] || [];

    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions",
      });
    }

    next();
  };
};

// Usage
router.post("/doctors", protect, authorize("doctor.create"), createDoctor);

router.delete(
  "/hospitals/:id",
  protect,
  authorize("hospital.delete"),
  deleteHospital
);
```

#### **3.1.3 Hospital-Level Authorization**

```typescript
// Ensure user can only access their hospital's data
const authorizeHospital = async (req, res, next) => {
  const { id } = req.params; // Resource ID
  const resourceType = req.route.path.split("/")[1]; // e.g., 'doctors'

  // Super admins can access everything
  if (req.user.role === "super-admin" || req.user.role === "admin") {
    return next();
  }

  try {
    let resource;

    switch (resourceType) {
      case "doctors":
        resource = await User.findById(id);
        break;
      case "appointments":
        resource = await Appointment.findById(id);
        break;
      case "patients":
        resource = await Patient.findById(id);
        break;
      default:
        return res.status(400).json({ error: "Invalid resource type" });
    }

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Check if resource belongs to user's hospital
    if (resource.hospital.toString() !== req.user.hospital.toString()) {
      return res.status(403).json({
        error: "Access denied: Resource belongs to another hospital",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: "Authorization check failed" });
  }
};

// Usage
router.get("/doctors/:id", protect, authorizeHospital, getDoctorById);
```

### 3.2 Data Encryption

#### **3.2.1 Data at Rest**

```typescript
// Encrypt sensitive fields in database
import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (text: string): string => {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

// Use in Schema
const PatientSchema = new Schema({
  name: String,
  email: String,

  // Encrypted fields
  medicalHistory: {
    type: String,
    set: (value: string) => encrypt(value),
    get: (value: string) => (value ? decrypt(value) : null),
  },

  allergies: {
    type: String,
    set: (value: string) => encrypt(value),
    get: (value: string) => (value ? decrypt(value) : null),
  },
});

PatientSchema.set("toJSON", { getters: true });
```

#### **3.2.2 Data in Transit**

```typescript
// HTTPS enforcement
app.use((req, res, next) => {
  if (
    req.headers["x-forwarded-proto"] !== "https" &&
    process.env.NODE_ENV === "production"
  ) {
    return res.redirect("https://" + req.headers.host + req.url);
  }
  next();
});

// Security headers
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", process.env.API_URL],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
import cors from "cors";

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

### 3.3 Audit Logging

```typescript
// Audit log schema
const AuditLogSchema = new Schema({
  userId: { type: ObjectId, ref: "User", required: true },
  hospitalId: { type: ObjectId, ref: "Hospital" },
  action: { type: String, required: true }, // e.g., 'CREATE_DOCTOR'
  resource: { type: String, required: true }, // e.g., 'User'
  resourceId: { type: ObjectId },
  details: { type: Object },
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
});

// Audit middleware
const auditLog = (action: string, resource: string) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method
    res.json = function (data) {
      // Create audit log
      AuditLog.create({
        userId: req.user._id,
        hospitalId: req.user.hospital,
        action,
        resource,
        resourceId: data._id || req.params.id,
        details: {
          method: req.method,
          path: req.path,
          body: req.body,
          query: req.query,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      }).catch((err) => console.error("Audit log error:", err));

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

// Usage
router.post(
  "/doctors",
  protect,
  authorize("doctor.create"),
  auditLog("CREATE_DOCTOR", "User"),
  createDoctor
);

router.delete(
  "/hospitals/:id",
  protect,
  authorize("hospital.delete"),
  auditLog("DELETE_HOSPITAL", "Hospital"),
  deleteHospital
);
```

---

## 4. API Design & Implementation

### 4.1 RESTful API Structure

#### **4.1.1 Endpoint Organization**

```
/api
├── /auth
│   ├── POST   /login
│   ├── POST   /register
│   ├── POST   /logout
│   ├── POST   /refresh
│   ├── GET    /me
│   └── POST   /forgot-password
│
├── /admin (Super Admin)
│   ├── GET    /dashboard
│   ├── GET    /hospitals
│   ├── POST   /create-hospital
│   ├── PUT    /hospitals/:id
│   ├── DELETE /hospitals/:id
│   ├── GET    /users
│   ├── POST   /create-admin
│   ├── POST   /create-hospital-admin
│   ├── POST   /create-doctor
│   └── POST   /broadcast
│
├── /hospital-admin
│   ├── GET    /dashboard       (Hospital-specific)
│   ├── GET    /hospital        (Own hospital only)
│   ├── PUT    /hospital        (Update own hospital)
│   ├── GET    /doctors         (Own hospital's doctors)
│   ├── POST   /doctors         (Create doctor for own hospital)
│   ├── GET    /helpdesks       (Own hospital's helpdesk)
│   ├── POST   /helpdesks       (Create helpdesk for own hospital)
│   ├── POST   /pharma          (Create pharma staff)
│   ├── POST   /labs            (Create labs staff)
│   ├── GET    /patients        (Own hospital's patients)
│   ├── GET    /appointments    (Own hospital's appointments)
│   ├── GET    /analytics       (Own hospital's analytics)
│   └── POST   /message/:userId (Message staff)
│
├── /doctor
│   ├── GET    /dashboard
│   ├── GET    /me
│   ├── GET    /my-patients
│   ├── GET    /appointments
│   ├── POST   /appointments/:id/start
│   ├── POST   /appointments/:id/complete
│   ├── POST   /prescriptions
│   └── GET    /hospital-info   (View own hospital info)
│
├── /helpdesk
│   ├── GET    /dashboard
│   ├── GET    /me
│   ├── GET    /doctors         (Own hospital's doctors)
│   ├── POST   /appointments    (Book in own hospital)
│   ├── POST   /patients        (Register patient)
│   └── GET    /hospital-info   (View own hospital info)
│
├── /pharma
│   ├── GET    /dashboard
│   ├── GET    /prescriptions   (Own hospital)
│   ├── POST   /dispense/:id
│   └── GET    /inventory
│
└── /labs
    ├── GET    /dashboard
    ├── GET    /test-requests   (Own hospital)
    ├── POST   /results/:id
    └── GET    /equipment
```

#### **4.1.2 Request/Response Standards**

```typescript
// Standard Success Response
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Standard Error Response
interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  code?: string;
}

// Example Implementation
const getDoctors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const doctors = await User.find({
      role: "doctor",
      hospital: req.user.hospital,
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select("-password");

    const total = await User.countDocuments({
      role: "doctor",
      hospital: req.user.hospital,
    });

    res.json({
      success: true,
      data: doctors,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch doctors",
      code: "FETCH_DOCTORS_ERROR",
    });
  }
};
```

### 4.2 Frontend API Integration Pattern

#### **4.2.1 Service Layer**

```typescript
// lib/integrations/services/hospitalAdmin.service.ts

import { apiClient } from "../api";
import { HOSPITAL_ADMIN_ENDPOINTS } from "../config";
import type {
  HospitalAdminDashboard,
  Doctor,
  Helpdesk,
  Patient,
  Appointment,
} from "../types";

export const hospitalAdminService = {
  // Dashboard
  getDashboard: () =>
    apiClient<HospitalAdminDashboard>(HOSPITAL_ADMIN_ENDPOINTS.DASHBOARD),

  // Doctors
  getDoctors: (params?: { page?: number; limit?: number }) =>
    apiClient<{ data: Doctor[]; meta: any }>(
      `${HOSPITAL_ADMIN_ENDPOINTS.DOCTORS}?${new URLSearchParams(params)}`
    ),

  createDoctor: (data: CreateDoctorRequest) =>
    apiClient<Doctor>(HOSPITAL_ADMIN_ENDPOINTS.CREATE_DOCTOR, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateDoctor: (id: string, data: Partial<Doctor>) =>
    apiClient<Doctor>(`${HOSPITAL_ADMIN_ENDPOINTS.DOCTORS}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Helpdesk
  getHelpdesks: () =>
    apiClient<{ data: Helpdesk[] }>(HOSPITAL_ADMIN_ENDPOINTS.HELPDESKS),

  createHelpdesk: (data: CreateHelpdeskRequest) =>
    apiClient<Helpdesk>(HOSPITAL_ADMIN_ENDPOINTS.CREATE_HELPDESK, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Patients
  getPatients: (params?: { search?: string; page?: number }) =>
    apiClient<{ data: Patient[]; meta: any }>(
      `${HOSPITAL_ADMIN_ENDPOINTS.PATIENTS}?${new URLSearchParams(params)}`
    ),

  // Appointments
  getAppointments: (date?: string) =>
    apiClient<{ data: Appointment[] }>(
      `${HOSPITAL_ADMIN_ENDPOINTS.APPOINTMENTS}${date ? `?date=${date}` : ""}`
    ),

  // Analytics
  getAnalytics: (period?: "day" | "week" | "month") =>
    apiClient<any>(
      `${HOSPITAL_ADMIN_ENDPOINTS.ANALYTICS}?period=${period || "day"}`
    ),

  // Communication
  sendMessage: (userId: string, message: string) =>
    apiClient<any>(`${HOSPITAL_ADMIN_ENDPOINTS.MESSAGE}/${userId}`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
```

#### **4.2.2 React Component Usage**

```typescript
// app/hospital-admin/dashboard/page.tsx

"use client";

import { useState, useEffect } from "react";
import { hospitalAdminService } from "@/lib/integrations";
import toast from "react-hot-toast";

export default function HospitalAdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await hospitalAdminService.getDashboard();
      setDashboard(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1>Hospital Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Doctors" value={dashboard.stats.totalDoctors} />
        <StatCard
          title="Appointments Today"
          value={dashboard.stats.todayAppointments}
        />
        <StatCard title="Patients" value={dashboard.stats.totalPatients} />
        <StatCard title="Revenue" value={`₹${dashboard.stats.revenue}`} />
      </div>

      {/* Doctors List */}
      <DoctorsList doctors={dashboard.doctors} />

      {/* Appointments */}
      <AppointmentsList appointments={dashboard.appointments} />
    </div>
  );
}
```

---

## 5. Data Isolation & Multi-Tenancy

### 5.1 Multi-Tenancy Strategy

#### **5.1.1 Shared Database, Isolated Data**

```
┌─────────────────────────────────────────────────────────────┐
│                     MongoDB Database                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Users Collection                                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │ { _id, name, email, role, hospital: "HOSP001" }    │     │
│  │ { _id, name, email, role, hospital: "HOSP002" }    │     │
│  │ { _id, name, email, role, hospital: "HOSP001" }    │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Appointments Collection                                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │ { _id, patient, doctor, hospital: "HOSP001" }      │     │
│  │ { _id, patient, doctor, hospital: "HOSP002" }      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Prescriptions Collection                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │ { _id, doctor, patient, hospital: "HOSP001" }      │     │
│  │ { _id, doctor, patient, hospital: "HOSP002" }      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**

- All hospitals share the same database
- Every document has a `hospital` field
- Queries are automatically scoped by hospital
- Indexes on `hospital` field ensure fast queries
- Super admins can query across all hospitals

### 5.2 Data Isolation Patterns

#### **5.2.1 Mongoose Middleware for Auto-Scoping**

```typescript
// Apply to all schemas
const applyHospitalScoping = (schema: Schema) => {
  // Add hospital field if not exists
  if (!schema.path("hospital")) {
    schema.add({
      hospital: {
        type: Schema.Types.ObjectId,
        ref: "Hospital",
        required: true,
        index: true,
      },
    });
  }

  // Auto-add hospital filter to queries
  schema.pre(/^find/, function (next) {
    // Get the current user's hospital from context
    const hospital = this.getOptions().hospital;

    if (hospital) {
      this.where({ hospital });
    }

    next();
  });
};

// Apply to schemas
applyHospitalScoping(UserSchema);
applyHospitalScoping(AppointmentSchema);
applyHospitalScoping(PrescriptionSchema);

// Usage with context
const doctors = await User.find({ role: "doctor" }).setOptions({
  hospital: req.user.hospital,
});
```

#### **5.2.2 Query Helper Functions**

```typescript
// Centralized query functions with automatic scoping
class HospitalQuery {
  constructor(private hospitalId: string) {}

  async findUsers(filter: any = {}) {
    return User.find({
      ...filter,
      hospital: this.hospitalId,
    });
  }

  async findAppointments(filter: any = {}) {
    return Appointment.find({
      ...filter,
      hospital: this.hospitalId,
    });
  }

  async countDocuments(model: any, filter: any = {}) {
    return model.countDocuments({
      ...filter,
      hospital: this.hospitalId,
    });
  }

  async aggregate(model: any, pipeline: any[]) {
    return model.aggregate([
      { $match: { hospital: this.hospitalId } },
      ...pipeline,
    ]);
  }
}

// Usage in controllers
const hospitalQuery = new HospitalQuery(req.user.hospital);

const doctors = await hospitalQuery.findUsers({ role: "doctor" });
const appointments = await hospitalQuery.findAppointments({
  date: { $gte: today },
});
```

### 5.3 Cross-Hospital Data Access (Super Admin)

```typescript
// Super Admin can access all hospitals
const getSuperAdminDashboard = async () => {
  // Aggregate data across all hospitals
  const hospitalStats = await Hospital.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "hospital",
        as: "users",
      },
    },
    {
      $lookup: {
        from: "appointments",
        localField: "_id",
        foreignField: "hospital",
        as: "appointments",
      },
    },
    {
      $project: {
        name: 1,
        totalDoctors: {
          $size: {
            $filter: {
              input: "$users",
              as: "user",
              cond: { $eq: ["$$user.role", "doctor"] },
            },
          },
        },
        totalAppointments: { $size: "$appointments" },
      },
    },
  ]);

  return hospitalStats;
};
```

---

## 6. Hospital Admin Dashboard Upgrade

### 6.1 Feature Modules

#### **6.1.1 Dashboard Overview Component**

```typescript
// components/hospital-admin/Dashboard.tsx

interface DashboardProps {
  hospitalId: string;
}

export function Dashboard({ hospitalId }: DashboardProps) {
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Real-time updates
  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Subscribe to real-time updates
    socketService.on("stats:updated", (newStats) => {
      setStats(newStats);
    });

    // Polling fallback (every 30 seconds)
    const interval = setInterval(fetchStats, 30000);

    return () => {
      clearInterval(interval);
      socketService.off("stats:updated");
    };
  }, [hospitalId]);

  const fetchStats = async () => {
    const data = await hospitalAdminService.getDashboard();
    setStats(data.stats);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <StatsGrid stats={stats} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Today's Schedule */}
      <TodaysSchedule />

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}
```

#### **6.1.2 Doctor Management Module**

```typescript
// components/hospital-admin/DoctorManagement.tsx

export function DoctorManagement() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDoctors();

    // Real-time doctor updates
    socketService.on("doctor:created", (doctor) => {
      setDoctors((prev) => [...prev, doctor]);
      toast.success(`New doctor ${doctor.name} added!`);
    });

    socketService.on("doctor:updated", (doctor) => {
      setDoctors((prev) =>
        prev.map((d) => (d._id === doctor._id ? doctor : d))
      );
    });

    return () => {
      socketService.off("doctor:created");
      socketService.off("doctor:updated");
    };
  }, []);

  const fetchDoctors = async () => {
    const { data } = await hospitalAdminService.getDoctors();
    setDoctors(data);
  };

  const handleViewDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsModalOpen(true);
  };

  const handleMessageDoctor = async (doctor: Doctor) => {
    // Open chat interface
    router.push(`/hospital-admin/messages/${doctor._id}`);
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Doctor Management</h1>
        <Button onClick={() => router.push("/hospital-admin/create-doctor")}>
          Add New Doctor
        </Button>
      </header>

      {/* Filters */}
      <Filters />

      {/* Doctor List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.map((doctor) => (
          <DoctorCard
            key={doctor._id}
            doctor={doctor}
            onView={() => handleViewDoctor(doctor)}
            onMessage={() => handleMessageDoctor(doctor)}
          />
        ))}
      </div>

      {/* Doctor Details Modal */}
      <DoctorDetailsModal
        isOpen={isModalOpen}
        doctor={selectedDoctor}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
```

#### **6.1.3 Helpdesk Communication Module**

```typescript
// components/hospital-admin/HelpdeskCommunication.tsx

export function HelpdeskCommunication() {
  const [helpdesks, setHelpdesks] = useState<Helpdesk[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedHelpdesk, setSelectedHelpdesk] = useState<string | null>(null);

  useEffect(() => {
    fetchHelpdesks();
  }, []);

  useEffect(() => {
    if (selectedHelpdesk) {
      fetchMessages(selectedHelpdesk);

      // Subscribe to new messages
      socketService.on(`message:${selectedHelpdesk}`, (message) => {
        setMessages((prev) => [...prev, message]);
      });

      return () => {
        socketService.off(`message:${selectedHelpdesk}`);
      };
    }
  }, [selectedHelpdesk]);

  const fetchHelpdesks = async () => {
    const { data } = await hospitalAdminService.getHelpdesks();
    setHelpdesks(data);
  };

  const fetchMessages = async (helpdeskId: string) => {
    const data = await hospitalAdminService.getMessages(helpdeskId);
    setMessages(data);
  };

  const sendMessage = async (message: string) => {
    if (!selectedHelpdesk) return;

    await hospitalAdminService.sendMessage(selectedHelpdesk, message);
    socketService.emit("message:send", {
      to: selectedHelpdesk,
      message,
    });
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-200px)]">
      {/* Helpdesk List */}
      <div className="col-span-1 border-r">
        <h2 className="text-lg font-bold mb-4">Front Desk Staff</h2>
        <div className="space-y-2">
          {helpdesks.map((helpdesk) => (
            <HelpdeskItem
              key={helpdesk._id}
              helpdesk={helpdesk}
              isSelected={selectedHelpdesk === helpdesk._id}
              onClick={() => setSelectedHelpdesk(helpdesk._id)}
            />
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="col-span-2 flex flex-col">
        {selectedHelpdesk ? (
          <>
            <ChatHeader
              helpdesk={helpdesks.find((h) => h._id === selectedHelpdesk)!}
            />
            <MessagesArea messages={messages} />
            <MessageInput onSend={sendMessage} />
          </>
        ) : (
          <EmptyState message="Select a staff member to start chatting" />
        )}
      </div>
    </div>
  );
}
```

### 6.2 Analytics Module

```typescript
// components/hospital-admin/Analytics.tsx

export function Analytics() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    const data = await hospitalAdminService.getAnalytics(period);
    setAnalytics(data);
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Revenue Chart */}
      <Card title="Revenue Trends">
        <LineChart data={analytics?.revenue} />
      </Card>

      {/* Appointment Analytics */}
      <Card title="Appointment Analytics">
        <BarChart data={analytics?.appointments} />
      </Card>

      {/* Department Performance */}
      <Card title="Department Performance">
        <div className="grid grid-cols-2 gap-4">
          {analytics?.departments?.map((dept) => (
            <DepartmentCard key={dept.name} department={dept} />
          ))}
        </div>
      </Card>

      {/* Doctor Productivity */}
      <Card title="Doctor Productivity">
        <Table
          columns={[
            "Doctor",
            "Patients Seen",
            "Avg Consultation Time",
            "Revenue",
          ]}
          data={analytics?.doctorStats}
        />
      </Card>
    </div>
  );
}
```

---

## 7. Implementation Roadmap

### Week 1-2: Foundation

- [ ] Set up hospital scoping middleware
- [ ] Implement RBAC system
- [ ] Create hospital admin service layer
- [ ] Build basic dashboard UI

### Week 3-4: Core Features

- [ ] Doctor management module
- [ ] Helpdesk management module
- [ ] Pharma/Labs staff creation
- [ ] Basic analytics

### Week 5-6: Communication

- [ ] WebSocket implementation
- [ ] Real-time notifications
- [ ] In-app messaging
- [ ] Broadcast system

### Week 7-8: Analytics & Reporting

- [ ] Advanced analytics dashboard
- [ ] Custom reports
- [ ] Data export functionality
- [ ] Performance metrics

### Week 9-10: Testing & Optimization

- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance optimization
- [ ] Security audit

---

## 8. Best Practices & Patterns

### 8.1 Code Organization

- Use feature-based folder structure
- Keep components small and focused
- Extract reusable logic into hooks
- Use TypeScript strictly

### 8.2 Performance

- Implement pagination for large lists
- Use React.memo for expensive components
- Debounce search inputs
- Optimize database queries with indexes

### 8.3 Security

- Never trust client input
- Always validate on server
- Use prepared statements (Mongoose handles this)
- Implement rate limiting
- Log all sensitive operations

---

## 9. Monitoring & Maintenance

### 9.1 Monitoring

- Set up application monitoring (e.g., Sentry)
- Monitor API response times
- Track error rates
- Monitor database performance

### 9.2 Maintenance

- Regular security updates
- Database backups
- Performance audits
- Code refactoring

---

## 10. Troubleshooting & FAQs

### Q: How to handle hospital switching?

A: Users belong to one hospital. Super admins can view all.

### Q: How to ensure data isolation?

A: Every query is automatically scoped by hospitalId.

### Q: How to scale for more hospitals?

A: Use database sharding and caching strategies.

---

**End of Document**
