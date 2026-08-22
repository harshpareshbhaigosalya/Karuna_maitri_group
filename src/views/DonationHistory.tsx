import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Search, Calendar, Eye, Trash2, SlidersHorizontal, MessageSquare, Download, Gift } from "lucide-react";
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
        const dateCompare = b.donationDate.localeCompare(a.donationDate);
        if (dateCompare !== 0) return dateCompare;
        // Fallback to ID or timestamp
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
    const searchLower = searchQuery.toLowerCase();
    const matchesDonor = don.donorNameSnapshot.toLowerCase().includes(searchLower);
    const matchesPhone = don.phoneSnapshot.includes(searchLower);
    const matchesSeva = selectedSeva ? don.sevaTypeId === selectedSeva : true;
    const matchesOccasion = selectedOccasion ? don.occasionType === selectedOccasion : true;
    return (matchesDonor || matchesPhone) && matchesSeva && matchesOccasion;
  });

  const occasions = [
    "જન્મદિવસ",
    "તિથિ",
    "લગ્ન વર્ષગાંઠ",
    "પુણ્યતિથિ",
    "સ્મૃતિ દિવસ",
    "વર્ષગાંઠ",
    "અન્ય"
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">દાન ઇતિહાસ (Donations History)</h1>
          <p className="text-gray-500 mt-1">બધી દાન રસીદો અને શેરિંગ વિગતોનું સંચાલન કરો.</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            showFilters || selectedSeva || selectedOccasion
              ? "bg-royal-800 text-cream-50 border-royal-800"
              : "bg-white text-royal-800 border-cream-200 hover:bg-cream-50/50"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>ફિલ્ટર્સ (Filters)</span>
        </button>
      </div>

      {/* Filter drawer box */}
      {(showFilters || selectedSeva || selectedOccasion) && (
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
          {/* Seva Type Filter */}
          <div>
            <label className="block text-xs font-bold text-royal-850 uppercase tracking-wider mb-2">સેવા પ્રકાર (Seva Type)</label>
            <select
              value={selectedSeva}
              onChange={(e) => setSelectedSeva(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-1 focus:ring-royal-800"
            >
              <option value="">બધી સેવાઓ</option>
              {sevaTypes.map((s) => (
                <option key={s.id} value={s.id}>{s.nameGujarati}</option>
              ))}
            </select>
          </div>

          {/* Occasion Filter */}
          <div>
            <label className="block text-xs font-bold text-royal-850 uppercase tracking-wider mb-2">પ્રસંગ (Occasion)</label>
            <select
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-1 focus:ring-royal-800"
            >
              <option value="">બધા પ્રસંગો</option>
              {occasions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              onClick={() => {
                setSelectedSeva("");
                setSelectedOccasion("");
                setSearchQuery("");
              }}
              className="w-full bg-cream-100 hover:bg-cream-200 text-royal-800 text-xs font-bold py-2.5 px-4 rounded-xl border border-cream-200 transition-colors"
            >
              ફિલ્ટર્સ સાફ કરો (Clear)
            </button>
          </div>
        </div>
      )}

      {/* Main Grid table */}
      <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search Input bar */}
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
          <div className="text-xs text-gray-500 font-bold tracking-wider shrink-0 bg-white border border-cream-200 px-3 py-1.5 rounded-lg">
            {filteredDonations.length} દાન મળ્યા
          </div>
        </div>

        {/* Content list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-cream-100/50 border-b border-cream-200 text-xs font-bold text-royal-800 uppercase tracking-wider">
                <th className="p-4 text-center">તારીખ</th>
                <th className="p-4">દાતા અને ફોન</th>
                <th className="p-4">સેવા પ્રકાર</th>
                <th className="p-4 text-right">રકમ</th>
                <th className="p-4">પ્રસંગ</th>
                <th className="p-4 text-center">ક્રિયાઓ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-800 mx-auto mb-2" />
                    <p className="gujarati-text text-sm">લોડ થઈ રહ્યું છે...</p>
                  </td>
                </tr>
              ) : filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    <Gift className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="gujarati-text text-sm">કોઈ દાન રેકોર્ડ મળ્યો નથી.</p>
                  </td>
                </tr>
              ) : (
                filteredDonations.map((don) => (
                  <tr key={don.id} className="hover:bg-cream-50/30 transition-colors">
                    <td className="p-4 text-center font-mono whitespace-nowrap text-xs text-gray-500">
                      {don.donationDate}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-royal-800">{don.donorNameSnapshot}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{don.phoneSnapshot}</p>
                    </td>
                    <td className="p-4 font-medium text-gray-600">
                      {don.sevaNameSnapshot}
                    </td>
                    <td className="p-4 text-right font-bold text-royal-800 font-mono">
                      ₹{don.amount.toLocaleString("en-IN")}/-
                    </td>
                    <td className="p-4">
                      {don.occasionType && don.occasionType !== "કોઈ પ્રસંગ નથી" ? (
                        <span className="bg-saffron-600/10 text-saffron-600 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          {don.occasionType}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/donations/${don.id}`}
                          className="p-1.5 text-gray-400 hover:text-royal-800 hover:bg-cream-100 rounded-lg transition-all"
                          title="જુઓ"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(don.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="કાઢી નાખો"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
