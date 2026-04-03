import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Watchlists from "@/pages/Watchlists";
import Alerts from "@/pages/Alerts";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import ProtectedRoute from "@/components/ProtectedRoute";
import "./App.css";

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {!isAuthenticated && <AuthModal onSuccess={() => {}} />}
      {isAuthenticated && (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/watchlists"
              element={
                <ProtectedRoute>
                  <Watchlists />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <div className="text-foreground text-2xl font-bold">
                  Settings — Coming Soon
                </div>
              }
            />
          </Routes>
        </Layout>
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <WatchlistProvider>
        <Router>
          <AppContent />
        </Router>
      </WatchlistProvider>
    </AuthProvider>
  );
}

export default App;
