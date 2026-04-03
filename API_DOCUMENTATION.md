# Doctor and Patient Management Backend API

## API Documentation

### Authentication Endpoints

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "1234567890",
  "role": "doctor" or "patient"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response includes JWT token for subsequent requests.

### User Endpoints

All user endpoints require Authorization header: `Bearer {token}`

#### Get Current User Profile
```
GET /api/users/profile
```

#### Update User Profile
```
PUT /api/users/profile
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "1234567890"
}
```

#### Get User by ID
```
GET /api/users/:id
```

### Doctor Endpoints

#### Create Doctor Profile
```
POST /api/doctors
Content-Type: application/json
Authorization: Bearer {token}

{
  "license_number": "ABC123",
  "specialization": "Cardiology",
  "bio": "Experienced cardiologist",
  "clinic_address": "123 Main St",
  "clinic_phone": "9876543210",
  "consultation_fee": 50.00,
  "available_from": "09:00:00",
  "available_to": "17:00:00",
  "years_experience": 10
}
```

#### Get All Doctors
```
GET /api/doctors
```

#### Get Doctor by ID
```
GET /api/doctors/:id
```

#### Update Doctor Profile
```
PUT /api/doctors/:id
Content-Type: application/json
Authorization: Bearer {token}
```

#### Search Doctors by Specialization
```
GET /api/doctors/specialization/{specialization}
```

### Patient Endpoints

#### Create Patient Profile
```
POST /api/patients
Content-Type: application/json
Authorization: Bearer {token}

{
  "date_of_birth": "1990-01-15",
  "blood_group": "O+",
  "allergies": "Penicillin",
  "medical_history": "Diabetes",
  "emergency_contact": "Jane Doe",
  "emergency_contact_phone": "9876543210"
}
```

#### Get Current User Patient Profile
```
GET /api/patients/me/profile
Authorization: Bearer {token}
```

#### Get Patient by ID
```
GET /api/patients/:id
Authorization: Bearer {token}
```

#### Update Patient Profile
```
PUT /api/patients/:id
Content-Type: application/json
Authorization: Bearer {token}
```

### Appointment Endpoints

#### Create Appointment
```
POST /api/appointments
Content-Type: application/json
Authorization: Bearer {token}

{
  "doctor_id": 1,
  "appointment_date": "2024-12-20T10:00:00Z",
  "reason": "Regular checkup",
  "notes": "Follow-up visit"
}
```

#### Get All Appointments (filtered by role)
```
GET /api/appointments
Authorization: Bearer {token}
```

#### Get Appointment by ID
```
GET /api/appointments/:id
Authorization: Bearer {token}
```

#### Update Appointment Status
```
PUT /api/appointments/:id
Content-Type: application/json
Authorization: Bearer {token}

{
  "status": "completed" or "cancelled" or "no-show",
  "notes": "Appointment notes"
}
```

#### Cancel Appointment
```
DELETE /api/appointments/:id
Authorization: Bearer {token}
```

#### Get Appointments by Doctor
```
GET /api/appointments/doctor/:doctor_id
Authorization: Bearer {token}
```

## Database Schema

### users
- id (Primary Key)
- email (Unique)
- password (hashed)
- first_name
- last_name
- phone
- role (doctor, patient, admin)
- created_at
- updated_at

### doctors
- id (Primary Key)
- user_id (Foreign Key → users)
- license_number (Unique)
- specialization
- bio
- clinic_address
- clinic_phone
- consultation_fee
- available_from
- available_to
- years_experience
- created_at
- updated_at

### patients
- id (Primary Key)
- user_id (Foreign Key → users)
- date_of_birth
- blood_group
- allergies
- medical_history
- emergency_contact
- emergency_contact_phone
- created_at
- updated_at

### appointments
- id (Primary Key)
- doctor_id (Foreign Key → doctors)
- patient_id (Foreign Key → patients)
- appointment_date
- reason
- status (scheduled, completed, cancelled, no-show)
- notes
- created_at
- updated_at

### prescriptions
- id (Primary Key)
- appointment_id (Foreign Key → appointments)
- medication_name
- dosage
- frequency
- duration
- notes
- created_at

## Running the Application

### With Docker Compose
```bash
docker compose up
```

The application will:
1. Start PostgreSQL on port 5432
2. Start the backend on port 3000
3. Automatically initialize the database

### Without Docker
```bash
npm install
npm run dev
```

Requires PostgreSQL running separately with appropriate environment variables in .env

## Environment Variables

```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=doctor_user
DB_PASSWORD=doctor_password
DB_NAME=doctor_patient_db
JWT_SECRET=your-secret-key
```

## Features

- User authentication with JWT
- Role-based access control (Doctor, Patient, Admin)
- Complete CRUD operations for doctors and patients
- Appointment scheduling and management
- Patient medical history tracking
- Doctor availability management
- Secure password hashing with bcryptjs
- Input validation
- Error handling
- PostgreSQL database
