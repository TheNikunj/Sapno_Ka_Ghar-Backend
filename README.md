# Sapno Ka Ghar (Backend) 🏡⚡

This is the central nervous system for the **Sapno Ka Ghar** smart home automation platform. It is a robust Node.js and Express server that processes REST API requests, maintains secure user authentication, handles strict Role-Based Access Control (RBAC), and drives instantaneous bi-directional hardware communication via WebSockets.

---

## 🏗️ Core Architecture Overview

The backend is built strictly on the **MERN** stack (focusing on Mongo, Express, Node) combined with high-speed WebSockets. It acts as the bridge between standard human users (via the React Dashboard), System Admins, and raw IoT physical microcontrollers (ESP32 / Arduino).

### Key Technologies:
* **Node.js & Express**: Core routing framework and runtime engine.
* **Socket.io**: Real-time duplex communication for zero-latency hardware switching.
* **MongoDB (Mongoose)**: Secure dynamic storage for User Profiles, Hardware Topologies (Homes, Rooms, Devices), and transient 24-hour Activity Logs.
* **JWT (JSON Web Tokens)**: Stateless and mathematically secure payload tokens for authorization.
* **Bcrypt**: Cryptographic hashing to protect system passwords.

---

## 🛣️ Network Map (Routing Topology)

The system is broken down into two primary routing domains:

### 1. Security & Authentication (`/api/auth`)
Responsible for perimeter defense, creating accounts, logging in, and Admin-level system commands.
* `POST /api/auth/register` - Registers a new user.
* `POST /api/auth/login` - Authenticates user and returns an encrpyted `JWT`.
* `GET /api/auth/owners` - **(Admin Only)** Fetches aggregations of all deployed Smart Homes.
* `PUT /api/auth/block/:userId` - **(Admin Only)** Suspends an Owner's Smart Home instance globally.

### 2. Smart Home Management (`/api/home`)
Responsible for deploying hardware grids, mapping rooms, and access control within a specific House.
* `POST /api/home/setup` - Bootstraps a fresh Smart Home and generates a unique `homeCode` (e.g. `6822`).
* `POST /api/home/room` - Dynamically adds new scaling rooms to an existing Home.
* `GET /api/home/` - Safely resolves and returns the populated Home Object corresponding to the requester.
* `POST /api/home/join` - Relays a request from a Member to securely join an Owner's network.
* `PUT /api/home/approve/:memberId` - Grants cross-network access to pending users.
* `GET /api/home/notifications` - Pulls the latest historic operational logs.

---

## ⚡ The Socket Engine (Real-Time Actuation)

Because standard HTTP REST requests are too slow for physical light switches, the backend binds a `Socket.IO` engine directly over the Express HTTP Server.

1. **Grid Binding (`joinHome`)**: When a user or an ESP32 connects to the server, they emit a `joinHome` payload containing their isolated MongoDB ObjectId. This effectively quarantines them into a secure WebSocket "Room".
2. **The Command Pipeline (`toggleDevice`)**: A user hits a button. The payload `{ homeId, roomId, deviceId, state, userName }` is instantly transmitted.
3. **Optimistic Database Sync**: The server structurally locates the exact physical device inside the MongoDB schema `.id(deviceId)`, flips the `isOn` boolean, and saves it.
4. **Broadcast (`deviceUpdate`)**: The server then immediately shouts `deviceUpdate` to everyone in the quarantined room. 
   - The React UI hears this and gracefully animates.
   - The **ESP32 Hardware** hears this and physically applies 3.3v to the mapped GPIO jumper pin.
5. **Logging Sequence**: The backend automatically intercepts the command, builds an audit trail (`Notification` DB), and fires a pop-up Notification pulse.

---

## 🔐 Role-Based Access Control (RBAC)

The system enforces strict permission boundaries preventing cross-contamination.

1. **Admin**: Cannot access individual homes. They exist strictly on the `/admin` portal to monitor total system health, and suspend rogue Home Networks (`isBlocked`).
2. **Owner**: The "Home Creator". They possess native authority to build rooms, verify user join requests, modify hardware mapping, and authorize other local admins.
3. **Members**: Sub-users linked to an Owner's house. They can view the dashboard and toggle hardware, but they rely entirely on the Owner for verification rights.

---

## 🚀 Deployment Instructions

### Prerequisites
- Install `Node.js (v18+)`
- Install `MongoDB Community Edition` or acquire a `MongoDB Atlas` URI connection string.

### Standard Boot Sequence

1. CD into the directory: `cd Backend`
2. Install Engine Dependencies: `npm install`
3. Prepare a local `.env` file (Optional):
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=super_secret_jwt_key
   ```
4. Initiate Local Runtime: `npm run dev`
5. Initiate Production Runtime: `npm start`
