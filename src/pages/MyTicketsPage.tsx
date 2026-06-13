import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Ticket, 
  Calendar as CalendarIcon, 
  MapPin, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { motion } from "motion/react";

interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: any;
  eventLocation: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyTickets = async () => {
      try {
        const idToken = await user?.getIdToken();
        const res = await fetch("/api/registrations/mine", {
          headers: { "Authorization": `Bearer ${idToken}` }
        });
        const data = await res.json();
        setRegistrations(data);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchMyTickets();
  }, [user]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-bold tracking-tighter">My Tickets</h1>
          <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
            <Ticket className="w-6 h-6 text-zinc-500" />
          </div>
        </div>

        {registrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registrations.map((reg, idx) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link 
                  to={`/tickets/${reg.id}`}
                  className="group block bg-zinc-900 border border-zinc-800 hover:border-zinc-750 hover:scale-[1.01] rounded-3xl overflow-hidden transition-all"
                >
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                        reg.status === 'approved' ? "bg-green-500/10 text-green-500" :
                        reg.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                      }`}>
                        {reg.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {reg.status === 'pending' && <Clock className="w-3 h-3" />}
                        {reg.status === 'rejected' && <AlertCircle className="w-3 h-3" />}
                        {reg.status}
                      </div>
                      <span className="text-zinc-600 text-[10px] font-mono">{reg.id.substring(0, 8)}</span>
                    </div>

                    <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">{reg.eventTitle}</h3>
                    
                    <div className="space-y-2 mb-8">
                      <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <CalendarIcon className="w-4 h-4" />
                        {new Date(reg.eventDate?._seconds ? reg.eventDate._seconds * 1000 : reg.eventDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-sm">
                        <MapPin className="w-4 h-4" />
                        {reg.eventLocation}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-zinc-800/50">
                      <p className="text-xs text-zinc-550">
                        {reg.status === 'approved' ? "Valid Ticket Issued" : 
                         reg.status === 'pending' ? "Waiting for verification" : "Registration declined"}
                      </p>
                      <div className="flex items-center text-xs font-bold text-zinc-400 group-hover:text-pink-400 group-hover:translate-x-1 transition-all">
                        {reg.status === 'approved' ? "View Entry Pass" : "View Processing Status"} <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
            <Ticket className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No tickets yet</h3>
            <p className="text-zinc-500 mb-8">You haven't registered for any events yet.</p>
            <Link 
              to="/" 
              className="inline-flex items-center bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-zinc-200 transition-all"
            >
              Explore Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
