<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<p align="center">
  ⏱️ <b>Timekeeping System</b> – Backend service built with <a href="https://nestjs.com">NestJS 11</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeORM-FE0803?style=for-the-badge&logo=typeorm&logoColor=white" alt="TypeORM" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />
</p>

---

## 📖 Overview

The **Timekeeping System** is a monolithic backend service designed for precise timekeeping and human resources management. It processes raw attendance data, manages employee master data, synchronizes approval requests from external systems (like Base, Lark), and uses an automatic engine to calculate accurate timesheets based on defined shifts, late/early penalties, and various approval rules.

## ✨ Features

- **Master Data (Employee Management)**: Manage employee profiles, including bulk imports and updates.
- **Attendance Processing Pipeline**: Ingest raw attendance data from devices or external sources and run calculations against work shifts locally.
- **Approval Management System**: Receive and process complex external workflows for options like `LEAVE`, `REMOTE`, `OVERTIME`, `CORRECTION`, `MATERNITY`, and `SWAP`.
- **Automated Calculations Engine**: In-process background processing determines real working hours, workday counts, late/early penalties, and valid attendance thresholds in real-time.
- **Time Reporting**: Generate daily and monthly attendance timesheets.

---

## 📐 Architecture & Data Flow

The system operates with an **In-process Architecture**, allowing for optimal responsiveness and easy maintainability without managing external message queues right out of the box.

### 1. Attendance Processing
1. **Ingestion**: Raw check-in/out records are submitted via APIs.
2. **Persistence**: Records are saved to `attendance_raw`.
3. **Calculation (In-process)**: The `AttendanceEngine` asynchronously processes data for the current day.
4. **Storage**: Consolidated timesheet records are saved to `attendance_daily`.

### 2. Leave & Approval Flow
1. **Ingestion**: Approvals from third-party systems are pushed into the API.
2. **Persistence**: Approved requests (e.g., Leave, Overtime) are finalized and logged.
3. **Recalculation**: The system determines the impacted dates and queues asynchronous, in-process jobs to re-run the `AttendanceEngine` over the respective timesheets, reflecting the changes immediately.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Yarn
- Docker & Docker Compose (for the database)

### 1. Installation

Clone the repository and install the dependencies:

```bash
yarn install
```

### 2. Environment Configuration

Copy the example environment variables and adjust them to your setup:

```bash
cp .env.example .env
```
Ensure the `DATABASE_URL` or standard database parameters refer to your PostgreSQL host.

### 3. Database & Docker setup

To spin up development PostgreSQL instance easily via Docker Compose:

```bash
docker-compose up db -d
```

### 4. Running the Application

To run the application in watch mode during development:

```bash
# Watch mode
yarn start:dev
```

Other available commands:
```bash
# Production build
yarn build

# Run production
yarn start:prod
```

### 5. Running Full System with Docker

If you want to run both the Database and the API Application using Docker Compose::

```bash
docker-compose up -d --build
```
> This will boot `db`, `migration`, and `api-app` instances.

---

## 🗄️ Database Management (TypeORM)

This project uses TypeORM to manage schemas. Execute the following commands to process schema syncs securely.

```bash
# Generate a new migration based on entity changes
yarn migration:generate

# Execute pending migrations
yarn migration:run

# Revert the most recent migration
yarn migration:revert

# Run Seeders
yarn seed:run
# OR (depending on local setup)
yarn seed-v2:run
```

---

## 📚 API Documentation

The application exposes structured REST APIs. Once running, explore all endpoints via the Swagger Dashboard:

👉 **[Swagger UI: http://localhost:3000/apis/docs](http://localhost:3000/apis/docs)**

---

## 🧪 Testing

```bash
# Unit tests
yarn test

# Test watch mode
yarn test:watch

# Test coverage
yarn test:cov

# E2E tests
yarn test:e2e
```