import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { BarChart, Heart, Users, Calendar, TrendingUp, IndianRupee } from "lucide-react";
import { Donation, SevaType } from "../types";
import { format, parseISO } from "date-fns";

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [sevaStats, setSevaStats] = useState<Record<string, { count: number; amount: number; name: string }>>({});
  const [monthlyStats, setMonthlyStats] = useState<Record<string, number>>({});
  const [topDonors, setTopDonors] = useState<{ name: string; amount: number; count: number }[]>([]);
  const [totalMetrics, setTotalMetrics] = useState({ count: 0, amount: 0, avg: 0 });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        // 1. Fetch all Seva Types
        const sevaSnap = await getDocs(collection(db, "sevaTypes"));
        const sevaMap: Record<string, string> = {};
        const initialSevaStats: Record<string, { count: number; amount: number; name: string }> = {};
        sevaSnap.forEach((doc) => {
          const s = doc.data() as SevaType;
          sevaMap[doc.id] = s.nameGujarati;
          initialSevaStats[doc.id] = { count: 0, amount: 0, name: s.nameGujarati };
        });

        // 2. Fetch all Donations
        const donationsSnap = await getDocs(collection(db, "donations"));
        let totalAmt = 0;
        const donorTotals: Record<string, { amount: number; count: number }> = {};
        const monthTotals: Record<string, number> = {};

        donationsSnap.forEach((doc) => {
          const don = doc.data() as Donation;
          const amt = don.amount || 0;
          totalAmt += amt;

          // Seva Stats
          const sId = don.sevaTypeId;
          if (initialSevaStats[sId]) {
            initialSevaStats[sId].amount += amt;
            initialSevaStats[sId].count += 1;
          } else {
            // Fallback for custom or missing seva
            const sName = don.sevaNameSnapshot || "અન્ય";
            if (!initialSevaStats[sId]) {
              initialSevaStats[sId] = { count: 0, amount: 0, name: sName };
            }
            initialSevaStats[sId].amount += amt;
            initialSevaStats[sId].count += 1;
          }

          // Top Donors Grouping
          const donorName = don.donorNameSnapshot;
          if (!donorTotals[donorName]) {
            donorTotals[donorName] = { amount: 0, count: 0 };
          }
          donorTotals[donorName].amount += amt;
          donorTotals[donorName].count += 1;

          // Monthly trend (e.g. "2026-08")
          try {
            const dateObj = parseISO(don.donationDate);
            const mKey = format(dateObj, "MMM yyyy");
            monthTotals[mKey] = (monthTotals[mKey] || 0) + amt;
          } catch (e) {
            // Fallback if parsing fails
            const mKey = don.donationDate.substring(0, 7);
            monthTotals[mKey] = (monthTotals[mKey] || 0) + amt;
          }
        });

        setSevaStats(initialSevaStats);
        setMonthlyStats(monthTotals);

        // Sort and select top 5 donors
        const sortedDonors = Object.entries(donorTotals)
          .map(([name, stat]) => ({ name, amount: stat.amount, count: stat.count }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);
        setTopDonors(sortedDonors);

        // Fetch settings to include lifetime archived metrics
        const settingsSnap = await getDoc(doc(db, "settings", "org"));
        const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;
        const archivedAmt = Number(settingsData?.lifetimeArchivedAmount || 0);
        const archivedCount = Number(settingsData?.lifetimeArchivedCount || 0);

        const finalTotalCount = donationsSnap.size + archivedCount;
        const finalTotalAmount = totalAmt + archivedAmt;

        setTotalMetrics({
          count: finalTotalCount,
          amount: finalTotalAmount,
          avg: finalTotalCount > 0 ? Math.round(finalTotalAmount / finalTotalCount) : 0,
        });

      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Prepare Chart Dimensions & Data
  const monthlyDataArray = Object.entries(monthlyStats);
  const maxMonthValue = monthlyDataArray.length > 0 ? Math.max(...monthlyDataArray.map(([_, v]) => v)) : 100;

  const sevaDataArray = Object.values(sevaStats).filter((s) => s.count > 0);
  const maxSevaValue = sevaDataArray.length > 0 ? Math.max(...sevaDataArray.map((s) => s.amount)) : 100;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-800 mb-2" />
        <p className="gujarati-text text-sm">લોડ થઈ રહ્યું છે...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">દાન પૃથ્થકરણ (Analytics Dashboard)</h1>
        <p className="text-gray-500 mt-1">સેવા કાર્યોના આંકડા અને મનનીય યોગદાનનું સરવૈયું.</p>
      </div>

      {/* Highlights Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex items-center gap-4">
          <div className="bg-royal-800/10 p-4 rounded-xl text-royal-800">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">કુલ એકત્રિત રકમ</p>
            <h3 className="text-2xl font-extrabold text-royal-900 font-mono mt-1">₹{totalMetrics.amount.toLocaleString("en-IN")}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex items-center gap-4">
          <div className="bg-saffron-600/10 p-4 rounded-xl text-saffron-600">
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">કુલ જમા દાન</p>
            <h3 className="text-2xl font-extrabold text-royal-900 font-mono mt-1">{totalMetrics.count} વખત</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-700/10 p-4 rounded-xl text-emerald-700">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">સરેરાશ દાન (Average)</p>
            <h3 className="text-2xl font-extrabold text-royal-900 font-mono mt-1">₹{totalMetrics.avg.toLocaleString("en-IN")}</h3>
          </div>
        </div>
      </div>

      {/* SVG Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Monthly Trend Chart */}
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-royal-850 flex items-center gap-2 border-b border-cream-100 pb-3">
            <Calendar className="h-5 w-5 text-saffron-500" />
            માસિક દાન પ્રવાહ (Monthly Trend)
          </h2>
          
          {monthlyDataArray.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16 gujarati-text">કોઈ ટ્રેન્ડ ઉપલબ્ધ નથી.</p>
          ) : (
            <div className="pt-6">
              {/* Responsive SVG Chart */}
              <svg viewBox="0 0 400 200" className="w-full h-auto">
                {/* Grid Lines */}
                <line x1="40" y1="20" x2="380" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="40" y1="70" x2="380" y2="70" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="40" y1="120" x2="380" y2="120" stroke="#f3f4f6" strokeWidth="1" />
                <line x1="40" y1="170" x2="380" y2="170" stroke="#e5e7eb" strokeWidth="1.5" />

                {/* Bars */}
                {monthlyDataArray.map(([month, amount], idx) => {
                  const barCount = monthlyDataArray.length;
                  const spacing = 340 / barCount;
                  const x = 50 + idx * spacing;
                  const barWidth = Math.min(25, spacing - 10);
                  const barHeight = (amount / maxMonthValue) * 140;
                  const y = 170 - barHeight;

                  return (
                    <g key={idx} className="group">
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill="#0B2F64"
                        rx="4"
                        className="transition-all duration-300 hover:fill-saffron-500 cursor-pointer"
                      />
                      {/* Tooltip */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fill="#111827"
                        fontSize="8"
                        fontWeight="bold"
                        className="opacity-0 group-hover:opacity-100 transition-opacity font-mono"
                      >
                        ₹{Math.round(amount/1000)}k
                      </text>
                      {/* Axis Label */}
                      <text
                        x={x + barWidth / 2}
                        y="185"
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize="7"
                        fontWeight="semibold"
                      >
                        {month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Seva Type Breakdown Chart */}
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-royal-850 flex items-center gap-2 border-b border-cream-100 pb-3">
            <Heart className="h-5 w-5 text-saffron-500" />
            સેવા પ્રકાર મુજબ ફાળવણી (Donations by Seva)
          </h2>

          {sevaDataArray.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16 gujarati-text">કોઈ વિગતો ઉપલબ્ધ નથી.</p>
          ) : (
            <div className="space-y-4 pt-2">
              {sevaDataArray.map((seva, idx) => {
                const percentage = Math.round((seva.amount / totalMetrics.amount) * 100);
                
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>{seva.name}</span>
                      <span className="font-mono">₹{seva.amount.toLocaleString("en-IN")} ({percentage}%)</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-cream-100 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-royal-800 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Donors Row */}
      <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden max-w-2xl">
        <div className="p-6 border-b border-cream-200">
          <h2 className="text-lg font-bold text-royal-850 flex items-center gap-2">
            <Users className="h-5 w-5 text-saffron-500" />
            આદરણીય અગ્રણી દાતાઓ (Top Donors)
          </h2>
        </div>

        <div className="divide-y divide-cream-100">
          {topDonors.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="gujarati-text text-sm">દાન નો કોઈ ઇતિહાસ નથી.</p>
            </div>
          ) : (
            topDonors.map((donor, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-cream-50/20 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-saffron-500/10 text-saffron-600 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-royal-800 text-sm md:text-base">{donor.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-royal-800 font-mono text-sm md:text-base">₹{donor.amount.toLocaleString("en-IN")}/-</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{donor.count} વખત યોગદાન</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
