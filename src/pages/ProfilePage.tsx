import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { User, Mail, Shield, Calendar, Settings, Save, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function ProfilePage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [profileData, setProfileData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    role: role || "user"
  });

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
        console.error("Failed to load wallet balance inside profile:", err);
      }
    };
    if (user) fetchBalance();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      await updateProfile(user, { displayName: profileData.name });
      await updateDoc(doc(db, "users", user.uid), {
        name: profileData.name
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tighter mb-2">Account Settings</h1>
          <p className="text-zinc-500">Manage your profile and account preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Avatar and quick info */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center">
              <div className="w-24 h-24 bg-zinc-950 border border-zinc-800 rounded-full mx-auto mb-6 flex items-center justify-center">
                <User className="w-12 h-12 text-zinc-500" />
              </div>
              <h2 className="text-xl font-bold mb-1">{user?.displayName || "User"}</h2>
              <p className="text-sm text-zinc-500 mb-6">{user?.email}</p>
              
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl mb-8">
                <Shield className={`w-4 h-4 ${role === 'admin' ? 'text-primary' : 'text-zinc-500'}`} />
                <span className="text-xs uppercase font-bold tracking-widest">{role}</span>
              </div>

              <button 
                onClick={() => auth.signOut()}
                className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 py-3 rounded-xl transition-all font-bold text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>

            {/* WALLET WIDGET */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-pink-500" />
                  <span className="font-bold text-sm">Account Wallet</span>
                </div>
                <Link 
                  to="/wallet" 
                  className="text-xs text-pink-400 hover:text-pink-300 font-bold transition-colors"
                >
                  Manage
                </Link>
              </div>
              <div className="bg-zinc-950 border border-zinc-850/80 rounded-2xl p-4 flex flex-col">
                <span className="text-[10px] text-zinc-550 font-mono uppercase font-bold tracking-wider mb-1">Available Funds</span>
                <span className="text-xl font-bold font-sans">
                  EP {walletBalance !== null ? walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
                </span>
              </div>
              <Link 
                to="/wallet" 
                className="mt-4 w-full py-3 bg-white text-black hover:bg-zinc-200 transition-all font-bold text-xs text-center rounded-xl"
              >
                Deposit Credits
              </Link>
            </div>
          </div>

          {/* Edit form */}
          <div className="md:col-span-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-zinc-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input
                        type="email"
                        disabled
                        value={profileData.email}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 opacity-50 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-800">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50"
                  >
                    {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" /> : <Save className="w-5 h-5" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-8 p-8 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-500" />
                Linked Accounts
              </h3>
              <p className="text-sm text-zinc-500">
                You are currently signed in with email and password. In the future, you'll be able to link your Google account here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
