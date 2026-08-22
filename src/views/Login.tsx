import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { KeyRound, AlertCircle, Eye, EyeOff } from "lucide-react";

export const Login: React.FC = () => {
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("કૃપા કરીને પાસવર્ડ દાખલ કરો.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await login(password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "ખોટો પાસવર્ડ. કૃપા કરીને ફરી પ્રયાસ કરો.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-cream-200 overflow-hidden flex flex-col">
        {/* Banner Section */}
        <div className="bg-royal-800 p-8 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-saffron-500" />
          <img
            src="/logo.jpg"
            alt="Logo"
            className="h-20 w-20 rounded-full mx-auto border-2 border-saffron-500 shadow-md object-cover bg-white mb-3"
            onError={(e) => { (e.target as any).src = "https://placehold.co/150?text=KM+Group"; }}
          />
          <h1 className="text-2xl font-bold tracking-wide">કરુણા-મૈત્રી ગ્રુપ</h1>
          <p className="text-saffron-500 text-sm font-medium mt-1">દાન વ્યવસ્થાપન અને દાતા CRM પોર્ટલ</p>
          <p className="text-xs text-cream-200/80 mt-0.5 font-bold">સુરેન્દ્રનગર, ગુજરાત</p>
        </div>

        {/* Login Form */}
        <div className="p-8 flex-1">
          <h2 className="text-lg font-bold text-royal-900 mb-6 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-saffron-500" />
            કર્મચારી પ્રવેશ (Staff Access)
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2.5 animate-shake">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <span className="gujarati-text leading-relaxed font-bold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">એક્સેસ પાસવર્ડ (Password) *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="પાસવર્ડ દાખલ કરો..."
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-royal-800 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-royal-800 text-cream-50 font-bold py-3.5 px-4 rounded-xl shadow-md hover:bg-royal-900 transition-all active:scale-[0.98] disabled:bg-royal-800/40 disabled:cursor-not-allowed disabled:transform-none mt-2"
            >
              {loading ? "પ્રવેશ થઈ રહ્યો છે..." : "પોર્ટલ માં પ્રવેશ કરો"}
            </button>
          </form>
        </div>

        <div className="bg-cream-100/50 p-6 border-t border-cream-200 text-xs text-center text-gray-500 font-semibold leading-relaxed">
          આ પોર્ટલ ફક્ત કરુણા-મૈત્રી ગ્રુપના અધિકૃત સભ્યો માટે છે.
        </div>
      </div>
    </div>
  );
};
