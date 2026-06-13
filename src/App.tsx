/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { db } from "./firebase";
import { doc, getDocFromServer } from "firebase/firestore";
import Navbar from "./components/Navbar";
import SplashScreen from "./components/SplashScreen";
import HomePage from "./pages/HomePage";
import EventDetailPage from "./pages/EventDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import TicketPage from "./pages/TicketPage";
import AdminDashboard from "./pages/AdminDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import ProfilePage from "./pages/ProfilePage";
import WalletPage from "./pages/WalletPage";
import WishlistPage from "./pages/WishlistPage";
import AIAssistant from "./components/AIAssistant";

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error: any) {
        // Log connection info softly since sandbox networks can block direct ports
        console.log("Firebase status checked:", error?.message || "Success");
      }
    };
    testConnection();
  }, []);

  return (
    <AuthProvider>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "#1a1a1a",
            border: "1px solid #333",
            color: "#fff",
          },
        }}
      />
      
      <SplashScreen onComplete={() => setSplashDone(true)} />

      <div
        className="transition-opacity duration-700"
        style={{
          opacity: splashDone ? 1 : 0,
          pointerEvents: splashDone ? "auto" : "none",
        }}
      >
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/my-tickets"
              element={
                <ProtectedRoute>
                  <MyTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <WalletPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <WishlistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:regId"
              element={
                <ProtectedRoute>
                  <TicketPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer"
              element={
                <ProtectedRoute allowedRoles={["organizer", "admin"]}>
                  <OrganizerDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
          <AIAssistant />
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

