import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  FileText, 
  Plus, 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MoreVertical,
  CheckCircle2,
  MapPin,
  Star,
  ArrowRight,
  Mic,
  Video,
  PhoneOff,
  ScreenShare,
  MoreHorizontal,
  Download,
  ArrowUpRight,
  Stethoscope,
  Syringe,
  Pill,
  Bot,
  ArrowUp,
  LogIn,
  LogOut,
  AlertCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  RefreshCw,
  Home as HomeIcon,
  Zap,
  Activity,
  Heart,
  ArrowRightCircle
} from 'lucide-react';
import { cn } from './lib/utils';
import { DOCTORS } from './constants';
import { Doctor, HealthRecord, Message, AppUser } from './types';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  getDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

// --- Context & Auth ---

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (settings: AppUser['checkupSettings']) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMessage = `Security Error: ${parsed.error}`;
      } catch {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="glass p-8 rounded-xxl max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="font-headline font-bold text-2xl text-on-surface">Application Error</h2>
            <p className="text-on-surface-variant">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full primary-gradient text-on-primary py-4 rounded-xl font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---

const TopBar = ({ title = "Antigravity Health", avatar }: { title?: string, avatar?: string }) => {
  const { logout } = useAuth();
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 py-4 glass">
      <div className="flex items-center gap-4">
        <div className="relative group cursor-pointer active:opacity-80 transition-all" onClick={logout}>
          <img 
            src={avatar || "https://picsum.photos/seed/doc/200"} 
            alt="Avatar" 
            className="w-10 h-10 rounded-full object-cover border-2 border-primary-fixed"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-surface rounded-full"></div>
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <LogOut className="w-4 h-4 text-white" />
          </div>
        </div>
        <h1 className="font-headline font-extrabold text-primary text-2xl tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors">
          <Search className="w-5 h-5 text-on-surface-variant" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors relative">
          <Bell className="w-5 h-5 text-on-surface-variant" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
      </div>
    </header>
  );
};

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'assistant', label: 'Assistant', icon: Bot },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 glass shadow-[0_-20px_40px_rgba(0,96,103,0.06)] rounded-t-[1.5rem]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex flex-col items-center justify-center px-5 py-2 transition-all duration-300 ease-out active:scale-95 rounded-[1.5rem]",
            activeTab === tab.id ? "bg-primary-fixed text-on-primary-fixed" : "text-on-surface-variant hover:text-primary"
          )}
        >
          <tab.icon className={cn("w-6 h-6", activeTab === tab.id && "fill-current")} />
          <span className="text-[10px] font-semibold tracking-wide uppercase mt-1">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

// --- Screens ---

const Home = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-16 pb-12">
      {/* Hero Welcome */}
      <section className="relative py-12">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-0 -right-24 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -z-10"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-fixed/30 text-on-primary-fixed rounded-full text-xs font-bold uppercase tracking-widest">
            <Zap className="w-3 h-3" /> System Online
          </div>
          <h1 className="font-headline font-black text-5xl lg:text-7xl text-on-surface leading-[1.1] tracking-tight">
            Elevating your <br />
            <span className="text-primary">health journey.</span>
          </h1>
          <p className="text-on-surface-variant text-xl max-w-xl leading-relaxed">
            Welcome back, {user?.displayName?.split(' ')[0]}. Your clinical profile is up to date and monitored by Stitch AI.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={() => setActiveTab('assistant')}
              className="primary-gradient text-on-primary px-8 py-4 rounded-xxl font-extrabold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              Ask Stitch AI <ArrowRightCircle className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('appointments')}
              className="bg-surface-container-high text-on-surface px-8 py-4 rounded-xxl font-extrabold hover:bg-surface-container-highest transition-all"
            >
              Book Specialist
            </button>
          </div>
        </motion.div>
      </section>

      {/* Quick Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-8 rounded-xxl border-white/40 space-y-6">
          <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">Vital Status</h3>
            <p className="text-2xl font-headline font-black text-on-surface">Optimal</p>
          </div>
          <div className="pt-4 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant">Last sync: 12 minutes ago</p>
          </div>
        </div>

        <div className="glass p-8 rounded-xxl border-white/40 space-y-6">
          <div className="w-12 h-12 bg-secondary-container text-on-secondary-container rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">Heart Rate</h3>
            <p className="text-2xl font-headline font-black text-on-surface">72 BPM</p>
          </div>
          <div className="pt-4 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant">Resting average: 68 BPM</p>
          </div>
        </div>

        <div className="glass p-8 rounded-xxl border-white/40 space-y-6">
          <div className="w-12 h-12 bg-tertiary-container text-on-tertiary-container rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">Security</h3>
            <p className="text-2xl font-headline font-black text-on-surface">Protected</p>
          </div>
          <div className="pt-4 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant">End-to-end encrypted</p>
          </div>
        </div>
      </section>

      {/* Featured Insight */}
      <section className="bg-surface-container-lowest rounded-[2.5rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 shadow-sm">
        <div className="flex-1 space-y-6">
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Weekly Insight</span>
          <h2 className="font-headline font-black text-4xl text-on-surface leading-tight">
            Understanding your <br /> metabolic rhythm.
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Your recent blood work shows a 12% improvement in glucose stability. Stitch AI suggests maintaining your current hydration protocol for continued progress.
          </p>
          <button className="text-primary font-bold flex items-center gap-2 group">
            Read Full Analysis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="w-full md:w-80 h-80 rounded-xxl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
          <img 
            src="https://picsum.photos/seed/health-insight/800/800" 
            alt="Health Insight" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>
    </div>
  );
};

const Dashboard = () => {
  const { user, updateSettings } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'appointments'), where('patientId', '==', user.uid), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'appointments'));
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user?.checkupSettings?.lastCheckupDate) return;
    
    const lastDate = new Date(user.checkupSettings.lastCheckupDate);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + (user.checkupSettings.frequencyMonths || 6));
    
    if (new Date() > nextDate && !user.checkupSettings.autoBook) {
      setShowReminder(true);
    }
  }, [user]);

  const handleBookNow = async () => {
    if (!user) return;
    const preferredDocId = user.checkupSettings?.preferredDoctorId || '1';
    const doctor = DOCTORS.find(d => d.id === preferredDocId) || DOCTORS[0];
    
    try {
      const aptData = {
        patientId: user.uid,
        doctorId: doctor.id,
        doctorName: doctor.name,
        time: new Date(Date.now() + 86400000).toISOString(),
        status: 'Upcoming',
        reason: 'Routine Check-up',
        room: 'Virtual Room 1',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'appointments'), aptData);
      
      // Update last checkup date to "scheduled" (or just reset the reminder)
      await updateSettings({
        ...user.checkupSettings!,
        lastCheckupDate: new Date().toISOString()
      });
      
      setShowReminder(false);
      alert('Routine check-up booked!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const days = [
    { name: 'MON', date: 23 },
    { name: 'TUE', date: 24 },
    { name: 'WED', date: 25, active: true },
    { name: 'THU', date: 26 },
    { name: 'FRI', date: 27 },
    { name: 'SAT', date: 28, dimmed: true },
    { name: 'SUN', date: 29, dimmed: true },
  ];

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {showReminder && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary-container text-on-primary-container p-6 rounded-xxl flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg border border-primary/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg">Routine Check-up Due</h3>
                  <p className="text-sm opacity-80">It's been over {user?.checkupSettings?.frequencyMonths || 6} months since your last visit.</p>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setShowReminder(false)}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm hover:bg-black/5 transition-colors"
                >
                  Dismiss
                </button>
                <button 
                  onClick={handleBookNow}
                  className="flex-1 md:flex-none bg-primary text-on-primary px-8 py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all"
                >
                  Book Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <div>
            <p className="text-on-surface-variant text-sm font-medium tracking-wide uppercase">Welcome back, {user?.displayName?.split(' ')[0]}</p>
            <h2 className="font-headline font-bold text-3xl text-on-surface">Weekly Overview</h2>
          </div>
          <div className="flex gap-1">
            <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button className="p-2 rounded-full hover:bg-surface-container-high transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex justify-between items-center gap-2 overflow-x-auto no-scrollbar py-2">
          {days.map((day) => (
            <div key={day.date} className={cn(
              "flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl transition-all cursor-pointer",
              day.active ? "bg-primary text-on-primary shadow-lg transform scale-105" : "bg-surface-container-low hover:bg-surface-container-high",
              day.dimmed && "opacity-50"
            )}>
              <span className={cn("text-xs font-semibold", day.active ? "opacity-80 uppercase tracking-widest" : "text-on-surface-variant")}>{day.name}</span>
              <span className={cn("text-lg font-bold", day.active && "text-xl font-black")}>{day.date}</span>
              {day.active && <div className="w-1.5 h-1.5 bg-on-primary rounded-full"></div>}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-headline font-bold text-xl text-on-surface">Your Appointments</h3>
          <span className="bg-surface-container-highest px-3 py-1 rounded-full text-xs font-bold text-on-surface-variant">
            {appointments.length} Total
          </span>
        </div>
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="p-12 text-center glass rounded-xxl">
              <CalendarDays className="w-12 h-12 text-outline mx-auto mb-4" />
              <p className="text-on-surface-variant font-medium">No appointments scheduled yet.</p>
            </div>
          ) : appointments.map((apt) => (
            <div key={apt.id} className={cn(
              "group relative bg-surface-container-lowest p-6 rounded-xl flex items-center gap-6 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-primary/5",
              apt.status === 'Completed' && "opacity-80 grayscale-[0.5] bg-surface-container-low/50 shadow-none"
            )}>
              <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-surface-container-high">
                <img src={`https://picsum.photos/seed/${apt.doctorId}/200`} alt={apt.doctorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-headline font-bold text-lg text-on-surface">{apt.doctorName}</h4>
                  <p className="text-sm text-on-surface-variant">Specialist</p>
                </div>
                <div className="flex flex-col justify-center">
                  <div className={cn("flex items-center gap-2 font-bold", apt.status === 'Completed' ? "text-on-surface-variant" : "text-primary")}>
                    {apt.status === 'Completed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    <span>{new Date(apt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant">{apt.room || 'Virtual'}</p>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Reason</span>
                  <p className="text-sm font-medium text-on-surface">{apt.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold",
                  apt.status === 'Arrived' && "bg-primary-fixed text-on-primary-fixed",
                  apt.status === 'In-Progress' && "bg-secondary-container text-on-secondary-container",
                  apt.status === 'Completed' && "bg-surface-container-high text-on-surface-variant",
                  apt.status === 'Upcoming' && "bg-surface-container-low text-on-surface-variant"
                )}>
                  {apt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const Appointments = ({ onDoctorClick }: { onDoctorClick: (doctor: Doctor) => void }) => {
  const { user } = useAuth();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const handleBooking = async () => {
    if (!user || !selectedDoctor) return;
    try {
      const aptData = {
        patientId: user.uid,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        status: 'Upcoming',
        reason: 'General Consultation',
        room: 'Virtual Room 1',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'appointments'), aptData);
      alert('Appointment booked successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  return (
    <div className="space-y-12">
      <section className="relative mb-16">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-4">Find a Specialist</label>
            <div className="relative group">
              <input className="w-full bg-surface-container-high border-none rounded-xxl px-12 py-5 text-on-surface outline-none" placeholder="Cardiology, Therapy..." type="text" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary w-5 h-5" />
            </div>
          </div>
          <button className="primary-gradient text-on-primary px-10 py-5 rounded-xxl font-bold h-[64px]">Find Care</button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          <h2 className="font-headline text-3xl font-extrabold text-primary">Top Rated Specialists</h2>
          {DOCTORS.map((doctor) => (
            <div key={doctor.id} onClick={() => setSelectedDoctor(doctor)} className={cn(
              "group relative bg-surface-container-lowest rounded-xxl p-6 transition-all cursor-pointer border-2",
              selectedDoctor?.id === doctor.id ? "border-primary shadow-lg" : "border-transparent"
            )}>
              <div className="flex gap-6">
                <div className="w-32 h-32 rounded-xxl overflow-hidden bg-surface-container-high flex-shrink-0">
                  <img src={doctor.avatar} alt={doctor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-headline text-xl font-bold text-on-surface">{doctor.name}</h3>
                      <div className="flex items-center gap-1 text-tertiary">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-bold">{doctor.rating}</span>
                      </div>
                    </div>
                    <p className="text-on-surface-variant font-medium">{doctor.specialty}</p>
                  </div>
                  <div className="flex gap-3 mt-4">
                    {doctor.languages.map(lang => <span key={lang} className="px-3 py-1 bg-surface-container-low rounded-full text-[10px] font-bold uppercase text-outline">{lang}</span>)}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <span className="text-xs font-bold text-secondary uppercase tracking-widest">{doctor.availability}</span>
                  <button onClick={(e) => { e.stopPropagation(); onDoctorClick(doctor); }} className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                    <Video className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5">
          <div className="glass rounded-xxl p-8 sticky top-28 shadow-lg">
            <div className="mb-8">
              <h2 className="font-headline text-2xl font-extrabold text-primary mb-1">Select a Slot</h2>
              <p className="text-on-surface-variant text-sm">{selectedDoctor ? `Booking with ${selectedDoctor.name}` : 'Choose a doctor to see availability'}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {['09:00 AM', '10:30 AM', '11:15 AM', '01:00 PM', '02:30 PM', '04:00 PM'].map((time, i) => (
                <button key={time} className="py-4 rounded-xl text-sm font-bold border bg-surface-container-low text-on-surface border-transparent hover:border-primary transition-all">
                  {time}
                </button>
              ))}
            </div>
            <button 
              disabled={!selectedDoctor}
              onClick={handleBooking}
              className="w-full primary-gradient text-on-primary py-5 rounded-xxl font-extrabold tracking-tight text-lg shadow-lg disabled:opacity-50"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Records = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'records'), where('patientId', '==', user.uid), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'records'));
    return unsubscribe;
  }, [user]);

  const categories = [
    { title: 'Lab Results', icon: Stethoscope, color: 'primary' },
    { title: 'Immunizations', icon: Syringe, color: 'secondary' },
    { title: 'Prescriptions', icon: Pill, color: 'tertiary' },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-2">
        <h1 className="font-headline font-extrabold text-4xl tracking-tight text-primary">Health Records</h1>
        <p className="text-on-surface-variant text-lg">Securely stored clinical history and laboratory data.</p>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.title} className="bg-surface-container-low rounded-xxl p-8 transition-all hover:shadow-md">
            <div className={cn("p-4 rounded-xl w-fit mb-8", 
              cat.color === 'primary' && "bg-primary-fixed text-on-primary-fixed",
              cat.color === 'secondary' && "bg-secondary-fixed text-on-secondary-fixed",
              cat.color === 'tertiary' && "bg-tertiary-fixed text-on-tertiary-fixed"
            )}>
              <cat.icon className="w-8 h-8" />
            </div>
            <h3 className="font-headline font-bold text-2xl text-on-surface mb-2">{cat.title}</h3>
          </div>
        ))}
      </section>

      <section className="space-y-8">
        <h2 className="font-headline font-bold text-2xl text-primary">Recent Results</h2>
        <div className="space-y-6">
          {records.length === 0 ? (
            <div className="p-12 text-center glass rounded-xxl">
              <FileText className="w-12 h-12 text-outline mx-auto mb-4" />
              <p className="text-on-surface-variant font-medium">No health records found.</p>
            </div>
          ) : records.map((record) => (
            <div key={record.id} className="glass p-6 rounded-xxl flex items-center gap-6 group hover:bg-surface-container-lowest transition-all">
              <div className="shrink-0 w-16 h-16 rounded-xl bg-surface-container-high flex items-center justify-center">
                <FileText className={cn("w-8 h-8", record.status === 'Normal' ? "text-primary" : "text-error")} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-headline font-bold text-xl text-on-surface">{record.title}</h4>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold", record.status === 'Normal' ? "bg-green-100 text-green-700" : "bg-error-container text-on-error-container")}>
                    {record.status}
                  </span>
                </div>
                <p className="text-on-surface-variant">{record.clinic} • {record.date}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-outline font-bold uppercase">Result</p>
                <p className={cn("font-headline font-bold text-lg", record.status === 'Normal' ? "text-primary" : "text-error")}>
                  {record.result} {record.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const Assistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'messages'), where('userId', '==', user.uid), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages'));
    return unsubscribe;
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    
    const userMsg = {
      userId: user.uid,
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
    };
    
    setInput('');
    setIsTyping(true);

    try {
      await addDoc(collection(db, 'messages'), userMsg);
      
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input,
        config: {
          systemInstruction: "You are Stitch AI, a clinical health assistant. Provide brief, professional analysis. Always include a structured JSON analysis at the end of your response if symptoms are mentioned. JSON format: {\"confidence\": number, \"diagnosis\": string, \"description\": string, \"priority\": string, \"recommendation\": string}",
        }
      });

      const aiContent = response.text || "I'm sorry, I couldn't process that.";
      
      // Basic extraction of JSON if present
      let analysis = undefined;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse AI analysis", e);
      }

      const aiMsg = {
        userId: user.uid,
        role: 'assistant' as const,
        content: aiContent.replace(/\{[\s\S]*\}/, '').trim(),
        timestamp: new Date().toISOString(),
        analysis: analysis || {
          confidence: 80,
          diagnosis: "General Inquiry",
          description: "Providing general health information.",
          priority: "Low",
          recommendation: "Continue monitoring"
        }
      };

      await addDoc(collection(db, 'messages'), aiMsg);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-32">
      <header className="mb-12">
        <h2 className="font-headline text-4xl font-extrabold text-on-background">Chat with <span className="text-primary">Stitch AI</span></h2>
        <p className="text-on-surface-variant mt-3">Secure, private clinical intelligence at your fingertips.</p>
      </header>

      <div className="space-y-12">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex items-start gap-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
            {msg.role === 'assistant' && (
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-on-primary-container" />
              </div>
            )}
            <div className="space-y-4 max-w-lg">
              <div className={cn("p-6 rounded-2xl border", msg.role === 'user' ? "bg-primary text-on-primary rounded-tr-none" : "bg-surface-container-lowest rounded-tl-none border-primary/5")}>
                <p className="leading-relaxed">{msg.content}</p>
              </div>
              {msg.analysis && (
                <div className="glass p-6 rounded-[2rem] border-white/40 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">AI Analysis</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-sm font-medium text-on-surface-variant">Confidence</span>
                        <span className="text-xl font-headline font-bold text-primary">{msg.analysis.confidence}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${msg.analysis.confidence}%` }}></div>
                      </div>
                    </div>
                    <p className="font-bold text-on-surface">{msg.analysis.diagnosis}</p>
                    <p className="text-on-surface-variant text-xs">{msg.analysis.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && <div className="flex items-center gap-2 text-primary font-bold animate-pulse"><Bot className="w-5 h-5" /> Stitch is thinking...</div>}
      </div>

      <div className="fixed bottom-24 left-0 w-full px-6 flex justify-center">
        <div className="w-full max-w-2xl bg-surface-container-high p-2 rounded-[2rem] shadow-xl flex items-center gap-2 ring-1 ring-black/5">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} className="flex-grow bg-transparent border-none focus:ring-0 text-on-surface py-4 px-6" placeholder="Ask Stitch AI..." type="text" />
          <button onClick={handleSend} className="bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
            <ArrowUp className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const { user, updateSettings } = useAuth();
  const [settings, setSettings] = useState(user?.checkupSettings || {
    autoBook: false,
    frequencyMonths: 6,
    preferredDoctorId: '1',
    lastCheckupDate: new Date().toISOString()
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(settings);
      alert('Settings updated successfully!');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <header>
        <h1 className="font-headline font-extrabold text-4xl text-primary mb-2">Health Settings</h1>
        <p className="text-on-surface-variant">Configure your automated care and check-up preferences.</p>
      </header>

      <section className="glass p-8 rounded-xxl space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-on-surface">Automated Booking</h3>
            <p className="text-sm text-on-surface-variant">Automatically schedule check-ups when they are due.</p>
          </div>
          <button 
            onClick={() => setSettings(s => ({ ...s, autoBook: !s.autoBook }))}
            className={cn(
              "w-14 h-8 rounded-full transition-all relative",
              settings.autoBook ? "bg-primary" : "bg-surface-container-highest"
            )}
          >
            <div className={cn(
              "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm",
              settings.autoBook ? "left-7" : "left-1"
            )} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold text-on-surface uppercase tracking-wider">Check-up Frequency</label>
          <div className="grid grid-cols-3 gap-4">
            {[3, 6, 12].map(months => (
              <button 
                key={months}
                onClick={() => setSettings(s => ({ ...s, frequencyMonths: months }))}
                className={cn(
                  "py-4 rounded-xl font-bold border transition-all",
                  settings.frequencyMonths === months ? "bg-primary-fixed text-on-primary-fixed border-primary" : "bg-surface-container-low border-transparent hover:border-primary/20"
                )}
              >
                {months} Months
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold text-on-surface uppercase tracking-wider">Preferred Specialist</label>
          <select 
            value={settings.preferredDoctorId}
            onChange={(e) => setSettings(s => ({ ...s, preferredDoctorId: e.target.value }))}
            className="w-full bg-surface-container-high border-none rounded-xl p-4 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {DOCTORS.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
            ))}
          </select>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full primary-gradient text-on-primary py-4 rounded-xl font-extrabold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Save Preferences"}
          </button>
        </div>
      </section>

      <div className="p-6 bg-surface-container-low rounded-xl flex items-start gap-4">
        <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Your health data is encrypted and stored securely. Automated bookings will only be made with your preferred specialist and you will receive a notification 24 hours prior to the appointment.
        </p>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { signIn } = useAuth();
  
  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] -z-10"></div>
      
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-8 max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center shadow-lg">
            <Stethoscope className="w-6 h-6 text-on-primary" />
          </div>
          <span className="font-headline font-black text-2xl text-primary tracking-tighter">Antigravity</span>
        </div>
        <button 
          onClick={signIn}
          className="bg-surface-container-high text-on-surface px-6 py-3 rounded-full font-bold hover:bg-surface-container-highest transition-all"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-fixed/20 text-on-primary-fixed rounded-full text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> HIPAA Compliant & Secure
            </div>
            <h1 className="font-headline font-black text-6xl lg:text-8xl text-on-surface leading-[0.95] tracking-tight">
              Healthcare <br />
              <span className="text-primary">reimagined.</span>
            </h1>
            <p className="text-on-surface-variant text-xl lg:text-2xl max-w-lg leading-relaxed">
              Experience the weightless future of clinical care. AI-driven insights, seamless telehealth, and secure records in one polished platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={signIn}
                className="primary-gradient text-on-primary px-10 py-5 rounded-xxl font-black text-xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Get Started <ArrowRightCircle className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4 px-4">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <img key={i} src={`https://picsum.photos/seed/user${i}/100`} className="w-10 h-10 rounded-full border-2 border-background" alt="User" referrerPolicy="no-referrer" />
                  ))}
                </div>
                <p className="text-sm font-bold text-on-surface-variant">Joined by 10k+ patients</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-white/20">
              <img 
                src="https://picsum.photos/seed/healthcare-hero/1200/1600" 
                alt="Healthcare Future" 
                className="w-full h-auto grayscale-[20%] hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10 glass p-8 rounded-3xl border-white/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <Bot className="w-6 h-6 text-on-primary" />
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-white text-lg">Stitch AI Analysis</h4>
                    <p className="text-white/60 text-xs">Real-time clinical monitoring</p>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ delay: 1, duration: 1.5 }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-8 py-32 border-t border-outline-variant/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-6">
            <div className="w-14 h-14 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center">
              <Video className="w-7 h-7" />
            </div>
            <h3 className="font-headline font-bold text-2xl text-on-surface">HD Telehealth</h3>
            <p className="text-on-surface-variant leading-relaxed">Crystal clear video consultations with integrated record sharing and real-time vitals.</p>
          </div>
          <div className="space-y-6">
            <div className="w-14 h-14 bg-secondary-container text-on-secondary-container rounded-2xl flex items-center justify-center">
              <Bot className="w-7 h-7" />
            </div>
            <h3 className="font-headline font-bold text-2xl text-on-surface">Clinical AI</h3>
            <p className="text-on-surface-variant leading-relaxed">Stitch AI monitors your symptoms and provides high-confidence diagnostic insights.</p>
          </div>
          <div className="space-y-6">
            <div className="w-14 h-14 bg-tertiary-container text-on-tertiary-container rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-headline font-bold text-2xl text-on-surface">Secure Records</h3>
            <p className="text-on-surface-variant leading-relaxed">Your medical history is encrypted and accessible only by you and your authorized providers.</p>
          </div>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-8 py-12 text-center border-t border-outline-variant/10 text-on-surface-variant text-sm font-medium">
        © 2026 Antigravity Health Intelligence. All rights reserved.
      </footer>
    </div>
  );
};

// --- Provider ---

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as AppUser;
            setUser(userData);
            
            // Check for auto-booking
            if (userData.checkupSettings?.autoBook && userData.checkupSettings.lastCheckupDate) {
              const lastDate = new Date(userData.checkupSettings.lastCheckupDate);
              const nextDate = new Date(lastDate);
              nextDate.setMonth(nextDate.getMonth() + (userData.checkupSettings.frequencyMonths || 6));
              
              if (new Date() > nextDate) {
                const preferredDocId = userData.checkupSettings.preferredDoctorId || '1';
                const doctor = DOCTORS.find(d => d.id === preferredDocId) || DOCTORS[0];
                
                const aptData = {
                  patientId: userData.uid,
                  doctorId: doctor.id,
                  doctorName: doctor.name,
                  time: new Date(Date.now() + 86400000).toISOString(),
                  status: 'Upcoming',
                  reason: 'Automated Routine Check-up',
                  room: 'Virtual Room 1',
                  createdAt: new Date().toISOString()
                };
                
                await addDoc(collection(db, 'appointments'), aptData);
                await setDoc(doc(db, 'users', userData.uid), {
                  ...userData,
                  checkupSettings: {
                    ...userData.checkupSettings,
                    lastCheckupDate: new Date().toISOString()
                  }
                });
              }
            }
          } else {
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'patient',
              checkupSettings: {
                autoBook: false,
                frequencyMonths: 6,
                preferredDoctorId: '1',
                lastCheckupDate: new Date().toISOString()
              },
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const updateSettings = async (settings: AppUser['checkupSettings']) => {
    if (!user) return;
    try {
      const updatedUser = { ...user, checkupSettings: settings };
      await setDoc(doc(db, 'users', user.uid), updatedUser);
      setUser(updatedUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <LandingPage />;

  const renderScreen = () => {
    if (selectedDoctor) return <Telehealth />;
    switch (activeTab) {
      case 'home': return <Home setActiveTab={setActiveTab} />;
      case 'dashboard': return <Dashboard />;
      case 'appointments': return <Appointments onDoctorClick={setSelectedDoctor} />;
      case 'records': return <Records />;
      case 'assistant': return <Assistant />;
      case 'settings': return <Settings />;
      default: return <Home setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <TopBar 
        title={selectedDoctor ? "Telehealth Session" : "Antigravity Health"} 
        avatar={user.photoURL || undefined}
      />
      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (selectedDoctor ? '-call' : '')}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
      {!selectedDoctor && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
      {selectedDoctor && (
        <button onClick={() => setSelectedDoctor(null)} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface px-6 py-3 rounded-full font-bold shadow-xl z-50 flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> End Session
        </button>
      )}
    </div>
  );
};

const Telehealth = () => {
  return (
    <div className="bg-inverse-surface text-inverse-on-surface rounded-xxl p-2 relative overflow-hidden shadow-2xl h-[calc(100vh-200px)] min-h-[600px]">
      <div className="flex flex-col lg:flex-row h-full">
        <div className="flex-1 relative bg-slate-900 rounded-xxl overflow-hidden">
          <img src="https://picsum.photos/seed/doc-call/1200/800" alt="Doctor" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
          <div className="absolute top-6 right-6 w-48 h-64 bg-slate-800 rounded-xl overflow-hidden border-2 border-primary shadow-xl">
            <img src="https://picsum.photos/seed/user-call/400/600" alt="You" className="w-full h-full object-cover grayscale-[20%]" referrerPolicy="no-referrer" />
            <div className="absolute bottom-2 left-2 bg-black/40 px-2 py-1 rounded text-[10px] backdrop-blur-md">You</div>
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 glass rounded-full border border-white/10">
            <button className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white"><Mic className="w-6 h-6" /></button>
            <button className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white"><Video className="w-6 h-6" /></button>
            <button className="w-16 h-12 rounded-full flex items-center justify-center bg-error text-white shadow-lg"><PhoneOff className="w-6 h-6" /></button>
            <button className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white"><ScreenShare className="w-6 h-6" /></button>
            <button className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 text-white"><MoreHorizontal className="w-6 h-6" /></button>
          </div>
        </div>
        <div className="w-full lg:w-80 bg-inverse-surface p-6 flex flex-col gap-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary-fixed mb-4">Patient Records</h3>
          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-white/40 mb-1">Blood Pressure</p>
              <p className="text-xl font-headline font-bold">122/80 <span className="text-xs text-primary-fixed ml-1">mmHg</span></p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-white/40 mb-1">Heart Rate</p>
              <p className="text-xl font-headline font-bold">72 <span className="text-xs text-primary-fixed ml-1">BPM</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
