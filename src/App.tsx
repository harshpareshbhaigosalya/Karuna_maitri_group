import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { isFirebaseConfigured } from "./lib/firebase";

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
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white max-w-xl w-full p-8 rounded-3xl border border-cream-200 shadow-xl space-y-6 text-center">
          <div className="h-16 w-16 bg-saffron-550/10 text-saffron-600 rounded-full flex items-center justify-center mx-auto text-3xl">
            ⚠️
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-royal-800">Firebase configuration is missing!</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Vite requires environment variables to be baked in at compile/build time. If you deploy to Vercel, the environment variables must be defined in your Vercel project settings **before** deploying.
            </p>
          </div>

          <div className="border border-cream-100 p-5 rounded-2xl bg-cream-50/50 text-left text-xs space-y-3 font-mono text-gray-650">
            <p className="font-bold text-royal-800 border-b pb-1.5 mb-1.5">Required variables list:</p>
            <p>• VITE_FIREBASE_API_KEY</p>
            <p>• VITE_FIREBASE_AUTH_DOMAIN</p>
            <p>• VITE_FIREBASE_PROJECT_ID</p>
            <p>• VITE_FIREBASE_STORAGE_BUCKET</p>
            <p>• VITE_FIREBASE_MESSAGING_SENDER_ID</p>
            <p>• VITE_FIREBASE_APP_ID</p>
            <p>• VITE_FIREBASE_MEASUREMENT_ID</p>
          </div>

          <div className="text-left text-xs text-saffron-800 bg-saffron-500/10 border border-saffron-500/20 p-4 rounded-xl space-y-2">
            <p>💡 <strong>How to fix:</strong></p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Go to your project dashboard on Vercel.</li>
              <li>Go to <strong>Settings</strong> → <strong>Environment Variables</strong>.</li>
              <li>Add the above variables with their values from your local <code>.env.local</code>.</li>
              <li>Go to <strong>Deployments</strong>, click the three dots on your latest deployment, and select <strong>Redeploy</strong> (with "Use existing Build Cache" unchecked) to compile the variables into the JS bundle.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

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
