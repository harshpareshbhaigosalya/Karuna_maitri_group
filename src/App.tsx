import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

// Import Views
import { Home } from "./views/Home";
import { Login } from "./views/Login";
import { Dashboard } from "./views/Dashboard";
import { DonationEntry } from "./views/DonationEntry";
import { DonationHistory } from "./views/DonationHistory";
import { DonationDetail } from "./views/DonationDetail";
import { Donors } from "./views/Donors";
import { DonorProfile } from "./views/DonorProfile";
import { Reminders } from "./views/Reminders";
import { Analytics } from "./views/Analytics";
import { Settings } from "./views/Settings";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Landing Home Route */}
          <Route path="/" element={<Home />} />
          
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Main Application Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/donations/new" element={<DonationEntry />} />
                    <Route path="/donations" element={<DonationHistory />} />
                    <Route path="/donations/:id" element={<DonationDetail />} />
                    <Route path="/donors" element={<Donors />} />
                    <Route path="/donors/:id" element={<DonorProfile />} />
                    <Route path="/reminders" element={<Reminders />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                    
                    {/* Default Fallback Redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
