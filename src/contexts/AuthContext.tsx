import React, { createContext, useContext, useEffect, useState } from "react";

interface AuthContextType {
  currentUser: { uid: string; role: string; email?: string } | null;
  loading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<{ uid: string; role: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (password: string) => {
    if (password === "karuna@1234") {
      const user = { uid: "admin", role: "admin", email: "admin@karunamaitri.org" };
      setCurrentUser(user);
      localStorage.setItem("km_auth_session", "authenticated");
      return true;
    } else {
      throw new Error("ખોટો પાસવર્ડ. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem("km_auth_session");
  };

  useEffect(() => {
    // Check if session exists in localStorage
    const session = localStorage.getItem("km_auth_session");
    if (session === "authenticated") {
      setCurrentUser({ uid: "admin", role: "admin", email: "admin@karunamaitri.org" });
    }
    setLoading(false);
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    isConfigured: true, // Always configured as we don't strictly require firebase storage/auth
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
