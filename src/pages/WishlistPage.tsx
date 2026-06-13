import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Calendar as CalendarIcon, ArrowRight, Heart, HeartOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import EventBannerPlaceholder from "../components/EventBannerPlaceholder";
import { useAuth } from "../context/AuthContext";
import { getProxyUrl } from "../utils/proxyUrl";

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

export default function WishlistPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchWishlist = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/wishlist", {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      if (!res.ok) {
        throw new Error("Failed to load wishlist items");
      }
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not fetch your wishlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [user]);

  const handleRemove = async (eventId: string, eventTitle: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/wishlist/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ eventId })
      });

      if (!res.ok) {
        throw new Error("Failed to update wishlist");
      }

      toast.success(`"${eventTitle}" removed from wishlist.`);
      // Optimistically remove from state
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Remove wishlist error:", err);
      toast.error("An error occurred. Try again.");
    }
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <span className="text-[10px] text-zinc-550 font-mono uppercase font-bold tracking-widest block mb-2">Saved Operations</span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white">My Wishlist</h1>
            <p className="text-zinc-500 text-sm mt-1">Keep track of interest lanes & events you plan to join</p>
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search saved events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-full py-3 pl-11 pr-5 focus:outline-none focus:border-zinc-700 transition-all text-xs text-white placeholder:text-zinc-650"
            />
          </div>
        </div>

        {/* Dynamic List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="aspect-[4/3] bg-zinc-950 border border-zinc-850 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !user ? (
          <div className="text-center py-20 bg-zinc-950/40 border border-zinc-850 rounded-3xl p-8 max-w-xl mx-auto">
            <Heart className="w-10 h-10 text-zinc-600 mx-auto mb-4 stroke-[1.5]" />
            <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
            <p className="text-zinc-500 text-sm mb-6">You must join or log in first to manage your personalized event wishlist.</p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold text-xs py-3 px-6 rounded-full hover:bg-zinc-200 transition-colors"
            >
              Sign In to Your Account
            </Link>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, idx) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative group block bg-zinc-950 border border-zinc-850/80 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all shadow-lg hover:shadow-zinc-950/60"
                >
                  {/* Remove Button Hover Accent Pin */}
                  <button
                    onClick={() => handleRemove(event.id, event.title)}
                    className="absolute top-4 left-4 z-20 bg-black/70 hover:bg-red-950/85 text-zinc-350 hover:text-red-400 p-2.5 rounded-full backdrop-blur-md border border-zinc-800 hover:border-red-900 transition-all group/button shadow-md"
                    title="Remove from wishlist"
                  >
                    <HeartOff className="w-4 h-4" />
                  </button>

                  <Link to={`/events/${event.id}`} className="block">
                    <div className="aspect-[16/9] bg-zinc-900 relative overflow-hidden group">
                      {event.imageUrl ? (
                        <div className="w-full h-full relative overflow-hidden">
                          <motion.img
                            src={getProxyUrl(event.imageUrl)}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            animate={{
                              y: [0, -5, 0],
                            }}
                            transition={{
                              duration: 6,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            whileHover={{
                              scale: 1.04,
                              transition: { duration: 0.3 }
                            }}
                          />
                          
                          {/* Pulse scanning line */}
                          <motion.div 
                            initial={{ top: "-10%" }}
                            animate={{ top: "110%" }}
                            transition={{
                              duration: 4,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="absolute left-0 right-0 h-[1.5px] bg-red-400/55 blur-[0.5px] pointer-events-none shadow-[0_0_8px_rgba(248,113,113,0.7)]"
                          />
                        </div>
                      ) : (
                        <EventBannerPlaceholder category={event.category} title={event.title} />
                      )}
                      
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-400 border border-zinc-800">
                        {event.category}
                      </div>
                    </div>
                  </Link>

                  <div className="p-6">
                    <div className="flex items-center text-zinc-550 text-[10px] mb-3 space-x-4 font-mono">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {new Date(event.date?._seconds ? event.date._seconds * 1000 : event.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </div>
                    </div>

                    <Link to={`/events/${event.id}`}>
                      <h3 className="text-lg font-bold mb-2 text-white hover:text-zinc-300 transition-colors tracking-tight line-clamp-1">{event.title}</h3>
                    </Link>
                    <p className="text-zinc-550 text-xs line-clamp-2 mb-4 leading-relaxed">{event.description}</p>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-900">
                      <div className="text-md font-bold text-zinc-150">
                        {event.fee === 0 ? "FREE" : `LKR ${event.fee.toLocaleString()}`}
                      </div>
                      <Link
                        to={`/events/${event.id}`}
                        className="inline-flex items-center text-xs font-semibold text-white group/link"
                      >
                        Details <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-24 bg-zinc-950/10 border border-zinc-900 rounded-3xl p-8 max-w-lg mx-auto">
            <Heart className="w-12 h-12 text-zinc-800 mx-auto mb-4 stroke-[1.2]" />
            <h3 className="text-xl font-bold text-zinc-400 mb-2">Wishlist is Empty</h3>
            <p className="text-zinc-550 text-sm mb-6 max-w-sm mx-auto">Start browsing upcoming workshops and high-octane meetups and add favorites here for instant access.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 text-white font-semibold text-xs py-3 px-6 rounded-full border border-zinc-800 transition-colors"
            >
              Explore Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
