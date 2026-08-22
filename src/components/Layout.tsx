import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { 
  Home,
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Users, 
  Bell, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  AlertTriangle
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, isConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dueReminderCount, setDueReminderCount] = useState(0);

  // Monitor active reminders for notification badge
  useEffect(() => {
    if (!isConfigured || !currentUser) return;

    // Fetch due and overdue reminders
    const remindersQuery = query(
      collection(db, "reminders"),
      where("status", "in", ["due", "overdue"])
    );

    const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
      setDueReminderCount(snapshot.size);
    }, (error) => {
      console.error("Error watching reminders count:", error);
    });

    return () => unsubscribe();
  }, [isConfigured, currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    { name: "ડેશબોર્ડ", path: "/dashboard", icon: LayoutDashboard },
    { name: "નવું દાન", path: "/donations/new", icon: PlusCircle, highlight: true },
    { name: "દાન ઇતિહાસ", path: "/donations", icon: History },
    { name: "દાતાઓ", path: "/donors", icon: Users },
    { 
      name: "રિમાઇન્ડર્સ", 
      path: "/reminders", 
      icon: Bell,
      badge: dueReminderCount > 0 ? dueReminderCount : undefined 
    },
    { name: "આંકડા", path: "/analytics", icon: BarChart3 },
    { name: "સેટિંગ્સ", path: "/settings", icon: Settings },
    { name: "મુખ્ય વેબસાઈટ", path: "/", icon: Home },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream-50 font-sans">
      {/* Configuration Warning Banner */}
      {!isConfigured && (
        <div className="bg-amber-600 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2 w-full z-50 fixed top-0">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Firebase configuration missing. Setup `.env.local` to enable login and database storage.</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <header className={`md:hidden flex items-center justify-between bg-royal-800 text-white px-4 py-3 shadow-md z-40 ${!isConfigured ? 'mt-9' : ''}`}>
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="h-9 w-9 rounded-full object-cover border border-saffron-500" onError={(e) => { (e.target as any).src = "https://placehold.co/100?text=KM"; }} />
          <div>
            <h1 className="text-base font-bold tracking-wide">કરુણા-મૈત્રી ગ્રુપ</h1>
            <p className="text-xs text-saffron-500">સુરેન્દ્રનગર</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => navigate("/")}
            className="p-2 text-cream-200 hover:text-saffron-400 transition-colors focus:outline-none"
            title="મુખ્ય વેબસાઈટ"
          >
            <Home className="h-5.5 w-5.5" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 text-cream-50 hover:text-red-400 transition-colors focus:outline-none"
            title="લૉગઆઉટ"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className={`hidden md:flex md:w-64 flex-col bg-royal-800 text-cream-50 shadow-xl z-30 shrink-0 border-r border-royal-900 ${!isConfigured ? 'pt-9' : ''}`}>
        {/* Brand Logo and Title */}
        <div className="p-6 border-b border-royal-900 flex items-center gap-3">
          <img 
            src="/logo.jpg" 
            alt="KM Group Logo" 
            className="h-12 w-12 rounded-full border-2 border-saffron-500 object-cover bg-white"
            onError={(e) => { (e.target as any).src = "https://placehold.co/100?text=KM"; }}
          />
          <div>
            <h2 className="text-lg font-bold leading-tight tracking-wide text-white">કરુણા-મૈત્રી ગ્રુપ</h2>
            <p className="text-xs text-saffron-500 font-semibold tracking-wider">સુરેન્દ્રનગર, ગુજરાત</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = item.path === "/" 
              ? location.pathname === "/" 
              : location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  item.highlight
                    ? isActive
                      ? "bg-saffron-500 text-royal-800 shadow-md font-bold"
                      : "bg-saffron-600/10 text-saffron-500 hover:bg-saffron-500 hover:text-royal-800 shadow-sm border border-saffron-500/25"
                    : isActive
                      ? "bg-royal-900 text-white border-l-4 border-saffron-500 font-bold"
                      : "text-cream-200 hover:bg-royal-900/50 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${item.highlight && !isActive ? 'text-saffron-500 group-hover:text-royal-800' : ''}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        {currentUser && (
          <div className="p-4 border-t border-royal-900 bg-royal-900/40">
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="text-xs text-saffron-500 font-medium">લૉગિન કર્મચારી</p>
                <p className="text-sm font-semibold truncate text-white">{currentUser.email}</p>
              </div>
              <button
                onClick={handleLogout}
                title="લૉગઆઉટ"
                className="p-2 text-cream-200 hover:text-red-400 hover:bg-royal-900 rounded-lg transition-all"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
        <div className="text-center pb-4 pt-2 text-[9px] text-cream-200/30 font-mono uppercase tracking-widest">
          By Harsh Gosaliya
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-royal-800 border-t border-royal-900 text-cream-200 flex items-center justify-around py-2.5 z-40 shadow-lg px-2">
        {navItems.filter(item => ["ડેશબોર્ડ", "નવું દાન", "રિમાઇન્ડર્સ", "સેટિંગ્સ"].includes(item.name)).map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1.5 py-1 px-3.5 rounded-xl transition-all relative ${
                isActive 
                  ? "text-saffron-500 font-bold"
                  : "text-cream-200/75 hover:text-white"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5.5 w-5.5 ${item.highlight ? 'text-saffron-500 animate-pulse' : ''}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-wide font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-0 overflow-y-auto pb-16 md:pb-0 ${!isConfigured ? 'pt-9 md:pt-9' : ''}`}>
        <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
