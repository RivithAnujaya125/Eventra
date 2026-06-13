import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Coins,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit,
  Filter,
  TrendingUp,
  Ticket,
  ChevronDown,
  X,
  ShieldCheck,
  Percent,
  Check,
  Clock,
  QrCode,
  Sparkles
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  date: any;
  location: string;
  category: string;
  fee: number;
  capacity: number;
  registeredCount: number;
  imageUrl?: string;
}

interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  eventCategory: string;
  userId: string;
  userEmail: string;
  name: string;
  phone: string;
  college: string;
  paymentMethod: string;
  paymentProofUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
  checkedIn?: boolean;
  checkedInAt?: any;
}

export default function OrganizerDashboard() {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "events" | "registrations" | "gate">("overview");
  
  // Dashboard Metrics
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalRegistrations: 0,
    approvedRegistrations: 0,
    pendingRegistrations: 0,
    grossSales: 0,
    organizerShare: 0,
    platformCommission: 0,
    checkedInCount: 0
  });

  const [assignedCategories, setAssignedCategories] = useState<string[]>([]);
  const [categoryDetails, setCategoryDetails] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [eventSearch, setEventSearch] = useState("");
  const [regSearch, setRegSearch] = useState("");
  const [regStatusFilter, setRegStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");

  // Create/Edit Event Form Modal State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    category: "",
    fee: 0,
    capacity: 100,
    imageUrl: ""
  });
  const [savingEvent, setSavingEvent] = useState(false);

  // Ticket Gate Check-In State
  const [ticketCodeInput, setTicketCodeInput] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
    attendee?: string;
    event?: string;
  } | null>(null);

  // Audio chirp feedback for check-in
  const playBeep = (freq: number, dur: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const idToken = await user?.getIdToken();
      if (!idToken) return;

      const [catsRes, statsRes, eventsRes, regsRes] = await Promise.all([
        fetch("/api/organizer/assigned-categories", { headers: { Authorization: `Bearer ${idToken}` } }),
        fetch("/api/organizer/stats", { headers: { Authorization: `Bearer ${idToken}` } }),
        fetch("/api/organizer/events", { headers: { Authorization: `Bearer ${idToken}` } }),
        fetch("/api/organizer/registrations", { headers: { Authorization: `Bearer ${idToken}` } })
      ]);

      if (catsRes.ok) {
        const catsData = await catsRes.json();
        setAssignedCategories(catsData.categories || []);
        setCategoryDetails(catsData.details || []);
        if (catsData.categories && catsData.categories.length > 0 && !eventForm.category) {
          setEventForm(prev => ({ ...prev, category: catsData.categories[0] }));
        }
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }

      if (regsRes.ok) {
        setRegistrations(await regsRes.json());
      }
    } catch (err: any) {
      console.error("Organizer fetch error:", err);
      toast.error("Failed to sync organizer data circles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleOpenCreateModal = () => {
    setEditingEventId(null);
    setEventForm({
      title: "",
      description: "",
      date: "",
      location: "",
      category: assignedCategories[0] || "",
      fee: 0,
      capacity: 100,
      imageUrl: ""
    });
    setShowEventModal(true);
  };

  const handleOpenEditModal = (event: Event) => {
    setEditingEventId(event.id);
    
    // Format date properly for input field datetime-local
    let dateStr = "";
    if (event.date) {
      const d = new Date(event.date?._seconds ? event.date._seconds * 1000 : event.date);
      // Format to: YYYY-MM-DDTHH:MM
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - offset * 60 * 1000);
      dateStr = localDate.toISOString().slice(0, 16);
    }

    setEventForm({
      title: event.title,
      description: event.description || "",
      date: dateStr,
      location: event.location,
      category: event.category,
      fee: event.fee,
      capacity: event.capacity,
      imageUrl: event.imageUrl || ""
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date || !eventForm.location || !eventForm.category) {
      toast.error("Title, Date, Location, and Category are required.");
      return;
    }

    setSavingEvent(true);
    try {
      const idToken = await user?.getIdToken();
      const url = editingEventId ? `/api/organizer/events/${editingEventId}` : "/api/organizer/events";
      const method = editingEventId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify(eventForm)
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || "Event persistence operation failed.");
      }

      toast.success(editingEventId ? "Event updated successfully!" : "New event created under your exclusive category!");
      setShowEventModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving the event.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete event "${name}"? This is irreversible.`)) {
      return;
    }

    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/organizer/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Event deletion failed.");
      }

      toast.success("Event removed from exclusive records.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event.");
    }
  };

  const handleUpdateRegStatus = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/organizer/registrations/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }

      toast.success(`Registration status update completed: ${newStatus}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to execute validation check.");
    }
  };

  const handleCheckInSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketCodeInput.trim()) {
      toast.error("Please provide or paste a Ticket ID first.");
      return;
    }

    setCheckInLoading(true);
    setCheckInResult(null);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/organizer/registrations/${ticketCodeInput.trim()}/checkin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` }
      });

      const data = await res.json();

      if (!res.ok) {
        playBeep(220, 0.45); // low buzz error
        setCheckInResult({
          success: false,
          message: data.error || "Entrance verification failed.",
          attendee: data.attendeeName,
          event: data.eventTitle
        });
        toast.error(data.error || "Gate Access Mock Blocked!");
      } else {
        playBeep(980, 0.12); // clean success audio chirp
        setTimeout(() => playBeep(1200, 0.1), 100);

        setCheckInResult({
          success: true,
          message: "Gate entry approved. Welcome to the event circle!",
          attendee: data.attendeeName,
          event: data.eventTitle
        });
        toast.success(`Access Approved: ${data.attendeeName}`);
        setTicketCodeInput("");
        loadData(); // refresh registered lists count
      }
    } catch (err: any) {
      playBeep(220, 0.4);
      toast.error(err.message || "Network validation error.");
    } finally {
      setCheckInLoading(false);
    }
  };

  // Filters Events & Registrations
  const filteredEvents = events.filter(e =>
    e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
    e.location.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch =
      r.name.toLowerCase().includes(regSearch.toLowerCase()) ||
      r.eventTitle.toLowerCase().includes(regSearch.toLowerCase()) ||
      r.id.toLowerCase().includes(regSearch.toLowerCase());
    
    const matchesStatus = regStatusFilter === "all" || r.status === regStatusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading && assignedCategories.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto" />
          <p className="text-sm font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
            Connecting Security clearance...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 font-sans selection:bg-emerald-500 selection:text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-zinc-850 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-400">
                Exclusive Partnership Hub
              </span>
            </div>
            <h1 className="text-3xl font-black mt-1 font-sans tracking-tight">Organizer Dashboard</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Control exclusive event series, track ledger payouts (80/20 share splits), and manage gate attendee entries.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-2 px-4 rounded-xl font-bold transition ${
                activeTab === "overview" ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850 hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`py-2 px-4 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "events" ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850 hover:text-white"
              }`}
            >
              <CalendarIcon className="w-4 h-4" /> My Events
            </button>
            <button
              onClick={() => setActiveTab("registrations")}
              className={`py-2 px-4 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "registrations" ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-850 hover:bg-zinc-850 hover:text-white"
              }`}
            >
              <Ticket className="w-4 h-4" /> Admissions
            </button>
            <button
              onClick={() => setActiveTab("gate")}
              className={`py-2 px-4 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "gate" ? "bg-emerald-500 text-black shadow-lg" : "bg-zinc-900 text-emerald-400 border border-zinc-850 hover:bg-zinc-850 hover:text-emerald-300"
              }`}
            >
              <QrCode className="w-4 h-4" /> Guest Check-In
            </button>
          </div>
        </div>

        {/* Assigned categories banner info */}
        {assignedCategories.length === 0 ? (
          <div className="bg-amber-950/15 border border-amber-900/30 p-6 rounded-3xl text-center mb-8">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <h3 className="text-white font-bold">No Exclusivity Categories Mapped Yet</h3>
            <p className="text-zinc-500 mt-1 max-w-xl mx-auto text-xs">
              Every partnership in Eventra maps exclusively to categories (e.g. "Music", "Tech"). Standard ticket sales on designated categories automatically remits 80% split back to you.
              Please reach out to the Platform Administration to link Category ownership (Account UID: <span className="font-mono text-zinc-300">{user?.uid}</span>).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {categoryDetails.map((detail: any, i: number) => (
              <div key={i} className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex gap-3 items-center">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-xl">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Exclusivity over</div>
                  <div className="text-sm font-black text-white">{detail.category}</div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{detail.organizationName}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 1. OVERVIEW SCREEN */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            {/* Visual Balance Counters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-500 uppercase text-[10px] tracking-wider font-mono">Gross Ticket Sales</span>
                  <div className="p-1 px-2.5 rounded-full bg-zinc-950 border border-zinc-850 text-sky-400 text-[10px] font-mono">Gross</div>
                </div>
                <div className="text-3xl font-black text-white tracking-tight">
                  LKR {stats.grossSales.toLocaleString()}
                </div>
                <p className="text-[10px] text-zinc-550 font-mono mt-2">
                  Total revenue accumulated before commission fees.
                </p>
                <div className="absolute right-[-10px] bottom-[-10px] opacity-5 pointer-events-none">
                  <Coins className="w-24 h-24 text-white" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden ring-1 ring-emerald-500/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-500 uppercase text-[10px] tracking-wider font-mono">Organizer Payout Share</span>
                  <div className="p-1 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">80% Share</div>
                </div>
                <div className="text-3xl font-black text-emerald-400 tracking-tight">
                  LKR {stats.organizerShare.toLocaleString()}
                </div>
                <p className="text-[10px] text-zinc-550 font-mono mt-2">
                  Net remittance sum after the standard 20% split.
                </p>
                <div className="absolute right-[-10px] bottom-[-10px] opacity-5 pointer-events-none">
                  <TrendingUp className="w-24 h-24 text-emerald-400" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-500 uppercase text-[10px] tracking-wider font-mono">Platform Commission</span>
                  <div className="p-1 px-2.5 rounded-full bg-zinc-950 border border-zinc-850 text-red-400 text-[10px] font-mono">20% Split</div>
                </div>
                <div className="text-3xl font-black text-white/80 tracking-tight">
                  LKR {stats.platformCommission.toLocaleString()}
                </div>
                <p className="text-[10px] text-zinc-550 font-mono mt-2">
                  Admin platform cost retained by Eventra host.
                </p>
                <div className="absolute right-[-10px] bottom-[-10px] opacity-5 pointer-events-none">
                  <Percent className="w-24 h-24 text-white" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-500 uppercase text-[10px] tracking-wider font-mono">Admissions Audit</span>
                  <div className="p-1 px-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-mono">Checkins</div>
                </div>
                <div className="text-3xl font-black text-white tracking-tight">
                  {stats.checkedInCount} / {stats.approvedRegistrations}
                </div>
                <p className="text-[10px] text-zinc-550 font-mono mt-2">
                  Guest passes scanned and admitted at entry gates.
                </p>
                <div className="absolute right-[-10px] bottom-[-10px] opacity-5 pointer-events-none">
                  <Users className="w-24 h-24 text-white" />
                </div>
              </div>

            </div>

            {/* Quick Summary Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Side: Exclusive Ledger Description */}
              <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-spin" strokeWidth={1} />
                    Verified Partnership Contract
                  </span>
                  <h3 className="text-lg font-black text-white">How category payouts operate</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-3">
                    As an authorized community organizer, any event published within your assigned exclusive categories drawing ticket revenues remits 80% in full. No payment gateway charges or credit processing overheads are deducted. 
                    Calculations are automatically updated the second attendees make approved payments (using online receipt uploads or wallet transfers).
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed mt-3">
                    Your exclusive categories currently process {events.length} active event nodes.
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-850 mt-6 text-center text-xs">
                  <div className="bg-black/50 p-3 rounded-2xl border border-zinc-850">
                    <div className="text-zinc-650 font-mono text-[9px] uppercase">My Events</div>
                    <div className="text-base font-bold text-white mt-1">{events.length}</div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-2xl border border-zinc-850">
                    <div className="text-zinc-650 font-mono text-[9px] uppercase">Pending Passes</div>
                    <div className="text-base font-bold text-amber-500 mt-1">{stats.pendingRegistrations}</div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-2xl border border-zinc-850">
                    <div className="text-zinc-650 font-mono text-[9px] uppercase">Approved Passes</div>
                    <div className="text-base font-bold text-emerald-500 mt-1">{stats.approvedRegistrations}</div>
                  </div>
                </div>
              </div>

              {/* Right Side: Partnership Directory contact details card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Organization Identity</h3>
                  <p className="text-[11px] text-zinc-550 mt-0.5">Assigned profile records representing your student body entity.</p>
                  
                  <div className="space-y-4 mt-6">
                    {categoryDetails.length === 0 ? (
                      <p className="text-xs text-zinc-600 font-mono">No profile records populated yet.</p>
                    ) : (
                      <div className="space-y-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-850 text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-600 font-mono block">Organization:</span>
                          <span className="font-bold text-white text-sm">{categoryDetails[0]?.organizationName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-600 font-mono block">Represent:</span>
                          <span className="text-zinc-300 font-medium">{categoryDetails[0]?.organizerName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-600 font-mono block">Associated Contact:</span>
                          <span className="text-zinc-350 font-sans">{categoryDetails[0]?.organizerEmail}</span>
                        </div>
                        {categoryDetails[0]?.organizerPhone && (
                          <div>
                            <span className="text-[10px] text-zinc-600 font-mono block">Contact Phone:</span>
                            <span className="text-zinc-400 font-mono">{categoryDetails[0]?.organizerPhone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-zinc-650 font-mono mt-4 pt-4 border-t border-zinc-850">
                  Last verified sync: {new Date().toLocaleDateString()}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. MANAGE EVENTS TAB SCREEN */}
        {activeTab === "events" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search your exclusive category events..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <button
                onClick={handleOpenCreateModal}
                disabled={assignedCategories.length === 0}
                className="py-2.5 px-4 bg-white text-black hover:bg-zinc-200 transition text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-4 h-4" /> Publish New Event
              </button>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-12 text-center text-zinc-600 font-mono text-xs">
                No events recorded or matches found in your assigned exclusive brackets.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((ev) => {
                  const evDate = new Date(ev.date?._seconds ? ev.date._seconds * 1000 : ev.date);
                  return (
                    <div key={ev.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition">
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-400/20 rounded-full font-bold">
                              {ev.category}
                            </span>
                            <h3 className="text-base font-black text-white mt-2 leading-snug line-clamp-1">{ev.title}</h3>
                          </div>
                          <span className="text-xs font-bold font-mono text-emerald-400 px-2 py-1 bg-zinc-950 border border-zinc-850 rounded-lg">
                            {ev.fee === 0 ? "FREE" : `LKR ${ev.fee.toLocaleString()}`}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                          {ev.description || "No description provided."}
                        </p>

                        <div className="space-y-1.5 pt-2 text-xs font-mono text-zinc-400 border-t border-zinc-850/60">
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-600" />
                            <span>{evDate.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-zinc-600" />
                            <span>Capacity: {ev.registeredCount || 0} / {ev.capacity} Pax</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-zinc-950 border-t border-zinc-850 px-5 py-3 flex justify-between gap-2 text-xs">
                        <Link 
                          to={`/events/${ev.id}`} 
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 text-zinc-300 font-bold rounded-lg transition"
                        >
                          View Page
                        </Link>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(ev)}
                            className="p-1 px-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg border border-zinc-850 hover:border-zinc-700 transition"
                            title="Edit Event Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id, ev.title)}
                            className="p-1 px-2.5 bg-red-950/10 hover:bg-red-900/30 text-red-400 hover:text-red-300 rounded-lg border border-red-900/20 hover:border-red-500/20 transition"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. ADMISSIONS & ORDER REGISTRANTS TAB SCREEN */}
        {activeTab === "registrations" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-grow max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter by name, ID, or event title..."
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setRegStatusFilter("all")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition border ${
                    regStatusFilter === "all" ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-500 border-zinc-850 hover:bg-zinc-850"
                  }`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setRegStatusFilter("pending")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition border ${
                    regStatusFilter === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium" : "bg-zinc-900 text-zinc-500 border-zinc-850 hover:bg-zinc-850"
                  }`}
                >
                  Pending Bank Receipt
                </button>
                <button
                  onClick={() => setRegStatusFilter("approved")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition border ${
                    regStatusFilter === "approved" ? "bg-green-500/10 text-green-400 border-green-500/30 font-medium" : "bg-zinc-900 text-zinc-500 border-zinc-850 hover:bg-zinc-850"
                  }`}
                >
                  Admitted Codes
                </button>
              </div>
            </div>

            {filteredRegistrations.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-16 text-center text-zinc-600 font-mono text-xs">
                No tickets or admissions recorded for your events.
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto text-xs font-sans">
                  <table className="w-full text-left text-zinc-400">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-555 font-mono uppercase tracking-wider text-[9px] bg-zinc-950/20 font-bold">
                        <th className="p-4">Attendee</th>
                        <th className="p-4">Event Topic</th>
                        <th className="p-4">Ticket Type</th>
                        <th className="p-4">Checked In</th>
                        <th className="p-4">Verify Audit</th>
                        <th className="p-4 text-right">Receipt Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850/60">
                      {filteredRegistrations.map((reg) => (
                        <tr key={reg.id} className="hover:bg-zinc-950/30 transition text-[11px]">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs">{reg.name}</span>
                              <span className="text-[9px] text-zinc-500 italic mt-0.5 font-mono">Ref ID: {reg.id}</span>
                              <span className="text-[9px] text-zinc-650 font-mono italic">{reg.phone} ({reg.college || "N/A"})</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-300">{reg.eventTitle}</span>
                              <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-sky-400 mt-0.5">{reg.eventCategory}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-mono text-zinc-300 uppercase py-0.5 px-2 bg-zinc-950 border border-zinc-850 rounded-md w-max">
                                {reg.paymentMethod}
                              </span>
                              {reg.paymentProofUrl && (
                                <a 
                                  href={reg.paymentProofUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-zinc-500 hover:text-white underline font-mono"
                                >
                                  View Uploaded slip
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {reg.checkedIn ? (
                              <div className="flex flex-col text-[10px] text-emerald-400">
                                <span className="font-black">✓ Admitted</span>
                                <span className="text-[9px] mt-0.5 text-zinc-500 font-mono">
                                  {reg.checkedInAt ? new Date(reg.checkedInAt?._seconds ? reg.checkedInAt._seconds * 1000 : reg.checkedInAt).toLocaleTimeString() : ""}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-600 italic">No Entrance Logged</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-[9px] uppercase font-mono rounded-full font-bold border ${
                              reg.status === "approved" 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                : reg.status === "rejected" 
                                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}>
                              {reg.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {reg.status === "pending" && (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleUpdateRegStatus(reg.id, "rejected")}
                                  className="py-1 px-2.5 bg-red-950/15 hover:bg-red-900/30 border border-red-900/20 text-red-400 rounded-lg font-bold"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleUpdateRegStatus(reg.id, "approved")}
                                  className="py-1 px-2.5 bg-emerald-400 hover:bg-emerald-350 text-black rounded-lg font-bold"
                                >
                                  Approve Payment
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. PASS GUEST CHECK-IN GATE SCANNER */}
        {activeTab === "gate" && (
          <div className="max-w-xl mx-auto animate-fade-in text-center font-sans space-y-6">
            
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full w-max mx-auto mb-4">
                <QrCode className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white">Attendee Check-In Portal</h2>
              <p className="text-zinc-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                Scan or paste a Ticket reference Token ID (e.g., <span className="font-mono text-zinc-300">2ndL5hZkE...</span>) to verify payment verification and check-in guests.
              </p>

              <form onSubmit={handleCheckInSubmit} className="mt-8 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Ticket ID reference hash..."
                    value={ticketCodeInput}
                    onChange={(e) => setTicketCodeInput(e.target.value)}
                    className="flex-grow bg-zinc-950 border border-zinc-850 rounded-xl py-3 px-4 text-xs font-mono text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={checkInLoading || !ticketCodeInput.trim()}
                    className="py-3 px-6 bg-white hover:bg-zinc-200 transition text-black font-bold text-xs rounded-xl cursor-pointer disabled:opacity-40 select-none shrink-0"
                  >
                    {checkInLoading ? "Verifying..." : "Verify Pass"}
                  </button>
                </div>
              </form>

              {/* Check-In Response Card */}
              <AnimatePresence>
                {checkInResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className={`mt-8 p-6 border rounded-2xl text-left text-xs ${
                      checkInResult.success
                        ? "bg-emerald-950/10 border-emerald-500/25 text-emerald-100"
                        : "bg-red-950/10 border-red-500/25 text-red-100"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-black/40 rounded-xl border border-zinc-800 shrink-0">
                        {checkInResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      
                      <div className="space-y-4 flex-grow">
                        <div>
                          <div className={`font-black uppercase tracking-wider text-[10px] ${checkInResult.success ? "text-emerald-400" : "text-red-400"}`}>
                            {checkInResult.success ? "✓ ACCESS GRANTED" : "❌ ACCESS DENIED"}
                          </div>
                          <div className="text-zinc-200 mt-2 font-medium text-xs leading-relaxed">{checkInResult.message}</div>
                        </div>

                        {checkInResult.attendee && (
                          <div className="pt-3 border-t border-zinc-850/60 font-mono space-y-1 text-[10px] text-zinc-400">
                            <div><span className="text-zinc-600 block">Guest Name:</span> <span className="text-zinc-200 font-bold font-sans text-xs">{checkInResult.attendee}</span></div>
                            <div><span className="text-zinc-600 block">Event:</span> <span className="text-zinc-200 font-sans">{checkInResult.event}</span></div>
                            <div><span className="text-zinc-600 block">Security Gateway:</span> Verified signature token check: Completed</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl flex items-start gap-3 text-left">
              <Clock className="w-5 h-5 text-zinc-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-zinc-400 font-bold text-xs uppercase font-mono">Simulate a Ticket Pass ID check-in:</h4>
                <p className="text-zinc-650 text-[10px] leading-relaxed mt-1">
                  You can copy a Ticket Ref ID from the <span className="text-zinc-500 font-semibold italic cursor-pointer underline" onClick={() => setActiveTab("registrations")}>Admissions</span> tab, paste it above, and hit "Verify Pass" to simulate live entry-gate scanners with instant audio and UI feedback updates.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* EVENT CREATION/EDITING MODAL */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/30">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 font-mono">
                  {editingEventId ? "Modify Event Details" : "Publish New Event"}
                </h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="rounded-lg p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider mb-1">Event Title</label>
                    <input
                      type="text"
                      required
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Electronic Music Fest"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider mb-1">Target Category (Mapped)</label>
                    <select
                      value={eventForm.category}
                      onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-zinc-500"
                    >
                      {assignedCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider mb-1">Detailed Description</label>
                  <textarea
                    rows={4}
                    value={eventForm.description}
                    onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide a comprehensive write up for the event, topics discussed, hosts etc..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider mb-1">Location Venue</label>
                    <input
                      type="text"
                      required
                      value={eventForm.location}
                      onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., W002 IT Hall"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider mb-1">Calendar Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.date}
                      onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider mb-1">Ticket Fee (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      value={eventForm.fee}
                      onChange={(e) => setEventForm(prev => ({ ...prev, fee: Number(e.target.value) || 0 }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                    <span className="text-[9px] text-zinc-650 font-mono block mt-1">Set as 0 for Free Events.</span>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider mb-1">Auditorium Capacity (Pax)</label>
                    <input
                      type="number"
                      min={1}
                      value={eventForm.capacity}
                      onChange={(e) => setEventForm(prev => ({ ...prev, capacity: Number(e.target.value) || 50 }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-500 tracking-wider mb-1">Banner Image URL (Optional)</label>
                  <input
                    type="text"
                    value={eventForm.imageUrl}
                    onChange={(e) => setEventForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="py-2 px-4 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold rounded-xl text-xs transition cursor-pointer select-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEvent}
                    className="py-2 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer select-none"
                  >
                    {savingEvent ? "Saving..." : "Publish Event"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
