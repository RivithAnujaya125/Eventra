import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Mail, Lock, LogIn, ShieldAlert, Sparkles, Chrome, Facebook, User, Briefcase } from "lucide-react";
import { motion } from "motion/react";
import EventraLogo from "../components/EventraLogo";
import { getFriendlyAuthErrorMessage } from "../utils/authErrors";
import loginBanner from "../assets/images/eventra_concert_1779621231022.png";

type LoginMode = "user" | "organizer" | "admin";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("user");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Loaded Firestore Profile info
      const snap = await getDoc(doc(db, "users", user.uid));
      const profile = snap.exists() ? snap.data() : null;
      let userRole = profile?.role || "user";
      
      // Bootstrap checks
      if (user.email === "anujayakulathunga15@gmail.com" || user.email === "hexcipher.dev@gmail.com") {
        userRole = "admin";
      }

      // Mode-specific route resolution
      if (loginMode === "admin") {
        if (userRole !== "admin") {
          await auth.signOut();
          toast.error("Access denied. Admin privileges required.");
          setLoading(false);
          return;
        }
        toast.success("Welcome, Admin.");
        navigate("/admin");
      } else if (loginMode === "organizer") {
        if (userRole !== "organizer" && userRole !== "admin") {
          await auth.signOut();
          toast.error("Access denied. Event Organizer account required.");
          setLoading(false);
          return;
        }
        const bName = profile?.businessName || "Event Organizer";
        toast.success(`Welcome back, ${bName}!`);
        navigate("/organizer");
      } else {
        toast.success("Successfully logged in.");
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

      toast.success("Successfully logged in with Google.");
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

      toast.success("Successfully logged in with Facebook.");
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
            <Sparkles className="w-3.5 h-3.5" /> Sri Lanka's Verified Event Pass System
          </motion.div>

          <div className="space-y-4">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.1] font-sans"
            >
              Unleash the Beat of Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">Experience</span>.
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-zinc-400 text-sm sm:text-base font-medium leading-relaxed"
            >
              Step into exclusive festivals, music beats, and premier corporate functions with automated high-speed check-ins, automated payment OCR proofing, and AI assistant ticketing.
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

      {/* Right side form */}
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
            <h1 className="text-2xl font-bold text-white mb-1">
              {loginMode === "admin" ? "Admin Portal" : loginMode === "organizer" ? "Organizer Portal" : "Welcome Back"}
            </h1>
            <p className="text-zinc-500 text-sm">
              {loginMode === "admin" 
                ? "Restricted access only" 
                : loginMode === "organizer" 
                ? "Sign in to manage events & tickets" 
                : "Sign in to your Eventra account"}
            </p>
          </div>

          {/* Login Target Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-xl mb-5 border border-zinc-850">
            <button
              type="button"
              onClick={() => setLoginMode("user")}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-mono tracking-wider font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                loginMode === "user"
                  ? "bg-white text-black shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              ATTENDEE
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("organizer")}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-mono tracking-wider font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                loginMode === "organizer"
                  ? "bg-emerald-500 text-black shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              ORGANIZER
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("admin")}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-mono tracking-wider font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                loginMode === "admin"
                  ? "bg-rose-600 text-white shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              ADMIN
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
              className={`w-full font-extrabold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-sans cursor-pointer ${
                loginMode === "admin"
                  ? "bg-rose-600 text-white hover:bg-rose-500"
                  : loginMode === "organizer"
                  ? "bg-emerald-500 text-black hover:bg-emerald-400"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In {loginMode === "organizer" ? "as Organizer" : loginMode === "admin" ? "as Admin" : ""}
                </>
              )}
            </button>
          </form>

          {loginMode === "user" && (
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

          <div className="mt-6 pt-6 border-t border-zinc-900 space-y-4">
            {loginMode === "user" ? (
              <p className="text-center text-zinc-500 text-sm">
                Don't have an account?{" "}
                <Link to="/register" className="text-white font-bold hover:underline">
                  Create one
                </Link>
              </p>
            ) : (
              <p className="text-center text-zinc-500 text-sm">
                Need to access standard features instead?{" "}
                <button onClick={() => setLoginMode("user")} className="text-white font-bold hover:underline">
                  Go back to Attendee Sign-In
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
