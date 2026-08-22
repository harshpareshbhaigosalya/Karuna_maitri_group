import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, getDocs, doc, getDoc, where } from "firebase/firestore";
import { Phone, MapPin, Sparkles, Building, QrCode, Lock, CreditCard, Heart, Share2, Download, Gift, Calendar } from "lucide-react";
import { SevaType, OrganizationSettings } from "../types";
import { DEFAULT_SEVA_TYPES } from "../lib/dbSeed";
import html2canvas from "html2canvas";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [sevaTypes, setSevaTypes] = useState<SevaType[]>([]);
  const [loading, setLoading] = useState(true);

  // Preloaded Base64 assets for canvas rendering
  const [bgBase64, setBgBase64] = useState<string>("");
  const [logoBase64, setLogoBase64] = useState<string>("");

  // Export states for the Appeal Flyer
  const [exportingAppeal, setExportingAppeal] = useState(false);
  const [exportedAppealImage, setExportedAppealImage] = useState<string | null>(null);

  const appealCardRef = useRef<HTMLDivElement>(null);

  // Calendar states
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(new Date());
  const [calendarDonations, setCalendarDonations] = useState<Record<string, { donorName: string; sevaName: string }[]>>({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysNum = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysNum; d++) {
    calendarDays.push(new Date(calendarYear, calendarMonth, d));
  }

  const monthNamesGujarati = [
    "જાન્યુઆરી (January)",
    "ફેબ્રુઆરી (February)",
    "માર્ચ (March)",
    "એપ્રિલ (April)",
    "મે (May)",
    "જૂન (June)",
    "જુલાઈ (July)",
    "ઓગસ્ટ (August)",
    "સપ્ટેમ્બર (September)",
    "ઓક્ટોબર (October)",
    "નવેમ્બર (November)",
    "ડિસેમ્બર (December)"
  ];

  const weekdayNames = ["રવિ (Sun)", "સોમ (Mon)", "મંગળ (Tue)", "બુધ (Wed)", "ગુરૂ (Thu)", "શુક્ર (Fri)", "શનિ (Sat)"];

  // Fetch calendar donations for selected month range
  useEffect(() => {
    const fetchCalendarDonations = async () => {
      try {
        setLoadingCalendar(true);
        const startStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-01`;
        const endStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(daysNum).padStart(2, "0")}`;

        const q = query(
          collection(db, "donations"),
          where("donationDate", ">=", startStr),
          where("donationDate", "<=", endStr)
        );

        const snap = await getDocs(q);
        const mapped: Record<string, { donorName: string; sevaName: string }[]> = {};

        snap.forEach((doc) => {
          const data = doc.data();
          const dateKey = data.donationDate;
          if (!mapped[dateKey]) {
            mapped[dateKey] = [];
          }
          mapped[dateKey].push({
            donorName: data.donorNameSnapshot,
            sevaName: data.sevaNameSnapshot
          });
        });

        setCalendarDonations(mapped);
      } catch (err) {
        console.error("Error loading calendar donations:", err);
      } finally {
        setLoadingCalendar(false);
      }
    };

    fetchCalendarDonations();
  }, [calendarYear, calendarMonth, daysNum]);

  useEffect(() => {
    const loadPublicData = async () => {
      try {
        setLoading(true);
        // Load Settings from Firestore
        const settingsSnap = await getDoc(doc(db, "settings", "org"));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as OrganizationSettings);
        } else {
          setSettings(null);
        }

        // Load Seva Types
        const sevaSnap = await getDocs(collection(db, "sevaTypes"));
        const items: SevaType[] = [];
        sevaSnap.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as SevaType);
        });

        if (items.length > 0) {
          items.sort((a, b) => a.sortOrder - b.sortOrder);
          setSevaTypes(items);
        } else {
          setSevaTypes(DEFAULT_SEVA_TYPES as any);
        }
      } catch (err) {
        console.error("Error loading public data:", err);
        setSettings(null);
        setSevaTypes(DEFAULT_SEVA_TYPES as any);
      } finally {
        setLoading(false);
      }
    };

    loadPublicData();
  }, []);

  // Preload logo and background collage as Base64 to prevent canvas taints during home share
  useEffect(() => {
    const loadAssetsAsBase64 = async () => {
      try {
        const bgRes = await fetch("/card_background.jpg");
        const bgBlob = await bgRes.blob();
        const bgReader = new FileReader();
        bgReader.onloadend = () => setBgBase64(bgReader.result as string);
        bgReader.readAsDataURL(bgBlob);

        const logoUrl = settings?.logoUrl || "/logo.jpg";
        if (logoUrl.startsWith("data:")) {
          setLogoBase64(logoUrl);
        } else {
          const logoRes = await fetch(logoUrl);
          const logoBlob = await logoRes.blob();
          const logoReader = new FileReader();
          logoReader.onloadend = () => setLogoBase64(logoReader.result as string);
          logoReader.readAsDataURL(logoBlob);
        }
      } catch (err) {
        console.error("Error preloading public assets:", err);
      }
    };
    loadAssetsAsBase64();
  }, [settings?.logoUrl]);

  // Strips all oklch, oklab, shadows, and outline properties from cloned DOM before html2canvas converts it.
  const cleanCanvasOklch = (clonedDoc: Document) => {
    if (clonedDoc.documentElement) {
      clonedDoc.documentElement.style.borderColor = "transparent";
      clonedDoc.documentElement.style.color = "#111827";
      clonedDoc.documentElement.style.backgroundColor = "#FAF9F6";
      clonedDoc.documentElement.style.boxShadow = "none";
      clonedDoc.documentElement.style.outlineColor = "transparent";
    }

    if (clonedDoc.body) {
      clonedDoc.body.style.borderColor = "transparent";
      clonedDoc.body.style.color = "#111827";
      clonedDoc.body.style.backgroundColor = "#FAF9F6";
      clonedDoc.body.style.boxShadow = "none";
      clonedDoc.body.style.outlineColor = "transparent";
    }

    const elements = clonedDoc.querySelectorAll("*");
    elements.forEach((el: any) => {
      if (el.classList.contains("gold-border")) {
        el.style.borderColor = "#C5A059";
      } else if (el.classList.contains("blue-border")) {
        el.style.borderColor = "#0B2F64";
      } else if (el.classList.contains("gray-border")) {
        el.style.borderColor = "#E5E7EB";
      } else {
        el.style.borderColor = "transparent";
      }
      el.style.outlineColor = "transparent";
      el.style.boxShadow = "none";
      el.style.textShadow = "none";

      const computed = window.getComputedStyle(el);
      if (computed.color && computed.color.includes("oklch")) {
        el.style.color = "#111827";
      }
      if (computed.backgroundColor && computed.backgroundColor.includes("oklch")) {
        el.style.backgroundColor = "transparent";
      }
    });
  };

  // Export Appeal Flyer as PNG
  const handleExportAppealPng = async () => {
    if (!appealCardRef.current) return;
    try {
      setExportingAppeal(true);
      const canvas = await html2canvas(appealCardRef.current, {
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#FAF9F6",
        logging: false,
        onclone: (clonedDoc) => {
          cleanCanvasOklch(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL("image/png");
      setExportedAppealImage(imgData);

      try {
        const link = document.createElement("a");
        link.download = `KM-Donation-Appeal.png`;
        link.href = imgData;
        link.click();
      } catch (clickErr) {
        console.warn("Auto download blocked, showing modal fallback:", clickErr);
      }
    } catch (err) {
      console.error("Flyer export failed:", err);
      alert("અપીલ પત્રિકા ડાઉનલોડ કરવામાં ખામી સર્જાઈ.");
    } finally {
      setExportingAppeal(false);
    }
  };

  // Share Appeal Flyer to WhatsApp and Web Share API
  const handleShareAppealCard = async () => {
    if (!appealCardRef.current) return;
    try {
      setExportingAppeal(true);
      const canvas = await html2canvas(appealCardRef.current, {
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#FAF9F6",
        logging: false,
        onclone: (clonedDoc) => {
          cleanCanvasOklch(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL("image/png");

      const shareText = `જય જિનેન્દ્ર,

અબોલ જીવોની સેવા એ જ સાચી માનવતા છે.

કરુણા-મૈત્રી જીવદયા ગ્રુપ (સુરેન્દ્રનગર) દ્વારા ચાલતી જીવદયા પ્રવૃત્તિઓમાં આપ યથાશક્તિ દાન આપી સહભાગી બની શકો છો.

અમારી મુખ્ય સેવાઓ:
૧. કૂતરાઓ માટે દૂધપૌવા
૨. પંખીના માળા-કુંડાનું વિતરણ
૩. પાંજરાપોળમાં મુલાકાત અને સેવા
૪. બીમાર પશુ-પક્ષીઓની સારવાર
૫. બર્ડ કેમ્પમાં સેવા (JCT અમદાવાદ)

આપનો આભાર સહયોગ મોકલવા માટે નીચેની વિગતો તપાસો અથવા અપીલ પત્રિકા ડાઉનલોડ કરો.

*કરુણા-મૈત્રી ગ્રુપ, સુરેન્દ્રનગર*`;

      try {
        const res = await fetch(imgData);
        const blob = await res.blob();
        const file = new File([blob], "KM-Donation-Appeal.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "સહયોગ અપીલ પત્રિકા",
            text: shareText
          });
          return;
        }
      } catch (shareErr) {
        console.warn("Web Share API failed, falling back:", shareErr);
      }

      // Fallback
      setExportedAppealImage(imgData);
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(url, "_blank");

    } catch (err: any) {
      console.error("Export and share failed:", err);
      alert(`શેર કરવામાં ભૂલ આવી: ${err.message || String(err)}`);
    } finally {
      setExportingAppeal(false);
    }
  };

  const hasDonationMethods = !!settings?.donationMethods;
  const hasQrCode = !!settings?.showQR && (!!settings?.qrImageUrl || !!settings?.qrUrl);
  const hasMembers = !!settings?.members && settings.members.length > 0;
  const displayMembers = settings?.members?.filter(m => m.showOnCard) || [];

  return (
    <div className="min-h-screen bg-cream-50 font-sans text-gray-800 flex flex-col justify-between selection:bg-saffron-500/30 selection:text-royal-800">
      
      {/* Top Header */}
      <header className="bg-royal-800 text-white shadow-md border-b border-saffron-500/30 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={settings?.logoUrl || "/logo.jpg"}
              alt="Logo"
              className="h-12 w-12 rounded-full object-cover border-2 border-saffron-500 bg-white"
              onError={(e) => { (e.target as any).src = "https://placehold.co/100?text=KM"; }}
            />
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-wide leading-tight">
                {settings?.orgNameGujarati || "કરુણા-મૈત્રી ગ્રુપ"}
              </h1>
              <p className="text-xs text-saffron-500 font-semibold tracking-wider font-mono">
                {settings?.location || "સુરેન્દ્રનગર"}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 bg-saffron-500 hover:bg-saffron-600 text-royal-800 font-bold px-4 py-2 rounded-xl text-xs md:text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <Lock className="h-4 w-4" />
            <span>સ્ટાફ પ્રવેશ (Staff Portal)</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 space-y-16 flex-1">
        
        {/* Hero Tagline banner */}
        <div className="bg-white rounded-3xl border border-cream-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-6 md:p-10 relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-saffron-500" />
          
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-1.5 bg-saffron-500/10 text-saffron-600 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>જીવદયા અને અનુકંપા કાર્ય</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black text-royal-800 leading-tight">
              અબોલ જીવોની સેવા એ જ સાચી માનવતા છે.
            </h2>
            <p className="text-sm md:text-base text-gray-500 leading-relaxed font-semibold max-w-xl">
              "{settings?.tagline || "અબોલ પશુ-પક્ષીઓ માટે આપના ઉદાર સહયોગ બદલ ખૂબ ખૂબ આભાર."}"
            </p>
            
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <a
                  href="#donations"
                  className="bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold px-6 py-3.5 rounded-xl shadow-md transition-all text-sm shrink-0"
                >
                  સહયોગ આપો (Donate)
                </a>
                <button
                  onClick={handleExportAppealPng}
                  disabled={exportingAppeal}
                  className="flex items-center gap-1.5 bg-saffron-500 hover:bg-saffron-600 text-royal-800 font-bold px-5 py-3.5 rounded-xl text-xs md:text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                >
                  <Download className="h-4.5 w-4.5" />
                  <span>અપીલ પત્રિકા ડાઉનલોડ</span>
                </button>
                <button
                  onClick={handleShareAppealCard}
                  disabled={exportingAppeal}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-3.5 rounded-xl text-xs md:text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                >
                  <Share2 className="h-4.5 w-4.5" />
                  <span>અપીલ પત્રિકા શેર</span>
                </button>
              </div>

              <div className="text-center lg:text-left text-xs font-black text-gray-400">
                📅 આજની બુકિંગ વિગતો માટે{" "}
                <a href="#calendar" className="text-royal-800 hover:text-saffron-600 underline decoration-wavy underline-offset-4 decoration-saffron-400">
                  લાઇવ સેવા કેલેન્ડર જુઓ (Seva Calendar)
                </a>
              </div>
            </div>
          </div>

          {/* Dog collage image frame */}
          <div className="lg:col-span-5 relative w-full h-64 md:h-80 rounded-2xl overflow-hidden card-border-gold shadow-md">
            <div className="absolute top-1 left-1 w-3.5 h-3.5 border-t border-l border-saffron-500 z-10" />
            <div className="absolute top-1 right-1 w-3.5 h-3.5 border-t border-r border-saffron-500 z-10" />
            <div className="absolute bottom-1 left-1 w-3.5 h-3.5 border-b border-l border-saffron-500 z-10" />
            <div className="absolute bottom-1 right-1 w-3.5 h-3.5 border-b border-r border-saffron-500 z-10" />
            <img
              src="/card_background.jpg"
              alt="Karuna Maitri Collage"
              className="w-full h-full object-cover transform hover:scale-[1.03] transition-transform duration-500"
              onError={(e) => { (e.target as any).src = "/logo.jpg"; }}
            />
          </div>
        </div>

        {/* Seva Activities Grid */}
        <div className="space-y-8" id="seva">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-royal-800">જીવદયા અને માનવ સેવા કાર્યો</h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto leading-relaxed">
              કરુણા-મૈત્રી ગ્રુપ દ્વારા સુરેન્દ્રનગર શહેરમાં નિયમિત રીતે ચાલતી અવિરત પ્રવૃત્તિઓ.
            </p>
            <div className="h-1 w-16 bg-saffron-500 mx-auto rounded-full mt-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {sevaTypes.map((seva, index) => {
              let svgSilhouette = (
                <svg viewBox="0 0 100 100" className="h-16 w-16 opacity-15 absolute right-4 bottom-4 fill-current">
                  <path d="M50 10 C30 10 10 30 10 50 C10 70 30 90 50 90 C70 90 90 70 90 50 C90 30 70 10 50 10 Z" />
                </svg>
              );

              if (seva.id === "dudh-pova" || seva.id.includes("dog")) {
                svgSilhouette = (
                  <svg viewBox="0 0 24 24" className="h-16 w-16 opacity-20 absolute right-4 bottom-4 fill-current">
                    <path d="M12 2c-.55 0-1 .45-1 1v1.17c-.33-.07-.66-.17-1-.28V3c0-.55-.45-1-1-1s-1 .45-1 1v1.54c-.66.24-1.28.59-1.83 1.03l-1.1-1.1c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.1 1.1C5.31 8.12 4.96 8.74 4.72 9.4H3c-.55 0-1 .45-1 1s.45 1 1 1h1.17c.07.33.17.66.28 1H3c-.55 0-1 .45-1 1s.45 1 1 1h1.54c.24.66.59 1.28 1.03 1.83l-1.1 1.1c-.39.39-.39 1.02 0 1.41.2.2.45.3.71.3s.51-.1.71-.3l1.1-1.1c.55.44 1.17.79 1.83 1.03V21c0 .55.45 1 1 1s1-.45 1-1v-1.17c.33.07.66.17 1 .28V21c0 .55.45 1 1 1s1-.45 1-1v-1.54c.66-.24 1.28-.59 1.83-1.03l1.1 1.1c.2.2.45.3.71.3s.51-.1.71-.3c.39-.39.39-1.02 0-1.41l-1.1-1.1c.44-.55.79-1.17 1.03-1.83H21c.55 0 1-.45 1-1s-.45-1-1-1h-1.17c-.07-.33-.17-.66-.28-1H21c.55 0 1-.45 1-1s-.45-1-1-1h-1.54c-.24-.66-.59-1.28-1.03-1.83l1.1-1.1c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-1.1 1.1c-.55-.44-1.17-.79-1.83-1.03V3c0-.55-.45-1-1-1z" />
                  </svg>
                );
              } else if (seva.id === "bird-nest-pot" || seva.id.includes("bird")) {
                svgSilhouette = (
                  <svg viewBox="0 0 24 24" className="h-16 w-16 opacity-20 absolute right-4 bottom-4 fill-current">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zm-1.02-4.14c-.11.24-.26.46-.46.65l-1.41 1.41C9.69 14.84 9 15.34 9 16c0 .55.45 1 1 1s1-.45 1-1c0-.28.18-.52.38-.72l1.41-1.41c.38-.38.62-.9.62-1.47 0-1.1-.9-2-2-2s-2 .9-2 2c0 .55.45 1 1 1s1-.45 1-1c0-.28.22-.5.5-.5s.5.22.5.5c0 .09-.02.17-.02.26z" />
                  </svg>
                );
              }

              return (
                <div 
                  key={seva.id} 
                  className="bg-white rounded-3xl border border-cream-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="h-2 w-full" style={{ backgroundColor: seva.accentColor || '#0B2F64' }} />
                  
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between z-10">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border border-cream-200 shadow-inner" style={{ backgroundColor: seva.accentColor }} />
                        <h4 className="font-extrabold text-royal-800 text-lg leading-tight group-hover:text-saffron-600 transition-colors">
                          {seva.nameGujarati}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed font-semibold">{seva.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-cream-100/50">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        Seva Type {index + 1}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: seva.accentColor }}>
                        <Heart className="h-3.5 w-3.5 fill-current" />
                        <span>જીવદયા સેવા</span>
                      </div>
                    </div>
                  </div>

                  {svgSilhouette}
                </div>
              );
            })}
          </div>
        </div>

        {/* 🐾 Seva Booking Calendar Section */}
        <div id="calendar" className="bg-white rounded-3xl border border-cream-200 shadow-xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-royal-800" />
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 bg-royal-800/10 text-royal-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />
              <span>જીવદયા રોસ્ટર બુકિંગ</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-royal-800">🐾 જીવદયા સેવા કેલેન્ડર (Seva Calendar)</h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto leading-relaxed">
              નીચેના કેલેન્ડર દ્વારા જોઈ શકો છો કે કઈ તારીખ કયા દાતાશ્રી દ્વારા બુક થયેલ છે. તમે પણ ખાલી તારીખ પસંદ કરી દાન મોકલી શકો છો.
            </p>
            <div className="h-1 w-16 bg-saffron-500 mx-auto rounded-full mt-2" />
          </div>

          {/* Month Navigator Row */}
          <div className="flex items-center justify-between border-b border-cream-100 pb-4 max-w-md mx-auto">
            <button
              onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
              className="p-2 border border-cream-200 hover:bg-cream-50 text-royal-800 rounded-xl transition-all font-bold text-sm"
            >
              ← પાછલો મહિનો
            </button>
            <span className="font-extrabold text-royal-800 text-base md:text-lg text-center">
              {monthNamesGujarati[calendarMonth]} - {calendarYear}
            </span>
            <button
              onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
              className="p-2 border border-cream-200 hover:bg-cream-50 text-royal-800 rounded-xl transition-all font-bold text-sm"
            >
              આગલો મહિનો →
            </button>
          </div>

          {/* Calendar Grid container */}
          <div className="max-w-4xl mx-auto border border-cream-150 rounded-2xl overflow-hidden shadow-inner bg-cream-50/20 p-4">
            
            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-extrabold text-royal-800 uppercase tracking-wider">
              {weekdayNames.map((day) => (
                <div key={day} className="py-2 bg-cream-100/50 rounded-lg">{day}</div>
              ))}
            </div>

            {/* Days grid */}
            {loadingCalendar ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-800 mb-2" />
                <p className="text-xs font-bold">બુકિંગ વિગતો લોડ થઈ રહી છે...</p>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="bg-transparent aspect-square sm:aspect-video" />;
                  
                  const dateKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                  const donationsList = calendarDonations[dateKey] || [];
                  const isSelected = selectedCalendarDay && selectedCalendarDay.toDateString() === day.toDateString();

                  let cardStyle = "bg-white border-cream-200 hover:border-royal-400";
                  let indicatorText = "Open 🐾";
                  let indicatorColor = "text-amber-650 bg-amber-50 border-amber-100";

                  if (donationsList.length > 0) {
                    cardStyle = "bg-emerald-50/30 border-emerald-250/50 hover:border-emerald-400";
                    indicatorText = "Booked ✓";
                    indicatorColor = "text-emerald-700 bg-emerald-100/50 border-emerald-150";
                  }

                  return (
                    <div
                      key={dateKey}
                      onClick={() => {
                        setSelectedCalendarDay(day);
                        setShowCalendarModal(true);
                      }}
                      className={`border-2 p-2 rounded-xl flex flex-col justify-between cursor-pointer aspect-square sm:aspect-video transition-all ${cardStyle} ${
                        isSelected ? "ring-2 ring-royal-800 shadow-md font-bold" : ""
                      }`}
                    >
                      <span className="self-end text-xs md:text-sm font-mono font-black text-royal-800">{day.getDate()}</span>
                      
                      {/* Desktop only details view inside box */}
                      <div className="hidden sm:flex flex-col items-start gap-1 w-full text-[10px] leading-tight">
                        {donationsList.length > 0 ? (
                          <>
                            <p className="font-extrabold text-royal-800 truncate w-full">👨‍💼 {donationsList[0].donorName}</p>
                            {donationsList.length === 1 ? (
                              <p className="text-emerald-700 font-extrabold truncate w-full">🐾 {donationsList[0].sevaName}</p>
                            ) : (
                              <p className="text-emerald-750 font-bold tracking-tight truncate w-full text-[9px]">
                                👥 (+ {donationsList.length - 1} sponsors)
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-amber-650 font-extrabold text-[9px] uppercase tracking-wider">સહયોગ બાકી</span>
                        )}
                      </div>

                      {/* Mobile dot indicator */}
                      <span className={`sm:hidden self-center px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-wider border ${indicatorColor}`}>
                        {indicatorText}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Date Details Box (Rendered as a popup modal overlay) */}
          {showCalendarModal && selectedCalendarDay && (
            <div 
              className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
              onClick={() => setShowCalendarModal(false)}
            >
              <div 
                className="bg-white max-w-sm w-full p-6 rounded-3xl shadow-2xl border border-cream-200 text-center space-y-4 relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowCalendarModal(false)} 
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-black text-sm h-8 w-8 bg-cream-50 hover:bg-cream-100 rounded-full flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
                
                <p className="text-[10px] font-extrabold text-royal-500 uppercase tracking-widest font-mono">
                  📅 તારીખ પસંદગી (Selected Date)
                </p>
                <h4 className="text-xl font-black text-royal-800 border-b border-cream-100 pb-2">
                  {selectedCalendarDay.getDate()} {monthNamesGujarati[selectedCalendarDay.getMonth()].split(" ")[0]}, {selectedCalendarDay.getFullYear()}
                </h4>
                
                {(() => {
                  const dateKey = `${selectedCalendarDay.getFullYear()}-${String(selectedCalendarDay.getMonth() + 1).padStart(2, "0")}-${String(selectedCalendarDay.getDate()).padStart(2, "0")}`;
                  const donationsList = calendarDonations[dateKey] || [];

                  if (donationsList.length > 0) {
                    return (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        <p className="text-xs text-gray-500 font-bold text-center">આ તારીખે સેવા સહયોગ આપનાર દાતાશ્રીઓ:</p>
                        {donationsList.map((don, dIdx) => (
                          <div key={dIdx} className="bg-emerald-100/40 border border-emerald-250/30 p-4 rounded-2xl space-y-2 text-left">
                            <p className="text-base font-black text-emerald-800">🎉 દાતા શ્રી {don.donorName}</p>
                            <div className="h-px bg-emerald-200/45 my-1" />
                            <p className="text-xs font-bold text-royal-800">
                              🎯 સેવા પ્રકાર: <span className="font-extrabold text-emerald-800 text-sm">{don.sevaName}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-amber-50/70 border border-amber-250/30 p-4 rounded-2xl space-y-3">
                        <p className="text-xs text-amber-800 font-bold">આ તારીખે કોઈ પણ અબોલ જીવની સેવાનું બુકિંગ બાકી છે!</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">આ તારીખ પસંદ કરી દૂધપૌવા કે પશુ-પક્ષી સારવારના દાતા બનવા માટે નીચે સહયોગ આપો.</p>
                        <a
                          href="#donations"
                          onClick={() => setShowCalendarModal(false)}
                          className="inline-block w-full bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
                        >
                          હમણાં સહયોગ કરો 🐾
                        </a>
                      </div>
                    );
                  }
                })()}

                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="w-full py-2.5 bg-cream-100 hover:bg-cream-200 text-royal-800 font-bold rounded-xl transition-all text-xs"
                >
                  બંધ કરો (Close)
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Accepted Donation Details with Share Appeal Card integration */}
        {(hasDonationMethods || hasQrCode || hasMembers) ? (
          <div className="space-y-8" id="donations">
            
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-royal-800">આપનો સેવા સહયોગ મોકલો</h2>
              <p className="text-gray-500 text-sm max-w-lg mx-auto leading-relaxed">
                આપનું દાન આ મૂગા પશુ પક્ષીઓ માટે જીવનદાન છે. નીચે આપેલી વિગતો દ્વારા આપ સહયોગ મોકલી શકો છો.
              </p>
              
              {/* Share Appeal Flyer triggers */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleExportAppealPng}
                  disabled={exportingAppeal}
                  className="flex items-center gap-1.5 bg-saffron-500 hover:bg-saffron-600 text-royal-800 font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Download className="h-4.5 w-4.5" />
                  <span>{exportingAppeal ? "તૈયાર થઈ રહી છે..." : "અપીલ પત્રિકા ડાઉનલોડ"}</span>
                </button>
                <button
                  onClick={handleShareAppealCard}
                  disabled={exportingAppeal}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Share2 className="h-4.5 w-4.5" />
                  <span>અપીલ પત્રિકા શેર</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-4">
              
              {/* Left panel: Donation Bank Credentials */}
              {hasDonationMethods ? (
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-cream-200 shadow-lg space-y-6 relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-royal-800" />
                  <h3 className="text-xl font-bold text-royal-855 border-b border-cream-100 pb-3 flex items-center gap-2">
                    <CreditCard className="h-5.5 w-5.5 text-saffron-500" />
                    બેંક એકાઉન્ટ માહિતી (Bank Credentials)
                  </h3>
                  
                  <div className="bg-cream-50/50 p-5 rounded-2xl border border-cream-200/50 space-y-2 whitespace-pre-line text-sm text-royal-800 font-extrabold leading-relaxed">
                    {settings.donationMethods}
                  </div>
                </div>
              ) : null}

              {/* Right panel: QR code scanning + Contacts */}
              {(hasQrCode || hasMembers) ? (
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-cream-200 shadow-lg space-y-6 relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-saffron-500" />
                  <h3 className="text-xl font-bold text-royal-800 border-b border-cream-100 pb-3 flex items-center gap-2">
                    <Phone className="h-5.5 w-5.5 text-saffron-500" />
                    સંપર્ક સૂચિ (Contact List)
                  </h3>

                  <div className="space-y-6">
                    {hasMembers && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {settings.members?.map((member, idx) => (
                          <div key={idx} className="bg-cream-50/40 p-4 rounded-xl border border-cream-200/50 text-center space-y-1">
                            <p className="text-xs text-gray-400 font-extrabold uppercase tracking-wide">{member.name}</p>
                            <p className="font-black text-royal-800 font-mono text-base">{member.phone}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {hasQrCode && (
                      <div className="border border-cream-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-4 bg-cream-50/50 shadow-inner">
                        <img
                          src={settings.qrImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(settings.qrUrl || "")}`}
                          alt="UPI QR Code"
                          className="h-32 w-32 bg-white p-1 rounded-xl border border-cream-200 shadow-sm object-contain"
                        />
                        <div className="text-center sm:text-left space-y-1">
                          <p className="font-extrabold text-royal-800 text-sm flex items-center justify-center sm:justify-start gap-1">
                            <QrCode className="h-4.5 w-4.5 text-saffron-500" />
                            સ્કેન કરી મદદ કરો (Scan & Pay)
                          </p>
                          <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
                            {settings.qrLabel || "તમારા ફોનની યુપીઆઈ એપ વડે સ્કેન કરી સીધો સેવા સહયોગ મોકલી શકો છો."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

            </div>
          </div>
        ) : null}

      </main>

      {/* 
        Hidden rendering card for 100% safe Donation Appeal Flyer downloads (un-scaled, offscreen).
        Completely styled with inline style colors, border sizes, and fixed sizes to ensure pixel-perfect rendering.
        Absolutely zero Tailwind classes for colors, borders, shadows, or text-colors are used here to prevent oklch crashes!
      */}
      <div 
        className="absolute" 
        style={{ 
          left: "-9999px", 
          top: "0",
          width: "600px",
          height: "780px",
          overflow: "hidden"
        }}
      >
        <div 
          ref={appealCardRef}
          className="w-[600px] h-[780px] select-none flex flex-col justify-between relative overflow-hidden safe-card-export"
          style={{ 
            fontFamily: "'Noto Sans Gujarati', sans-serif",
            border: "6px solid #C5A059", // Solid Gold border
            background: "linear-gradient(180deg, #FAF9F6 0%, #FFFDF9 100%)",
            boxSizing: 'border-box',
            padding: "20px"
          }}
        >
          {/* 
            Inject the style overrides INSIDE the cloned node itself so they are copied into the html2canvas iframe sandbox.
            This completely eliminates oklch variables and sets border variables to safe values inside the sandbox.
          */}
          <style dangerouslySetInnerHTML={{__html: `
            .safe-card-export, .safe-card-export * {
              --border-color: #FAF9F6 !important;
              border-color: #FAF9F6 !important;
              outline-color: transparent !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            .safe-card-export .gold-border {
              border-color: #C5A059 !important;
            }
            .safe-card-export .blue-border {
              border-color: #0B2F64 !important;
            }
            .safe-card-export .gray-border {
              border-color: #E5E7EB !important;
            }
          `}} />

          {/* Inner gold border */}
          <div 
            className="absolute pointer-events-none z-20 gold-border" 
            style={{ 
              inset: "8px", 
              border: "2px solid #C5A059", 
              borderRadius: "12px" 
            }} 
          />

          {/* Ornament Leaf details */}
          <div className="absolute w-2 h-2 z-30" style={{ top: "12px", left: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
          <div className="absolute w-2 h-2 z-30" style={{ top: "12px", right: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
          <div className="absolute w-2 h-2 z-30" style={{ bottom: "12px", left: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
          <div className="absolute w-2 h-2 z-30" style={{ bottom: "12px", right: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />

          {/* 1. Header (Reference Inspired): Slogan Top Row, Logo left, Contacts right */}
          <div className="relative z-10" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            
            {/* Top Slogan Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0 10px" }}>
              <span style={{ color: "#b91c1c", fontSize: "14px", fontWeight: "900", transform: "rotate(-4deg)" }}>🚩 જીવદયા</span>
              <span style={{ color: "#0B2F64", fontSize: "20px", fontWeight: "900", letterSpacing: "1.5px" }}>અહિંસા પરમો ધર્મઃ</span>
              <span style={{ color: "#b91c1c", fontSize: "14px", fontWeight: "900", transform: "rotate(4deg)" }}>કરુણા 🚩</span>
            </div>

            {/* Logo and Contact Info Side-By-Side */}
            <div className="blue-border" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #0B2F64", borderBottom: "1px solid #0B2F64", padding: "6px 10px", marginTop: "2px" }}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
                {logoBase64 && logoBase64.startsWith("data:") ? (
                  <img 
                    src={logoBase64} 
                    alt="Logo" 
                    className="h-14 w-14 rounded-full object-contain bg-white gold-border" 
                    style={{ border: "2px solid #C5A059" }}
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-[8px] p-1 text-center leading-none gold-border" style={{ border: '2px solid #C5A059', backgroundColor: '#0B2F64' }}>કરુણા મૈત્રી</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <h2 style={{ color: '#0B2F64', fontSize: "17px", fontWeight: "900", margin: 0, lineHeight: "1.1" }}>{settings?.orgNameGujarati || "કરુણા-મૈત્રી ગ્રુપ"}</h2>
                  <span style={{ color: '#C5A059', fontSize: "10.5px", fontWeight: "900", margin: 0 }}>📍 {settings?.location || "સુરેન્દ્રનગર"}</span>
                </div>
              </div>

              {/* Right side contact details list formatted compactly */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: "9.5px", fontWeight: "900", color: "#374151", lineHeight: "1.3" }}>
                {displayMembers.slice(0, 3).map((m, idx) => (
                  <p key={idx} style={{ margin: 0 }}>{m.name}: <span style={{ color: '#0B2F64', fontFamily: "monospace" }}>{m.phone}</span></p>
                ))}
                {displayMembers.length === 0 && (
                  <>
                    <p style={{ margin: 0 }}>કેતલ વોરા: <span style={{ color: '#0B2F64', fontFamily: "monospace" }}>98242 55909</span></p>
                    <p style={{ margin: 0 }}>મયુર શાહ: <span style={{ color: '#0B2F64', fontFamily: "monospace" }}>94290 99906</span></p>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* 2. Main Appeal Text Details Box (Redesigned with large fonts) */}
          <div 
            className="text-xs relative z-10 gold-border"
            style={{ 
              border: "2px solid #C5A059", 
              backgroundColor: 'rgba(255, 255, 255, 0.98)', 
              color: '#111827',
              borderRadius: "16px",
              padding: "16px",
              boxSizing: 'border-box',
              marginTop: "4px"
            }}
          >
            <h3 className="text-center font-black pb-1.5 mb-2.5 blue-border" style={{ color: '#0B2F64', borderBottom: '1px solid #FAF9F6', fontSize: '15px' }}>
              🐾 જીવદયા સેવા સહયોગ અપીલ (Bank Details) 🐾
            </h3>
            <div className="whitespace-pre-line text-[12px] leading-relaxed font-black text-center" style={{ color: '#1F2937' }}>
              {settings?.donationMethods || "બેંક વિગતો મેળવવા સંપર્ક કરો."}
            </div>
          </div>

          {/* 3. Seva types list (Expanded font sizes, bold list) */}
          <div 
            className="text-center relative z-10 gold-border" 
            style={{ 
              backgroundColor: 'rgba(197, 160, 89, 0.04)', 
              border: '1px solid rgba(197, 160, 89, 0.15)',
              borderRadius: "12px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}
          >
            <p className="text-[11px] font-black tracking-wider uppercase pb-0.5 inline-block gold-border" style={{ color: '#0B2F64', borderBottom: '1px solid rgba(197, 160, 89, 0.1)', alignSelf: "center", margin: 0 }}>
              અમારા મુખ્ય સેવા કાર્યો
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-black text-left pl-4" style={{ color: '#374151', display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {sevaTypes.slice(0, 6).map((s, idx) => (
                <p key={idx} style={{ margin: 0, whiteSpace: "normal" }}>
                  <span style={{ color: '#b91c1c' }}>{idx + 1})</span> {s.nameGujarati}
                </p>
              ))}
            </div>
          </div>

          {/* 4. Large collage image cover (Takes up full width, height 180px, covers fully without clipping) */}
          <div 
            className="gold-border"
            style={{ 
              borderRadius: "14px",
              overflow: "hidden",
              height: "180px",
              width: "100%",
              position: "relative",
              zIndex: 10,
              border: '2.5px solid #C5A059', 
              backgroundColor: '#FAF9F6',
              backgroundImage: bgBase64 ? `url(${bgBase64})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }}
          >
            {!bgBase64 && (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#9CA3AF" }}>
                જીવદયા પ્રવૃત્તિઓ
              </div>
            )}
          </div>

          {/* 5. UPI QR Code Box */}
          <div 
            className="relative z-10 gold-border" 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1.5px solid #C5A059',
              borderRadius: "14px",
              padding: "8px 16px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", maxWidth: "70%" }}>
              <p style={{ color: '#0B2F64', fontSize: "12px", fontWeight: "900", margin: 0 }}>📲 સ્કેન કરી મદદ કરો (Scan & Pay)</p>
              <p style={{ color: '#4B5563', fontSize: "9.5px", fontWeight: "900", margin: 0 }}>
                {settings?.qrLabel || "તમારા ફોનની કોઈ પણ યુપીઆઈ એપ વડે સ્કેન કરી સીધો સેવા સહયોગ મોકલી શકો છો."}
              </p>
            </div>
            
            {settings?.showQR && settings?.qrImageUrl && settings.qrImageUrl.startsWith("data:") ? (
              <img 
                src={settings.qrImageUrl} 
                alt="Custom QR" 
                className="h-16 w-16 p-0.5 bg-white object-contain gold-border" 
                style={{ border: '1px solid #C5A059', borderRadius: "6px" }} 
              />
            ) : (
              <div className="h-16 w-16 bg-white flex items-center justify-center text-[8px] font-bold font-sans gray-border" style={{ border: '1px dashed #FAF9F6', color: '#9CA3AF', borderRadius: "6px" }}>QR કોડ</div>
            )}
          </div>

          {/* 6. Footer (Quotes & Slogans) */}
          <div className="font-sans relative z-10 gray-border" style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid #FAF9F6", paddingTop: "6px" }}>
            <p style={{ color: "#0B2F64", fontSize: "11px", fontWeight: "900", fontStyle: "italic", textAlign: "center", margin: 0 }}>
              “ભવિષ્યમાં આપના તરફથી આજ રીતે જીવદયાના પુનિત કાર્યમાં સાથ સહકાર મળતો રહે તેવી અપેક્ષા સહ...આભાર..”
            </p>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "900", color: "#C5A059", padding: "0 12px" }}>
              <span style={{ color: "#b91c1c" }}>અનુકંપા 🚩</span>
              <span style={{ color: "#0B2F64" }}>"અમે તો માત્ર નિમિત્ત છીએ"</span>
              <span style={{ color: "#b91c1c" }}>🚩 જય જિનેન્દ્ર • આભાર</span>
            </div>

            <div 
              className="w-full text-center text-[9.5px] font-black tracking-wider gold-border" 
              style={{ 
                background: 'linear-gradient(to right, #051A3B, #0B2F64, #051A3B)', 
                color: '#C5A059', 
                border: '1px solid rgba(197, 160, 89, 0.2)',
                padding: "5px",
                borderRadius: "10px"
              }}
            >
              ← કરુણા થી કૃત્ય સુધી, મૈત્રી થી માનવતા સુધી →
            </div>
          </div>

        </div>
      </div>

      {/* Generated Appeal Image Modal Overlay */}
      {exportedAppealImage && (
        <div className="fixed inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white max-w-md w-full p-5 rounded-2xl shadow-2xl border border-cream-200 text-center space-y-4 my-8 relative">
            <button 
              onClick={() => setExportedAppealImage(null)} 
              className="absolute top-3 right-3 text-gray-405 hover:text-gray-600 font-bold text-lg p-1 bg-cream-50 hover:bg-cream-100 rounded-full h-8 w-8 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <h3 className="text-royal-855 font-extrabold text-base flex items-center gap-1.5 justify-center">
              <Gift className="h-5 w-5 text-saffron-500 animate-bounce" />
              અપીલ પત્રિકા સેવ કરો (Save Appeal Flyer)
            </h3>
            
            <div className="text-left text-xs text-saffron-800 bg-saffron-500/10 border border-saffron-500/20 p-3 rounded-xl space-y-1 font-sans">
              <p>📱 <strong>મોબાઈલ માટે:</strong> ફોટો પર થોડી સેકન્ડ આંગળી દબાવી રાખો (Long Press) અને <strong>"Save Image" (ફોટો સેવ)</strong> પસંદ કરો.</p>
              <p>💻 <strong>કોમ્પ્યુટર માટે:</strong> ફોટો પર રાઇટ ક્લિક (Right Click) કરી <strong>"Save Image As..."</strong> પસંદ કરો.</p>
            </div>

            {/* Rendered clean canvas image */}
            <div className="border border-cream-100 rounded-xl overflow-hidden shadow-inner bg-cream-50/20 max-h-[55vh] flex items-center justify-center p-1 bg-white">
              <img 
                src={exportedAppealImage} 
                alt="Generated Donation Appeal Flyer" 
                className="max-w-full max-h-[50vh] object-contain rounded"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2 text-xs font-bold font-sans">
              <button
                onClick={() => setExportedAppealImage(null)}
                className="w-full py-3 bg-royal-800 hover:bg-royal-900 text-cream-50 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                પૂર્ણ કરો (Done)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="bg-royal-800 text-cream-200 border-t border-saffron-500/20 py-8 text-center text-xs">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p className="font-extrabold text-white uppercase tracking-wider">
            {settings?.defaultFooter || "કરુણા-મૈત્રી ગ્રુપ — સુરેન્દ્રનગર"}
          </p>
          <p className="text-cream-200/50 font-medium">
            © {new Date().getFullYear()} Karuna-Maitri Group. All Rights Reserved. Designed for Animal Welfare Seva.
          </p>
          <p className="text-[10px] text-saffron-500 font-extrabold tracking-wider pt-1 font-mono uppercase">
            Developed & Engineered by Harsh Gosaliya
          </p>
        </div>
      </footer>
    </div>
  );
};
