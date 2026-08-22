import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, getDocs, addDoc, serverTimestamp, where, orderBy } from "firebase/firestore";
import { Search, UserPlus, Phone, Mail, MapPin, Notebook, User, ArrowRight, AlertTriangle, ArrowLeft } from "lucide-react";
import { Donor } from "../types";

export const Donors: React.FC = () => {
  const navigate = useNavigate();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // New Donor Form States
  const [isAdding, setIsAdding] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load donors
  const loadDonors = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "donors"), orderBy("fullName", "asc"));
      const snapshot = await getDocs(q);
      const items: Donor[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Donor);
      });
      setDonors(items);
    } catch (error) {
      console.error("Error loading donors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, []);

  // Helper: Normalize phone numbers (retain only last 10 digits)
  const normalizePhoneNumber = (num: string): string => {
    const cleaned = num.replace(/\D/g, "");
    return cleaned.slice(-10);
  };

  // Add Donor Submit
  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      setFormError("નામ અને ફોન નંબર બંને જરૂરી છે.");
      return;
    }

    const normPhone = normalizePhoneNumber(phone);
    if (normPhone.length < 10) {
      setFormError("કૃપા કરીને સાચો ૧૦ આંકડાનો ફોન નંબર દાખલ કરો.");
      return;
    }

    try {
      setFormError("");
      setSubmitting(true);

      // Check if duplicate phone exists
      const dupQuery = query(
        collection(db, "donors"),
        where("normalizedPhone", "==", normPhone)
      );
      const dupSnap = await getDocs(dupQuery);

      if (!dupSnap.empty) {
        const existingDonor = dupSnap.docs[0].data() as Donor;
        setFormError(`આ ફોન નંબર પરથી દાતા '${existingDonor.fullName}' પહેલેથી હાજર છે.`);
        setSubmitting(false);
        return;
      }

      // Add to Firestore
      const newDonor = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        normalizedPhone: normPhone,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        photoUrl: "", // Optional storage link
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "donors"), newDonor);
      
      // Reset & Reload
      setFullName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setNotes("");
      setIsAdding(false);
      loadDonors();
      navigate(`/donors/${docRef.id}`);
    } catch (error: any) {
      console.error("Error creating donor:", error);
      setFormError(`દાતા સંગ્રહ કરી શકાયો નથી. ભુલ: ${error.message || error}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Donors list
  const filteredDonors = donors.filter((donor) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesName = donor.fullName.toLowerCase().includes(searchLower);
    const matchesPhone = donor.phone.includes(searchLower) || donor.normalizedPhone.includes(searchLower);
    return matchesName || matchesPhone;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">દાતાઓ (Donors CRM)</h1>
          <p className="text-gray-500 mt-1">દાતાઓની યાદી, તેમનો દાન ઇતિહાસ અને નવી નોંધણી.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setFormError("");
          }}
          className="flex items-center justify-center gap-2 bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
          {isAdding ? (
            <>
              <ArrowLeft className="h-5 w-5" />
              <span>યાદી પર પાછા જાઓ</span>
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5 text-saffron-500" />
              <span>નવા દાતા ઉમેરો</span>
            </>
          )}
        </button>
      </div>

      {isAdding ? (
        /* Create Donor Form */
        <div className="bg-white rounded-2xl border border-cream-200 shadow-md p-6 max-w-2xl mx-auto">
          <div className="border-b border-cream-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-royal-800 flex items-center gap-2">
              <UserPlus className="h-5.5 w-5.5 text-saffron-500" />
              નવા દાતાની પ્રોફાઇલ બનાવો
            </h2>
            <p className="text-sm text-gray-500 mt-1">બધી વિગતો સાચી ભરો જેથી દાન પત્રિકા બનાવવામાં મદદ મળે.</p>
          </div>

          {formError && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl flex items-start gap-2 animate-shake">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <span className="gujarati-text font-medium leading-relaxed">{formError}</span>
            </div>
          )}

          <form onSubmit={handleAddDonor} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">દાતાનું પૂરું નામ (ગુજરાતીમાં) *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="દા.ત. રમેશભાઈ મણિલાલ શાહ"
                className="w-full px-4 py-3 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">ફોન નંબર (Phone) *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="દા.ત. 9876543210"
                  className="w-full px-4 py-3 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 focus:border-transparent transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">ઈમેલ એડ્રેસ (Email - વૈકલ્પિક)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">સરનામું (Address - વૈકલ્પિક)</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="શહેર, વિસ્તાર, સોસાયટી..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">નોંધ (Internal Notes - વૈકલ્પિક)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="દાતા વિશે વધારાની વિગતો અથવા પસંદગીની પ્રવૃત્તિ..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 focus:border-transparent transition-all"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:bg-royal-800/40 disabled:cursor-not-allowed"
              >
                {submitting ? "સંગ્રહ થઈ રહ્યો છે..." : "દાતા સંગ્રહ કરો"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Donors List Search Dashboard */
        <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden flex flex-col">
          {/* Search bar wrapper */}
          <div className="p-5 border-b border-cream-200 bg-cream-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
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
              {filteredDonors.length} માંથી {filteredDonors.length} દાતાઓ પ્રદર્શિત
            </div>
          </div>

          {/* List display */}
          <div className="divide-y divide-cream-100 flex-1">
            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-800 mx-auto mb-2" />
                <p className="gujarati-text text-sm">લોડ થઈ રહ્યું છે...</p>
              </div>
            ) : filteredDonors.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="gujarati-text text-sm">કોઈ દાતા મળ્યા નથી. નવો દાતા બનાવવા માટે ઉપર 'નવા દાતા ઉમેરો' બટન દબાવો.</p>
              </div>
            ) : (
              filteredDonors.map((donor) => (
                <div
                  key={donor.id}
                  onClick={() => navigate(`/donors/${donor.id}`)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-cream-50/40 cursor-pointer transition-colors"
                >
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-royal-800 text-base md:text-lg">{donor.fullName}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {donor.phone}
                      </span>
                      {donor.email && (
                        <span className="flex items-center gap-1 font-mono">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {donor.email}
                        </span>
                      )}
                      {donor.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {donor.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-4 text-right self-end md:self-center">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">પોર્ટલ ID</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{donor.id.substring(0, 8)}...</p>
                    </div>
                    <div className="bg-royal-800/5 p-2 rounded-xl text-royal-800 group-hover:bg-royal-800 group-hover:text-white transition-colors">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
