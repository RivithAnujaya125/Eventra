import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  User, 
  ArrowLeft, 
  Download, 
  Share2,
  Ticket as TicketIcon,
  Clock,
  AlertCircle,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface TicketData {
  id: string;
  name: string;
  phone: string;
  college: string;
  eventTitle: string;
  eventDate: any;
  eventLocation: string;
  status: string;
  paymentProofUrl?: string;
  aiVerification?: {
    status?: string;
    reason?: string;
    amountPaid?: number;
    transactionId?: string;
    confidence?: number;
  };
}

export default function TicketPage() {
  const { regId } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  const fetchTicket = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/registrations/${regId}`, {
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch ticket info");
      
      setTicket(data);
      
      if (data.status === 'approved') {
        // Generate QR code for the registration ID
        const qr = await QRCode.toDataURL(data.id);
        setQrCodeUrl(qr);
      } else {
        setQrCodeUrl("");
      }

      if (isManualRefresh) {
        toast.success(`Status updated: ${data.status.toUpperCase()}`, {
          description: data.status === 'approved' ? "Your entry pass is unlocked!" : "Processing is still in progress."
        });
      }
    } catch (error: any) {
      console.error("Error fetching ticket:", error);
      toast.error(error.message || "Failed to load ticket details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && regId) {
      fetchTicket();
    }
  }, [user, regId]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" />
        <p className="text-zinc-500 text-xs font-mono animate-pulse">Loading registration details...</p>
      </div>
    </div>
  );

  if (!ticket) return (
    <div className="min-h-screen bg-black text-white pt-24 text-center">
      <h2 className="text-2xl font-bold font-sans">Ticket not found</h2>
      <Link to="/my-tickets" className="text-zinc-450 hover:text-white mt-4 inline-block font-mono text-xs underline">
        Back to My Tickets
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <Link to="/my-tickets" className="inline-flex items-center text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Tickets
          </Link>
          
          <button 
            onClick={() => fetchTicket(true)}
            disabled={refreshing}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-full text-xs font-mono transition-all duration-250 ${
              refreshing ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-pink-500" : ""}`} />
            {refreshing ? "Syncing..." : "Sync Status"}
          </button>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white text-black rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
        >
          {/* Main Ticket Area */}
          <div className="flex-grow p-8 sm:p-10 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-zinc-200 relative">
            {/* Cutout circles for aesthetic ticket look */}
            <div className="hidden md:block absolute -top-5 -right-5 w-10 h-10 bg-black rounded-full z-10" />
            <div className="hidden md:block absolute -bottom-5 -right-5 w-10 h-10 bg-black rounded-full z-10" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-black rounded-xl">
                  <TicketIcon className="w-5.5 h-5.5 text-white" />
                </div>
                <span className="font-extrabold tracking-tighter text-xl">EVENTRA</span>
              </div>

              {/* Status Pill on Left side */}
              <div className={`flex items-center gap-1 px-3 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${
                ticket.status === 'approved' ? 'bg-green-100 text-green-800' :
                ticket.status === 'pending' ? 'bg-amber-100 text-amber-850 animate-pulse' :
                'bg-red-100 text-red-800'
              }`}>
                {ticket.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                {ticket.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                {ticket.status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                {ticket.status}
              </div>
            </div>

            {/* In-ticket state banner */}
            <div className="mb-8">
              {ticket.status === 'approved' ? (
                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-green-950 uppercase tracking-wide">Pass Is Verified & Active</h4>
                    <p className="text-xs text-green-800 mt-1">This entry pass is authenticated. Secure check-ins are enabled at the gates.</p>
                  </div>
                </div>
              ) : ticket.status === 'pending' ? (
                <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide inline-flex items-center gap-1">
                      Verification Processing <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                    </h4>
                    <p className="text-xs text-amber-850 mt-1">
                      Our automated system is processing your payment proof screenshot. Barcode unlocks instantly upon verification.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-red-950 uppercase tracking-wide">Verification Declined</h4>
                    <p className="text-xs text-red-800 mt-1">
                      {ticket.aiVerification?.reason || "The uploaded bank receipt could not be automatically matching or verified for correct payment fee. Please consult administrators."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 leading-tight mb-6">
                {ticket.eventTitle}
              </h1>
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-6 text-sm">
                <div>
                  <p className="text-zinc-400 uppercase font-bold text-[10px] tracking-widest mb-1 font-mono">Attendee</p>
                  <p className="font-extrabold text-zinc-800">{ticket.name}</p>
                </div>
                <div>
                  <p className="text-zinc-400 uppercase font-bold text-[10px] tracking-widest mb-1 font-mono">Organization</p>
                  <p className="font-extrabold text-zinc-800">{ticket.college || "N/A"}</p>
                </div>
                <div>
                  <p className="text-zinc-400 uppercase font-bold text-[10px] tracking-widest mb-1 font-mono">Date</p>
                  <div className="flex items-center gap-1.5 font-extrabold text-zinc-800">
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                    {ticket.eventDate ? (
                      new Date(ticket.eventDate?._seconds ? ticket.eventDate._seconds * 1000 : ticket.eventDate).toLocaleDateString("en-US", {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                      })
                    ) : "N/A"}
                  </div>
                </div>
                <div>
                  <p className="text-zinc-400 uppercase font-bold text-[10px] tracking-widest mb-1 font-mono">Location</p>
                  <div className="flex items-center gap-1.5 font-extrabold text-zinc-855">
                    <MapPin className="w-3.5 h-3.5 text-zinc-450" />
                    <span className="truncate max-w-[150px]" title={ticket.eventLocation}>{ticket.eventLocation}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle visual receipt preview */}
            {ticket.paymentProofUrl && (
              <div className="pt-6 border-t border-zinc-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-mono">Uploaded Payment Proof:</span>
                  <button 
                    onClick={() => setShowReceipt(!showReceipt)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-black transition-colors"
                  >
                    {showReceipt ? (
                      <>
                        <EyeOff className="w-4 h-4" /> Hide Image Proof
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 text-pink-500 animate-pulse" /> View Image Proof
                      </>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {showReceipt && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden bg-zinc-50 rounded-2xl border border-zinc-200/50 p-2 relative"
                    >
                      <img 
                        src={ticket.paymentProofUrl} 
                        alt="Payment screenshot proof" 
                        className="w-full max-h-72 object-contain rounded-xl shadow-inner"
                        referrerPolicy="no-referrer"
                      />
                      <a 
                        href={ticket.paymentProofUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute bottom-4 right-4 bg-black/80 hover:bg-black text-white p-2 text-[10px] rounded-lg inline-flex items-center gap-1 font-mono hover:scale-105 transition-all"
                      >
                        Open Original <ExternalLink className="w-3 h-3" />
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-150">
              <div className="text-[10px] font-mono text-zinc-400 select-all">
                REG_ID: {ticket.id}
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    toast.success("Ready to download", { description: "You can download/print this web pass safely." });
                    window.print();
                  }} 
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-black" 
                  title="Print Ticket"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* QR Code / Dynamic verification state stub */}
          <div className="md:w-64 p-8 sm:p-10 bg-zinc-50 flex flex-col items-center justify-center text-center relative border-t md:border-t-0 md:border-l border-zinc-100">
            {ticket.status === 'approved' ? (
              <>
                <div className="bg-white p-4 rounded-[28px] shadow-xl border border-zinc-200/40 mb-6 group transition-transform hover:scale-105">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Ticket QR code" className="w-32 h-32" />
                  ) : (
                    <div className="w-32 h-32 bg-zinc-100 animate-pulse rounded-2xl" />
                  )}
                </div>
                <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest font-mono">Entry Pass</p>
                <p className="text-xs font-bold text-zinc-800 mt-1">Scan at Entrance</p>
              </>
            ) : ticket.status === 'pending' ? (
              <div className="flex flex-col items-center justify-center p-4">
                {/* Visual loading ring */}
                <div className="relative w-28 h-28 mb-6 flex items-center justify-center bg-amber-500/5 rounded-full border border-amber-500/10">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/40 animate-[spin_12s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border border-pink-500/20 animate-pulse" />
                  <Clock className="w-10 h-10 text-amber-500 animate-bounce" />
                </div>
                <span className="text-[10px] font-extrabold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  Awaiting Sync
                </span>
                <p className="text-xs font-bold text-zinc-800 mt-3 font-sans">Locked Until Proof Verified</p>
                <p className="text-[10px] text-zinc-450 mt-1 leading-relaxed">
                  Your entry pass barcode will unlock automatically. Click 'Sync Status' above to check.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                  <XCircle className="w-12 h-12 text-red-500" />
                </div>
                <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                  Locked
                </span>
                <p className="text-xs font-bold text-zinc-800 mt-3">Declined Block</p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Manual admin review or key changes required.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        <div className="mt-12 text-center text-zinc-500 text-xs font-mono space-y-1">
          <p>Verified entry tickets are digital-only, non-transferable passes.</p>
          <p>Need support? Present registration ID {ticket.id} toEventra Help Desk.</p>
        </div>
      </div>
    </div>
  );
}
