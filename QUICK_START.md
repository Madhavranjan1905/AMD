# Doctor and Patient Management Backend - Quick Start Guide

## Project Structure

```
├── server.js                 # Main server entry point
├── package.json             # Node dependencies
├── Dockerfile               # Container setup
├── docker-compose.yml       # Multi-container orchestration
├── .env                     # Environment variables
├── .dockerignore            # Files to exclude from Docker build
├── .gitignore               # Git ignore rules
├── init-db.js               # Database initialization script
├── API_DOCUMENTATION.md     # Complete API reference
├── config/
│   ├── database.js          # PostgreSQL connection pool
│   └── database-init.js     # Database schema setup
├── middleware/
│   └── auth.js              # JWT authentication & authorization
└── routes/
    ├── auth.js              # Registration & login endpoints
    ├── users.js             # User profile management
    ├── doctors.js           # Doctor profiles & specializations
    ├── patients.js          # Patient profiles & medical info
    └── appointments.js      # Appointment scheduling & management
```

## Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Doctor, Patient, and Admin roles
- **Doctor Management**: Profile creation, specialization search, availability tracking
- **Patient Management**: Medical history, blood group, allergies, emergency contacts
- **Appointment System**: Scheduling, status tracking (scheduled/completed/cancelled/no-show)
- **PostgreSQL Database**: Persistent data storage with proper relationships
- **Docker Containerization**: Easy deployment and development

## Getting Started

### With Docker Compose (Recommended)

```bash
docker compose up --pull always
```

This starts:
- PostgreSQL database on port 5432
- Node.js backend on port 3000
- Auto-initializes database schema

### Without Docker

```bash
npm install
npm run dev
```

Requires PostgreSQL running separately with matching .env variables.

## Testing the API

### 1. Register a Doctor
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Smith",
    "phone": "9876543210",
    "role": "doctor"
  }'
```

### 2. Register a Patient
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "1234567890",
    "role": "patient"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "password123"
  }'
```

Save the returned token for authenticated requests.

### 4. Create Doctor Profile
```bash
curl -X POST http://localhost:3000/api/doctors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "license_number": "MD123456",
    "specialization": "Cardiology",
    "bio": "Experienced cardiologist with 10 years of practice",
    "clinic_address": "123 Heart Clinic, Main St",
    "clinic_phone": "555-0100",
    "consultation_fee": 75.00,
    "available_from": "09:00:00",
    "available_to": "17:00:00",
    "years_experience": 10
  }'
```

### 5. Create Patient Profile
```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PATIENT_TOKEN" \
  -d '{
    "date_of_birth": "1990-05-15",
    "blood_group": "O+",
    "allergies": "Penicillin, Aspirin",
    "medical_history": "Hypertension, managed with medication",
    "emergency_contact": "John Doe",
    "emergency_contact_phone": "555-0123"
  }'
```

### 6. Schedule Appointment
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PATIENT_TOKEN" \
  -d '{
    "doctor_id": 1,
    "appointment_date": "2024-12-20T10:00:00Z",
    "reason": "Regular checkup and heart health assessment",
    "notes": "Patient reports occasional chest discomfort"
  }'
```

### 7. View All Doctors
```bash
curl http://localhost:3000/api/doctors \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 8. Search Doctors by Specialization
```bash
curl http://localhost:3000/api/doctors/specialization/cardiology \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 9. View Appointments
```bash
curl http://localhost:3000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment Variables

Copy .env file and modify as needed:

```
NODE_ENV=development
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_USER=doctor_user
DB_PASSWORD=doctor_password
DB_NAME=doctor_patient_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**Important**: Change JWT_SECRET in production to a secure random string.

## Database Tables

- **users**: Core user accounts with role-based access
- **doctors**: Doctor-specific information (license, specialization, fees)
- **patients**: Patient-specific information (medical history, blood group)
- **appointments**: Appointment scheduling and status tracking
- **prescriptions**: Medication prescriptions (ready for future expansion)

## Common Issues

### Port Already in Use
Change the port in docker-compose.yml or .env:
```yaml
ports:
  - "3001:3000"  # Host:Container
```

### Database Connection Failed
Ensure PostgreSQL is running and credentials in .env match docker-compose.yml

### Invalid Token
Tokens expire in 7 days. Re-login to get a new token.

## Production Deployment

1. Update environment variables (use strong JWT_SECRET)
2. Enable HTTPS/SSL
3. Add rate limiting middleware
4. Implement request logging
5. Add database backup strategy
6. Use secrets management (AWS Secrets Manager, HashiCorp Vault)
7. Deploy with production-grade database (managed PostgreSQL)

## Next Steps

- Add appointment reminders/notifications
- Implement prescription management endpoints
- Add patient medical records/documents upload
- Create admin dashboard API
- Add billing/payment integration
- Implement real-time notifications with WebSockets
- Add comprehensive test suite
