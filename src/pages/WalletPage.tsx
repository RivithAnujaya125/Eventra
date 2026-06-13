import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Plus, 
  Sparkles, 
  ArrowLeft, 
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Lock,
  ChevronRight,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface Transaction {
  id: string;
  amount: number;
  type: "deposit" | "payment";
  reference: string;
  createdAt: any;
}

export default function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Deposit configurations
  const [depositAmount, setDepositAmount] = useState("2500");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "koko">("card");
  
  // Card Details State
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardFocused, setCardFocused] = useState(false); // Can trigger flipped state or highlighted border

  // Koko BNPL State
  const [kokoPhone, setKokoPhone] = useState("");
  const [kokoStep, setKokoStep] = useState<"phone" | "otp">("phone");
  const [kokoOtp, setKokoOtp] = useState("");

  // Gateway Simulation engine
  const [simulationStep, setSimulationStep] = useState<number>(-1);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Quick info modal toggle
  const [showInfo, setShowInfo] = useState(false);

  const fetchWallet = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/wallet", {
        headers: { "Authorization": `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch wallet info");
      setBalance(data.balance);
      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not retrieve wallet balance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWallet();
    }
  }, [user]);

  // Card formatting helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    // Format with spaces
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setCardExpiry(value.substring(0, 2) + "/" + value.substring(2));
    } else {
      setCardExpiry(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 3) value = value.slice(0, 3);
    setCardCvv(value);
  };

  const detectCardBrand = () => {
    const rawNumber = cardNumber.replace(/\D/g, "");
    if (rawNumber.startsWith("4")) return "visa";
    if (rawNumber.startsWith("5")) return "mastercard";
    return "generic";
  };

  // Run detailed secure gateway simulation
  const startDepositProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount to deposit");
      return;
    }

    if (paymentMethod === "card") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        toast.error("Please enter a valid 16-digit card number");
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        toast.error("Please enter card expiry in MM/YY format");
        return;
      }
      if (cardCvv.length < 3) {
        toast.error("Please enter valid CVV");
        return;
      }
      if (!cardName.trim()) {
        toast.error("Cardholder name is required");
        return;
      }
    } else if (paymentMethod === "koko") {
      if (kokoPhone.length < 9) {
        toast.error("Please enter a valid phone number registered with Koko");
        return;
      }
      if (kokoStep === "phone") {
        // Switch to OTP view
        setKokoStep("otp");
        toast.success("SMS verification code sent to " + kokoPhone);
        return;
      }
      if (kokoOtp.length < 4) {
        toast.error("Please enter the 4-digit security code received via SMS");
        return;
      }
    }

    // Begin visually detailed multi-stage payment simulation
    setIsSimulating(true);
    setSimulationStep(0);
    setSimulationLogs(["Establishing direct TLS 1.3 encrypted handshake with bank server..."]);

    const steps = [
      { delay: 1000, msg: "Handshake verified. Routing parameters through gateway..." },
      { delay: 2200, msg: paymentMethod === "card" 
        ? `Contacting acquiring bank for card ending in *${cardNumber.slice(-4)}...` 
        : `Communicating with Koko credit engine for installment plans...` },
      { delay: 3500, msg: "Authorizing virtual tokenized exchange limits..." },
      { delay: 4700, msg: "Authenticating 3D-Secure 2.0 multi-factor credentials..." },
      { delay: 5800, msg: "Exchange rate finalized: 1.00 LKR = 1.00 Eventra Point (EP)." },
      { delay: 6800, msg: "Verification complete. Requesting ledger updates from Firestore..." }
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, steps[i].delay - (i === 0 ? 0 : steps[i-1].delay)));
      setSimulationStep(i + 1);
      setSimulationLogs(prev => [...prev, steps[i].msg]);
    }

    // Finalize payment on actual database
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          amount: amountNum,
          paymentMethod,
          cardDetails: paymentMethod === "card" ? { cardNumber: cardNumber.replace(/\s/g, "") } : null,
          kokoDetails: paymentMethod === "koko" ? { phone: kokoPhone } : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deposit failed");
      
      toast.success(data.message || `Acquired ${amountNum.toLocaleString()} EP!`, { duration: 5000 });
      
      // Clean states
      setCardNumber("");
      setCardName("");
      setCardExpiry("");
      setCardCvv("");
      setKokoPhone("");
      setKokoOtp("");
      setKokoStep("phone");
      
      // Update local wallet data
      setBalance(data.balance);
      fetchWallet(true); // reload transactions silently
    } catch (err: any) {
      toast.error(err.message || "Failed to process virtual credit top-up");
    } finally {
      // Delay dismissing the simulation screen so user sees complete success
      await new Promise(r => setTimeout(r, 1200));
      setIsSimulating(false);
      setSimulationStep(-1);
      setSimulationLogs([]);
    }
  };

  const handleQuickAmount = (val: number) => {
    setDepositAmount(val.toString());
  };

  const currentAmount = parseFloat(depositAmount) || 0;

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500" />
        <p className="text-zinc-500 text-xs font-mono animate-pulse">Synchronizing secure credit logs...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div id="wallet-root" className="max-w-5xl mx-auto px-4">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <Link to="/profile" className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight font-sans">EVENTRA POINTS</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest text-pink-500 bg-pink-500/10 px-2.5 py-0.5 rounded border border-pink-500/20 font-mono">
                  Wallet
                </span>
              </div>
              <p className="text-zinc-500 text-xs mt-1">
                Your high-speed, instant checkout pass. 1 Eventra Point (EP) = 1.00 LKR.
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-400 font-bold transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" /> Learn about EP
          </button>
        </div>

        {/* EP INFO BOX */}
        <AnimatePresence>
          {showInfo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl text-xs text-zinc-400 space-y-3 leading-relaxed">
                <div className="flex items-center gap-2 text-white font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>Why use Eventra Points (EP)?</span>
                </div>
                <p>
                  Eventra Points are high-tier virtual credits mapped 1:1 with LKR. By topping up your balance, you eliminate checkout friction other users experience with slow banking gateways or manual receipt scanning.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-805 border-zinc-800/10">
                    <span className="font-bold text-zinc-200 block mb-0.5">Instant Approval</span>
                    Whenever you register for a paid event utilizing points, your ticket status changes to approved instantly.
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-805 border-zinc-800/10">
                    <span className="font-bold text-zinc-200 block mb-0.5">Flexible Top-up</span>
                    Fund your wallet seamlessly using your preferred bank debit/credit card or Sri Lanka's leading installment tracker system, Koko.
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-805 border-zinc-800/10">
                    <span className="font-bold text-zinc-200 block mb-0.5">Zero Processing Fees</span>
                    There are no dynamic surcharges or hidden subscription costs. EP keeps your transaction ledgers clean.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: ACTIVE BALANCE & DEPOSIT FORM (7 Units) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* BALANCE DISPLAY CARD */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-90 w-full border border-zinc-800/80 rounded-[32px] p-8 relative overflow-hidden shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[80px] rounded-full" />
              
              <div className="space-y-2">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono">Total Liquid Credits Available</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-sans text-pink-500">EP</span>
                  <span className="text-5xl font-black tracking-tighter text-white">
                    {balance !== null ? balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-500" /> Fully secured virtual ledger
                </p>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800/50 p-4 rounded-2xl flex flex-col self-stretch sm:self-auto justify-center min-w-[200px]">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-bold tracking-tight uppercase mb-2">
                  <span>Equivalence Node</span>
                  <span className="text-pink-400">1:1 peg</span>
                </div>
                <div className="text-xs text-zinc-350 flex justify-between">
                  <span>1 Eventra Point (EP)</span>
                  <span className="font-bold text-white">1.00 LKR</span>
                </div>
                <div className="text-xs text-zinc-350 flex justify-between mt-1">
                  <span>Processing latency</span>
                  <span className="font-mono text-green-400">0.05 ms</span>
                </div>
              </div>
            </div>

            {/* DEPOSIT CONTROLLER BLOCK */}
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-[32px] p-8 shadow-xl relative">
              <h3 className="font-extrabold text-sm uppercase tracking-widest text-zinc-400 mb-6 flex items-center justify-between">
                <span className="flex items-center gap-2"><CreditCard className="w-4.5 h-4.5 text-zinc-500" /> Load Eventra Points</span>
                <span className="text-[10px] text-zinc-550 font-mono normal-case">Direct Top-up Console</span>
              </h3>

              <form onSubmit={startDepositProcess} className="space-y-6">
                
                {/* Step 1: Amount Selection */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    1. Enter EP Purchase Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 font-black text-lg">EP</span>
                    <input 
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 transition-all rounded-2xl py-4 pl-14 pr-4 font-black text-2xl focus:outline-none text-white tracking-tight"
                    />
                  </div>

                  {/* Pre-set incremental packages */}
                  <div className="grid grid-cols-4 gap-2">
                    {[500, 1500, 3000, 5000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickAmount(val)}
                        className={`py-2 px-1 bg-zinc-950 border transition-all text-xs font-mono font-bold rounded-xl ${
                          depositAmount === val.toString() 
                            ? "border-pink-500 text-pink-400 font-black" 
                            : "border-zinc-800 hover:border-zinc-650 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {val.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Payment Provider Options */}
                <div className="space-y-3 pt-4 border-t border-zinc-800/60">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono mb-2">
                    2. Select Secure Payment Gateway
                  </label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-4 border rounded-2xl text-left transition-all flex items-start gap-3 relative ${
                        paymentMethod === "card"
                          ? "border-white bg-white/5 text-white shadow-lg"
                          : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <CreditCard className={`w-5 h-5 mt-0.5 ${paymentMethod === "card" ? "text-pink-500" : "text-zinc-500"}`} />
                      <div>
                        <span className="font-bold text-sm block">Credit / Debit Card</span>
                        <span className="text-[10px] text-zinc-500 block">Visa, MasterCard, Amex</span>
                      </div>
                      {paymentMethod === "card" && (
                        <div className="absolute top-3 right-3 w-2 h-2 bg-pink-500 rounded-full" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("koko")}
                      className={`p-4 border rounded-2xl text-left transition-all flex items-start gap-3 relative ${
                        paymentMethod === "koko"
                          ? "border-white bg-white/5 text-white shadow-lg"
                          : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Smartphone className={`w-5 h-5 mt-0.5 ${paymentMethod === "koko" ? "text-pink-500" : "text-zinc-500"}`} />
                      <div>
                        <span className="font-bold text-sm block">Koko BNPL Split</span>
                        <span className="text-[10px] text-zinc-500 block">3 splits • Interest-Free</span>
                      </div>
                      {paymentMethod === "koko" && (
                        <div className="absolute top-3 right-3 w-2 h-2 bg-pink-500 rounded-full" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Step 3: Provider-specific form parameters */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
                  {paymentMethod === "card" ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
                        <span className="text-xs text-zinc-450 font-bold uppercase tracking-wider font-mono">Secure Card Credentials</span>
                        <div className="flex gap-1.5">
                          <span className={`text-[9px] font-bold py-0.5 px-1.5 rounded ${detectCardBrand() === "visa" ? "bg-blue-600 text-white" : "bg-zinc-900 text-zinc-500"}`}>VISA</span>
                          <span className={`text-[9px] font-bold py-0.5 px-1.5 rounded ${detectCardBrand() === "mastercard" ? "bg-amber-600 text-white" : "bg-zinc-900 text-zinc-500"}`}>MASTERCARD</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Card Number</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-650"><Lock className="w-3.5 h-3.5 text-zinc-600" /></span>
                            <input 
                              type="text"
                              placeholder="4123 4567 8901 2345"
                              value={cardNumber}
                              onChange={handleCardNumberChange}
                              onFocus={() => setCardFocused(true)}
                              onBlur={() => setCardFocused(false)}
                              maxLength={19}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-xl py-2.5 pl-9 pr-4 font-mono text-sm focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Expiry Date</label>
                          <input 
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            maxLength={5}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-xl py-2.5 px-4 font-mono text-sm focus:outline-none text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">CVC / CVV</label>
                          <input 
                            type="password"
                            placeholder="•••"
                            value={cardCvv}
                            onChange={handleCvvChange}
                            maxLength={3}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-xl py-2.5 px-4 font-mono text-sm focus:outline-none text-center"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Cardholder Name</label>
                          <input 
                            type="text"
                            placeholder="ANUJA YAKULATHUNGA"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-xl py-2.5 px-4 font-sans text-xs focus:outline-none tracking-widest"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
                        <span className="text-xs text-zinc-450 font-bold uppercase tracking-wider font-mono">Koko Buy Now Pay Later</span>
                        <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 py-0.5 px-2 rounded-full border border-pink-500/20">Active split</span>
                      </div>

                      <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/50 space-y-3">
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/40">
                          <span className="text-zinc-400">Total Purchase:</span>
                          <span className="font-extrabold text-white">EP {currentAmount.toLocaleString()}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-zinc-400">
                              <span className="w-4 h-4 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold text-white">1</span>
                              Installment 1 (Today):
                            </span>
                            <span className="font-mono text-zinc-200">EP {(currentAmount / 3).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-zinc-400">
                              <span className="w-4 h-4 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400">2</span>
                              Installment 2 (In 30 days):
                            </span>
                            <span className="font-mono text-zinc-400">EP {(currentAmount / 3).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-zinc-400">
                              <span className="w-4 h-4 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400">3</span>
                              Installment 3 (In 60 days):
                            </span>
                            <span className="font-mono text-zinc-400">EP {(currentAmount / 3).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {kokoStep === "phone" ? (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Koko Registered Mobile</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 font-mono">+94</span>
                            <input 
                              type="tel"
                              placeholder="77 123 4567"
                              value={kokoPhone}
                              onChange={(e) => setKokoPhone(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-650 rounded-xl py-2.5 pl-12 pr-4 font-mono text-sm focus:outline-none"
                            />
                          </div>
                          <p className="text-[10px] text-zinc-500 italic">Enter your Sri Lankan phone registered with Koko to proceed to SMS OTP authorization.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono animate-pulse">Enter SMS Verification Code</label>
                            <button 
                              type="button" 
                              onClick={() => { setKokoStep("phone"); setKokoOtp(""); }}
                              className="text-[10px] text-zinc-450 hover:text-white font-bold underline"
                            >
                              Edit Phone
                            </button>
                          </div>
                          <input 
                            type="text"
                            placeholder="Enter 4-Digit OTP"
                            value={kokoOtp}
                            onChange={(e) => setKokoOtp(e.target.value.replace(/\D/g, ""))}
                            maxLength={4}
                            className="w-full bg-zinc-950 border border-teal-500/50 focus:border-teal-400 rounded-xl py-3 px-4 font-mono text-lg font-black text-center focus:outline-none text-teal-300 tracking-[1em]"
                          />
                          <p className="text-[10px] text-zinc-500 text-center">We simulated an SMS sending. Enter any 4 digit numeric code code to approve authorization.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submition Button */}
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="w-full py-4 bg-white text-black hover:bg-zinc-200 active:bg-zinc-300 transition-all rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  {isSimulating ? (
                    "Initiating Secure Vault..."
                  ) : paymentMethod === "koko" && kokoStep === "phone" ? (
                    "Authorize via Koko SMS"
                  ) : (
                    `Purchase ${currentAmount.toLocaleString()} Eventra Points (EP)`
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT PANEL: TRANSACTION HISTORY LEDGER & INTERACTIVE PLASTIC PREVIEW (5 Units) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* LIVE CARD GRAPHIC (INTERACTIVE MIRROR) */}
            <AnimatePresence>
              {paymentMethod === "card" && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-transparent"
                >
                  <div className={`relative h-[220px] rounded-[24px] overflow-hidden p-6 text-white border transition-all duration-500 shadow-2xl ${
                    cardFocused 
                      ? "border-pink-500/50 bg-gradient-to-tr from-zinc-950 via-pink-950/20 to-zinc-950" 
                      : "border-zinc-800 bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950"
                  }`}>
                    {/* Abstract hologram aesthetic */}
                    <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-pink-500/10 to-transparent blur-[50px] rounded-full pointer-events-none" />
                    
                    {/* Top Row: Brand & Holographic Chip */}
                    <div className="flex justify-between items-start mb-10">
                      <div className="w-10 h-8 bg-zinc-800/80 rounded-lg border border-zinc-700/50 relative overflow-hidden backdrop-blur flex items-center justify-center">
                        {/* Metallic chip lines */}
                        <div className="absolute inset-x-2 inset-y-2 border border-zinc-650/40 opacity-70" />
                        <div className="w-3 h-3 bg-zinc-600/50 rounded-xs" />
                      </div>
                      
                      <div className="text-right">
                        <span className="block text-[11px] font-black uppercase tracking-wider text-zinc-500">Secure Node</span>
                        <span className="text-xs font-bold text-zinc-400">
                          {detectCardBrand() === "visa" ? "VISA" : detectCardBrand() === "mastercard" ? "MASTERCARD" : "EP CHIP"}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Card Number Mirror */}
                    <div className="mb-8">
                      <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">Mirror Token ID</p>
                      <p className="text-xl font-bold font-mono tracking-[0.18em]">
                        {cardNumber || "•••• •••• •••• ••••"}
                      </p>
                    </div>

                    {/* Bottom Row: Name and Expire */}
                    <div className="flex justify-between items-end">
                      <div className="truncate pr-4">
                        <p className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase">Cardholder</p>
                        <p className="text-xs font-bold font-sans tracking-wide truncate max-w-[190px]">
                          {cardName || "YOUR NAME HERE"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[8px] text-zinc-500 font-mono tracking-widest uppercase">Expires</p>
                        <p className="text-xs font-bold font-mono">
                          {cardExpiry || "MM/YY"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LEDGER LOG LIST */}
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-[32px] p-8 shadow-xl min-h-[460px] flex flex-col justify-between">
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black font-sans">Transaction Ledger</h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Your official chronological record of point actions.</p>
                  </div>
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl">
                    <Clock className="w-4.5 h-4.5 text-zinc-500" />
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16">
                    <div className="w-16 h-16 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-850 mb-4 text-zinc-600">
                      <Wallet className="w-8 h-8" />
                    </div>
                    <p className="text-zinc-500 text-xs font-mono">Credit history currently blank</p>
                    <p className="text-[10px] text-zinc-650 mt-1 max-w-xs px-4">
                      Purchase credits using cards or Koko. Paid details sync automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="p-4 bg-zinc-950/40 border border-zinc-800/50 hover:border-zinc-800 rounded-2xl flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${
                            tx.type === "deposit" 
                              ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                              : "bg-pink-500/5 border-pink-500/10 text-pink-400"
                          }`}>
                            {tx.type === "deposit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-zinc-100 truncate max-w-[170px] sm:max-w-none">{tx.reference}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("en-US", {
                                year: "numeric", month: "short", day: "numeric", hour: "2-digit"
                              }) : "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className={`font-mono font-black text-xs shrink-0 pl-2 text-right ${
                          tx.amount > 0 ? "text-emerald-405 text-emerald-400" : "text-zinc-350"
                        }`}>
                          {tx.amount > 0 ? "+" : ""} {tx.amount.toLocaleString("en-US")} EP
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security guarantee line */}
              <div className="pt-6 border-t border-zinc-800/60 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>SSL Secured • PCIDSS Core Compliant</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* GATEWAY GATE OVERLAY / SIMULATOR VIEW (NOT EASY-WEEZY!) */}
      <AnimatePresence>
        {isSimulating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Spinning background glow */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-pulse" />
              
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl mx-auto flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-pink-500 animate-spin" />
                </div>
                
                <div>
                  <h3 className="text-lg font-black tracking-tight">Direct Gateway Validation</h3>
                  <p className="text-xs text-zinc-500 font-mono mt-1">Interfacing with central transaction nodes...</p>
                </div>
              </div>

              {/* Progress Console Lines */}
              <div className="my-6 bg-zinc-900 rounded-2xl p-4 border border-zinc-800/80 min-h-[140px] flex flex-col justify-end">
                <p className="text-[10px] px-1 pb-1 border-b border-zinc-800/50 text-zinc-550 font-bold tracking-widest uppercase font-mono mb-2">
                  System Logs Summary
                </p>
                <div className="space-y-1.5 overflow-hidden font-mono text-[10px] tracking-tight leading-normal">
                  {simulationLogs.map((log, index) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={index}
                      className="flex items-start gap-2"
                    >
                      <span className="text-pink-500 font-bold shrink-0">&gt;</span>
                      <span className={index === simulationLogs.length - 1 ? "text-white font-bold" : "text-zinc-500"}>
                        {log}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Progression Slider */}
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-300"
                  style={{ width: `${(simulationStep / 7) * 100}%` }}
                />
              </div>

              <div className="mt-6 flex items-center justify-center gap-1 text-[10px] text-zinc-600 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>Simulating secure network sandbox...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
