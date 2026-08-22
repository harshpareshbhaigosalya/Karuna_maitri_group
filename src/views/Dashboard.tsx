import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { format, startOfMonth, startOfYear } from "date-fns";
import { 
  IndianRupee, 
  Users, 
  Gift, 
  CalendarCheck, 
  PlusCircle, 
  History, 
  Bell, 
  TrendingUp, 
  ArrowRight,
  Send,
  CheckCircle,
  Clock
} from "lucide-react";
import { Donation, Reminder } from "../types";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    todayAmount: 0,
    todayCount: 0,
    monthAmount: 0,
    monthCount: 0,
    yearAmount: 0,
    yearCount: 0,
    totalDonors: 0,
    totalDonations: 0,
    totalAmount: 0,
  });

  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const monthStartStr = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const yearStartStr = format(startOfYear(new Date()), "yyyy-MM-dd");

    // Real-time listener for today's donations
    const todayQuery = query(
      collection(db, "donations"),
      where("donationDate", "==", todayStr)
    );

    const unsubscribeToday = onSnapshot(todayQuery, (snapshot) => {
      let amount = 0;
      snapshot.forEach((doc) => {
        amount += doc.data().amount || 0;
      });
      setStats((prev) => ({
        ...prev,
        todayAmount: amount,
        todayCount: snapshot.size,
      }));
    });

    // Fetch monthly, yearly, and total aggregates
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Month stats
        const monthQuery = query(
          collection(db, "donations"),
          where("donationDate", ">=", monthStartStr)
        );
        const monthSnap = await getDocs(monthQuery);
        let monthAmt = 0;
        monthSnap.forEach((doc) => {
          monthAmt += doc.data().amount || 0;
        });

        // Year stats
        const yearQuery = query(
          collection(db, "donations"),
          where("donationDate", ">=", yearStartStr)
        );
        const yearSnap = await getDocs(yearQuery);
        let yearAmt = 0;
        yearSnap.forEach((doc) => {
          yearAmt += doc.data().amount || 0;
        });

        // Cumulative Totals
        const allDonationsSnap = await getDocs(collection(db, "donations"));
        let totalAmt = 0;
        allDonationsSnap.forEach((doc) => {
          totalAmt += doc.data().amount || 0;
        });

        const allDonorsSnap = await getDocs(collection(db, "donors"));

        setStats((prev) => ({
          ...prev,
          monthAmount: monthAmt,
          monthCount: monthSnap.size,
          yearAmount: yearAmt,
          yearCount: yearSnap.size,
          totalDonors: allDonorsSnap.size,
          totalDonations: allDonationsSnap.size,
          totalAmount: totalAmt,
        }));
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Listen to recent donations (limit 5)
    const recentQuery = query(
      collection(db, "donations"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
      const items: Donation[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Donation);
      });
      setRecentDonations(items);
    });

    // Listen to due/overdue reminders for today
    const remindersQuery = query(
      collection(db, "reminders"),
      where("status", "in", ["due", "overdue"])
    );
    const unsubscribeReminders = onSnapshot(remindersQuery, (snapshot) => {
      const items: Reminder[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Reminder);
      });
      // Sort and slice in memory
      items.sort((a, b) => a.reminderDate.localeCompare(b.reminderDate));
      setActiveReminders(items.slice(0, 5));
    });

    return () => {
      unsubscribeToday();
      unsubscribeRecent();
      unsubscribeReminders();
    };
  }, []);

  const handleSendReminder = (reminder: Reminder) => {
    // Navigate directly to the reminders page and select this reminder
    navigate(`/reminders?id=${reminder.id}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">ડેશબોર્ડ (Dashboard)</h1>
        <p className="text-gray-500 mt-1">કરુણા-મૈત્રી ગ્રુપની દૈનિક સેવા પ્રવૃત્તિઓ અને દાન હિસાબની વિગતો.</p>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Stats */}
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500 tracking-wider">આજે (Today)</span>
            <div className="bg-royal-800/10 p-2.5 rounded-xl text-royal-800">
              <Gift className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-royal-800 font-mono">₹{stats.todayAmount.toLocaleString("en-IN")}</h3>
            <p className="text-sm text-gray-500 font-semibold mt-1">{stats.todayCount} દાન નોંધાયા</p>
          </div>
        </div>

        {/* This Month's Stats */}
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500 tracking-wider">આ મહિને (This Month)</span>
            <div className="bg-saffron-600/10 p-2.5 rounded-xl text-saffron-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-royal-800 font-mono">₹{stats.monthAmount.toLocaleString("en-IN")}</h3>
            <p className="text-sm text-gray-500 font-semibold mt-1">{stats.monthCount} દાન નોંધાયા</p>
          </div>
        </div>

        {/* This Year's Stats */}
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500 tracking-wider">આ વર્ષે (This Year)</span>
            <div className="bg-green-700/10 p-2.5 rounded-xl text-green-700">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-royal-800 font-mono">₹{stats.yearAmount.toLocaleString("en-IN")}</h3>
            <p className="text-sm text-gray-500 font-semibold mt-1">{stats.yearCount} દાન નોંધાયા</p>
          </div>
        </div>

        {/* Cumulative Totals */}
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-saffron-500" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500 tracking-wider">કુલ (Cumulative)</span>
            <div className="bg-amber-600/10 p-2.5 rounded-xl text-amber-600">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-royal-800 font-mono">₹{stats.totalAmount.toLocaleString("en-IN")}</h3>
            <div className="flex items-center justify-between mt-2 border-t border-cream-100 pt-2 text-xs font-bold text-gray-500">
              <span>{stats.totalDonors} દાતાઓ</span>
              <span>{stats.totalDonations} કુલ દાન</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link 
          to="/donations/new" 
          className="bg-royal-800 text-cream-50 p-6 rounded-2xl shadow-sm hover:bg-royal-900 active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center gap-3 border-b-4 border-saffron-500"
        >
          <PlusCircle className="h-8 w-8 text-saffron-500" />
          <span className="font-bold text-base tracking-wide">નવું દાન</span>
        </Link>
        <Link 
          to="/donations" 
          className="bg-white text-royal-800 p-6 rounded-2xl border border-cream-200 shadow-sm hover:bg-cream-100/50 active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center gap-3"
        >
          <History className="h-8 w-8 text-royal-800" />
          <span className="font-bold text-base tracking-wide">દાન ઇતિહાસ</span>
        </Link>
        <Link 
          to="/donors" 
          className="bg-white text-royal-800 p-6 rounded-2xl border border-cream-200 shadow-sm hover:bg-cream-100/50 active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center gap-3"
        >
          <Users className="h-8 w-8 text-royal-800" />
          <span className="font-bold text-base tracking-wide">દાતાઓ</span>
        </Link>
        <Link 
          to="/reminders" 
          className="bg-white text-royal-800 p-6 rounded-2xl border border-cream-200 shadow-sm hover:bg-cream-100/50 active:scale-[0.98] transition-all flex flex-col items-center justify-center text-center gap-3 relative"
        >
          {activeReminders.length > 0 && (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-bounce">
              {activeReminders.length}
            </span>
          )}
          <Bell className="h-8 w-8 text-royal-800" />
          <span className="font-bold text-base tracking-wide">આજના રિમાઇન્ડર્સ</span>
        </Link>
      </div>

      {/* Dual Panel Widget Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Today's Donations */}
        <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-cream-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-royal-800 flex items-center gap-2">
              <Gift className="h-5 w-5 text-saffron-500" />
              આજની દાન પ્રવૃત્તિ
            </h2>
            <Link to="/donations" className="text-xs font-bold text-royal-800 hover:text-saffron-600 flex items-center gap-1">
              બધા જુઓ <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-cream-100 flex-1">
            {recentDonations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Gift className="h-10 w-10 mx-auto mb-2 opacity-55" />
                <p className="gujarati-text text-sm">આજે કોઈ દાન નોંધાયું નથી.</p>
              </div>
            ) : (
              recentDonations.map((donation) => (
                <div 
                  key={donation.id} 
                  className="p-5 flex items-center justify-between hover:bg-cream-50/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/donations/${donation.id}`)}
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-royal-800 truncate text-sm md:text-base">{donation.donorNameSnapshot}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{donation.sevaNameSnapshot}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <p className="font-bold text-royal-800 font-mono text-sm md:text-base">₹{donation.amount.toLocaleString("en-IN")}</p>
                      {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                        <span className="bg-saffron-600/10 text-saffron-600 font-bold px-1.5 py-0.5 rounded text-[10px] mt-0.5 inline-block">
                          {donation.occasionType}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Reminders Widget */}
        <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-cream-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-royal-800 flex items-center gap-2">
              <Bell className="h-5 w-5 text-saffron-500" />
              આજના રિમાઇન્ડર્સ
            </h2>
            <Link to="/reminders" className="text-xs font-bold text-royal-800 hover:text-saffron-600 flex items-center gap-1">
              બધા જુઓ <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-cream-100 flex-1">
            {activeReminders.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-60" />
                <p className="gujarati-text text-sm">આજે કોઈ બાકી રીમાઇન્ડર નથી!</p>
              </div>
            ) : (
              activeReminders.map((reminder) => (
                <div 
                  key={reminder.id} 
                  className="p-5 flex items-center justify-between hover:bg-cream-50/50 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${reminder.status === "overdue" ? "bg-red-500" : "bg-amber-500"}`} />
                      <p className="font-bold text-royal-800 truncate text-sm md:text-base">{reminder.previousSeva} ({reminder.occasionType})</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      દાતા: <span className="font-semibold text-gray-700">{reminder.id}</span> • ગયા વર્ષે: <span className="font-mono text-royal-800">₹{reminder.previousAmount}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendReminder(reminder)}
                    className="flex items-center gap-1.5 bg-royal-800 hover:bg-royal-900 text-cream-50 text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all"
                  >
                    <Send className="h-3 w-3 text-saffron-500" />
                    <span>મોકલો</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
