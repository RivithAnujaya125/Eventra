import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { Calendar, Ticket, User, LogOut, Menu, X, ShieldCheck, Wallet, Heart } from "lucide-react";
import { useState } from "react";
import EventraLogo from "./EventraLogo";

export default function Navbar() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3 group">
            <EventraLogo className="h-8" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-zinc-400 hover:text-white transition-colors">Events</Link>
            {user && (
              <>
                {role !== "admin" && role !== "organizer" && (
                  <>
                    <Link to="/my-tickets" className="text-zinc-400 hover:text-white transition-colors">My Tickets</Link>
                    <Link to="/wallet" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-pink-500" /> Wallet
                    </Link>
                    <Link to="/wishlist" className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/10" /> Wishlist
                    </Link>
                  </>
                )}
                {role === "organizer" && (
                  <Link to="/organizer" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Organizer Hub
                  </Link>
                )}
                {role === "admin" && (
                  <>
                    <Link to="/admin" className="text-primary font-medium hover:text-primary/80 transition-colors flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      Admin
                    </Link>
                    <Link to="/organizer" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      Organizer Hub
                    </Link>
                  </>
                )}
                <div className="h-6 w-[1px] bg-zinc-800 mx-2" />
                <Link to="/profile" className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-all">
                  <User className="w-5 h-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-red-400 rounded-full hover:bg-zinc-900 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
            {!user && (
              <Link
                to="/login"
                className="bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-zinc-200 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-400">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-800 px-4 py-4 space-y-4">
          <Link to="/" onClick={() => setIsOpen(false)} className="block text-zinc-400 hover:text-white">Events</Link>
          {user ? (
            <>
              {role !== "admin" && role !== "organizer" && (
                <>
                  <Link to="/my-tickets" onClick={() => setIsOpen(false)} className="block text-zinc-400 hover:text-white">My Tickets</Link>
                  <Link to="/wallet" onClick={() => setIsOpen(false)} className="block text-zinc-400 hover:text-white">My Wallet</Link>
                  <Link to="/wishlist" onClick={() => setIsOpen(false)} className="block text-zinc-400 hover:text-white">My Wishlist</Link>
                </>
              )}
              {role === "organizer" && (
                <Link to="/organizer" onClick={() => setIsOpen(false)} className="block text-emerald-400 font-medium">Organizer Hub</Link>
              )}
              {role === "admin" && (
                <>
                  <Link to="/admin" onClick={() => setIsOpen(false)} className="block text-primary">Admin Dashboard</Link>
                  <Link to="/organizer" onClick={() => setIsOpen(false)} className="block text-emerald-400 font-medium">Organizer Hub</Link>
                </>
              )}
              <Link to="/profile" onClick={() => setIsOpen(false)} className="block text-zinc-400 hover:text-white">Profile</Link>
              <button onClick={handleLogout} className="block text-red-400">Logout</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setIsOpen(false)} className="block text-white">Sign In</Link>
          )}
        </div>
      )}
    </nav>
  );
}
