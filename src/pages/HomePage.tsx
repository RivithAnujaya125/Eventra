import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Calendar as CalendarIcon, ArrowRight, Filter, Image as ImageIcon, Briefcase, Plus, Send, CheckCircle, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import EventraLogo from "../components/EventraLogo";
import EventBannerPlaceholder from "../components/EventBannerPlaceholder";
import { getProxyUrl } from "../utils/proxyUrl";
import { useAuth } from "../context/AuthContext";

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

const CATEGORIES = ["All", "Music", "Tech", "Business", "Sports", "Food", "Literature", "Arts", "Education", "Gaming", "General"];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Organizer request states
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalResult, setProposalResult] = useState<{ success: boolean; message: string } | null>(null);
  const [proposalForm, setProposalForm] = useState({
    name: "",
    email: "",
    phone: "",
    organizationName: "",
    proposedEventCategory: "Tech",
    proposedEventTitle: "",
    proposedEventDescription: "",
    proposedEventFee: "",
    proposedEventCapacity: ""
  });

  useEffect(() => {
    if (user) {
      setProposalForm(prev => ({
        ...prev,
        name: prev.name || user.displayName || "",
        email: prev.email || user.email || ""
      }));
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/events")
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
        }
        return res.json();
      })
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching events:", err);
        setLoading(false);
      });
  }, []);

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase()) || 
                          e.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || e.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setProposalResult({ success: false, message: "Identification credentials missing. Please register or log in first." });
      return;
    }

    setProposalSubmitting(true);
    setProposalResult(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/admin/organizer-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: proposalForm.name,
          email: proposalForm.email,
          phone: proposalForm.phone,
          organizationName: proposalForm.organizationName,
          proposedEventCategory: proposalForm.proposedEventCategory,
          proposedEventTitle: proposalForm.proposedEventTitle,
          proposedEventDescription: proposalForm.proposedEventDescription,
          proposedEventFee: proposalForm.proposedEventFee ? Number(proposalForm.proposedEventFee) : 0,
          proposedEventCapacity: proposalForm.proposedEventCapacity ? Number(proposalForm.proposedEventCapacity) : 100
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed.");
      }

      setProposalResult({
        success: true,
        message: data.message || "Proposal submitted successfully! Admin will verify and set up your Category Organizer mapping soon."
      });

      // Reset proposal details but keep pre-filled bio
      setProposalForm(prev => ({
        ...prev,
        phone: "",
        organizationName: "",
        proposedEventTitle: "",
        proposedEventDescription: "",
        proposedEventFee: "",
        proposedEventCapacity: ""
      }));
    } catch (err: any) {
      setProposalResult({
        success: false,
        message: err.message || "Database node offline. Please test connectivity again."
      });
    } finally {
      setProposalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      {/* Hero */}
      <section className="px-4 mb-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center mb-8 scale-150 transform"
          >
            <EventraLogo className="h-16" />
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent"
          >
            Experience <br /> Without Limits
          </motion.h1>
          <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
            Discover events, register instantly, and get your digital ticket — all in one place.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search by event name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-4 pl-12 pr-6 focus:outline-none focus:border-zinc-500 transition-all text-white placeholder:text-zinc-600"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 mb-12">
        <div className="max-w-7xl mx-auto flex overflow-x-auto space-x-2 pb-4 scrollbar-hide no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-full whitespace-nowrap transition-all ${
                category === cat 
                  ? "bg-white text-black" 
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Events Grid */}
      <section className="px-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(n => (
                <div key={n} className="aspect-[4/3] bg-zinc-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event, idx) => (
                <motion.div
                  key={event.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link 
                    to={`/events/${event.id}`}
                    className="group block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all"
                  >
                    <div className="aspect-[16/9] bg-zinc-800 relative overflow-hidden group">
                      {event.imageUrl ? (
                        <div className="w-full h-full relative overflow-hidden">
                          <motion.img 
                            src={getProxyUrl(event.imageUrl)} 
                            alt={event.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            animate={{
                              y: [0, -6, 0],
                            }}
                            transition={{
                              duration: 6,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: idx * 0.2,
                            }}
                            whileHover={{
                              scale: 1.05,
                              transition: { duration: 0.3 }
                            }}
                          />
                          {/* AI Holographic laser scan beam overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none mix-blend-overlay" />
                          <motion.div 
                            initial={{ top: "-100%" }}
                            animate={{ top: "200%" }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "linear",
                              delay: idx * 0.4
                            }}
                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent blur-[2px] pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                          />
                        </div>
                      ) : (
                        <EventBannerPlaceholder category={event.category} title={event.title} />
                      )}
                      
                      {/* AI cyber-mesh corner flare */}
                      <div className="absolute bottom-0 right-0 left-0 h-10 bg-gradient-to-t from-black/90 to-transparent flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-[9px] text-zinc-400 font-mono tracking-widest flex items-center gap-1.5 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                          AI VESSEL SECURED
                        </span>
                      </div>
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
                        {event.category}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-zinc-500 text-xs mb-3 space-x-4">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {new Date(event.date?._seconds ? event.date._seconds * 1000 : event.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.location}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{event.title}</h3>
                      <p className="text-zinc-500 text-sm line-clamp-2 mb-4">{event.description}</p>
                      
                      <div className="flex items-center justify-between mt-6">
                        <div className="text-xl font-bold">
                          {event.fee === 0 ? "FREE" : `LKR ${event.fee.toLocaleString()}`}
                        </div>
                        <div className="flex items-center text-sm font-medium text-white group-hover:translate-x-1 transition-transform">
                          Details <ArrowRight className="ml-2 w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <h3 className="text-2xl font-bold mb-2">No events found</h3>
              <p className="text-zinc-500">
                {search || category !== "All" ? "Try adjusting your filters." : "No events have been posted yet."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Are You an Event Organizer Panel */}
      <section className="px-4 mt-20 mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(16,185,129,0.02)]">
            {/* Background cyber pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4 font-mono">
                  <Briefcase className="w-3.5 h-3.5 animate-pulse" />
                  EVENT PARTNERSHIP PROGRAM
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
                  Are you an <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Event Organizer</span>?
                </h2>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-6">
                  Pitch your event to our admin panel to secure an exclusive category partnership. 
                  Approved organizers get total catalog placement, and **80% of all ticket sales** are paid directly to your team, with a simple **20% platform commission** recorded directly in our verified payment ledger.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-500 font-mono">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Exclusive Category Monopoly available</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>80% Ticketing Payouts directed to you</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Real-time admin ledger metrics</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                {user ? (
                  <button
                    onClick={() => {
                      setProposalResult(null);
                      setShowOrganizerModal(true);
                    }}
                    className="group flex items-center gap-3 bg-white hover:bg-emerald-400 text-black px-8 py-4 rounded-full font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-white/5 font-sans"
                  >
                    Pitch Your Concept
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 bg-zinc-900 border border-zinc-805 hover:bg-zinc-850 text-white px-8 py-4 rounded-full font-bold transition-all cursor-pointer"
                  >
                    Login to Partner
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Submission Modal */}
      <AnimatePresence>
        {showOrganizerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrganizerModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <div>
                  <h3 className="text-lg font-bold">Submit Organizer Proposal</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Let’s launch your category and start collecting tickets.</p>
                </div>
                <button
                  onClick={() => setShowOrganizerModal(false)}
                  className="p-1 px-2.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body - Scrollable */}
              <form onSubmit={handleProposalSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
                {proposalResult && (
                  <div className={`p-4 rounded-2xl flex items-start gap-3 border text-xs leading-relaxed ${
                    proposalResult.success 
                      ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/10" 
                      : "bg-red-950/20 text-red-400 border-red-500/10"
                  }`}>
                    {proposalResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold mb-1">{proposalResult.success ? "Success" : "Error Occurred"}</p>
                      <p>{proposalResult.message}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Contact Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={proposalForm.name}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. john@university.edu"
                      value={proposalForm.email}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Phone (Sri Lanka format)</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0771234567"
                      value={proposalForm.phone}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Organization / Body Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IEEE Student Branch"
                      value={proposalForm.organizationName}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, organizationName: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-850 pt-4 mt-2">
                  <h4 className="text-zinc-300 text-xs font-bold uppercase tracking-wider mb-2 font-mono">Proposed Event Segment</h4>
                  <p className="text-zinc-500 text-[10px] mb-4">Provide details about the initial show/seminar you wish to organize under your target partnership category.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Target Category exclusivity</label>
                    <select
                      value={proposalForm.proposedEventCategory}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, proposedEventCategory: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 transition"
                    >
                      {CATEGORIES.filter(c => c !== "All").map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Proposed Event Title</label>
                    <input
                      type="text"
                      placeholder="e.g. CodeBlast Hacker Cup"
                      value={proposalForm.proposedEventTitle}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, proposedEventTitle: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Description (Schedules, targets, description)</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly pitch your timeline and event objectives..."
                    value={proposalForm.proposedEventDescription}
                    onChange={(e) => setProposalForm(prev => ({ ...prev, proposedEventDescription: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Ticket Price (LKR) - 0 if Free</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={proposalForm.proposedEventFee}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, proposedEventFee: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-xs font-semibold mb-1.5">Expected Capacity</label>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={proposalForm.proposedEventCapacity}
                      onChange={(e) => setProposalForm(prev => ({ ...prev, proposedEventCapacity: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition font-mono"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowOrganizerModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-750 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={proposalSubmitting}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 transition cursor-pointer disabled:opacity-50"
                  >
                    {proposalSubmitting ? "Transmitting..." : "Send Proposal"}
                    <Send className="w-3.5 h-3.5" />
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
