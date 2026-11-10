import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, getDocs, deleteDoc, doc } from "firebase/firestore";
import { 
  Search, 
  Calendar, 
  Trash2, 
  SlidersHorizontal, 
  Download, 
  Gift, 
  X, 
  Check, 
  FileSpreadsheet,
  RotateCcw
} from "lucide-react";
import { Donation, SevaType } from "../types";
import { DEFAULT_SEVA_TYPES } from "../lib/dbSeed";

// Gujarati months list for dropdown & reports
const GUJARATI_MONTHS = [
  { value: "01", name: "જાન્યુઆરી (January)" },
  { value: "02", name: "ફેબ્રુઆરી (February)" },
  { value: "03", name: "માર્ચ (March)" },
  { value: "04", name: "એપ્રિલ (April)" },
  { value: "05", name: "મે (May)" },
  { value: "06", name: "જૂન (June)" },
  { value: "07", name: "જુલાઈ (July)" },
  { value: "08", name: "ઓગસ્ટ (August)" },
  { value: "09", name: "સપ્ટેમ્બર (September)" },
  { value: "10", name: "ઓક્ટોબર (October)" },
  { value: "11", name: "નવેમ્બર (November)" },
  { value: "12", name: "ડિસેમ્બર (December)" },
];

// Helper to get local date string YYYY-MM-DD without timezone offset glitch
const getLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Robust date normalization for any stored string
const normalizeDateStr = (d?: string): string => {
  if (!d) return "";
  const clean = String(d).split("T")[0].trim().replace(/\//g, "-");
  if (clean.includes("-")) {
    const parts = clean.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD or YYYY-M-D
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY or D-M-YYYY
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
  }
  return clean;
};

export const DonationHistory: React.FC = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [sevaTypes, setSevaTypes] = useState<SevaType[]>([]);
  const [loading, setLoading] = useState(true);

  // Current date markers
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, "0");
  const defaultMonthStr = `${currentYear}-${currentMonthNum}`;

  // Filter states
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "month" | "range">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeva, setSelectedSeva] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Year options for month dropdown (current year - 2 to current year + 1)
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  // Derived selected year and month parts
  const selYear = selectedMonth.split("-")[0] || String(currentYear);
  const selMonth = selectedMonth.split("-")[1] || currentMonthNum;

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

  // Fetch all donations with client-side sorting to avoid Firestore compound index errors
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

  // Filter logic in client-side for smooth real-time experience
  const filteredDonations = donations.filter((don) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesDonor = (don.donorNameSnapshot || "").toLowerCase().includes(searchLower);
    const matchesPhone = (don.phoneSnapshot || "").includes(searchLower);
    const matchesSeva = selectedSeva ? don.sevaTypeId === selectedSeva : true;
    const matchesOccasion = selectedOccasion ? don.occasionType === selectedOccasion : true;
    
    if (!(matchesDonor || matchesPhone) || !matchesSeva || !matchesOccasion) {
      return false;
    }

    const dDate = normalizeDateStr(don.donationDate);

    // 1. Filter by specific Month (e.g. 2026-11)
    if (dateFilterMode === "month") {
      if (!selectedMonth) return true;
      return dDate.startsWith(selectedMonth);
    }

    // 2. Filter by Custom Date Range (From - To)
    if (dateFilterMode === "range") {
      if (startDate && (!dDate || dDate < startDate)) return false;
      if (endDate && (!dDate || dDate > endDate)) return false;
      return true;
    }

    // 3. All Records
    return true;
  });

  const totalFilteredAmount = filteredDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  // Quick Date/Month Presets
  const applyDatePreset = (preset: "this-month" | "last-month" | "today" | "this-year" | "clear") => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth(); // 0-indexed

    if (preset === "this-month") {
      setDateFilterMode("month");
      setSelectedMonth(`${y}-${String(m + 1).padStart(2, "0")}`);
    } else if (preset === "last-month") {
      setDateFilterMode("month");
      const prevDate = new Date(y, m - 1, 1);
      const prevY = prevDate.getFullYear();
      const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");
      setSelectedMonth(`${prevY}-${prevM}`);
    } else if (preset === "today") {
      setDateFilterMode("range");
      const todayStr = getLocalDateStr(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "this-year") {
      setDateFilterMode("range");
      const curFY = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      setStartDate(`${curFY}-04-01`);
      setEndDate(`${curFY + 1}-03-31`);
    } else if (preset === "clear") {
      setDateFilterMode("all");
      setStartDate("");
      setEndDate("");
      setSelectedSeva("");
      setSelectedOccasion("");
      setSearchQuery("");
    }
  };

  // Export filtered donations list to UTF-8 BOM CSV for correct Gujarati display in Microsoft Excel
  const exportToCSV = () => {
    if (filteredDonations.length === 0) {
      alert("એક્સપોર્ટ કરવા માટે કોઈ દાન એન્ટ્રી મળી નથી. કૃપા કરીને ફિલ્ટર તપાસો.");
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

    const todayStr = getLocalDateStr(new Date());
    let filename = `KM-Donations-Report-All-${todayStr}.csv`;

    if (dateFilterMode === "month" && selectedMonth) {
      const [y, m] = selectedMonth.split("-");
      const mObj = GUJARATI_MONTHS.find((item) => item.value === m);
      const mLabel = mObj ? mObj.name.split(" ")[0] : m;
      filename = `KM-Donations-Report-${mLabel}-${y}.csv`;
    } else if (dateFilterMode === "range") {
      filename = `KM-Donations-Report-${startDate || "Start"}-to-${endDate || "Today"}.csv`;
    }

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

  // Helper label for active filter display
  const getActiveFilterLabel = () => {
    if (dateFilterMode === "month" && selectedMonth) {
      const [y, m] = selectedMonth.split("-");
      const mObj = GUJARATI_MONTHS.find((item) => item.value === m);
      return `${mObj ? mObj.name.split(" ")[0] : m} ${y} (આખો મહિનો)`;
    }
    if (dateFilterMode === "range") {
      if (startDate && endDate) return `${startDate} થી ${endDate}`;
      if (startDate) return `${startDate} પછી`;
      if (endDate) return `${endDate} સુધી`;
      return "કસ્ટમ તારીખ ગાળો";
    }
    return "બધા દાન રેકોર્ડ્સ (ઓલ ટાઈમ)";
  };

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-royal-800 tracking-tight">
            દાન ઇતિહાસ (Donations History)
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            બધી દાન રસીદો, મહિનો અથવા તારીખ મુજબ ફિલ્ટર કરો અને Excel રિપોર્ટ ડાઉનલોડ કરો.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportToCSV}
            disabled={filteredDonations.length === 0}
            className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-600/50 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            title="Excel ફાઇલ ડાઉનલોડ કરો"
          >
            <Download className="h-4 w-4" />
            <span>Excel ડાઉનલોડ ({filteredDonations.length})</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              showFilters || dateFilterMode !== "all" || selectedSeva || selectedOccasion
                ? "bg-royal-800 text-cream-50 border-royal-800 shadow-sm"
                : "bg-white text-royal-800 border-cream-200 hover:bg-cream-50/50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>વધુ ફિલ્ટર્સ {dateFilterMode !== "all" || selectedSeva || selectedOccasion ? "✓" : ""}</span>
          </button>
        </div>
      </div>

      {/* Primary Month & Date Quick Selector Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-cream-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Main Mode Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-cream-50 rounded-xl border border-cream-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setDateFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilterMode === "all"
                  ? "bg-royal-800 text-white shadow-2xs"
                  : "text-gray-600 hover:text-royal-800"
              }`}
            >
              🌐 બધા રેકોર્ડ
            </button>
            <button
              type="button"
              onClick={() => {
                setDateFilterMode("month");
                if (!selectedMonth) setSelectedMonth(defaultMonthStr);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                dateFilterMode === "month"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-gray-600 hover:text-royal-800"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>🗓️ મહિના મુજબ</span>
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode("range")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilterMode === "range"
                  ? "bg-royal-800 text-white shadow-2xs"
                  : "text-gray-600 hover:text-royal-800"
              }`}
            >
              📅 તારીખ ગાળો (From-To)
            </button>
          </div>

          {/* Quick Presets Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            <span className="text-gray-500 mr-1 hidden sm:inline">ઝડપી પસંદગી:</span>
            <button
              type="button"
              onClick={() => applyDatePreset("this-month")}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                dateFilterMode === "month" && selectedMonth === defaultMonthStr
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold"
                  : "bg-white text-gray-700 border-cream-200 hover:bg-cream-50"
              }`}
            >
              આ મહિનો
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("last-month")}
              className="px-2.5 py-1 rounded-lg border bg-white text-gray-700 border-cream-200 hover:bg-cream-50 transition-all"
            >
              ગત મહિનો
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("today")}
              className="px-2.5 py-1 rounded-lg border bg-white text-gray-700 border-cream-200 hover:bg-cream-50 transition-all"
            >
              આજે
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("this-year")}
              className="px-2.5 py-1 rounded-lg border bg-white text-gray-700 border-cream-200 hover:bg-cream-50 transition-all"
            >
              ચાલુ વર્ષ (FY)
            </button>
            {dateFilterMode !== "all" && (
              <button
                type="button"
                onClick={() => applyDatePreset("clear")}
                className="px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1 transition-all"
                title="ફિલ્ટર રીસેટ કરો"
              >
                <RotateCcw className="h-3 w-3" />
                <span>રીસેટ</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Controls based on selected mode */}
        {dateFilterMode === "month" && (
          <div className="pt-2 border-t border-cream-100 flex flex-wrap items-center gap-3 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
            <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <span>મહિનો પસંદ કરો:</span>
            </span>

            {/* Gujarati Month Select */}
            <select
              value={selMonth}
              onChange={(e) => setSelectedMonth(`${selYear}-${e.target.value}`)}
              className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-royal-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {GUJARATI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={selYear}
              onChange={(e) => setSelectedMonth(`${e.target.value}-${selMonth}`)}
              className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-royal-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  વર્ષ {y}
                </option>
              ))}
            </select>

            {/* Native Month picker input for easy mobile popup */}
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="px-2 py-1 bg-white border border-emerald-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              title="કૅલેન્ડરથી મહિનો પસંદ કરો"
            />

            <div className="ml-auto text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
              આખા મહિનાના કુલ: <strong>{filteredDonations.length} દાન</strong> (₹ {totalFilteredAmount.toLocaleString("en-IN")})
            </div>
          </div>
        )}

        {dateFilterMode === "range" && (
          <div className="pt-2 border-t border-cream-100 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream-50/60 p-3 rounded-xl border border-cream-200">
            <div>
              <label className="block text-[11px] font-bold text-royal-800 uppercase tracking-wider mb-1">
                તારીખથી (From Date)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-royal-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-royal-800 uppercase tracking-wider mb-1">
                તારીખ સુધી (To Date)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-cream-300 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-royal-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filter Drawer (Seva Type, Occasion, etc.) */}
      {(showFilters || selectedSeva || selectedOccasion) && (
        <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <option value="">બધી સેવાઓ (All Seva Activities)</option>
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
                <option value="">બધા પ્રસંગો (All Occasions)</option>
                {occasions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-cream-100">
            <button
              onClick={() => {
                setSelectedSeva("");
                setSelectedOccasion("");
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>સેવા/પ્રસંગ ફિલ્ટર સાફ કરો</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid table Card */}
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

        {/* Active Filter Indicators Bar */}
        <div className="px-4 py-2.5 bg-amber-50/50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-amber-900">📊 સક્રિય ગાળો:</span>
            <span className="bg-white border border-amber-300 text-amber-950 font-bold px-2.5 py-0.5 rounded-md shadow-2xs">
              {getActiveFilterLabel()}
            </span>
            {selectedSeva && (
              <span className="bg-white border border-amber-200 px-2 py-0.5 rounded-md text-[11px] text-amber-950">
                સેવા: {sevaTypes.find((s) => s.id === selectedSeva)?.nameGujarati || selectedSeva}
              </span>
            )}
            {selectedOccasion && (
              <span className="bg-white border border-amber-200 px-2 py-0.5 rounded-md text-[11px] text-amber-950">
                પ્રસંગ: {selectedOccasion}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              disabled={filteredDonations.length === 0}
              className="text-emerald-800 hover:text-emerald-900 font-extrabold text-xs flex items-center gap-1 px-2 py-1 rounded bg-emerald-100/60 hover:bg-emerald-100 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>આ રિપોર્ટ Excel માં ડાઉનલોડ કરો</span>
            </button>
            {dateFilterMode !== "all" && (
              <button
                type="button"
                onClick={() => applyDatePreset("clear")}
                className="text-amber-800 underline font-bold text-[11px] ml-2"
              >
                બધા રેકોર્ડ્સ જુઓ
              </button>
            )}
          </div>
        </div>

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
            <p className="text-xs text-gray-400 mt-1">કૃપા કરીને મહિનો અથવા તારીખ ગાળો બદલીને ફરી તપાસો.</p>
            <button
              type="button"
              onClick={() => applyDatePreset("clear")}
              className="mt-4 px-4 py-2 bg-royal-800 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              બધા દાન રેકોર્ડ જુઓ
            </button>
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
