import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText, 
  ArrowLeft, 
  TrendingUp, 
  Heart,
  CalendarDays,
  CreditCard,
  Send,
  Eye,
  Trash2
} from "lucide-react";
import { Donor, Donation, SevaType } from "../types";

export const DonorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [donor, setDonor] = useState<Donor | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [sevaTypes, setSevaTypes] = useState<Record<string, SevaType>>({});
  const [loading, setLoading] = useState(true);

  // Statistics
  const [stats, setStats] = useState({
    totalAmount: 0,
    count: 0,
    firstDate: "",
    lastDate: "",
    sevaBreakdown: [] as { name: string; count: number }[],
  });

  useEffect(() => {
    if (!id) return;

    const fetchDonorData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Donor Details
        const donorSnap = await getDoc(doc(db, "donors", id));
        if (!donorSnap.exists()) {
          console.error("Donor not found");
          setDonor(null);
          setLoading(false);
          return;
        }
        const donorData = { id: donorSnap.id, ...donorSnap.data() } as Donor;
        setDonor(donorData);

        // 2. Fetch all seva types to match breakdown names
        const sevaSnap = await getDocs(collection(db, "sevaTypes"));
        const sevaMap: Record<string, SevaType> = {};
        sevaSnap.forEach((doc) => {
          sevaMap[doc.id] = { id: doc.id, ...doc.data() } as SevaType;
        });
        setSevaTypes(sevaMap);

        // 3. Fetch Donor Donations (Simple query to bypass composite index)
        const donationsQuery = query(
          collection(db, "donations"),
          where("donorId", "==", id)
        );
        const donationsSnap = await getDocs(donationsQuery);
        const donationItems: Donation[] = [];
        
        let totalAmt = 0;
        const sevaCounts: Record<string, number> = {};

        donationsSnap.forEach((doc) => {
          const don = { id: doc.id, ...doc.data() } as Donation;
          donationItems.push(don);
          totalAmt += don.amount || 0;

          // Count by Seva
          const sName = don.sevaNameSnapshot || sevaMap[don.sevaTypeId]?.nameGujarati || "અન્ય";
          sevaCounts[sName] = (sevaCounts[sName] || 0) + 1;
        });

        // Sort client-side (latest first)
        donationItems.sort((a, b) => b.donationDate.localeCompare(a.donationDate));
        setDonations(donationItems);

        // Format Dates
        let first = "";
        let last = "";
        if (donationItems.length > 0) {
          last = donationItems[0].donationDate;
          first = donationItems[donationItems.length - 1].donationDate;
        }

        // Seva breakdown array sorted by counts
        const breakdown = Object.entries(sevaCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setStats({
          totalAmount: totalAmt,
          count: donationItems.length,
          firstDate: first,
          lastDate: last,
          sevaBreakdown: breakdown,
        });

      } catch (error) {
        console.error("Error loading donor profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonorData();
  }, [id]);

  // Handle Delete Donation
  const handleDeleteDonation = async (donationId: string) => {
    if (!window.confirm("શું તમે ખરેખર આ દાનની વિગત કાઢી નાખવા માંગો છો? આ ક્રિયા પાછી ખેંચી શકાશે નહીં.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "donations", donationId));
      // Reload page data
      window.location.reload();
    } catch (error) {
      console.error("Error deleting donation:", error);
      alert("દાન કાઢી નાખવામાં નિષ્ફળતા મળી.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-800 mb-2" />
        <p className="gujarati-text text-sm">લોડ થઈ રહ્યું છે...</p>
      </div>
    );
  }

  if (!donor) {
    return (
      <div className="p-8 text-center text-gray-500 space-y-4">
        <p className="gujarati-text text-lg">દાતા મળ્યા નથી અથવા રદ કરવામાં આવ્યા છે.</p>
        <Link to="/donors" className="text-royal-800 font-bold hover:underline flex items-center justify-center gap-1">
          <ArrowLeft className="h-4 w-4" /> દાતા સૂચિ પર પાછા જાઓ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Back button */}
      <div>
        <Link to="/donors" className="text-royal-800 hover:text-saffron-600 font-bold flex items-center gap-1 text-sm font-sans">
          <ArrowLeft className="h-4 w-4" /> દાતાઓ પર પાછા જાઓ
        </Link>
      </div>

      {/* Profile Header card */}
      <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-saffron-500" />
        
        {/* Donor information */}
        <div className="space-y-4 max-w-xl">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-royal-800">{donor.fullName}</h1>
            <p className="text-xs text-gray-400 font-mono">દાતા ID: {donor.id}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{donor.phone}</span>
            </div>
            {donor.email && (
              <div className="flex items-center gap-2 font-mono">
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="truncate">{donor.email}</span>
              </div>
            )}
            {donor.address && (
              <div className="flex items-start gap-2 sm:col-span-2 mt-1">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{donor.address}</span>
              </div>
            )}
          </div>

          {donor.notes && (
            <div className="p-3 bg-cream-50 rounded-xl border border-cream-200/50 text-xs text-gray-600">
              <p className="font-bold text-royal-800 mb-1 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                દાતા નોંધ (Notes):
              </p>
              <p className="leading-relaxed">{donor.notes}</p>
            </div>
          )}
        </div>

        {/* Action Button Link to record donation */}
        <div className="flex items-start self-start">
          <Link
            to={`/donations/new?donorId=${donor.id}`}
            className="w-full text-center bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-[0.98] whitespace-nowrap text-sm"
          >
            નવું દાન સ્વીકારો
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm">
          <p className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">કુલ દાન રકમ</p>
          <h3 className="text-2xl font-extrabold text-royal-800 font-mono">₹{stats.totalAmount.toLocaleString("en-IN")}/-</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm">
          <p className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">કુલ દાન સંખ્યા</p>
          <h3 className="text-2xl font-extrabold text-royal-800 font-mono">{stats.count} વખત</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm">
          <p className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">પ્રથમ દાન તારીખ</p>
          <h3 className="text-lg font-bold text-royal-800 flex items-center gap-1.5 mt-1 font-mono">
            <CalendarDays className="h-4.5 w-4.5 text-gray-400" />
            {stats.firstDate || "—"}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm">
          <p className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">છેલ્લું દાન તારીખ</p>
          <h3 className="text-lg font-bold text-royal-800 flex items-center gap-1.5 mt-1 font-mono">
            <CalendarDays className="h-4.5 w-4.5 text-gray-400" />
            {stats.lastDate || "—"}
          </h3>
        </div>
      </div>

      {/* Breakdown and History Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Supported Seva breakdown */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-cream-200 shadow-sm p-6 self-start">
          <h2 className="text-lg font-bold text-royal-800 border-b border-cream-100 pb-3 mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-saffron-500" />
            પ્રિય સેવાઓ (Supported Seva)
          </h2>
          
          {stats.sevaBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 gujarati-text">કોઈ સેવા ઇતિહાસ નથી.</p>
          ) : (
            <div className="space-y-4">
              {stats.sevaBreakdown.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-cream-50/50 px-4 py-3 rounded-xl border border-cream-200/50">
                  <span className="font-semibold text-royal-850 text-sm">{item.name}</span>
                  <span className="bg-royal-800 text-cream-50 font-bold text-xs px-2.5 py-1 rounded-full shrink-0 font-sans">
                    {item.count} વખત
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Donation History table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-cream-200">
            <h2 className="text-lg font-bold text-royal-800 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-saffron-500" />
              દાન ઇતિહાસ (Donation History)
            </h2>
          </div>

          <div className="divide-y divide-cream-100">
            {donations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="gujarati-text text-sm">દાન નોંધાયું નથી.</p>
              </div>
            ) : (
              donations.map((donation) => (
                <div 
                  key={donation.id}
                  className="p-5 flex items-center justify-between hover:bg-cream-50/20 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-royal-800 font-mono text-base">₹{donation.amount.toLocaleString("en-IN")}/-</p>
                    <p className="text-xs text-gray-500 font-semibold">{donation.sevaNameSnapshot}</p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3.5 w-3.5" />
                        {donation.donationDate}
                      </span>
                      {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                        <span className="bg-saffron-600/10 text-saffron-600 px-1 rounded font-bold">
                          {donation.occasionType}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions for donation */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/donations/${donation.id}`}
                      className="p-2 text-gray-400 hover:text-royal-800 hover:bg-cream-100 rounded-xl transition-all"
                      title="કાર્ડ અને મોકલો વિગતો"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteDonation(donation.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="કાઢી નાખો"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
