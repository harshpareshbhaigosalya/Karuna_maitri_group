import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, getDocs, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Bell, Send, CheckCircle2, XCircle, Clock, Search, Sparkles, Phone, MessageSquare, AlertTriangle } from "lucide-react";
import { Reminder, Donor, OrganizationSettings } from "../types";
import { format, differenceInDays, parseISO, addDays } from "date-fns";

export const Reminders: React.FC = () => {
  const [searchParams] = useSearchParams();
  const highlightedReminderId = searchParams.get("id");

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [donors, setDonors] = useState<Record<string, Donor>>({});
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Snooze Modal States
  const [snoozeTarget, setSnoozeTarget] = useState<Reminder | null>(null);
  const [snoozeDays, setSnoozeDays] = useState("3");

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Settings
      const settingsSnap = await getDoc(doc(db, "settings", "org"));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as OrganizationSettings);
      }

      // 2. Donors mapping
      const donorsSnap = await getDocs(collection(db, "donors"));
      const donorMap: Record<string, Donor> = {};
      donorsSnap.forEach((doc) => {
        donorMap[doc.id] = { id: doc.id, ...doc.data() } as Donor;
      });
      setDonors(donorMap);

      // 3. Reminders
      const remindersSnap = await getDocs(collection(db, "reminders"));
      const items: Reminder[] = [];
      remindersSnap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Reminder);
      });
      setReminders(items);
    } catch (error) {
      console.error("Error loading reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute reminder status dynamically based on current date
  const getDynamicStatus = (rem: Reminder): Reminder["status"] => {
    if (rem.status === "completed" || rem.status === "dismissed") {
      return rem.status;
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    
    // If snoozed and snooze date is in the future
    if (rem.snoozedUntil && rem.snoozedUntil > todayStr) {
      return "snoozed";
    }

    try {
      const today = new Date();
      const remDate = parseISO(rem.reminderDate);
      const diff = differenceInDays(remDate, today);

      const windowDays = settings?.reminderWindowDays ?? 3;

      if (diff < -windowDays) {
        return "overdue";
      } else if (diff >= -windowDays && diff <= windowDays) {
        return "due";
      } else {
        return "upcoming";
      }
    } catch (e) {
      return rem.status;
    }
  };

  // Actions
  const handleDismiss = async (remId: string) => {
    try {
      await updateDoc(doc(db, "reminders", remId), {
        status: "dismissed",
        dismissedAt: serverTimestamp(),
      });
      setReminders((prev) =>
        prev.map((r) => (r.id === remId ? { ...r, status: "dismissed" } : r))
      );
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    }
  };

  const handleSnoozeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snoozeTarget) return;

    try {
      const snoozeDateStr = format(addDays(new Date(), Number(snoozeDays)), "yyyy-MM-dd");
      await updateDoc(doc(db, "reminders", snoozeTarget.id), {
        status: "snoozed",
        snoozedUntil: snoozeDateStr,
      });

      setReminders((prev) =>
        prev.map((r) =>
          r.id === snoozeTarget.id
            ? { ...r, status: "snoozed", snoozedUntil: snoozeDateStr }
            : r
        )
      );
      setSnoozeTarget(null);
    } catch (error) {
      console.error("Error snoozing reminder:", error);
    }
  };

  const handleSendReminder = (rem: Reminder) => {
    const donor = donors[rem.donorId];
    if (!donor) return;

    const donorName = donor.fullName;
    const cleanPhone = donor.phone.replace(/\D/g, "");
    const whatsappPhone = cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone;

    // 1. Personalize wishes / blessings based on occasion type
    let wishText = "";
    if (rem.occasionType === "જન્મદિવસ") {
      wishText = `આપના મંગલ જન્મદિવસ નિમિત્તે કરુણા-મૈત્રી ગ્રુપ તરફથી આપને જન્મદિવસની ખૂબ-ખૂબ શુભકામનાઓ! 🎂💐 પ્રભુ આપને નિરોગી, દીર્ઘ અને સદા સુખમય આયુષ્ય આપે તેવી મંગલ કામના.`;
    } else if (rem.occasionType === "લગ્ન વર્ષગાંઠ") {
      wishText = `આપની લગ્ન વર્ષગાંઠ નિમિત્તે આપ બંને દંપતીને લગ્ન જીવનની અનેક અનેક હાર્દિક શુભકામનાઓ! 🤵👰 પરમેશ્વર આપની જોડીને સદા હર્ષિત અને દીર્ઘાયુ રાખે તેવી પ્રાર્થના.`;
    } else if (rem.occasionType === "પુણ્યતિથિ" || rem.occasionType === "સ્મૃતિ દિવસ") {
      wishText = `આપના પરિવારના પરમ પૂજ્ય દિવંગત સદસ્યની પવિત્ર સ્મૃતિ/પુણ્યતિથિ નિમિત્તે અબોલ જીવદયા સેવા કાર્યમાં સહયોગ આપવા બદલ સાદર વંદન. આપના તરફથી અબોલ જીવો માટેની આ સેવા પરમ આત્માને સાચી ભાવાંજલિ છે. 🙏🕯️`;
    } else if (rem.occasionType === "તિથિ") {
      wishText = `આપના પરિવારની પવિત્ર ઘર-સંસ્કારની તિથિના મંગલ અવસરે જીવદયા અને અનુકંપા કાર્યમાં આપના ઉદાર સહયોગ બદલ સાદર વંદન. 🙏`;
    } else {
      wishText = `આપના આ શુભ પ્રસંગ નિમિત્તે આપને અને આપના સમગ્ર પરિવારને સુખ, શાંતિ, સંતોષ અને સમૃદ્ધિ મળે તેવી હાર્દિક શુભેચ્છાઓ! 🌟`;
    }

    // 2. Format message incorporating past details
    const msg = `જય જિનેન્દ્ર,
આદરણીય દાતાશ્રી ${donorName},

${wishText}

ગત વર્ષે તા. ${rem.reminderDate.substring(5)} (MM-DD) ના રોજ આપના આ પાવન પ્રસંગ નિમિત્તે આપના દ્વારા *${rem.previousSeva}* પ્રવૃત્તિ માટે *₹${rem.previousAmount.toLocaleString("en-IN")}/-* નું ઉદાર દાન કરી જીવદયાને પ્રોત્સાહન આપવામાં આવ્યું હતું.

આ વર્ષે પણ આ શુભ અવસરે આ અબોલ, મૂંગા પશુ-પક્ષીઓ માટે આપનો સેવા સહયોગ ચાલુ રાખવા નમ્ર વિનંતી છે. આપનું દાન આ મૂંગા જીવો માટે જીવનદાન સમાન છે. આપનો હૃદયપૂર્વક આભાર.

*કરુણા-મૈત્રી ગ્રુપ, સુરેન્દ્રનગર*`;

    const encoded = encodeURIComponent(msg);
    const url = `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encoded}`;
    window.open(url, "_blank");
  };

  // Filter, classify, and deduplicate reminders across multiple years
  const processedReminders = reminders.map((r) => ({
    ...r,
    computedStatus: getDynamicStatus(r),
  }));

  // Group active reminders to show only ONE active reminder per donor+occasion (prevent duplicate years all showing up)
  const activeKeys = new Set<string>();
  const deduplicatedReminders: typeof processedReminders = [];

  // Sort reminders by status priority (due > overdue > snoozed > upcoming) and year asc
  const sortedReminders = [...processedReminders].sort((a, b) => {
    const statusPriority = { due: 1, overdue: 2, snoozed: 3, upcoming: 4, completed: 5, dismissed: 5 };
    const aP = statusPriority[a.computedStatus] || 9;
    const bP = statusPriority[b.computedStatus] || 9;
    if (aP !== bP) return aP - bP;
    return a.targetYear - b.targetYear; // nearest year first
  });

  for (const rem of sortedReminders) {
    if (["due", "overdue", "snoozed", "upcoming"].includes(rem.computedStatus)) {
      const key = `${rem.donorId}-${rem.occasionType}`;
      if (!activeKeys.has(key)) {
        activeKeys.add(key);
        deduplicatedReminders.push(rem);
      }
    } else {
      // Completed or Dismissed status reminders are fine to show
      deduplicatedReminders.push(rem);
    }
  }

  // Filter list based on search query
  const filteredReminders = deduplicatedReminders.filter((rem) => {
    const donor = donors[rem.donorId];
    if (!donor) return false;

    const queryLower = searchQuery.toLowerCase();
    const matchesDonor = donor.fullName.toLowerCase().includes(queryLower);
    const matchesPhone = donor.phone.includes(queryLower);
    const matchesSeva = rem.previousSeva.toLowerCase().includes(queryLower);
    return matchesDonor || matchesPhone || matchesSeva;
  });

  // Group reminders by computed status for rendering lists
  const due = filteredReminders.filter((r) => r.computedStatus === "due");
  const overdue = filteredReminders.filter((r) => r.computedStatus === "overdue");
  const upcoming = filteredReminders.filter((r) => r.computedStatus === "upcoming");
  const completed = filteredReminders.filter((r) => r.computedStatus === "completed");
  const snoozed = filteredReminders.filter((r) => r.computedStatus === "snoozed");

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">રિમાઇન્ડર ડેસ્ક (Occasion Reminders)</h1>
        <p className="text-gray-500 mt-1">આવર્તક પ્રસંગો અને વાર્ષિક દાતા સંપર્ક સૂચિ.</p>
      </div>

      {/* Search Input bar */}
      <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="દાતાનું નામ અથવા સેવા પ્રકારથી શોધો..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-royal-800 bg-cream-50/20"
          />
        </div>
        <div className="text-xs text-gray-500 font-bold bg-cream-50 border border-cream-100 px-3 py-1.5 rounded-lg shrink-0 font-sans">
          કુલ સક્રિય રિમાઇન્ડર્સ: {due.length + overdue.length}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-800 mx-auto mb-2" />
          <p className="gujarati-text text-sm">લોડ થઈ રહ્યું છે...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* OVERDUE REMINDERS */}
          {overdue.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-extrabold text-red-650 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-650 animate-ping" />
                સમય વીતી ગયો હોય તેવા રિમાઇન્ડર્સ ({overdue.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {overdue.map((rem) => (
                  <ReminderCard 
                    key={rem.id} 
                    rem={rem} 
                    donor={donors[rem.donorId]} 
                    onSend={handleSendReminder} 
                    onSnooze={setSnoozeTarget} 
                    onDismiss={handleDismiss} 
                    isHighlighted={highlightedReminderId === rem.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* DUE REMINDERS */}
          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-amber-600 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              આજના / ચાલુ અઠવાડિયાના રિમાઇન્ડર્સ ({due.length})
            </h2>
            {due.length === 0 ? (
              <div className="bg-white border border-cream-200 rounded-2xl p-6 text-center text-gray-400 text-sm">
                આજે કોઈ બાકી ચાલુ રિમાઇન્ડર નથી.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {due.map((rem) => (
                  <ReminderCard 
                    key={rem.id} 
                    rem={rem} 
                    donor={donors[rem.donorId]} 
                    onSend={handleSendReminder} 
                    onSnooze={setSnoozeTarget} 
                    onDismiss={handleDismiss}
                    isHighlighted={highlightedReminderId === rem.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* UPCOMING REMINDERS */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-bold text-royal-800 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-royal-800/30" />
                આગામી સમયના રિમાઇન્ડર્સ ({upcoming.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((rem) => (
                  <ReminderCard 
                    key={rem.id} 
                    rem={rem} 
                    donor={donors[rem.donorId]} 
                    onSend={handleSendReminder} 
                    onSnooze={setSnoozeTarget} 
                    onDismiss={handleDismiss}
                    isHighlighted={highlightedReminderId === rem.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SNOOZED / COMPLETED ROW */}
          {(completed.length > 0 || snoozed.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Completed Reminders */}
              {completed.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-650" />
                    આ વર્ષે પૂર્ણ થયેલા ({completed.length})
                  </h2>
                  <div className="bg-white rounded-2xl border border-cream-200 divide-y divide-cream-100 max-h-80 overflow-y-auto">
                    {completed.map((rem) => (
                      <div key={rem.id} className="p-4 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-600">{donors[rem.donorId]?.fullName}</p>
                          <p className="text-gray-400 mt-0.5">{rem.previousSeva} • {rem.occasionType}</p>
                        </div>
                        <span className="bg-emerald-600/10 text-emerald-650 font-bold px-2 py-0.5 rounded-full">₹{rem.previousAmount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Snoozed Reminders */}
              {snoozed.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4.5 w-4.5 text-blue-500" />
                    મોકૂફ રાખેલા (Snoozed) ({snoozed.length})
                  </h2>
                  <div className="bg-white rounded-2xl border border-cream-200 divide-y divide-cream-100 max-h-80 overflow-y-auto">
                    {snoozed.map((rem) => (
                      <div key={rem.id} className="p-4 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-600">{donors[rem.donorId]?.fullName}</p>
                          <p className="text-gray-400 mt-0.5">{rem.previousSeva} • {rem.occasionType}</p>
                        </div>
                        <span className="text-blue-500 font-semibold font-mono">સૂઝ્ડ: {rem.snoozedUntil}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* SNOOZE MODAL POPUP */}
      {snoozeTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-55">
          <div className="bg-white max-w-sm w-full p-6 rounded-2xl shadow-xl border border-cream-200 space-y-4">
            <h3 className="text-lg font-bold text-royal-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-saffron-500" />
              રિમાઇન્ડર મોકૂફ રાખો
            </h3>
            <p className="text-xs text-gray-500">
              આ દાતાનો સંપર્ક થોડા દિવસ બાદ કરવા માટે રિમાઇન્ડર મોકૂફ રાખો.
            </p>

            <form onSubmit={handleSnoozeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-royal-855 uppercase tracking-wider mb-2">કેટલા દિવસ માટે?</label>
                <select
                  value={snoozeDays}
                  onChange={(e) => setSnoozeDays(e.target.value)}
                  className="w-full p-2 rounded-lg border border-cream-200 text-sm"
                >
                  <option value="1">૧ દિવસ</option>
                  <option value="3">૩ દિવસ</option>
                  <option value="7">૧ અઠવાડિયું</option>
                  <option value="15">૧૫ દિવસ</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSnoozeTarget(null)}
                  className="px-4 py-2 border border-cream-200 rounded-lg text-gray-500"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-royal-800 hover:bg-royal-900 text-cream-50 rounded-lg shadow-sm"
                >
                  મોકૂફ કરો
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* INNER COMPONENT FOR REMINDER CARD */
const ReminderCard: React.FC<{
  rem: Reminder;
  donor?: Donor;
  onSend: (rem: Reminder) => void;
  onSnooze: (rem: Reminder) => void;
  onDismiss: (id: string) => void;
  isHighlighted: boolean;
}> = ({ rem, donor, onSend, onSnooze, onDismiss, isHighlighted }) => {
  if (!donor) return null;

  return (
    <div 
      className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all hover:shadow-md ${
        isHighlighted 
          ? "border-saffron-500 ring-2 ring-saffron-500/20 shadow-md bg-saffron-500/5" 
          : rem.computedStatus === "overdue"
            ? "border-red-200 bg-red-50/10"
            : "border-cream-200"
      }`}
    >
      {isHighlighted && (
        <span className="absolute top-0 right-0 bg-saffron-500 text-royal-800 text-[9px] font-black px-2 py-0.5 rounded-bl uppercase">
          નવું સિલેક્શન
        </span>
      )}

      {/* Main Info */}
      <div className="space-y-3 font-sans">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-extrabold text-royal-850 text-base md:text-lg">{donor.fullName}</h3>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 font-sans">
              <Phone className="h-3 w-3 text-gray-400" /> {donor.phone}
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-gray-400 bg-cream-100 px-2 py-0.5 rounded">
            {rem.occasionDate}
          </span>
        </div>

        {/* Previous Donation Details */}
        <div className="border border-cream-200/60 rounded-xl p-3 bg-cream-50/50 text-xs text-gray-600 space-y-1">
          <p><strong>ગયા વર્ષનું સેવા કાર્ય:</strong> {rem.previousSeva}</p>
          <p><strong>દાન પ્રસંગ:</strong> {rem.occasionType}</p>
          <p><strong>ગયા વર્ષની રકમ:</strong> <span className="font-bold text-royal-800 font-mono">₹{rem.previousAmount.toLocaleString("en-IN")}/-</span></p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 mt-5 border-t border-cream-100 pt-4 font-sans">
        <button
          onClick={() => onSend(rem)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold text-xs py-2.5 px-3 rounded-xl shadow-sm transition-all"
        >
          <Send className="h-3.5 w-3.5 text-saffron-500" />
          <span>WhatsApp મોકલો</span>
        </button>

        <button
          onClick={() => onSnooze(rem)}
          className="p-2 border border-cream-200 text-gray-500 hover:bg-cream-50 hover:text-royal-800 rounded-xl transition-all"
          title="મોકૂફ રાખો (Snooze)"
        >
          <Clock className="h-4.5 w-4.5" />
        </button>

        <button
          onClick={() => onDismiss(rem.id)}
          className="p-2 border border-cream-200 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
          title="રદ કરો (Dismiss)"
        >
          <XCircle className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
};
