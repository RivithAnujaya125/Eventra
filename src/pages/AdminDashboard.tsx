import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "../utils/compress";
import { getProxyUrl } from "../utils/proxyUrl";
import { 
  Users, 
  Calendar as CalendarIcon, 
  Ticket, 
  Plus, 
  Check, 
  X, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  Image as ImageIcon,
  Upload,
  ArrowUpDown,
  DollarSign,
  Activity,
  Award,
  QrCode,
  Printer,
  Receipt,
  CreditCard,
  Percent,
  Settings,
  Sliders,
  CheckCircle,
  RefreshCw,
  Shield,
  Clock,
  Scan
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

interface Stats {
  totalEvents: number;
  totalUsers: number;
  pendingRegistrations: number;
  totalRegistrations: number;
}

interface Registration {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  phone: string;
  college: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentProofUrl?: string;
  createdAt: any;
  eventTitle: string;
  aiVerification?: {
    status: 'verified' | 'failed';
    amountPaid: number | null;
    transactionId: string | null;
    confidence: number;
    isPotentiallyFraudulent: boolean;
    reason: string;
    verifiedAt: any;
  };
}

interface Event {
  id: string;
  title: string;
  description?: string;
  date: any;
  location?: string;
  category?: string;
  registeredCount: number;
  capacity: number;
  fee: number;
  imageUrl?: string;
}

const CATEGORIES = ["All", "Music", "Tech", "Business", "Sports", "Food", "Literature", "Arts", "Education", "Gaming", "General"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'payments' | 'verification' | 'events' | 'organizers'>('overview');
  const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
  const [verifyingRegId, setVerifyingRegId] = useState<string | null>(null);
  const [entryLogs, setEntryLogs] = useState<any[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState({
    mode: "test",
    provider: "Direct Bank",
    sandboxKey: "pk_test_sample_129481",
    taxRate: 15,
    serviceFee: 300,
    currencySymbol: "LKR"
  });
  const [activeRegForInvoice, setActiveRegForInvoice] = useState<Registration | null>(null);
  const [checkingInCode, setCheckingInCode] = useState("");
  const [checkInResult, setCheckInResult] = useState<{ success: boolean; message: string; title?: string; attendee?: string; time?: string; duplicate?: boolean; date?: string } | null>(null);
  const [scanningSimulateLoading, setScanningSimulateLoading] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);

  // Community Organizer programs state
  const [organizerRequests, setOrganizerRequests] = useState<any[]>([]);
  const [categoryOrganizers, setCategoryOrganizers] = useState<any[]>([]);
  const [manualMapCat, setManualMapCat] = useState<string | null>(null);
  const [manualMapForm, setManualMapForm] = useState({
    organizationName: "",
    organizerName: "",
    organizerEmail: "",
    organizerPhone: ""
  });

  // Action Handlers for Community Organizer Program
  const handleRequestsStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/admin/organizer-requests/${id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update state");
      }
      toast.success(`Proposal successfully ${status}!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "An unexpected system fault occurred.");
    }
  };

  const handleManualCategoryOrganizer = async (category: string) => {
    try {
      if (!manualMapForm.organizationName || !manualMapForm.organizerEmail) {
        toast.error("Organization name and contact email are required.");
        return;
      }
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/admin/category-organizers/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          category,
          ...manualMapForm
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to map organizer configuration.");
      }
      toast.success(`Category ${category} successfully reassigned to ${manualMapForm.organizationName}.`);
      setManualMapCat(null);
      setManualMapForm({
        organizationName: "",
        organizerName: "",
        organizerEmail: "",
        organizerPhone: ""
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    }
  };

  const handleDeleteCategoryOrganizer = async (category: string) => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/admin/category-organizers/${category}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove mapping.");
      }
      toast.success(`Exclusive designation mapping for ${category} category removed.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    }
  };
  
  // Filtering & Sorting of Events State
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventCategoryFilter, setEventCategoryFilter] = useState("All");
  const [eventSortKey, setEventSortKey] = useState<"date" | "title" | "registeredCount" | "fee">("date");
  const [eventSortOrder, setEventSortOrder] = useState<"asc" | "desc">("asc");

  // Filtering & Search of Registrations State
  const [regSearchQuery, setRegSearchQuery] = useState("");
  const [regStatusFilter, setRegStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Event Creation State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    category: "General",
    fee: 0,
    capacity: 100,
    imageUrl: ""
  });

  const fetchData = async () => {
    try {
      const idToken = await user?.getIdToken();
      const headers = { "Authorization": `Bearer ${idToken}` };

      const [statsRes, regsRes, eventsRes, logsRes, gatewayRes, organizerRequestsRes, categoryOrganizersRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/registrations", { headers }),
        fetch("/api/events"),
        fetch("/api/admin/entry-logs", { headers }).catch(() => null),
        fetch("/api/admin/gateway", { headers }).catch(() => null),
        fetch("/api/admin/organizer-requests", { headers }).catch(() => null),
        fetch("/api/admin/category-organizers", { headers }).catch(() => null)
      ]);

      const [statsData, regsData, eventsData] = await Promise.all([
        statsRes.json(),
        regsRes.json(),
        eventsRes.json()
      ]);

      const logsData = logsRes ? await logsRes.json().catch(() => []) : [];
      const gatewayData = gatewayRes ? await gatewayRes.json().catch(() => null) : null;
      const requestsData = organizerRequestsRes ? await organizerRequestsRes.json().catch(() => []) : [];
      const organizersData = categoryOrganizersRes ? await categoryOrganizersRes.json().catch(() => []) : [];

      setStats(statsData);
      setRegistrations(regsData);
      setEvents(eventsData);
      setOrganizerRequests(requestsData);
      setCategoryOrganizers(organizersData);
      if (logsData && Array.isArray(logsData)) setEntryLogs(logsData);
      if (gatewayData) setGatewayConfig(gatewayData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleUpdateStatus = async (regId: string, status: string) => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/registrations/${regId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: status as any } : r));
      toast.success(`Registration ${status}`);
    } catch (error) {
      toast.error("Failed to update registration status");
    }
  };

  const handleVerifyPayment = async (regId: string) => {
    setVerifyingRegId(regId);
    const toastId = toast.loading("🤖 Querying Gemini for multimodal payment verification...");
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/registrations/${regId}/verify`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Verification failed");
      }

      const data = await res.json();
      
      // Update registration local list with new status & aiVerification metrics
      setRegistrations(prev => prev.map(r => r.id === regId ? { 
        ...r, 
        status: data.status, 
        aiVerification: data.aiVerification 
      } : r));
      
      if (data.status === "approved") {
        toast.success("🤖 Verification passed! Ticket auto-approved (Confidence high & no fraud signs)", { id: toastId });
      } else {
        toast.warning(`🤖 Manual review flag: ${data.aiVerification?.reason || "Pending review"}`, { id: toastId, duration: 6000 });
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Auto-verification failed: ${error.message || error}`, { id: toastId });
    } finally {
      setVerifyingRegId(null);
    }
  };

  const handleRefundPayment = async (regId: string) => {
    if (!window.confirm("Are you sure you want to refund this payment? This will void the ticket and open up the slot for others to register.")) {
      return;
    }
    const toastId = toast.loading("Processing payment refund and revoking ticket...");
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/admin/registrations/${regId}/refund`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Refund failed");
      }

      const data = await res.json();
      toast.success(data.message || "Payment refunded successfully!", { id: toastId });
      
      // Update local registration
      const refundedReg = registrations.find(r => r.id === regId);
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: "refunded" as any } : r));

      // Decrement local event if exists
      if (refundedReg) {
        setEvents(prev => prev.map(e => e.id === refundedReg.eventId ? { ...e, registeredCount: Math.max(0, e.registeredCount - 1) } : e));
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to issue refund.", { id: toastId });
    }
  };

  const handleCheckIn = async (regId: string) => {
    if (!regId || !regId.trim()) {
      toast.error("Please enter a valid Ticket ID / Code");
      return;
    }
    
    setScanningSimulateLoading(true);
    setCheckInResult(null);

    // Audio confirmation beep
    const playBeep = (freq = 800, duration = 0.15) => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
      } catch (e) {}
    };

    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/admin/registrations/${regId}/checkin`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle failure (e.g. duplicate check-in, payment not approved)
        playBeep(220, 0.4); // low error buzz
        setCheckInResult({
          success: false,
          message: data.error || "Entrance verification failed.",
          attendee: data.attendeeName,
          title: data.eventTitle,
          duplicate: res.status === 409,
          time: data.checkedInAt ? format(new Date(data.checkedInAt?._seconds ? data.checkedInAt._seconds * 1000 : data.checkedInAt), "hh:mm:ss a") : undefined,
          date: data.checkedInAt ? format(new Date(data.checkedInAt?._seconds ? data.checkedInAt._seconds * 1000 : data.checkedInAt), "MMM dd, yyyy") : undefined
        });
        toast.error(data.error || "Check-in blocked!");
      } else {
        // Success
        playBeep(1000, 0.12); // high success chirp
        setTimeout(() => playBeep(1300, 0.1), 100);
        
        setCheckInResult({
          success: true,
          message: "Access Granted. Welcome to the event!",
          attendee: data.attendeeName,
          title: data.eventTitle,
          time: format(new Date(data.checkedInAt), "hh:mm:ss a")
        });

        toast.success(`Check-in successful: ${data.attendeeName}`);

        // Update local state registrations
        setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, checkedIn: true, checkedInAt: new Date() } : r));

        // Refetch entry logs to update feed instantly
        const headers = { "Authorization": `Bearer ${idToken}` };
        const logsRes = await fetch("/api/admin/entry-logs", { headers });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setEntryLogs(logsData);
        }
      }
    } catch (error: any) {
      console.error(error);
      playBeep(220, 0.4);
      setCheckInResult({
        success: false,
        message: error.message || "Network request for admission failed."
      });
      toast.error("Check-in attempt failed.");
    } finally {
      setScanningSimulateLoading(false);
      setCheckingInCode("");
    }
  };

  const handleSaveGatewaySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGateway(true);
    const toastId = toast.loading("Saving gateway adjustments... ");
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/admin/gateway", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify(gatewayConfig)
      });

      if (!res.ok) throw new Error("Could not preserve gateway configuration");
      
      toast.success("Gateway properties and tax settings updated successfully!", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update configurations.", { id: toastId });
    } finally {
      setSavingGateway(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingEvent(true);
    try {
      let imageUrl = editId ? newEvent.imageUrl : "";
      if (bannerFile) {
        const uploadToastId = toast.loading(`${editId ? 'Updating' : 'Uploading'} event banner...`);
        try {
          // Pre-compress the image file down to an ultra-efficient size in the client
          const compressedBase64 = await compressImage(bannerFile, 850, 0.6);

          // Upload to Firebase storage bucket directly
          const uploadToStorage = async (): Promise<string> => {
            const storageRef = ref(storage, `banners/${Date.now()}_${bannerFile.name}`);
            const uploadResult = await uploadBytes(storageRef, bannerFile);
            return await getDownloadURL(uploadResult.ref);
          };

          // 2.5-second timeout races against Firebase storage bucket upload
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

          const cloudUrl = await Promise.race([
            uploadToStorage(),
            timeoutPromise
          ]);

          if (cloudUrl) {
            imageUrl = cloudUrl;
            toast.success("Banner uploaded successfully!", { id: uploadToastId });
          } else {
            imageUrl = compressedBase64;
            toast.success("Ready (speed-optimized banner compression applied)!", { id: uploadToastId });
          }
        } catch (uploadError) {
          // Fall back gracefully to compressed base64
          try {
            imageUrl = await compressImage(bannerFile, 850, 0.6);
            toast.success("Ready (offline-fallback compression applied)!", { id: uploadToastId });
          } catch (fbError) {
            toast.error("Failed to process event banner image.", { id: uploadToastId });
            throw uploadError;
          }
        }
      }

      const idToken = await user?.getIdToken();
      const url = editId ? `/api/events/${editId}` : "/api/events";
      const method = editId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          ...newEvent,
          imageUrl
        })
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let errorMsg = `Failed to ${editId ? 'update' : 'create'} event`;
        if (contentType.includes("application/json")) {
          const errorData = await res.json().catch(() => ({}));
          errorMsg = errorData.error || errorMsg;
        } else {
          const errorText = await res.text().catch(() => "");
          if (errorText) {
            errorMsg = `Server response (${res.status}): ${errorText.slice(0, 150)}`;
          }
        }
        throw new Error(errorMsg);
      }
      
      toast.success(`Event ${editId ? 'updated' : 'created'} successfully`);
      setShowEventModal(false);
      setEditId(null);
      setBannerFile(null);
      setNewEvent({
        title: "",
        description: "",
        date: "",
        location: "",
        category: "General",
        fee: 0,
        capacity: 100,
        imageUrl: ""
      });
      fetchData();
    } catch (error: any) {
      console.error("Event submit error:", error);
      toast.error(error.message || `Failed to ${editId ? 'update' : 'create'} event`);
    } finally {
      setCreatingEvent(false);
    }
  };

  // Filter and Sort Events
  const filteredAndSortedEvents = events
    .filter((event) => {
      // Search Box
      if (eventSearchQuery.trim()) {
        const query = eventSearchQuery.toLowerCase();
        const titleMatch = (event.title || "").toLowerCase().includes(query);
        const descMatch = (event.description || "").toLowerCase().includes(query);
        const locMatch = (event.location || "").toLowerCase().includes(query);
        const catMatch = (event.category || "").toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !locMatch && !catMatch) {
          return false;
        }
      }
      // Category filter
      if (eventCategoryFilter !== "All") {
        return (event.category || "General").toLowerCase() === eventCategoryFilter.toLowerCase();
      }
      return true;
    })
    .sort((a, b) => {
      const multiplier = eventSortOrder === "asc" ? 1 : -1;
      
      if (eventSortKey === "date") {
        const dateA = new Date(a.date?._seconds ? a.date._seconds * 1000 : a.date).getTime();
        const dateB = new Date(b.date?._seconds ? b.date._seconds * 1000 : b.date).getTime();
        const scoreA = isNaN(dateA) ? 0 : dateA;
        const scoreB = isNaN(dateB) ? 0 : dateB;
        return (scoreA - scoreB) * multiplier;
      }
      
      if (eventSortKey === "title") {
        return (a.title || "").localeCompare(b.title || "") * multiplier;
      }
      
      if (eventSortKey === "registeredCount") {
        return ((a.registeredCount || 0) - (b.registeredCount || 0)) * multiplier;
      }
      
      if (eventSortKey === "fee") {
        return ((a.fee || 0) - (b.fee || 0)) * multiplier;
      }
      
      return 0;
    });

  // Filter Registrations
  const filteredRegistrations = registrations.filter((reg) => {
    // Status filter
    if (regStatusFilter !== "all" && reg.status !== regStatusFilter) {
      return false;
    }
    // Search Box
    if (regSearchQuery.trim()) {
      const query = regSearchQuery.toLowerCase();
      const nameMatch = (reg.name || "").toLowerCase().includes(query);
      const collegeMatch = (reg.college || "").toLowerCase().includes(query);
      const phoneMatch = (reg.phone || "").toLowerCase().includes(query);
      const eventTitleMatch = (reg.eventTitle || "").toLowerCase().includes(query);
      return nameMatch || collegeMatch || phoneMatch || eventTitleMatch;
    }
    return true;
  });

  // Calculate Event-Level Analytics, Fiscal Revenue, Category Share, and Trends Over Time
  const analyticsData = React.useMemo(() => {
    // 1. Detailed performance parameters for each individual event
    const eventMetrics = events.map(event => {
      const eventRegs = registrations.filter(r => r.eventId === event.id);
      const approvedCount = eventRegs.filter(r => r.status === "approved").length;
      const pendingCount = eventRegs.filter(r => r.status === "pending").length;
      const rejectedCount = eventRegs.filter(r => r.status === "rejected").length;
      
      // Calculate revenue
      const approvedRevenue = approvedCount * (event.fee || 0);
      const pendingRevenue = pendingCount * (event.fee || 0);
      const potentialRevenue = approvedRevenue + pendingRevenue;
      
      return {
        id: event.id,
        title: event.title,
        category: event.category || "General",
        fee: event.fee || 0,
        capacity: event.capacity || 100,
        registeredCount: event.registeredCount || 0,
        approvedCount,
        pendingCount,
        rejectedCount,
        approvedRevenue,
        pendingRevenue,
        potentialRevenue,
        fillPercentage: event.capacity > 0 ? Math.min(100, Math.round(((event.registeredCount || 0) / event.capacity) * 100)) : 0
      };
    });

    // 2. Aggregate parameters grouped by Category
    const categoryMap: { [key: string]: { count: number; registrations: number; revenue: number } } = {};
    const defaultCategories = ["Music", "Tech", "Business", "Sports", "General"];
    
    defaultCategories.forEach(cat => {
      categoryMap[cat] = { count: 0, registrations: 0, revenue: 0 };
    });

    events.forEach(event => {
      const cat = event.category || "General";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, registrations: 0, revenue: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].registrations += event.registeredCount || 0;
      
      // Approved ticket sales revenue for category
      const approvedRegsForCat = registrations.filter(r => r.eventId === event.id && r.status === "approved");
      categoryMap[cat].revenue += approvedRegsForCat.length * (event.fee || 0);
    });

    const categoryData = Object.entries(categoryMap).map(([name, stats]) => ({
      name,
      eventsCount: stats.count,
      value: stats.registrations, // registrations count for visual graphs
      revenue: stats.revenue,
    })).filter(c => c.eventsCount > 0 || c.value > 0);

    // 3. Time Series Analytics: Growth Trends over the last 14 days
    const dailyMap: { [dateStr: string]: { date: string; approved: number; pending: number; total: number; revenue: number; timestamp: number } } = {};
    
    registrations.forEach(reg => {
      if (!reg.createdAt) return;
      const refDate = new Date(reg.createdAt?._seconds ? reg.createdAt._seconds * 1000 : reg.createdAt);
      if (isNaN(refDate.getTime())) return;
      
      const dayStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
      const label = dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const stamp = dayStart.getTime();

      if (!dailyMap[label]) {
        dailyMap[label] = { date: label, approved: 0, pending: 0, total: 0, revenue: 0, timestamp: stamp };
      }

      if (reg.status === "approved") {
        dailyMap[label].approved += 1;
        const matchEvent = events.find(e => e.id === reg.eventId);
        const fee = matchEvent?.fee || 0;
        dailyMap[label].revenue += fee;
      } else if (reg.status === "pending") {
        dailyMap[label].pending += 1;
      }
      dailyMap[label].total += 1;
    });

    // Chronological timeline sorting
    const sortedTimeline = Object.values(dailyMap).sort((a, b) => a.timestamp - b.timestamp);

    // Compute cumulative stats
    let runningRevenue = 0;
    const trendDataWithRevenue = sortedTimeline.map(day => {
      runningRevenue += day.revenue;
      return {
        ...day,
        cumulativeRevenue: runningRevenue
      };
    });

    // Sum overall totals
    const totalApprovedRevenue = eventMetrics.reduce((sum, item) => sum + item.approvedRevenue, 0);
    const totalPotentialRevenue = eventMetrics.reduce((sum, item) => sum + item.potentialRevenue, 0);

    return {
      eventMetrics,
      categoryData,
      trendData: trendDataWithRevenue.slice(-14), // show up to last 14 active days
      revenueTimeline: trendDataWithRevenue, // complete timeline for cumulative and daily revenue
      totalApprovedRevenue,
      totalPotentialRevenue
    };
  }, [events, registrations]);

  const paymentMetrics = React.useMemo(() => {
    const approvedRegs = registrations.filter(r => r.status === "approved");
    const pendingRegs = registrations.filter(r => r.status === "pending");
    const refundedRegs = registrations.filter(r => r.status === "refunded");

    let totalTicketRevenue = 0;
    let totalServiceFees = 0;
    let totalTaxes = 0;
    let totalRefundedAmount = 0;

    const categoryRevenueMap: Record<string, number> = {};

    approvedRegs.forEach(reg => {
      const matchEvent = events.find(e => e.id === reg.eventId);
      const fee = matchEvent?.fee || 0;
      if (fee > 0) {
        totalTicketRevenue += fee;
        totalServiceFees += gatewayConfig.serviceFee;
        totalTaxes += (fee + gatewayConfig.serviceFee) * (gatewayConfig.taxRate / 100);

        const category = matchEvent?.category || "General";
        categoryRevenueMap[category] = (categoryRevenueMap[category] || 0) + fee;
      }
    });

    refundedRegs.forEach(reg => {
      const matchEvent = events.find(e => e.id === reg.eventId);
      const fee = matchEvent?.fee || 0;
      if (fee > 0) {
        totalRefundedAmount += fee + gatewayConfig.serviceFee + ((fee + gatewayConfig.serviceFee) * (gatewayConfig.taxRate / 100));
      }
    });

    const netSales = totalTicketRevenue + totalServiceFees + totalTaxes - totalRefundedAmount;

    // Split Calculations: 20% to Website Owner, 80% to the assigned Category Organizer
    let totalOrganizerPayout = 0;
    let totalAdminTicketShare = 0;
    const organizerPayoutMap: Record<string, { organizerName: string; organizationName: string; totalRaw: number; organizerShare: number; adminShare: number }> = {};

    Object.entries(categoryRevenueMap).forEach(([category, totalRaw]) => {
      const assigned = categoryOrganizers.find(co => co.category === category);
      if (assigned) {
        const organizerShare = totalRaw * 0.8;
        const adminShare = totalRaw * 0.2;
        totalOrganizerPayout += organizerShare;
        totalAdminTicketShare += adminShare;

        organizerPayoutMap[category] = {
          organizerName: assigned.organizerName || assigned.organizationName,
          organizationName: assigned.organizationName,
          totalRaw,
          organizerShare,
          adminShare
        };
      } else {
        totalAdminTicketShare += totalRaw;
        organizerPayoutMap[category] = {
          organizerName: "Website Platform (Default)",
          organizationName: "Platform Managed",
          totalRaw,
          organizerShare: 0,
          adminShare: totalRaw
        };
      }
    });

    return {
      approvedCount: approvedRegs.length,
      pendingCount: pendingRegs.length,
      refundedCount: refundedRegs.length,
      totalTicketRevenue,
      totalServiceFees,
      totalTaxes,
      totalRefundedAmount,
      netSales,
      totalOrganizerPayout,
      totalAdminTicketShare,
      organizerPayoutMap
    };
  }, [registrations, events, gatewayConfig, categoryOrganizers]);

  const chartData = [
    { name: "Pending", value: registrations.filter(r => r.status === "pending").length },
    { name: "Approved", value: registrations.filter(r => r.status === "approved").length },
    { name: "Rejected", value: registrations.filter(r => r.status === "rejected").length },
  ];

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter mb-2">Admin Command</h1>
            <p className="text-zinc-500">Manage your events and attendees from one place.</p>
          </div>
          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center justify-center gap-2 bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-zinc-200 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full mb-8">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 w-fit">
            {(['overview', 'registrations', 'payments', 'organizers', 'verification', 'events'] as const).map(tab => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all cursor-pointer data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-lg text-zinc-500 hover:text-zinc-200"
              >
                {tab === 'verification' ? 'Ticket Scanning' : tab === 'payments' ? 'Payment Admin' : tab === 'organizers' ? 'Organizer Requests' : tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Events" value={stats?.totalEvents || 0} icon={<CalendarIcon className="w-6 h-6 text-blue-500" />} />
              <StatCard title="Active Users" value={stats?.totalUsers || 0} icon={<Users className="w-6 h-6 text-purple-500" />} />
              <StatCard 
                title="Revenue Generated" 
                value={`LKR ${analyticsData.totalApprovedRevenue.toLocaleString("en-LK")}`} 
                icon={<DollarSign className="w-6 h-6 text-emerald-500" />} 
              />
              <StatCard title="Total Tickets" value={stats?.totalRegistrations || 0} icon={<Ticket className="w-6 h-6 text-green-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Registration Status Chart */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Ticket Audits</h3>
                  <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    Overall Health
                  </div>
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px" }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.name === "Approved" ? "#22c55e" : 
                            entry.name === "Pending" ? "#f59e0b" : "#ef4444"
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Registration Trends Over Time (Area Chart) */}
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold">Booking Trends Over Time</h3>
                    <p className="text-zinc-500 text-xs mt-1">Ticket reservation speed (comprising approved and pending tickets)</p>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-850">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    Last 14 Active Days
                  </div>
                </div>
                {analyticsData.trendData.length === 0 ? (
                  <div className="h-[250px] flex flex-col items-center justify-center text-zinc-550 gap-2">
                    <TrendingUp className="w-8 h-8 text-zinc-800" />
                    <p className="text-sm font-semibold text-zinc-500">No reservation timeline detected</p>
                    <p className="text-xs text-zinc-650 max-w-sm text-center">Once users register for either free or paid sessions, booking speeds will display here.</p>
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.trendData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                        <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px" }}
                          itemStyle={{ color: "#fff" }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Area type="monotone" dataKey="total" name="Total Tickets" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                        <Area type="monotone" dataKey="approved" name="Confirmed Tickets" stroke="#22c55e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApproved)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Total Revenue Over Time Line Chart Grid Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Total Revenue Over Time Chart */}
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div>
                    <h3 className="text-xl font-bold">Total Revenue Dynamics</h3>
                    <p className="text-zinc-500 text-xs mt-1">Chronological representation of incremental daily and cumulative payment earnings</p>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-xs bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-850 self-start sm:self-auto">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Overall Billing Record
                  </div>
                </div>

                {!analyticsData.revenueTimeline || analyticsData.revenueTimeline.length === 0 ? (
                  <div className="h-[300px] flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <DollarSign className="w-8 h-8 text-zinc-800 animate-pulse" />
                    <p className="text-sm font-semibold text-zinc-500">No transaction records found</p>
                    <p className="text-xs text-zinc-600 max-w-sm text-center">Once approved paid ticket transactions occur, the chronological financial trajectory will be rendered here.</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.revenueTimeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                        <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `LKR ${val.toLocaleString()}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px" }}
                          itemStyle={{ color: "#fff" }}
                          labelStyle={{ color: "#71717a", fontWeight: "bold" }}
                          formatter={(value: any) => [`LKR ${Number(value).toLocaleString("en-LK")}`]}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="cumulativeRevenue" 
                          name="Cumulative Revenue (LKR)" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={{ r: 4, stroke: "#10b981", strokeWidth: 1, fill: "#09090b" }}
                          activeDot={{ r: 6, fill: "#10b981" }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          name="Daily Sales (LKR)" 
                          stroke="#6366f1" 
                          strokeWidth={2} 
                          strokeDasharray="4 4"
                          dot={{ r: 3, stroke: "#6366f1", strokeWidth: 1, fill: "#09090b" }}
                          activeDot={{ r: 5, fill: "#6366f1" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Fiscal Breakdown Summary Cards */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Fiscal Ledger Summary</h3>
                  <p className="text-zinc-500 text-xs mb-6">Aggregate payment gateway audit parameters</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800/40">
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Gross Ticket Sales</p>
                        <p className="text-sm font-bold text-white mt-0.5">LKR {paymentMetrics.totalTicketRevenue.toLocaleString("en-LK")}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-zinc-950 text-emerald-400 border-emerald-500/10">Base</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800/40">
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Svc Fees Collected</p>
                        <p className="text-sm font-bold text-zinc-300 mt-0.5">LKR {paymentMetrics.totalServiceFees.toLocaleString("en-LK")}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-zinc-950 text-zinc-400 border-zinc-800">Fees</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800/40">
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Tax Recovered</p>
                        <p className="text-sm font-bold text-zinc-300 mt-0.5">LKR {paymentMetrics.totalTaxes.toLocaleString("en-LK")}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-zinc-950 text-zinc-400 border-zinc-800">Govt</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800/40">
                      <div>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Refunds Issued</p>
                        <p className="text-sm font-bold text-red-400 mt-0.5">LKR {paymentMetrics.totalRefundedAmount.toLocaleString("en-LK")}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-red-950/10 text-red-400 border-red-500/10">Debit</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-zinc-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500 font-medium font-semibold">Net Gateway Payout</span>
                    <p className="text-lg font-black text-emerald-400 mt-0.5">LKR {paymentMetrics.netSales.toLocaleString("en-LK")}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                    Authorized
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Popular Categories */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Category Breakdown</h3>
                  <p className="text-zinc-500 text-xs mb-6">User interests & generated revenue per stream</p>
                  
                  <div className="space-y-5">
                    {analyticsData.categoryData.length === 0 ? (
                      <p className="text-zinc-650 text-xs italic">No category insights available currently.</p>
                    ) : (
                      analyticsData.categoryData.map((catSpec) => {
                        const maxRegistrations = Math.max(...analyticsData.categoryData.map(c => c.value), 1);
                        const barWidthPercent = Math.min(100, Math.round((catSpec.value / maxRegistrations) * 100));
                        return (
                          <div key={catSpec.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-zinc-300 flex items-center gap-2">
                                {catSpec.name === "Music" ? "🎵" :
                                 catSpec.name === "Tech" ? "💻" :
                                 catSpec.name === "Business" ? "💼" :
                                 catSpec.name === "Sports" ? "⚽" : "🎟️"}
                                {catSpec.name}
                              </span>
                              <span className="text-zinc-400 font-medium">
                                {catSpec.value} sold <span className="text-zinc-700 font-mono">/</span> LKR {catSpec.revenue.toLocaleString("en-LK")}
                              </span>
                            </div>
                            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-850">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  catSpec.name === "Music" ? "bg-purple-500/80" :
                                  catSpec.name === "Tech" ? "bg-cyan-500/80" :
                                  catSpec.name === "Business" ? "bg-emerald-500/80" :
                                  catSpec.name === "Sports" ? "bg-amber-500/80" : "bg-zinc-400/80"
                                }`}
                                style={{ width: `${barWidthPercent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                
                <div className="mt-8 pt-5 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>Active Streams Identified</span>
                  <span className="font-bold text-white">{analyticsData.categoryData.length} streams</span>
                </div>
              </div>

              {/* Quick Actions / Recent Activty */}
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold mb-1">Recent Activity</h3>
                <p className="text-zinc-500 text-xs mb-6">Latest ticket audit triggers and student registrations</p>
                
                <div className="space-y-4">
                  {registrations.length === 0 ? (
                    <div className="py-12 text-center text-zinc-650 text-xs italic">
                      No registrations recorded yet.
                    </div>
                  ) : (
                    registrations.slice(0, 5).map(reg => (
                      <div key={reg.id} className="flex items-center justify-between pb-4 border-b border-zinc-800/50 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-sm text-zinc-100">{reg.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                            <span className="truncate max-w-[150px] sm:max-w-xs">{reg.eventTitle}</span>
                            <span className="text-zinc-700">•</span>
                            <span className="text-zinc-550 truncate max-w-[120px]">{reg.college}</span>
                          </div>
                        </div>
                        <div className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                          reg.status === "approved" ? "bg-green-500/10 text-green-400 border-green-500/15" :
                          reg.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/15" : "bg-red-500/10 text-red-400 border-red-500/15"
                        }`}>
                          {reg.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Granular Event-by-Event Pricing & Sales Insights Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-xl font-bold">Event Capacity & Fiscal Analytics</h3>
                  <p className="text-zinc-500 text-xs mt-1">Detailed capacity metrics, registration volume, and approved vs interest receipts</p>
                </div>
                <div className="flex items-center gap-3 self-start md:self-auto">
                  <div className="px-3.5 py-1.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-400 font-medium">
                    Prospective Pool: <strong className="text-white">LKR {analyticsData.totalPotentialRevenue.toLocaleString("en-LK")}</strong>
                  </div>
                </div>
              </div>

              {analyticsData.eventMetrics.length === 0 ? (
                <div className="py-12 text-center text-zinc-550 text-xs italic">
                  No active events in the catalogue. Tap "Create Event" to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full text-left text-xs text-zinc-350">
                    <TableHeader>
                      <TableRow className="border-b border-zinc-800 hover:bg-transparent">
                        <TableHead className="pb-3 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Event Details</TableHead>
                        <TableHead className="pb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Category</TableHead>
                        <TableHead className="pb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Capacity Fill Rate</TableHead>
                        <TableHead className="pb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Registered Tickets</TableHead>
                        <TableHead className="pb-3 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Approved Revenue</TableHead>
                        <TableHead className="pb-3 text-right text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Potential Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData.eventMetrics.map((me) => (
                        <TableRow key={me.id} className="hover:bg-zinc-950/20 border-b border-zinc-800/40">
                          <TableCell className="py-4 font-bold text-zinc-100 max-w-xs truncate pr-4 text-left" title={me.title}>
                            {me.title}
                            <p className="text-[10px] text-zinc-500 font-normal mt-0.5">LKR {me.fee.toLocaleString()} entry fee</p>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <Badge variant="outline" className="inline-block px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest border border-white/5 bg-zinc-950 text-zinc-400">
                              {me.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 pr-4">
                            <div className="flex flex-col gap-1 items-stretch justify-center max-w-[120px] mx-auto">
                              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                                <span>{me.fillPercentage}%</span>
                                <span>{me.capacity} cap</span>
                              </div>
                              <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    me.fillPercentage >= 90 ? "bg-red-500/80" :
                                    me.fillPercentage >= 60 ? "bg-amber-500/80" : "bg-blue-500/80"
                                  }`}
                                  style={{ width: `${me.fillPercentage}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-center font-semibold text-zinc-300">
                            <span className="text-white">{me.registeredCount}</span>
                            <span className="text-zinc-650 text-[10px] font-normal font-sans">
                              / {me.capacity} ({me.approvedCount} approved, {me.pendingCount} pending)
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-right font-mono font-bold text-emerald-400">
                            LKR {me.approvedRevenue.toLocaleString("en-LK")}
                          </TableCell>
                          <TableCell className="py-4 text-right font-mono font-bold text-zinc-400">
                            LKR {me.potentialRevenue.toLocaleString("en-LK")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div className="space-y-6">
            {/* Registration Table Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              {/* Search Attendee */}
              <div className="relative w-full md:w-80">
                <Input
                  type="text"
                  placeholder="Search attendee, college, session title..."
                  value={regSearchQuery}
                  onChange={(e) => setRegSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border-zinc-800 focus:border-zinc-500 text-xs rounded-xl py-2.5 px-3 pl-9 text-zinc-300 transition-all placeholder-zinc-500 h-10"
                />
                <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-900 w-full md:w-auto overflow-x-auto justify-start">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setRegStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      regStatusFilter === status
                        ? status === 'pending' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : status === 'approved' ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : status === 'rejected' ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-zinc-800 text-white shadow-md border border-zinc-700/50"
                        : "text-zinc-550 hover:text-white bg-zinc-950/40 hover:bg-zinc-950"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <Table className="w-full text-left">
                  <TableHeader>
                    <TableRow className="border-b border-zinc-800 bg-zinc-900/50 hover:bg-transparent">
                      <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Attendee</TableHead>
                      <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Event</TableHead>
                      <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Payment</TableHead>
                      <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Status</TableHead>
                      <TableHead className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="px-6 py-16 text-center text-zinc-500">
                          <Ticket className="w-8 h-8 mx-auto text-zinc-800 mb-2" />
                          <p className="font-bold text-sm">No registrations found</p>
                          <p className="text-xs">Adjust your search input or status filter query.</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredRegistrations.map(reg => (
                      <React.Fragment key={reg.id}>
                      <TableRow className="hover:bg-zinc-800/20 border-b border-zinc-800/40">
                        <TableCell className="px-6 py-4 text-left">
                          <p className="font-bold text-sm text-zinc-100">{reg.name}</p>
                          <p className="text-xs text-zinc-500">{reg.college}</p>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-zinc-300 text-left">
                          {reg.eventTitle}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-left">
                          {reg.paymentProofUrl ? (
                            <div className="flex flex-col gap-1 items-start">
                              <a 
                                href={reg.paymentProofUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-400 hover:underline font-medium"
                              >
                                View Proof <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                onClick={() => setExpandedRegId(expandedRegId === reg.id ? null : reg.id)}
                                className={`flex items-center gap-1.5 text-[9px] font-mono leading-none px-2 py-1 rounded mt-1.5 transition-all outline-none border cursor-pointer ${
                                  reg.aiVerification?.isPotentiallyFraudulent
                                    ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                    : reg.aiVerification?.status === "verified"
                                    ? "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                                    : "bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:bg-zinc-700 hover:text-zinc-200"
                                }`}
                              >
                                {expandedRegId === reg.id ? (
                                  "Hide AI Report"
                                ) : reg.aiVerification?.isPotentiallyFraudulent ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3 text-red-500" /> Wait... Forged?
                                  </>
                                ) : (
                                  "🤖 Inspect AI Report"
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-xs">No payment (Free)</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-left">
                           <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                             reg.status === "approved" ? "bg-green-950/20 text-green-400 border-green-500/30" :
                             reg.status === "pending" ? "bg-amber-950/20 text-amber-400 border-amber-500/30" : "bg-red-950/20 text-red-400 border-red-500/30"
                           }`}>
                             {reg.status}
                           </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-left">
                          {reg.status === 'pending' && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleUpdateStatus(reg.id, 'approved')}
                                className="p-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(reg.id, 'rejected')}
                                className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRegId === reg.id && (
                        <TableRow className="bg-zinc-950/80 hover:bg-zinc-950/80 border-b border-zinc-805">
                          <TableCell colSpan={5} className="px-8 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                              {/* Left column: payment preview */}
                              <div className="flex flex-col gap-3">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ">Submitted Image Attachment</span>
                                <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-900 max-h-96 flex items-center justify-center p-2 relative shadow-inner">
                                  {reg.paymentProofUrl ? (
                                    <img
                                      src={reg.paymentProofUrl}
                                      alt="Payment proof screenshot"
                                      className="max-h-80 w-auto object-contain rounded-lg"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full py-16 flex flex-col items-center justify-center text-zinc-600 gap-2">
                                      <ImageIcon className="w-8 h-8" />
                                      <span className="text-xs">No attachment found</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Right column: AI analysis report */}
                              <div className="flex flex-col gap-5">
                                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Receipt Compliance Parsing</span>
                                    <button
                                      disabled={verifyingRegId === reg.id}
                                      onClick={() => handleVerifyPayment(reg.id)}
                                      className="px-2 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/20 hover:border-blue-400/50 hover:bg-blue-500/5 rounded bg-blue-500/10 transition-all font-sans cursor-pointer disabled:opacity-50"
                                    >
                                      {verifyingRegId === reg.id ? "Analyzing..." : "Re-run AI Audit"}
                                    </button>
                                  </div>
                                  {reg.aiVerification ? (
                                    <span className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-md border ${
                                      reg.aiVerification.isPotentiallyFraudulent
                                        ? "bg-red-500/15 text-red-400 border-red-500/30 font-semibold"
                                        : reg.aiVerification.status === 'verified'
                                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                    }`}>
                                      {reg.aiVerification.isPotentiallyFraudulent ? "⚠️ Tampering Suspicion" : `Confidence: ${reg.aiVerification.confidence}%`}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500 text-[10px] italic">AI Report Loading...</span>
                                  )}
                                </div>

                                {reg.aiVerification ? (
                                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 text-sm space-y-4">
                                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-800/40">
                                      <div>
                                        <p className="text-zinc-500 mb-1 text-[10px] uppercase font-bold tracking-widest">Extracted Amount</p>
                                        <p className="text-base font-black text-white">
                                          {reg.aiVerification.amountPaid !== null ? `LKR ${reg.aiVerification.amountPaid.toLocaleString()}` : <span className="text-zinc-500 font-sans font-normal text-xs">Not readable</span>}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-zinc-500 mb-1 text-[10px] uppercase font-bold tracking-widest">Txn / Reference Identifier</p>
                                        <p className="text-base font-mono font-bold text-zinc-300 select-all truncate" title={reg.aiVerification.transactionId || ""}>
                                          {reg.aiVerification.transactionId || <span className="text-zinc-500 font-sans font-normal text-xs">Not found</span>}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <p className="text-zinc-500 mb-1.5 text-[10px] uppercase font-bold tracking-widest">Model Analysis Rationale</p>
                                      <p className="text-zinc-400 font-sans leading-relaxed text-xs whitespace-pre-wrap">
                                        {reg.aiVerification.reason}
                                      </p>
                                    </div>

                                    {reg.aiVerification.isPotentiallyFraudulent && (
                                      <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl flex gap-3 text-red-400 text-xs leading-relaxed">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
                                        <div>
                                          <strong className="font-bold">Forgery Warning:</strong> This image has been flagged for potential fraud risk. The model detected inconsistent fonts, edited text objects, or typical BHIM/UPI fraud marks. Please review before approval.
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-3">
                                    <p className="text-zinc-400 leading-relaxed max-w-xs">No AI verification record found for this ticket. You can trigger an automated audit on the uploaded screenshot right now.</p>
                                    <button
                                      disabled={verifyingRegId === reg.id}
                                      onClick={() => handleVerifyPayment(reg.id)}
                                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-50 text-[11px]"
                                    >
                                      {verifyingRegId === reg.id ? "Analyzing screenshot..." : "🚀 Run AI Verification"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        )}

        {/* Payment Administration Section */}
        {activeTab === 'payments' && (
          <div className="space-y-8 animate-fade-in text-sans" id="payment-admin-panel">
            {/* Payment Metrics Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Net Sales Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-white">
                  LKR {paymentMetrics.netSales.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Taxes & Fees</span>
                  <Percent className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl font-black text-white">
                  LKR {paymentMetrics.totalTaxes.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-zinc-550 mt-1 font-mono">{gatewayConfig.taxRate}% VAT + LKR {gatewayConfig.serviceFee}</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Refunds Processed</span>
                  <RefreshCw className="w-4 h-4 text-rose-455" />
                </div>
                <div className="text-xl font-black text-white font-mono">
                  LKR {paymentMetrics.totalRefundedAmount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Transactions</span>
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-black text-white">
                  {paymentMetrics.approvedCount} <sub className="text-xs text-zinc-550 font-normal">Approved</sub> / {paymentMetrics.pendingCount} <sub className="text-xs text-zinc-550 font-normal">Pending</sub>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Transactions list */}
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-zinc-300">Transaction Ledgers</h3>
                <div className="overflow-x-auto text-[11px]">
                  <Table className="w-full text-left text-xs text-zinc-400">
                    <TableHeader>
                      <TableRow className="border-b border-zinc-800 text-zinc-500 hover:bg-transparent font-bold uppercase text-[10px] tracking-wider">
                        <TableHead className="pb-3 pl-2 text-left">Client / Event</TableHead>
                        <TableHead className="pb-3 text-right">Fee</TableHead>
                        <TableHead className="pb-3 text-right">Tax+Fee</TableHead>
                        <TableHead className="pb-3 text-center">Ref ID</TableHead>
                        <TableHead className="pb-3 text-right">Status</TableHead>
                        <TableHead className="pb-3 pr-2 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations.filter(r => {
                        const mEvent = events.find(e => e.id === r.eventId);
                        return mEvent && mEvent.fee > 0;
                      }).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-zinc-600">No paid transactions found.</TableCell>
                        </TableRow>
                      ) : (
                        registrations.filter(r => {
                          const mEvent = events.find(e => e.id === r.eventId);
                          return mEvent && mEvent.fee > 0;
                        }).map(reg => {
                          const mEvent = events.find(e => e.id === reg.eventId);
                          const fee = mEvent?.fee || 0;
                          const svc = gatewayConfig.serviceFee;
                          const tax = (fee + svc) * (gatewayConfig.taxRate / 100);

                          return (
                            <TableRow key={reg.id} className="hover:bg-zinc-950/40 border-b border-zinc-850">
                              <TableCell className="py-3 pl-2 text-left">
                                <div className="font-bold text-white leading-tight">{reg.name}</div>
                                <div className="text-[10px] text-zinc-500 truncate max-w-[140px] mt-0.5">{reg.eventTitle}</div>
                              </TableCell>
                              <TableCell className="py-3 text-right font-mono text-zinc-350">LKR {fee}</TableCell>
                              <TableCell className="py-3 text-right font-mono text-[10px] text-zinc-500 font-normal">LKR {(svc+tax).toFixed(0)}</TableCell>
                              <TableCell className="py-3 text-center font-mono text-[10px] text-blue-500">
                                {reg.aiVerification?.transactionId ? reg.aiVerification.transactionId.substring(0, 8) : "N/A"}
                              </TableCell>
                              <TableCell className="py-3 text-right font-sans">
                                <Badge variant="outline" className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                                  reg.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : reg.status === 'refunded' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                }`}>
                                  {reg.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 pr-2 text-right">
                                <span className="flex gap-1.5 justify-end">
                                  <button onClick={() => setActiveRegForInvoice(reg)} className="p-1 px-1.5 bg-zinc-950 hover:bg-zinc-850 text-[10px] text-zinc-400 hover:text-white rounded border border-zinc-800 transition cursor-pointer">
                                    <Receipt className="w-3.5 h-3.5 inline mr-1" /> Invoice
                                  </button>
                                  {reg.status === "approved" && (
                                    <button onClick={() => handleRefundPayment(reg.id)} className="p-1 px-1.5 bg-red-955/20 hover:bg-red-900 border border-red-900/30 text-[10px] text-red-400 rounded transition cursor-pointer">
                                      Refund
                                    </button>
                                  )}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Gateway Configuration Panel */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-zinc-300">Gateway Management</h3>
                <form onSubmit={handleSaveGatewaySettings} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Provider</label>
                    <select
                      value={gatewayConfig.provider}
                      onChange={(e) => setGatewayConfig(prev => ({ ...prev, provider: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-xl py-2 px-3 focus:outline-none"
                    >
                      <option value="Direct Bank">Direct Bank Transfer</option>
                      <option value="Stripe">Stripe API (Hosted Checkout)</option>
                      <option value="Payhere">Payhere Gateway (Sri Lanka)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Mode</label>
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl">
                      <button type="button" onClick={() => setGatewayConfig(prev => ({ ...prev, mode: "test" }))} className={`py-1 rounded text-[10px] font-bold cursor-pointer transition ${gatewayConfig.mode === 'test' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>SANDBOX</button>
                      <button type="button" onClick={() => setGatewayConfig(prev => ({ ...prev, mode: "live" }))} className={`py-1 rounded text-[10px] font-bold cursor-pointer transition ${gatewayConfig.mode === 'live' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>LIVE</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Tax (VAT %)</label>
                    <div className="flex gap-2 items-center">
                      <input type="range" min="0" max="25" value={gatewayConfig.taxRate} onChange={(e) => setGatewayConfig(prev => ({ ...prev, taxRate: parseInt(e.target.value) }))} className="flex-grow bg-zinc-950 cursor-pointer" />
                      <span className="text-xs text-white font-mono font-bold">{gatewayConfig.taxRate}%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Convenience Fee (LKR)</label>
                    <input type="number" value={gatewayConfig.serviceFee} onChange={(e) => setGatewayConfig(prev => ({ ...prev, serviceFee: parseInt(e.target.value) || 0 }))} className="w-full bg-zinc-950 border border-zinc-800 text-xs rounded-xl py-2 px-3 text-white focus:outline-none font-mono" />
                  </div>

                  <button type="submit" disabled={savingGateway} className="w-full py-2.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer font-sans">{savingGateway ? "Saving..." : "Save Gateways"}</button>
                </form>
              </div>
            </div>

            {/* Split Commission Ledger card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mt-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-zinc-850 pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Partnership Ledger Splits</h3>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Summary of category organizers receiving 80% splits, vs 20% platform commission retained.</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-mono">
                  <div className="bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-zinc-500">Admin Ticket Share (20%):</span>
                    <span className="text-emerald-400 font-bold">LKR {paymentMetrics.totalAdminTicketShare.toLocaleString()}</span>
                  </div>
                  <div className="bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-zinc-500">Organizer Payout (80%):</span>
                    <span className="text-sky-400 font-bold">LKR {paymentMetrics.totalOrganizerPayout.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <Table className="w-full text-left text-zinc-400">
                  <TableHeader>
                    <TableRow className="border-b border-zinc-800 text-zinc-500 hover:bg-transparent font-bold uppercase text-[10px] tracking-wider">
                      <TableHead className="pb-3 pl-2">Category</TableHead>
                      <TableHead className="pb-3">Assigned Organizer</TableHead>
                      <TableHead className="pb-3 text-right">Gross Sales</TableHead>
                      <TableHead className="pb-3 text-right">Organizer Split (80%)</TableHead>
                      <TableHead className="pb-3 text-right">Platform Share (20% / 100%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(paymentMetrics.organizerPayoutMap).length === 0 ? (
                      <TableRow className="border-none">
                        <TableCell colSpan={5} className="text-center text-zinc-600 py-8 font-mono">
                          No ticket revenue transactions recorded to build ledgers yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(paymentMetrics.organizerPayoutMap).map(([category, info]: any) => (
                        <TableRow key={category} className="border-b border-zinc-850/60 hover:bg-zinc-950/20">
                          <TableCell className="py-3.5 pl-2 font-black text-white">{category}</TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-zinc-300">{info.organizationName}</span>
                              <span className="text-[10px] text-zinc-500 italic">{info.organizerName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 text-right font-bold text-white font-mono">
                            LKR {info.totalRaw.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3.5 text-right font-bold text-sky-400 font-mono">
                            LKR {info.organizerShare.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3.5 text-right font-bold text-emerald-400 font-mono">
                            LKR {info.adminShare.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Organizer Requests Tab Section */}
        {activeTab === 'organizers' && (
          <div className="space-y-8 animate-fade-in text-sans" id="organizer-requests-panel">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Partnerships & Monopolies Dashboard</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Control category ownership, audit incoming proposals, and register authorized community entities.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Directory (Category Overrides) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Category Monopoly Assignments</h3>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">EXCLUSIVE</Badge>
                </div>
                <p className="text-zinc-500 text-xs mb-6 leading-relaxed">Each event category on the homepage can map to one designated exclusive organizer. Assigned organizers draw 80% of ticket sales from that category.</p>

                <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
                  {CATEGORIES.filter(c => c !== "All").map(categoryName => {
                    const assigned = categoryOrganizers.find(co => co.category === categoryName);
                    const isEditingThis = manualMapCat === categoryName;

                    return (
                      <div key={categoryName} className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{categoryName}</span>
                          {assigned ? (
                            <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-mono">Mapped</Badge>
                          ) : (
                            <Badge className="bg-zinc-800 text-zinc-500 text-[10px] font-mono">Platform Managed (100% Admin)</Badge>
                          )}
                        </div>

                        {assigned ? (
                          <div className="text-xs text-zinc-400 space-y-1 bg-zinc-900/50 p-3 rounded-xl border border-zinc-850/40">
                            <p className="font-bold text-zinc-200 text-sm mb-1">{assigned.organizationName}</p>
                            <p className="font-mono text-[10px]"><span className="text-zinc-650">Contact:</span> {assigned.organizerName}</p>
                            <p className="font-mono text-[10px]"><span className="text-zinc-650">Email:</span> {assigned.organizerEmail}</p>
                            <p className="font-mono text-[10px]"><span className="text-zinc-650">Phone:</span> {assigned.organizerPhone || "Not provided"}</p>
                            <p className="text-[9px] text-zinc-500 mt-2">Designated at: {new Date(assigned.updatedAt?._seconds ? assigned.updatedAt._seconds * 1000 : assigned.updatedAt || Date.now()).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-600">All events created under {categoryName} will remit 100% ticket earnings to the platform owner unless an organizer partnership is assigned.</p>
                        )}

                        {isEditingThis ? (
                          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3 mt-2">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono font-sans text-sans">Assign Category Organizer</h4>
                            <div className="space-y-2 text-xs">
                              <input
                                type="text"
                                placeholder="Organization Name (e.g. IEEE Group)"
                                value={manualMapForm.organizationName}
                                onChange={(e) => setManualMapForm(prev => ({ ...prev, organizationName: e.target.value }))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-white"
                              />
                              <input
                                type="text"
                                placeholder="Contact Representative Name"
                                value={manualMapForm.organizerName}
                                onChange={(e) => setManualMapForm(prev => ({ ...prev, organizerName: e.target.value }))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-white"
                              />
                              <input
                                type="email"
                                placeholder="Representative Email font-mono"
                                value={manualMapForm.organizerEmail}
                                onChange={(e) => setManualMapForm(prev => ({ ...prev, organizerEmail: e.target.value }))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-white font-mono"
                              />
                              <input
                                type="text"
                                placeholder="Phone number"
                                value={manualMapForm.organizerPhone}
                                onChange={(e) => setManualMapForm(prev => ({ ...prev, organizerPhone: e.target.value }))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-white font-mono"
                              />
                            </div>
                            <div className="flex justify-end gap-2 text-[10px] mt-2">
                              <button onClick={() => setManualMapCat(null)} className="py-1 px-3 bg-zinc-800 text-zinc-400 hover:bg-zinc-750 rounded-lg cursor-pointer font-bold">Cancel</button>
                              <button onClick={() => handleManualCategoryOrganizer(categoryName)} className="py-1 px-3 bg-white hover:bg-zinc-200 text-black rounded-lg cursor-pointer font-bold">Save Mapping</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end mt-2">
                            {assigned && (
                              <button
                                onClick={() => handleDeleteCategoryOrganizer(categoryName)}
                                className="text-[10px] font-bold text-red-400 bg-red-955/10 hover:bg-red-900/40 border border-red-900/30 py-1.5 px-3 rounded-lg cursor-pointer transition"
                              >
                                Clear Assignment
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setManualMapForm({
                                  organizationName: assigned?.organizationName || "",
                                  organizerName: assigned?.organizerName || "",
                                  organizerEmail: assigned?.organizerEmail || "",
                                  organizerPhone: assigned?.organizerPhone || ""
                                });
                                setManualMapCat(categoryName);
                              }}
                              className="text-[10px] font-bold text-zinc-300 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 py-1.5 px-3 rounded-lg cursor-pointer transition"
                            >
                              {assigned ? "Override Assignment" : "Assign Organizer"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pitch Submissions list */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col font-sans">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-zinc-300 font-sans">Incoming Partnership Applications</h3>
                <p className="text-zinc-500 text-xs mb-6">Pitches submitted by student body representatives and community hosts from the home page. Approving registers their organization and installs their proposed event in full.</p>

                <div className="flex-grow overflow-y-auto max-h-[600px] space-y-4 pr-2">
                  {organizerRequests.length === 0 ? (
                    <div className="text-center text-zinc-600 py-16 font-mono text-xs">
                      No incoming event partnership inquiry pitches found.
                    </div>
                  ) : (
                     organizerRequests.map((req: any) => (
                      <div key={req.id} className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-mono">
                              {req.proposedEventCategory} exclusivity
                            </span>
                            <h4 className="text-base font-black text-white mt-2">{req.organizationName}</h4>
                            <p className="text-zinc-400 text-xs mt-0.5">Contact: {req.name} ({req.email})</p>
                            <p className="text-zinc-500 text-[10px] font-mono mt-0.5">Phone: {req.phone}</p>
                          </div>
                          <div>
                            <Badge className={`${
                              req.status === 'approved' 
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                : req.status === 'rejected' 
                                ? 'text-red-400 bg-red-500/10 border-red-500/20' 
                                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            } uppercase font-mono text-[9px] px-2.5`}>
                              {req.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-850/60 text-xs space-y-2">
                          <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                            <span className="text-zinc-300 font-bold">{req.proposedEventTitle || "No Proposed Title"}</span>
                            <span className="text-emerald-400 font-bold font-mono">LKR {req.proposedEventFee ? req.proposedEventFee.toLocaleString() : "0 (Free)"}</span>
                          </div>
                          <p className="text-zinc-400 italic leading-relaxed text-[11px]">“ {req.proposedEventDescription || "No notes provided with pitch."} ”</p>
                          <div className="text-[10px] text-zinc-550 font-mono mt-1">Expected Attendance: {req.proposedEventCapacity || 100} Pax</div>
                        </div>

                        <div className="text-[10px] text-zinc-600 font-mono">
                          Submitted on: {new Date(req.createdAt?._seconds ? req.createdAt._seconds * 1000 : req.createdAt || Date.now()).toLocaleString()}
                        </div>

                        {req.status === 'pending' && (
                          <div className="flex gap-2 justify-end pt-2 border-t border-zinc-900">
                            <button
                              onClick={() => handleRequestsStatusUpdate(req.id, "rejected")}
                              className="text-[10px] font-bold text-red-400 bg-red-955/15 hover:bg-red-900/40 border border-red-900/30 py-1.5 px-4 rounded-xl cursor-pointer transition uppercase tracking-wider"
                            >
                              Reject Pitch
                            </button>
                            <button
                              onClick={() => handleRequestsStatusUpdate(req.id, "approved")}
                              className="text-[10px] font-bold text-black bg-emerald-400 hover:bg-emerald-350 py-1.5 px-4 rounded-xl cursor-pointer transition uppercase tracking-wider flex items-center gap-1.5"
                            >
                              Approve Partnership
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ticket Verification Hub */}
        {activeTab === 'verification' && (
          <div className="space-y-8 animate-fade-in text-sans" id="ticket-checker-panel">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <div>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-1">Admission Progress</span>
                <div className="text-xl font-extrabold text-white">
                  {registrations.filter(r => r.status === "approved" && r.checkedIn).length} <span className="text-xs text-zinc-500 font-normal">/ {registrations.filter(r => r.status === "approved").length} Checked In</span>
                </div>
              </div>
              <div>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-1">Gate Shield Active</span>
                <div className="text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5"><Shield className="w-4 h-4" /> DUP-PREVENTION ON</div>
              </div>
              <div>
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider block mb-1">Gate Hardware Status</span>
                <p className="text-[10px] text-zinc-400 font-mono">Connected • Laser sweep aligned OK</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
              <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                <h3 className="text-sm font-bold uppercase mb-4 text-zinc-300">Admission Gate QR/Barcode Reader</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-sans">Gate ID Scan (Manual / QR Lookup)</label>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Enter ticket ID..." value={checkingInCode} onChange={(e) => setCheckingInCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCheckIn(checkingInCode)} className="flex-grow bg-zinc-950 border border-zinc-800 text-xs font-mono rounded-xl py-2 px-3 text-zinc-300 focus:outline-none" />
                      <button onClick={() => handleCheckIn(checkingInCode)} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer">Verify</button>
                    </div>

                    <div className="border-t border-zinc-800/60 pt-4 mt-4 space-y-2">
                      <span className="block text-[9px] font-bold text-zinc-500 uppercase font-mono">Simulator Quick Actions</span>
                      <button onClick={() => {
                        const target = registrations.find(r => r.status === "approved" && !r.checkedIn);
                        if (target) { setCheckingInCode(target.id); toast.info(`Loaded approved check-in...`); setTimeout(() => handleCheckIn(target.id), 1000); }
                        else { toast.warning("No unused approved tickets in database."); }
                      }} className="w-full text-left bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 transition px-3 py-2.5 rounded-xl flex justify-between text-xs cursor-pointer">
                        <span className="text-zinc-350">🚀 Scan Unused Approved Ticket</span>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">SIMULATE</span>
                      </button>

                      <button onClick={() => {
                        const target = registrations.find(r => r.status === "approved" && r.checkedIn);
                        if (target) { setCheckingInCode(target.id); toast.info(`Simulating duplicate code check-in...`); setTimeout(() => handleCheckIn(target.id), 1000); }
                        else { toast.warning("Requires at least one checked-in approved ticket first."); }
                      }} className="w-full text-left bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 transition px-3 py-2.5 rounded-xl flex justify-between text-xs cursor-pointer">
                        <span className="text-zinc-355 text-zinc-300 hover:text-white">👿 Duplicate Code Entry Attempt</span>
                        <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">TEST SHIELD</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-855 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-6 min-h-[160px]">
                    <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-blue-500" />
                    <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-blue-500" />
                    <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-blue-500" />
                    <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-blue-500" />
                    <div className="absolute left-0 w-full h-[1px] bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" style={{ top: '45%' }} />
                    <Scan className="w-8 h-8 text-zinc-700 mb-2" />
                    <span className="text-[8px] font-mono text-zinc-650 text-center tracking-widest uppercase">HARDWARE SCANPOINT READY</span>
                  </div>
                </div>

                {checkInResult && (
                  <div className={`mt-6 border rounded-2xl p-4 ${checkInResult.success ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" : "bg-rose-950/20 border-rose-500/20 text-rose-350"}`}>
                    <div className="text-[10px] font-mono uppercase font-black tracking-wider text-zinc-550">Gate Verification Report</div>
                    <h4 className="text-sm font-bold text-white mt-1 uppercase">{checkInResult.success ? "✓ ACCESS GRANTED" : "✕ ACCESS DENIED"}</h4>
                    <p className="text-xs mt-1">{checkInResult.message}</p>
                    {checkInResult.attendee && (
                      <p className="text-[10px] mt-2 text-zinc-400 font-mono">Attendee: {checkInResult.attendee} | Event: {checkInResult.title}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Entry logs stream timeline */}
              <div className="lg:col-span-12 xl:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest mb-4 font-sans">Gate Entrance Logs</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {entryLogs.length === 0 ? (
                    <div className="py-8 text-center text-zinc-600 text-xs">No entries logged yet today.</div>
                  ) : (
                    entryLogs.map((log: any) => {
                      const seconds = log.checkedInAt?._seconds || null;
                      const displayTime = format(seconds ? new Date(seconds * 1000) : new Date(log.checkedInAt), "hh:mm:ss a");
                      return (
                        <div key={log.id} className="flex gap-2.5 bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs font-sans">
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-white truncate max-w-[110px]">{log.attendeeName}</h4>
                              <span className="text-[9px] text-zinc-550 font-mono">{displayTime}</span>
                            </div>
                            <p className="text-[10px] text-zinc-550 truncate mt-0.5">{log.eventTitle}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Filter and Sort Bar */}
            <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
                {/* Search */}
                <div className="relative flex-grow md:flex-grow-0 md:w-64">
                  <Input
                    type="text"
                    placeholder="Search events (title, desc, location)..."
                    value={eventSearchQuery}
                    onChange={(e) => setEventSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border-zinc-800 focus:border-zinc-500 text-xs rounded-xl py-2.5 px-3 pl-9 text-zinc-300 transition-all placeholder-zinc-500 h-10"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 py-1">
                  {["All", "Music", "Tech", "Business", "Sports", "Food", "Literature", "Arts", "Education", "Gaming", "General"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEventCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        eventCategoryFilter === cat
                          ? "bg-zinc-800 text-white shadow-md border border-zinc-700/50"
                          : "text-zinc-500 hover:text-white bg-zinc-950/40 hover:bg-zinc-950"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full xl:w-auto justify-end">
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl text-xs text-zinc-300 w-full md:w-auto">
                  <span className="text-zinc-400 font-medium">Sort by:</span>
                  <select
                    value={eventSortKey}
                    onChange={(e: any) => setEventSortKey(e.target.value)}
                    className="bg-transparent focus:outline-none text-zinc-300 cursor-pointer font-bold"
                  >
                    <option value="date" className="bg-zinc-900 text-white">Event Date</option>
                    <option value="title" className="bg-zinc-900 text-white">Alphabetical</option>
                    <option value="registeredCount" className="bg-zinc-900 text-white">Popularity</option>
                    <option value="fee" className="bg-zinc-900 text-white">Pricing Fee</option>
                  </select>
                </div>

                <button
                  onClick={() => setEventSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5 text-xs hover:border-zinc-600 h-[36px] min-w-[70px]"
                  title={`Sort Order: ${eventSortOrder === "asc" ? "Ascending" : "Descending"}`}
                >
                  <span className="font-bold uppercase tracking-wider text-[10px]">{eventSortOrder}</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Empty state */}
            {filteredAndSortedEvents.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-3">
                <CalendarIcon className="w-8 h-8 text-zinc-700" />
                <div>
                  <p className="font-bold text-lg text-zinc-400">No events found</p>
                  <p className="text-sm">Try adjusting your category selection, search terms, or publish a new event.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedEvents.map(event => (
                  <div key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-zinc-700 transition-all flex flex-col">
                    <div className="aspect-[16/9] bg-zinc-800 relative overflow-hidden">
                      {event.imageUrl ? (
                        <img 
                          src={getProxyUrl(event.imageUrl)} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-zinc-700" />
                        </div>
                      )}
                      
                      {/* Event Category Badge */}
                      <div className={`absolute top-4 left-4 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border shadow-lg ${
                        event.category === "Music" ? "bg-purple-500/20 text-purple-400 border-purple-500/20" :
                        event.category === "Tech" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/20" :
                        event.category === "Business" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" :
                        event.category === "Sports" ? "bg-amber-500/20 text-amber-400 border-amber-500/20" :
                        event.category === "Food" ? "bg-orange-500/20 text-orange-400 border-orange-500/20" :
                        event.category === "Literature" ? "bg-rose-500/20 text-rose-400 border-rose-500/20" :
                        event.category === "Arts" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/20" :
                        event.category === "Education" ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/20" :
                        event.category === "Gaming" ? "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/20" :
                        "bg-zinc-500/20 text-zinc-400 border-zinc-500/20"
                      }`}>
                        {event.category || "General"}
                      </div>

                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white border border-white/10">
                        {event.registeredCount}/{event.capacity}
                      </div>
                    </div>
                    
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold truncate mb-1">{event.title}</h3>
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                          <CalendarIcon className="w-3 h-3" />
                          {new Date(event.date?._seconds ? event.date._seconds * 1000 : event.date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-lg font-bold">
                            {event.fee === 0 ? "FREE" : `LKR ${event.fee.toLocaleString()}`}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono">
                            {Math.round((event.registeredCount / event.capacity) * 100)}% Full
                          </div>
                        </div>
                        
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-6">
                          <div 
                            className="bg-primary h-1.5 rounded-full" 
                            style={{ width: `${Math.min(100, (event.registeredCount / event.capacity) * 100)}%` }}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const d = new Date(event.date?._seconds ? event.date._seconds * 1000 : event.date);
                              const formattedDate = !isNaN(d.getTime()) 
                                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
                                : "";
                              setNewEvent({
                                ...event,
                                date: formattedDate
                              } as any);
                              setEditId(event.id);
                              setShowEventModal(true);
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-800 py-3 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-500 transition-all font-bold text-sm"
                          >
                            Edit
                          </button>
                          <button 
                             onClick={async () => {
                               if (!confirm("Are you sure you want to delete this event? This will not delete registrations.")) return;
                               try {
                                 const idToken = await user?.getIdToken();
                                 const res = await fetch(`/api/events/${event.id}`, {
                                   method: "DELETE",
                                   headers: { "Authorization": `Bearer ${idToken}` }
                                 });
                                 if (!res.ok) throw new Error("Failed to delete");
                                 toast.success("Event deleted");
                                 fetchData();
                               } catch (e) {
                                 toast.error("Failed to delete event");
                               }
                             }}
                             className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-600 hover:text-red-500 hover:border-red-500/50 transition-all flex items-center justify-center"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event Creation Modal */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEventModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">{editId ? 'Update Event' : 'Create New Event'}</h2>
                <button 
                  onClick={() => {
                    setShowEventModal(false);
                    setEditId(null);
                    setNewEvent({
                      title: "",
                      description: "",
                      date: "",
                      location: "",
                      category: "General",
                      fee: 0,
                      capacity: 100,
                      imageUrl: ""
                    });
                  }} 
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Event Title</label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all"
                    placeholder="Grand Music Fest 2024"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all resize-none"
                    placeholder="Tell us about the event..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Date</label>
                    <input
                      type="datetime-local"
                      required
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Category</label>
                    <select
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({...newEvent, category: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all appearance-none"
                    >
                      <option>Music</option>
                      <option>Tech</option>
                      <option>Business</option>
                      <option>Sports</option>
                      <option>Food</option>
                      <option>Literature</option>
                      <option>Arts</option>
                      <option>Education</option>
                      <option>Gaming</option>
                      <option>General</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Location</label>
                  <input
                    type="text"
                    required
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all"
                    placeholder="Auditorium, Main Campus"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Fee (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      value={newEvent.fee}
                      onChange={(e) => setNewEvent({...newEvent, fee: e.target.value === "" ? "" as any : parseInt(e.target.value) || 0})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Capacity</label>
                    <input
                      type="number"
                      min={1}
                      value={newEvent.capacity}
                      onChange={(e) => setNewEvent({...newEvent, capacity: e.target.value === "" ? "" as any : parseInt(e.target.value) || 0})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-zinc-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Event Banner</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:border-zinc-600 transition-all bg-zinc-950 group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 mb-2" />
                      <p className="text-sm text-zinc-500 group-hover:text-zinc-400 font-medium">
                        {bannerFile ? bannerFile.name : "Click to upload banner"}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={creatingEvent}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creatingEvent ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                    ) : (
                      <>
                        {editId ? 'Save Changes' : 'Confirm & Publish'}
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Invoice Generator Modal Popup */}
      <AnimatePresence>
        {activeRegForInvoice && (() => {
          const matchedEvent = events.find(e => e.id === activeRegForInvoice.eventId);
          const baseFee = matchedEvent?.fee || 0;
          const serviceFee = baseFee > 0 ? gatewayConfig.serviceFee : 0;
          const taxRate = gatewayConfig.taxRate;
          const taxAmount = (baseFee + serviceFee) * (taxRate / 100);
          const totalPaid = baseFee + serviceFee + taxAmount;
          
          const seconds = activeRegForInvoice.createdAt?._seconds || null;
          const billingDate = seconds ? new Date(seconds * 1000) : new Date(activeRegForInvoice.createdAt);
          const formattedBillingDate = format(billingDate, "MMM dd, yyyy - hh:mm a");

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans"
              onClick={() => setActiveRegForInvoice(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-zinc-950 border border-zinc-850 rounded-3xl w-full max-w-xl p-8 relative shadow-2xl flex flex-col gap-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Print button on upper right corner */}
                <button
                  onClick={() => window.print()}
                  className="absolute top-6 right-16 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>

                <button
                  onClick={() => setActiveRegForInvoice(null)}
                  className="absolute top-6 right-6 p-2 bg-zinc-900 hover:bg-zinc-850 rounded-xl text-zinc-500 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Invoice Content */}
                <div className="space-y-6 printable-document text-left">
                  {/* Header / Brand */}
                  <div className="flex justify-between items-start border-b border-zinc-900 pb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Award className="w-5 h-5 text-blue-500" />
                        <span className="font-extrabold text-sm tracking-widest text-white uppercase font-mono">TICKETMETRIC</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed max-w-xs uppercase tracking-wider font-mono">
                        Sri Lanka's Automated Ticket acquiring and AI auditing portal.
                      </p>
                    </div>

                    <div className="text-right font-sans">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Invoice ID</span>
                      <span className="font-mono text-zinc-300 text-xs font-bold bg-zinc-900 px-2 py-1 rounded border border-zinc-850">
                        TXN-{activeRegForInvoice.id.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information Grid */}
                  <div className="grid grid-cols-2 gap-6 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-850/50">
                    <div>
                      <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block mb-1">Billed To Attendee</span>
                      <strong className="text-white text-xs block font-sans">{activeRegForInvoice.name}</strong>
                      <span className="text-zinc-500 text-[10px] mt-0.5 block font-mono">{activeRegForInvoice.phone}</span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block mb-1 font-sans">Order Date / Time</span>
                      <span className="text-zinc-300 text-[11px] font-bold font-sans block">{formattedBillingDate}</span>
                      <span className="text-[9px] font-bold text-zinc-555 uppercase tracking-widest block mt-2.5 mb-0.5">Gateway Provider</span>
                      <span className="text-zinc-400 text-[10px] font-medium font-mono">{gatewayConfig.provider} ({gatewayConfig.mode})</span>
                    </div>
                  </div>

                  {/* Bill Line Items Table */}
                  <div className="space-y-3 font-sans">
                    <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block font-sans">Purchased Access Pass</span>
                    
                    <div className="border border-zinc-850 rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-12 bg-zinc-900 px-4 py-2 text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-850 font-sans">
                        <div className="col-span-8">Description</div>
                        <div className="col-span-4 text-right">Amount</div>
                      </div>

                      <div className="grid grid-cols-12 px-4 py-3 text-xs border-b border-zinc-850/60 font-sans">
                        <div className="col-span-8">
                          <strong className="text-white text-xs">{activeRegForInvoice.eventTitle}</strong>
                          <span className="text-zinc-550 block text-[10px] mt-1 italic">Single Entry Pass ID: {activeRegForInvoice.id}</span>
                        </div>
                        <div className="col-span-4 text-right font-mono text-zinc-200 self-center">
                          LKR {baseFee.toLocaleString()}
                        </div>
                      </div>

                      {baseFee > 0 && (
                        <div className="grid grid-cols-12 px-4 py-2.5 text-xs text-zinc-500 font-mono">
                          <div className="col-span-8">Simulated Convenience Surcharge</div>
                          <div className="col-span-4 text-right">
                            LKR {serviceFee.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Totals and tax calculations display */}
                  <div className="flex flex-col items-end gap-2 text-xs font-mono font-bold">
                    <div className="flex justify-between w-64 text-zinc-500">
                      <span>Subtotal:</span>
                      <span className="text-zinc-400">LKR {(baseFee + serviceFee).toLocaleString()}</span>
                    </div>
                    {baseFee > 0 && (
                      <div className="flex justify-between w-64 text-zinc-500">
                        <span>Simulated Tax (VAT {taxRate}%):</span>
                        <span className="text-zinc-400">LKR {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between w-64 text-sm text-white border-t border-zinc-850 pt-3 mt-1">
                      <span>Total Invoice Due:</span>
                      <span className="text-emerald-400">LKR {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Compliance note */}
                  <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl text-[9px] text-zinc-500 leading-relaxed font-mono">
                    NOTICE: This invoice is dynamically simulated in accordance with government tourism taxes ({taxRate}% VAT). Tax Invoice record cleared on AI automated verification parameters. Refunded checkin registers are non-transferable.
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800 text-white">
          {icon}
        </div>
        <Badge variant="outline" className="text-[10px] bg-zinc-950 text-zinc-400 border-zinc-800 rounded uppercase font-bold tracking-tighter px-2 py-0.5">
          Live Sync
        </Badge>
      </div>
      <div>
        <p className="text-4xl font-black mb-1.5 tracking-tighter text-white">{value}</p>
        <p className="text-zinc-400 text-sm font-medium">{title}</p>
      </div>
    </Card>
  );
}
