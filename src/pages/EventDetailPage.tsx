import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "../utils/compress";
import { getProxyUrl } from "../utils/proxyUrl";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  IndianRupee, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Upload,
  Info,
  Image as ImageIcon,
  Wallet,
  Heart
} from "lucide-react";
import { motion } from "motion/react";
import EventBannerPlaceholder from "../components/EventBannerPlaceholder";

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

export default function EventDetailPage() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  
  // Wishlist States
  const [wishlisted, setWishlisted] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(false);
  
  // Registration Form State
  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    phone: "",
    college: "",
    paymentProofUrl: ""
  });

  const [paymentMethod, setPaymentMethod] = useState<"receipt" | "wallet">("receipt");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const idToken = await user?.getIdToken();
        const res = await fetch("/api/wallet", {
          headers: { "Authorization": `Bearer ${idToken}` }
        });
        const data = await res.json();
        if (res.ok) setWalletBalance(data.balance);
      } catch (err) {
        console.error("Error loading wallet balance:", err);
      }
    };
    if (user) {
      fetchBalance();
    }
  }, [user]);

  useEffect(() => {
    if (!id) return;
    
    fetch(`/api/events/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setEvent(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching event:", err);
        toast.error("Event not found");
        setLoading(false);
      });
  }, [id, user?.displayName]);

  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!user || !id) return;
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/wishlist/check/${id}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setWishlisted(data.wishlisted);
        }
      } catch (err) {
        console.error("Error checking wishlist status:", err);
      }
    };
    checkWishlistStatus();
  }, [user, id]);

  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error("Please sign in to add events to your wishlist.");
      navigate("/login");
      return;
    }
    setCheckingWishlist(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/wishlist/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ eventId: id })
      });
      if (!res.ok) {
        throw new Error("Failed to toggle wishlist");
      }
      const data = await res.json();
      setWishlisted(data.wishlisted);
      toast.success(data.message);
    } catch (err) {
      console.error("Error toggling wishlist:", err);
      toast.error("Failed to update wishlist. Try again.");
    } finally {
      setCheckingWishlist(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to register");
      navigate("/login");
      return;
    }

    // Form Handling & Regex Validation
    const nameRegex = /^[A-Za-z\s']{3,50}$/;
    if (!nameRegex.test(formData.name.trim())) {
      toast.error("Invalid Name: Name should contain only letters/spaces, 3 to 50 characters.");
      return;
    }

    // Sri Lankan standard phone matches 07XXXXXXXX / 011XXXXXXX (9 to 10 digits) or general mobile patterns
    const phoneRegex = /^(0|94)?[1-9][0-9]{8}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      toast.error("Invalid Phone Number: Please enter a valid Sri Lankan phone number (e.g. 0771234567 or 94771234567).");
      return;
    }

    setRegistering(true);
    let finalPaymentUrl = formData.paymentProofUrl;

    try {
      if (event?.fee && event.fee > 0) {
        if (paymentMethod === "wallet") {
          if (walletBalance !== null && walletBalance < event.fee) {
            toast.error(`Insufficient Eventra Points (EP). You need ${event.fee.toLocaleString()} EP but only have ${walletBalance.toLocaleString()} EP`);
            setRegistering(false);
            return;
          }
          finalPaymentUrl = ""; // No screenshot attachment needed for wallet
        } else {
          if (!paymentFile && !finalPaymentUrl) {
            toast.error("Please upload payment proof screenshot");
            setRegistering(false);
            return;
          }

          if (paymentFile) {
            // File size validation (e.g., 5MB)
            if (paymentFile.size > 5 * 1024 * 1024) {
              toast.error("File size must be less than 5MB");
              setRegistering(false);
              return;
            }

            setUploading(true);
            const uploadToastId = toast.loading("Processing payment proof...");
            try {
              // Pre-compress the image to under 100KB using our downscaler
              const compressedBase64 = await compressImage(paymentFile, 850, 0.6);

              // Cloud Storage upload promise
              const uploadToStorage = async (): Promise<string> => {
                const storageRef = ref(storage, `payments/${user.uid}/${Date.now()}_${paymentFile.name}`);
                const uploadResult = await uploadBytes(storageRef, paymentFile);
                return await getDownloadURL(uploadResult.ref);
              };

              // 2.5-second fallback timer
              const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

              const cloudUrl = await Promise.race([
                uploadToStorage(),
                timeoutPromise
              ]);

              if (cloudUrl) {
                finalPaymentUrl = cloudUrl;
                toast.success("Ready (uploaded successfully)!", { id: uploadToastId });
              } else {
                finalPaymentUrl = compressedBase64;
                toast.success("Ready (speed-optimized receipt compression applied)!", { id: uploadToastId });
              }
            } catch (uploadError) {
              // Error fallback directly to compressed Base64
              try {
                finalPaymentUrl = await compressImage(paymentFile, 850, 0.6);
                toast.success("Ready (high-speed fallback applied)!", { id: uploadToastId });
              } catch (fallbackError) {
                toast.error("Failed to process attachment. Please try again.", { id: uploadToastId });
                throw uploadError;
              }
            } finally {
              setUploading(false);
            }
          }
        }
      }

      const idToken = await user.getIdToken();
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          eventId: id,
          ...formData,
          paymentMethod,
          paymentProofUrl: finalPaymentUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      toast.success("Successfully registered!");
      navigate("/my-tickets");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen bg-black text-white pt-24 text-center">
      <h2 className="text-2xl font-bold">Event not found</h2>
      <Link to="/" className="text-zinc-400 hover:text-white mt-4 inline-block">Back to Events</Link>
    </div>
  );

  const isFull = (event.registeredCount || 0) >= event.capacity;
  const eventDate = new Date(event.date?._seconds ? event.date._seconds * 1000 : event.date);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center text-zinc-500 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Link>

        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 mb-8">
          <button
            onClick={handleToggleWishlist}
            disabled={checkingWishlist}
            className="absolute top-6 left-6 z-10 bg-black/60 hover:bg-black/85 text-white p-2.5 rounded-full backdrop-blur-md border border-zinc-800 transition-all flex items-center justify-center shadow-lg disabled:opacity-50"
            title={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`w-5 h-5 transition-all ${wishlisted ? "text-red-500 fill-red-500 scale-105" : "text-white"}`} />
          </button>
          
          <div className="aspect-[21/9] bg-zinc-800 flex items-center justify-center font-mono text-zinc-700 text-3xl font-bold overflow-hidden relative group">
            {event.imageUrl ? (
              <div className="w-full h-full relative overflow-hidden">
                <motion.img 
                  src={getProxyUrl(event.imageUrl)} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  whileHover={{
                    scale: 1.03,
                    transition: { duration: 0.4 }
                  }}
                />
                
                {/* Tactical AI Mesh & Target Scope scan line overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                
                {/* Pulse Glow Grid effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_95%,rgba(16,185,129,0.05)_95%),linear-gradient(90.1deg,rgba(18,18,18,0)_95%,rgba(16,185,129,0.05)_95%)] bg-[size:30px_30px] opacity-40 mix-blend-screen pointer-events-none group-hover:opacity-70 transition-opacity duration-500" />
                
                {/* Horizontal high-risk scanning laser */}
                <motion.div 
                  initial={{ top: "-10%" }}
                  animate={{ top: "110%" }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute left-0 right-0 h-0.5 bg-cyan-500/60 blur-[1px] pointer-events-none shadow-[0_0_12px_rgba(6,182,212,0.9)]"
                />

                {/* Subtle digital vignette layout marker */}
                <span className="absolute bottom-4 left-6 text-[9px] text-zinc-400 font-mono tracking-wider flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  CHAMBER INTEL: SECURE NODE VERIFIED
                </span>
              </div>
            ) : (
              <EventBannerPlaceholder category={event.category} title={event.title} />
            )}
          </div>
          <div className="absolute top-6 right-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-sm font-bold tracking-widest uppercase text-white">
            {event.category}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">{event.title}</h1>
            
            <div className="flex flex-wrap gap-6 mb-8 text-zinc-400">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-zinc-500" />
                <span>{eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-zinc-500" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-zinc-500" />
                <span>{event.registeredCount || 0} / {event.capacity} Registered</span>
              </div>
            </div>

            <div className="max-w-none">
              <h3 className="text-xl font-bold mb-3">About this event</h3>
              <p className="text-zinc-400 leading-relaxed text-lg whitespace-pre-wrap">
                {event.description || "No description provided for this event."}
              </p>
            </div>
            
            <div className="mt-12 p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-start gap-4">
              <Info className="w-6 h-6 text-zinc-500 shrink-0 mt-1" />
              <div>
                <h4 className="font-bold mb-1">Important Information</h4>
                <p className="text-sm text-zinc-500">
                  Please arrive at least 30 minutes before the event starts. Digital tickets will be checked at the entrance. 
                  Valid ID proof may be required.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                <div className="mb-6 flex justify-between items-start gap-3">
                  <div>
                    <div className="text-sm text-zinc-500 uppercase tracking-widest font-bold mb-1">Registration Fee</div>
                    <div className="text-4xl font-bold flex flex-wrap items-center gap-1 text-white">
                      {event.fee === 0 ? "FREE" : `LKR ${event.fee.toLocaleString()}`}
                    </div>
                    {event.fee > 0 && (
                      <span className="text-xs text-zinc-500 font-medium tracking-wide">
                        ({event.fee.toLocaleString()} Eventra Points)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleToggleWishlist}
                    disabled={checkingWishlist}
                    className="p-3 bg-zinc-950 border border-zinc-850 rounded-2xl hover:bg-zinc-850 hover:border-zinc-700 transition-all flex items-center justify-center text-zinc-400 hover:text-white shrink-0"
                    title={wishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`w-5 h-5 ${wishlisted ? "text-red-500 fill-red-500" : ""}`} />
                  </button>
                </div>

                {role === "admin" || role === "organizer" ? (
                  <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-zinc-650" />
                    <span>Administrators and Event Organizers are not permitted to register for events or acquire tickets.</span>
                  </div>
                ) : !showRegForm ? (
                  <button
                    onClick={() => setShowRegForm(true)}
                    disabled={isFull}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isFull ? "Event Full" : "Register Now"}
                  </button>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-tighter mb-1.5">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-tighter mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        required
                        pattern="[0-9]{10}"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all"
                        placeholder="10 digit number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-tighter mb-1.5">College / Company</label>
                      <input
                        type="text"
                        value={formData.college}
                        onChange={(e) => setFormData({...formData, college: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all"
                        placeholder="Organization name"
                      />
                    </div>
                    
                    {event.fee > 0 && (
                      <div className="space-y-4 pt-2 border-t border-zinc-800">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-tighter">Payment Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("receipt")}
                            className={`py-2.5 px-3 border rounded-xl text-center text-xs font-bold transition-all ${
                              paymentMethod === "receipt" 
                                ? "bg-white text-black border-white" 
                                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            Bank Transfer
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("wallet")}
                            className={`py-2 px-3 border rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                              paymentMethod === "wallet" 
                                ? "bg-white text-black border-white" 
                                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <span>Wallet Balance</span>
                            <span className="text-[9px] opacity-70">
                              {walletBalance !== null ? walletBalance.toLocaleString() : "0"} EP
                            </span>
                          </button>
                        </div>

                        {paymentMethod === "wallet" ? (
                          <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl space-y-1.5 text-xs text-zinc-400">
                            {walletBalance !== null && walletBalance >= event.fee ? (
                              <div className="flex items-start gap-2 text-green-400 font-medium">
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Sufficient balance! Paid tickets will be instantly approved on confirmation.</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-start gap-2 text-red-400 font-medium">
                                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                  <span>Insufficient Eventra Points (EP). You need {event.fee.toLocaleString()} EP but only have {walletBalance?.toLocaleString() || "0"} EP</span>
                                </div>
                                <Link 
                                  to="/wallet" 
                                  className="block text-center py-2 bg-pink-500 text-white font-bold hover:bg-pink-600 rounded-lg transition-all"
                                >
                                  Top up Wallet Credits
                                </Link>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-tighter mb-1.5">Payment Proof screenshot</label>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                required={!formData.paymentProofUrl}
                                onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="payment-upload"
                              />
                              <label 
                                htmlFor="payment-upload"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 pl-10 focus:outline-none focus:border-zinc-500 transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-zinc-705 cursor-pointer"
                              >
                                <Upload className="w-4 h-4 text-zinc-650 text-zinc-650" />
                                <span className="text-sm truncate">
                                  {paymentFile ? paymentFile.name : "Upload Screenshot"}
                                </span>
                              </label>
                            </div>
                            <p className="text-[10px] text-zinc-650 mt-1 italic">
                              Please upload the transaction receipt of LKR {event.fee.toLocaleString()} (equivalent to {event.fee.toLocaleString()} EP).
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-4 flex gap-2">
                       <button
                        type="button"
                        disabled={registering}
                        onClick={() => !registering && setShowRegForm(false)}
                        className="flex-1 bg-zinc-950 text-white font-bold py-3 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={registering}
                        className="flex-[2] bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {registering ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                            <span>Publishing Event...</span>
                          </>
                        ) : (
                          "Confirm"
                        )}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Instant digital ticket for free events</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <Clock className="w-5 h-5 text-amber-500" />
                    <span>Quick approval for paid events</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
