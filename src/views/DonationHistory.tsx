import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Search, Calendar, Eye, Trash2, SlidersHorizontal, MessageSquare, Download, Gift, Filter, X } from "lucide-react";
import { Donation, SevaType } from "../types";
import { DEFAULT_SEVA_TYPES } from "../lib/dbSeed";

export const DonationHistory: React.FC = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [sevaTypes, setSevaTypes] = useState<SevaType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeva, setSelectedSeva] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load seva types
  useEffect(() => {
    const fetchSeva = async () => {
      try {
        const snap = await getDocs(collection(db, "sevaTypes"));
        const items: SevaType[] = [];
        snap.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as SevaType);
        });
        if (items.length > 0) {
          setSevaTypes(items);
        } else {
          setSevaTypes(DEFAULT_SEVA_TYPES as any);
        }
      } catch (err) {
        console.error("Error loading seva types in history:", err);
        setSevaTypes(DEFAULT_SEVA_TYPES as any);
      }
    };
    fetchSeva();
  }, []);

  // Fetch all donations with client-side sorting to bypass Firestore compound index errors
  const fetchDonations = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "donations"));
      const snap = await getDocs(q);
      const items: Donation[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Donation);
      });
      
      // Sort in-memory (latest donationDate and createdAt first)
      items.sort((a, b) => {
        const dateCompare = (b.donationDate || "").localeCompare(a.donationDate || "");
        if (dateCompare !== 0) return dateCompare;
        return (b.id || "").localeCompare(a.id || "");
      });
      
      setDonations(items);
    } catch (error) {
      console.error("Error loading donations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  // Delete transaction
  const handleDelete = async (id: string) => {
    if (!window.confirm("શું તમે આ દાન રેકોર્ડ કાયમી માટે કાઢી નાખવા માંગો છો?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "donations", id));
      setDonations((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Error deleting donation:", error);
      alert("કાઢી નાખવામાં ભૂલ આવી.");
    }
  };

  // Helper to strictly normalize date strings to YYYY-MM-DD
  const normalizeDateStr = (d?: string): string => {
    if (!d) return "";
    const clean = String(d).split("T")[0].trim();
    if (clean.includes("-")) {
      const parts = clean.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    }
    return clean;
  };

  // Filter logic in client-side for smooth real-time experience with strict date range checking
  const filteredDonations = donations.filter((don) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesDonor = (don.donorNameSnapshot || "").toLowerCase().includes(searchLower);
    const matchesPhone = (don.phoneSnapshot || "").includes(searchLower);
    const matchesSeva = selectedSeva ? don.sevaTypeId === selectedSeva : true;
    const matchesOccasion = selectedOccasion ? don.occasionType === selectedOccasion : true;
    
    // Strict Date Range Matching
    const dDate = normalizeDateStr(don.donationDate);
    if (startDate && (!dDate || dDate < startDate)) return false;
    if (endDate && (!dDate || dDate > endDate)) return false;

    return (matchesDonor || matchesPhone) && matchesSeva && matchesOccasion;
  });

  const totalFilteredAmount = filteredDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  // Quick date presets
  const applyDatePreset = (preset: "today" | "this-month" | "last-month" | "this-year" | "clear") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "this-month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(first);
      setEndDate(todayStr);
    } else if (preset === "last-month") {
      const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      setStartDate(firstPrev);
      setEndDate(lastPrev);
    } else if (preset === "this-year") {
      const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setStartDate(`${curYear}-04-01`);
      setEndDate(todayStr);
    } else if (preset === "clear") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Export filtered donations list to UTF-8 BOM CSV for correct Gujarati display in Microsoft Excel
  const exportToCSV = () => {
    if (filteredDonations.length === 0) {
      alert("એક્સપોર્ટ કરવા માટે કોઈ દાન એન્ટ્રી મળી નથી.");
      return;
    }

    const headers = [
      "દાન તારીખ (Date)",
      "દાતાનું નામ (Donor Name)",
      "ફોન નંબર (Phone Number)",
      "સેવા પ્રકાર (Seva Type)",
      "રકમ (Amount ₹)",
      "પ્રસંગ (Occasion)",
      "પ્રસંગ તારીખ (Occasion Date)",
      "હસ્તે (Presented By)",
      "સંદેશ (Message)"
    ];

    const cleanCsvValue = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = filteredDonations.map((don) => [
      don.donationDate || "",
      don.donorNameSnapshot || "",
      don.phoneSnapshot || "",
      don.sevaNameSnapshot || "",
      don.amount || 0,
      don.occasionType && don.occasionType !== "કોઈ પ્રસંગ નથી" ? don.occasionType : "",
      don.occasionDate || "",
      don.hasteName || "",
      don.customMessage || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(cleanCsvValue).join(","))
    ].join("\n");

    // Add UTF-8 BOM (\uFEFF) for Excel compatibility with Gujarati characters
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().split("T")[0];
    const filename = (startDate || endDate)
      ? `KM-Donations-Report-${startDate || "Start"}-to-${endDate || "Today"}.csv`
      : `KM-Donations-Report-${todayStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const occasions = [
    "જન્મદિવસ",
    "તિથિ",
    "લગ્ન વર્ષગાંઠ",
    "પુણ્યતિથિ",
    "સ્મૃતિ દિવસ",
    "સ્વર્ગવાસી",
    "વર્ષગાંઠ",
    "અન્ય"
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">દાન ઇતિહાસ (Donations History)</h1>
          <p className="text-gray-500 mt-1">બધી દાન રસીદો, તારીખ મુજબ ફિલ્ટર અને રિપોર્ટ ડાઉનલોડ કરો.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToCSV}
            disabled={filteredDonations.length === 0}
            className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-600/50 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Excel ડાઉનલોડ ({filteredDonations.length})</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              showFilters || selectedSeva || selectedOccasion || startDate || endDate
                ? "bg-royal-800 text-cream-50 border-royal-800 shadow-sm"
                : "bg-white text-royal-800 border-cream-200 hover:bg-cream-50/50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>ફિલ્ટર્સ & તારીખ {startDate || endDate ? "✓" : ""}</span>
          </button>
        </div>
      </div>

      {/* Filter drawer box */}
      {(showFilters || selectedSeva || selectedOccasion || startDate || endDate) && (
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-royal-850 uppercase tracking-wider mb-1.5">
                તારીખથી (From Date)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-royal-800"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-bold text-royal-850 uppercase tracking-wider mb-1.5">
                તારીખ સુધી (To Date)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-royal-800"
              />
            </div>

            {/* Seva Type Filter */}
            <div>
              <label className="block text-xs font-bold text-royal-850 uppercase tracking-wider mb-1.5">
                સેવા પ્રકાર (Seva Type)
              </label>
              <select
                value={selectedSeva}
                onChange={(e) => setSelectedSeva(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 bg-white"
              >
                <option value="">બધી સેવાઓ</option>
                {sevaTypes.map((s) => (
                  <option key={s.id} value={s.id}>{s.nameGujarati}</option>
                ))}
              </select>
            </div>

            {/* Occasion Filter */}
            <div>
              <label className="block text-xs font-bold text-royal-850 uppercase tracking-wider mb-1.5">
                પ્રસંગ (Occasion)
              </label>
              <select
                value={selectedOccasion}
                onChange={(e) => setSelectedOccasion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 bg-white"
              >
                <option value="">બધા પ્રસંગો</option>
                {occasions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Date Presets & Clear Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cream-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 mr-1">ઝડપી તારીખ:</span>
              <button
                type="button"
                onClick={() => applyDatePreset("today")}
                className="text-[11px] bg-cream-50 hover:bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-lg font-bold text-royal-800 transition-colors"
              >
                આજે
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("this-month")}
                className="text-[11px] bg-cream-50 hover:bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-lg font-bold text-royal-800 transition-colors"
              >
                આ મહિનો
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("last-month")}
                className="text-[11px] bg-cream-50 hover:bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-lg font-bold text-royal-800 transition-colors"
              >
                ગત મહિનો
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("this-year")}
                className="text-[11px] bg-cream-50 hover:bg-cream-100 border border-cream-200 px-2.5 py-1 rounded-lg font-bold text-royal-800 transition-colors"
              >
                ચાલુ વર્ષ (FY)
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedSeva("");
                setSelectedOccasion("");
                setSearchQuery("");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>બધા ફિલ્ટર્સ સાફ કરો</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid table */}
      <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search Input bar & Summary */}
        <div className="p-4 border-b border-cream-200 bg-cream-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="દાતાનું નામ અથવા ફોન નંબરથી શોધો..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 focus:border-transparent bg-white transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider shrink-0">
            <span className="bg-white border border-cream-200 px-3 py-1.5 rounded-lg text-royal-900 shadow-2xs">
              કુલ પરિણામ: <strong className="text-emerald-700">{filteredDonations.length}</strong> દાન
            </span>
            <span className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-900 shadow-2xs">
              સરવાળો: <strong>₹ {totalFilteredAmount.toLocaleString("en-IN")}</strong>
            </span>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(startDate || endDate || selectedSeva || selectedOccasion) && (
          <div className="px-4 py-2 bg-amber-50/40 border-b border-amber-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-amber-900">સક્રિય ફિલ્ટર:</span>
            {startDate && endDate && (
              <span className="bg-white border border-amber-200 px-2 py-0.5 rounded-md font-mono text-[11px] text-amber-950">
                📅 {startDate} થી {endDate}
              </span>
            )}
            {startDate && !endDate && (
              <span className="bg-white border border-amber-200 px-2 py-0.5 rounded-md font-mono text-[11px] text-amber-950">
                📅 {startDate} પછી
              </span>
            )}
            {!startDate && endDate && (
              <span className="bg-white border border-amber-200 px-2 py-0.5 rounded-md font-mono text-[11px] text-amber-950">
                📅 {endDate} સુધી
              </span>
            )}
            {selectedSeva && (
              <span className="bg-white border border-amber-200 px-2 py-0.5 rounded-md text-[11px] text-amber-950">
                સેવા: {sevaTypes.find(s => s.id === selectedSeva)?.nameGujarati || selectedSeva}
              </span>
            )}
            {selectedOccasion && (
              <span className="bg-white border border-amber-200 px-2 py-0.5 rounded-md text-[11px] text-amber-950">
                પ્રસંગ: {selectedOccasion}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedSeva("");
                setSelectedOccasion("");
              }}
              className="text-amber-800 underline font-bold text-[11px] ml-auto"
            >
              ફિલ્ટર હટાવો
            </button>
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-royal-800 border-t-transparent"></div>
            <p className="mt-3 text-sm font-bold text-gray-500">દાન રેકોર્ડ લોડ થઈ રહ્યા છે...</p>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-bold text-gray-600">પસંદ કરેલ તારીખ અથવા ફિલ્ટરમાં કોઈ દાન મળ્યું નથી.</p>
            <p className="text-xs text-gray-400 mt-1">કૃપા કરીને તારીખ ગાળો અથવા સર્ચ વિગત બદલીને ફરી તપાસો.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50/70 text-royal-855 text-xs uppercase font-extrabold tracking-wider">
                  <th className="py-3 px-4">તારીખ</th>
                  <th className="py-3 px-4">દાતાનું નામ</th>
                  <th className="py-3 px-4">ફોન નંબર</th>
                  <th className="py-3 px-4">સેવા પ્રવૃત્તિ</th>
                  <th className="py-3 px-4">દાનની રકમ</th>
                  <th className="py-3 px-4">પ્રસંગ વિગત</th>
                  <th className="py-3 px-4 text-center">સન્માન પત્ર</th>
                  <th className="py-3 px-4 text-right">કાર્યવાહી</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filteredDonations.map((don) => (
                  <tr key={don.id} className="hover:bg-cream-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-royal-900">
                      {don.donationDate}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-royal-950">
                      {don.donorNameSnapshot}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                      {don.phoneSnapshot}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-royal-800">
                      <span className="bg-royal-50 border border-royal-200 px-2 py-0.5 rounded-md">
                        {don.sevaNameSnapshot}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono text-emerald-700 text-sm">
                      ₹ {Number(don.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {don.occasionType && don.occasionType !== "કોઈ પ્રસંગ નથી" ? (
                        <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          {don.occasionType}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        to={`/donations/${don.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-saffron-50 hover:bg-saffron-100 text-royal-800 border border-saffron-300 rounded-xl text-xs font-bold transition-all shadow-2xs hover:scale-105"
                      >
                        <Gift className="h-3.5 w-3.5 text-saffron-600" />
                        <span>કાર્ડ જુઓ</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(don.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="દાન એન્ટ્રી કાઢી નાખો"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
