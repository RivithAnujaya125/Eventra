import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { User, Mail, Lock, UserPlus, Sparkles, Chrome, Facebook, Briefcase, Phone, Tag } from "lucide-react";
import { motion } from "motion/react";
import EventraLogo from "../components/EventraLogo";
import { getFriendlyAuthErrorMessage } from "../utils/authErrors";
import loginBanner from "../assets/images/eventra_concert_1779621231022.png";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Organizer Mode specific state states
  const [isOrganizerMode, setIsOrganizerMode] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("Music");
  
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (isOrganizerMode) {
        // Update auth profile
        await updateProfile(user, { displayName: name || businessName });

        // Retrieve auth ID Token
        const token = await user.getIdToken();

        // Finalize organizer enrollment on server-side
        const res = await fetch("/api/organizer/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            businessName,
            phone,
            category
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to finalize organizer registration.");
        }

        toast.success(`Welcome, ${businessName}! Live organizer dashboard established.`);
        navigate("/organizer");
      } else {
        await updateProfile(user, { displayName: name });

        // Create standard user doc
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          role: "user",
          createdAt: new Date(),
        });

        toast.success("Account created successfully!");
        navigate("/");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(getFriendlyAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName || "Google User",
          email: user.email || "",
          role: "user",
          createdAt: new Date(),
        });
      }

      toast.success("Successfully signed up with Google.");
      navigate("/");
    } catch (error: any) {
      if (error.code === "auth/popup-blocked") {
        toast.error("Sign-in popup blocked by the browser. Please allow popups for this site.");
      } else {
        console.error(error);
        toast.error(getFriendlyAuthErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          name: user.displayName || "Facebook User",
          email: user.email || "",
          role: "user",
          createdAt: new Date(),
        });
      }

      toast.success("Successfully signed up with Facebook.");
      navigate("/");
    } catch (error: any) {
      if (error.code === "auth/popup-blocked") {
        toast.error("Sign-in popup blocked by the browser. Please allow popups for this site.");
      } else {
        console.error(error);
        toast.error(getFriendlyAuthErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex overflow-hidden">
      {/* Left decoration */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-950 items-center justify-center p-16 overflow-hidden border-r border-zinc-900">
        {/* Ambient Blurred Colored Glow backdrops */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-pink-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

        {/* Highly polished background image with smooth dark radial mask overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[4000ms] ease-out hover:scale-105"
          style={{ 
            backgroundImage: `url(${loginBanner})`,
            backgroundBlendMode: "overlay",
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-zinc-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000000_100%)]" />

        <div className="relative z-10 max-w-lg text-left space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-full text-[10px] font-bold uppercase tracking-widest font-mono"
          >
            <Sparkles className="w-3.5 h-3.5" /> Start Your Event Journey
          </motion.div>

          <div className="space-y-4">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.1] font-sans"
            >
              Step Into the World of <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">Unforgettable</span> Beats.
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-zinc-400 text-sm sm:text-base font-medium leading-relaxed"
            >
              Join Eventra today and book instant entry passes to music concerts, grand arenas, and live venues within a matter of standard automated clicks.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-4 flex items-center gap-4 border-t border-zinc-900"
          >
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border border-black bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">🇱🇰</div>
              <div className="w-8 h-8 rounded-full border border-black bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">🎟️</div>
              <div className="w-8 h-8 rounded-full border border-black bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">⚡</div>
            </div>
            <span className="text-xs text-zinc-500 font-mono">Trusted by thousands of attendees island-wide.</span>
          </motion.div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md my-auto py-8"
        >
          <div className="mb-6 flex flex-col items-start">
            <div className="mb-4">
              <EventraLogo className="h-10" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1.5">Create Account</h1>
            <p className="text-zinc-500 text-sm">Join Eventra and start discovering or planning events</p>
          </div>

          {/* Registration Mode Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-xl mb-5 border border-zinc-850">
            <button
              type="button"
              onClick={() => setIsOrganizerMode(false)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold tracking-wider font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !isOrganizerMode
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              ATTENDEE
            </button>
            <button
              type="button"
              onClick={() => setIsOrganizerMode(true)}
              className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold tracking-wider font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isOrganizerMode
                  ? "bg-emerald-500 text-black shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              EVENT ORGANIZER
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                {isOrganizerMode ? "Representative Name" : "Full Name"}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-zinc-500 transition-all text-white text-sm"
                  placeholder={isOrganizerMode ? "Jane Perera" : "John Doe"}
                />
              </div>
            </div>

            {isOrganizerMode && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business / Organization Name</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-zinc-500 transition-all text-white text-sm"
                      placeholder="e.g. Lanka Entertainment Group"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Representative Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-zinc-500 transition-all text-white text-sm"
                      placeholder="+94 77 123 4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Primary Event Category</label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-zinc-500 transition-all text-white text-sm appearance-none cursor-pointer"
                    >
                      <option value="Music">Music & Concerts</option>
                      <option value="Tech">Technology & Dev summits</option>
                      <option value="Design">UI/UX Design workshops</option>
                      <option value="Sports">Sports & Outdoors</option>
                      <option value="Arts">Arts & Theatre</option>
                      <option value="Aesthetic">Aesthetic & Fashion</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-zinc-500 transition-all text-white text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-zinc-500 transition-all text-white text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-black font-extrabold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-sans cursor-pointer ${
                isOrganizerMode ? "bg-emerald-500 hover:bg-emerald-400" : "bg-white hover:bg-zinc-200"
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {isOrganizerMode ? "Register Organization" : "Sign Up"}
                </>
              )}
            </button>
          </form>

          {!isOrganizerMode && (
            <>
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-zinc-900"></div>
                <span className="flex-shrink mx-4 text-[9px] uppercase tracking-widest text-zinc-500 font-mono">or continue with</span>
                <div className="flex-grow border-t border-zinc-900"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer font-sans"
                >
                  <Chrome className="w-3.5 h-3.5 text-rose-500" />
                  Google
                </button>
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer font-sans"
                >
                  <Facebook className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  Facebook
                </button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-zinc-500 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-white font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
