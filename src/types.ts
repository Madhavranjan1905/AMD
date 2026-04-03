export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  avatar: string;
  appointmentTime: string;
  room: string;
  reason: string;
  status: 'Arrived' | 'In-Progress' | 'Completed' | 'Upcoming';
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  avatar: string;
  availability: string;
  languages: string[];
  tags: string[];
}

export interface HealthRecord {
  id: string;
  patientId: string;
  title: string;
  category: 'Lab' | 'Immunization' | 'Prescription' | 'Note';
  date: string;
  clinic: string;
  result?: string;
  unit?: string;
  status: 'Normal' | 'Abnormal';
  createdAt: string;
}

export interface Message {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: any; // Firestore Timestamp or Date
  analysis?: {
    confidence: number;
    diagnosis: string;
    description: string;
    priority: string;
    recommendation: string;
  };
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'patient' | 'doctor' | 'admin';
  checkupSettings?: {
    autoBook: boolean;
    frequencyMonths: number;
    preferredDoctorId?: string;
    lastCheckupDate?: string;
  };
  createdAt: string;
}
