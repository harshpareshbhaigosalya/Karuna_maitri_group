import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore";
import { ArrowLeft, Download, Share2, Calendar, User, Heart, Gift } from "lucide-react";
import { Donation, OrganizationSettings, SevaType } from "../types";
import html2canvas from "html2canvas";

const SEVA_DETAILS_MAP: Record<string, {
  title: string;
  subtitle: string;
  highlightVal: string;
  highlightUnit: string;
  boxText: string;
  verb: string;
  bottomBar: string;
}> = {
  "dudh-pova": {
    title: "અમારી રોજની પ્રવૃતિ",
    subtitle: "દરરોજ આશરે",
    highlightVal: "350 થી 400",
    highlightUnit: "કૂતરાઓને",
    boxText: "દૂધપૌવા",
    verb: "જમાડવામાં આવે છે.",
    bottomBar: "દૂધ પૌવા જમાડવામાં આવે છે."
  },
  "bird-nest-pot": {
    title: "અમારી રોજની પ્રવૃતિ",
    subtitle: "અમે દર વર્ષે",
    highlightVal: "5000 થી વધુ",
    highlightUnit: "પક્ષીઓ માટે",
    boxText: "માળા-કુંડા",
    verb: "વિતરણ કરીએ છીએ.",
    bottomBar: "માળા-કુંડા વિતરણ કરવામાં આવે છે."
  },
  "panjrapole": {
    title: "અમારી રોજની પ્રવૃતિ",
    subtitle: "ગૌશાળા સેવા",
    highlightVal: "પાંજરાપોળ ગાયો",
    highlightUnit: "માટે પૌષ્ટિક",
    boxText: "લીલો ઘાસચારો",
    verb: "પૂરો પાડીએ છીએ.",
    bottomBar: "ઘાસચારો પૂરો પાડવામાં આવે છે."
  },
  "sick-animal": {
    title: "અમારી રોજની પ્રવૃતિ",
    subtitle: "બીમાર જીવોની",
    highlightVal: "તાત્કાલિક સારવાર",
    highlightUnit: "પશુ-પક્ષીઓની",
    boxText: "દવા-સારવાર",
    verb: "સેવા પૂરી પાડીએ છીએ.",
    bottomBar: "સારવાર પૂરી પાડવામાં આવે છે."
  },
  "bird-camp": {
    title: "અમારી રોજની પ્રવૃતિ",
    subtitle: "દર ઉત્તરાયણ",
    highlightVal: "બર્ડ કેમ્પ",
    highlightUnit: "ઘાયલ પક્ષીઓને",
    boxText: "ઓપરેશન-સારવાર",
    verb: "આપી બચાવીએ છીએ.",
    bottomBar: "પક્ષીઓનો જીવ બચાવીએ છીએ."
  }
};

export const DonationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [donation, setDonation] = useState<Donation | null>(null);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [sevaTypes, setSevaTypes] = useState<Record<string, SevaType>>({});
  const [sevaList, setSevaList] = useState<SevaType[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-loaded Base64 assets
  const [bgBase64, setBgBase64] = useState<string>("");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [donorPhotoBase64, setDonorPhotoBase64] = useState<string>("");
  const [headerBase64, setHeaderBase64] = useState<string>("");
  const [footerBase64, setFooterBase64] = useState<string>("");

  // Modal View state for mobile-safe downloads
  const [exportedImage, setExportedImage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const settingsSnap = await getDoc(doc(db, "settings", "org"));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as OrganizationSettings);
        }

        const sevaSnap = await getDocs(collection(db, "sevaTypes"));
        const sevaMap: Record<string, SevaType> = {};
        const allSevas: SevaType[] = [];
        sevaSnap.forEach((doc) => {
          const item = { id: doc.id, ...doc.data() } as SevaType;
          sevaMap[doc.id] = item;
          allSevas.push(item);
        });
        setSevaTypes(sevaMap);
        setSevaList(allSevas);

        const donSnap = await getDoc(doc(db, "donations", id));
        if (donSnap.exists()) {
          setDonation({ id: donSnap.id, ...donSnap.data() } as Donation);
        } else {
          setDonation(null);
        }
      } catch (error) {
        console.error("Error loading donation detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  // Load assets as Base64 data URLs to prevent canvas taint issues
  useEffect(() => {
    const loadAssetsAsBase64 = async () => {
      try {
        const bgRes = await fetch("/card_background.jpg");
        const bgBlob = await bgRes.blob();
        const bgReader = new FileReader();
        bgReader.onloadend = () => setBgBase64(bgReader.result as string);
        bgReader.readAsDataURL(bgBlob);

        // Fetch Logo (Only fetch if it's not already a base64 data string)
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

        // Fetch Header Banner
        const headerRes = await fetch("/header_banner.jpg");
        const headerBlob = await headerRes.blob();
        const headerReader = new FileReader();
        headerReader.onloadend = () => setHeaderBase64(headerReader.result as string);
        headerReader.readAsDataURL(headerBlob);

        // Fetch Footer Banner
        const footerRes = await fetch("/footer_banner.jpg");
        const footerBlob = await footerRes.blob();
        const footerReader = new FileReader();
        footerReader.onloadend = () => setFooterBase64(footerReader.result as string);
        footerReader.readAsDataURL(footerBlob);
      } catch (err) {
        console.error("Error preloading assets:", err);
      }
    };
    loadAssetsAsBase64();
  }, [settings?.logoUrl]);

  // Pre-load donor photo as Base64 if it's a remote URL
  useEffect(() => {
    const loadDonorPhoto = async () => {
      if (!donation?.donorPhotoUrl) {
        setDonorPhotoBase64("");
        return;
      }
      if (donation.donorPhotoUrl.startsWith("data:")) {
        setDonorPhotoBase64(donation.donorPhotoUrl);
        return;
      }
      try {
        const res = await fetch(donation.donorPhotoUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => setDonorPhotoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error("Failed to preload remote donor photo:", err);
        setDonorPhotoBase64(donation.donorPhotoUrl); // Fallback
      }
    };
    loadDonorPhoto();
  }, [donation?.donorPhotoUrl]);

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

  const handleExportPng = async () => {
    if (!cardRef.current || !donation) return;
    try {
      setExporting(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.0, // Safe scaling resolution
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#FAF9F6",
        logging: false,
        onclone: (clonedDoc) => {
          cleanCanvasOklch(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL("image/png");
      setExportedImage(imgData); // Opens modal for mobile long-press downloads

      // Trigger automatic file download attempt for desktop/PC
      try {
        const link = document.createElement("a");
        const cleanName = donation.donorNameSnapshot.replace(/\s+/g, "-");
        link.download = `KM-Cert-${cleanName || "Anonymous"}-${donation.sevaTypeId}-${donation.donationDate}.png`;
        link.href = imgData;
        link.click();
      } catch (clickErr) {
        console.warn("Auto download blocked, opening modal fallback:", clickErr);
      }
    } catch (err) {
      console.error("Export card failed:", err);
      alert("કાર્ડ એક્સપોર્ટ કરવામાં ખામી સર્જાઈ.");
    } finally {
      setExporting(false);
    }
  };

  // Upgraded native file sharing for card details
  const handleShareCard = async () => {
    if (!cardRef.current || !donation) return;
    try {
      setExporting(true);
      const canvas = await html2canvas(cardRef.current, {
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

      const cleanName = donation.donorNameSnapshot.trim().replace(/\s+/g, "-") || "Anonymous";
      const shareText = `જય જિનેન્દ્ર,

કરુણા-મૈત્રી ગ્રુપ તરફથી આપના દાન બદલ હૃદયપૂર્વક આભાર.

*દાતાનું નામ:* ${donation.donorNameSnapshot}
*સેવા પ્રકાર:* ${donation.sevaNameSnapshot}
*દાનની રકમ:* ₹${donation.amount.toLocaleString("en-IN")}/-
*તારીખ:* ${donation.donationDate}
${donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" ? `*પ્રસંગ:* ${donation.occasionType}` : ""}

તમારું દાન આ નિરીહ પ્રાણીઓ માટે જીવનદાન છે. આપનો હૃદયપૂર્વક આભાર.

*કરુણા-મૈત્રી ગ્રુપ, સુરેન્દ્રનગર*`;

      try {
        const res = await fetch(imgData);
        const blob = await res.blob();
        const file = new File([blob], `KM-Cert-${cleanName}.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "દાન સન્માન પત્ર",
            text: shareText
          });
          return;
        }
      } catch (shareErr) {
        console.warn("Native file sharing failed or not supported, using fallback:", shareErr);
      }

      // Fallback: Open WhatsApp and display long-press save modal
      setExportedImage(imgData);
      const cleanPhone = donation.phoneSnapshot.replace(/\D/g, "");
      const whatsappPhone = cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone;
      const url = `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(shareText)}`;
      window.open(url, "_blank");

    } catch (err: any) {
      console.error("Export and share failed:", err);
      alert(`કાર્ડ શેર કરવામાં ભૂલ આવી: ${err.message || String(err)}`);
    } finally {
      setExporting(false);
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

  if (!donation) {
    return (
      <div className="p-8 text-center text-gray-500 space-y-4">
        <p className="gujarati-text text-lg">આ દાનની વિગતો મળી નથી.</p>
        <Link to="/donations" className="text-royal-800 font-bold hover:underline flex items-center justify-center gap-1">
          <ArrowLeft className="h-4 w-4" /> દાન સૂચિ પર પાછા જાઓ
        </Link>
      </div>
    );
  }

  const activeSeva = sevaTypes[donation.sevaTypeId];
  const displayMembers = settings?.members?.filter(m => m.showOnCard) || [];
  const otherActiveSevas = sevaList.filter(s => s.id !== donation.sevaTypeId && s.active).slice(0, 6);
  const showQrOnCard = !!(settings?.showQR && settings?.qrImageUrl && settings.qrImageUrl.startsWith("data:"));

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div>
        <Link to="/donations" className="text-royal-855 hover:text-saffron-600 font-bold flex items-center gap-1 text-sm font-sans">
          <ArrowLeft className="h-4 w-4" /> દાન ઇતિહાસ પર પાછા જાઓ
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Summary and Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-royal-800 border-b border-cream-100 pb-3">દાન વિગત પત્ર</h2>
            
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-455 font-bold uppercase">દાતાનું નામ</p>
                  <p className="font-bold text-royal-800 text-base">{donation.donorNameSnapshot}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-455 font-bold uppercase">સેવા પ્રકાર</p>
                  <p className="font-bold text-royal-800">{donation.sevaNameSnapshot}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-455 font-bold uppercase">તારીખ</p>
                    <p className="font-bold text-royal-800 font-mono">{donation.donationDate}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-455 font-bold uppercase">રકમ</p>
                  <p className="font-extrabold text-royal-855 font-mono text-base font-sans">₹{donation.amount.toLocaleString("en-IN")}/-</p>
                </div>
              </div>

              {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                <div className="p-3.5 bg-saffron-600/5 border border-saffron-500/10 rounded-xl">
                  <p className="text-[10px] text-saffron-650 font-bold uppercase">શુભ પ્રસંગ</p>
                  <p className="font-bold text-royal-800 text-sm mt-0.5">{donation.occasionType} {donation.occasionDate ? `(${donation.occasionDate})` : ""}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-cream-100">
              <button
                onClick={handleExportPng}
                disabled={exporting}
                className="flex items-center justify-center gap-2 bg-saffron-500 hover:bg-saffron-600 text-royal-800 font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                <span>{exporting ? "બની રહ્યું છે..." : "ડાઉનલોડ પત્રિકા"}</span>
              </button>
              <button
                onClick={handleShareCard}
                disabled={exporting}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Share2 className="h-5 w-5" />
                <span>WhatsApp કરો</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Portrait Card Preview with Scale configuration */}
        <div className="lg:col-span-8 flex flex-col items-center gap-4 w-full">
          
          {/* Actions directly above card */}
          <div className="flex items-center gap-3 w-full max-w-[400px]">
            <button
              onClick={handleExportPng}
              disabled={exporting}
              className="flex-1 flex items-center justify-center gap-1.5 bg-saffron-500 hover:bg-saffron-600 text-royal-800 font-bold py-2.5 px-3 rounded-xl shadow-sm text-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? "બની રહ્યું છે..." : "ડાઉનલોડ (PNG)"}</span>
            </button>
            <button
              onClick={handleShareCard}
              disabled={exporting}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm text-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              <span>WhatsApp શેર</span>
            </button>
          </div>

          <div className="w-full flex justify-center overflow-hidden py-4 border border-cream-100 rounded-2xl bg-cream-50/20">
            <div className="w-[600px] h-[820px] scale-[0.48] sm:scale-[0.72] md:scale-100 origin-top shrink-0 -mb-[420px] sm:-mb-[220px] md:mb-0">
              
              {/* Visual preview replica */}
              <div 
                className="w-[600px] h-[820px] select-none flex flex-col justify-between relative overflow-hidden safe-card-export"
                style={{ 
                  fontFamily: "'Noto Sans Gujarati', sans-serif",
                  border: "8px solid #043e22", // Forest green outer border
                  background: "#FAF5EC", // Match background to banner cream color
                  boxSizing: 'border-box',
                  padding: "20px"
                }}
              >
                {/* Cloned override stylesheet for sandbox styling inside html2canvas */}
                <style dangerouslySetInnerHTML={{__html: `
                  .safe-card-export, .safe-card-export * {
                    --border-color: #FAF5EC !important;
                    border-color: #FAF5EC !important;
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

                {/* Watermark Background collage at 4% opacity behind details */}
                {bgBase64 && (
                  <div 
                    style={{
                      position: "absolute",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundImage: `url(${bgBase64})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: 0.04,
                      zIndex: 0
                    }}
                  />
                )}

                {/* Inner gold frame border */}
                <div 
                  className="absolute pointer-events-none z-20 gold-border" 
                  style={{ inset: "8px", border: "2px solid #C5A059", borderRadius: "12px" }} 
                />

                {/* 4 Arched Green Corners */}
                {/* Top-Left */}
                <div style={{
                  position: "absolute",
                  top: 0, left: 0,
                  width: "80px", height: "80px",
                  background: "#043e22",
                  borderBottomRightRadius: "100%",
                  borderRight: "2.5px solid #C5A059",
                  borderBottom: "2.5px solid #C5A059",
                  zIndex: 30,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingRight: "12px",
                  paddingBottom: "12px",
                  color: "white"
                }}>
                  <span style={{ fontSize: "11px", fontWeight: "900", color: "#C5A059", lineHeight: "1" }}>કરુણા</span>
                  <span style={{ fontSize: "13px", marginTop: "2px" }}>🖐️</span>
                </div>
                {/* Top-Right */}
                <div style={{
                  position: "absolute",
                  top: 0, right: 0,
                  width: "80px", height: "80px",
                  background: "#043e22",
                  borderBottomLeftRadius: "100%",
                  borderLeft: "2.5px solid #C5A059",
                  borderBottom: "2.5px solid #C5A059",
                  zIndex: 30,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingLeft: "12px",
                  paddingBottom: "12px",
                  color: "white"
                }}>
                  <span style={{ fontSize: "11px", fontWeight: "900", color: "#C5A059", lineHeight: "1" }}>મૈત્રી</span>
                  <span style={{ fontSize: "13px", marginTop: "2px" }}>🤝</span>
                </div>
                {/* Bottom-Left */}
                <div style={{
                  position: "absolute",
                  bottom: 0, left: 0,
                  width: "80px", height: "80px",
                  background: "#043e22",
                  borderTopRightRadius: "100%",
                  borderRight: "2.5px solid #C5A059",
                  borderTop: "2.5px solid #C5A059",
                  zIndex: 30,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingRight: "12px",
                  paddingTop: "12px",
                  color: "white"
                }}>
                  <span style={{ fontSize: "13px", marginBottom: "2px" }}>❤️</span>
                  <span style={{ fontSize: "11px", fontWeight: "900", color: "#C5A059", lineHeight: "1" }}>અનુકંપા</span>
                </div>
                {/* Bottom-Right */}
                <div style={{
                  position: "absolute",
                  bottom: 0, right: 0,
                  width: "80px", height: "80px",
                  background: "#043e22",
                  borderTopLeftRadius: "100%",
                  borderLeft: "2.5px solid #C5A059",
                  borderTop: "2.5px solid #C5A059",
                  zIndex: 30,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingLeft: "12px",
                  paddingTop: "12px",
                  color: "white"
                }}>
                  <span style={{ fontSize: "13px", marginBottom: "2px" }}>🐾</span>
                  <span style={{ fontSize: "11px", fontWeight: "900", color: "#C5A059", lineHeight: "1" }}>જીવદયા</span>
                </div>

                {/* 1. Header Banner Image */}
                {headerBase64 && (
                  <img 
                    src={headerBase64} 
                    alt="Header" 
                    style={{ 
                      width: "584px", 
                      height: "217px", 
                      marginLeft: "-20px",
                      marginRight: "-20px",
                      marginTop: "-20px",
                      borderBottom: "2.5px solid #C5A059",
                      zIndex: 10,
                      position: "relative",
                      display: "block"
                    }} 
                  />
                )}

                {/* 1. Header Area */}
                <div className="relative z-10" style={{ display: headerBase64 ? "none" : "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
                  {/* Top Slogans */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", margin: "0 0 4px 0" }}>
                    <span style={{ color: "#b91c1c", fontSize: "11.5px", fontWeight: "950" }}>॥ શ્રી મહાવીરાય નમઃ ॥</span>
                    <span style={{ color: "#b91c1c", fontSize: "13.5px", fontWeight: "950", marginTop: "2px" }}>✨ અહિંસા પરમો ધર્મ ✨</span>
                  </div>

                  {/* Logo & Main Title Banner */}
                  <div className="blue-border" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px", borderTop: "1.5px solid #0B2F64", borderBottom: "1.5px solid #0B2F64", padding: "5px 0", justifyContent: "center" }}>
                    {logoBase64 && logoBase64.startsWith("data:") ? (
                      <img 
                        src={logoBase64} 
                        alt="Logo" 
                        className="h-16 w-16 rounded-full object-cover bg-white gold-border shrink-0" 
                        style={{ border: '2px solid #C5A059' }}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-[9px] p-1.5 text-center leading-none gold-border shrink-0" style={{ border: '2px solid #C5A059', backgroundColor: '#0B2F64' }}>કરુણા મૈત્રી</div>
                    )}
                    
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <h2 style={{ color: '#043e22', fontSize: "28px", fontWeight: "950", margin: 0, lineHeight: "1.1", textShadow: "1.5px 1.5px 0px rgba(185, 28, 28, 0.4)" }}>
                        {settings?.orgNameGujarati || "કરુણા મૈત્રી ગ્રુપ"}
                      </h2>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                        <span style={{ backgroundColor: '#0b2f64', color: 'white', fontSize: "11px", fontWeight: "955", padding: "1px 12px", borderRadius: "9999px" }}>
                          📍 {settings?.location || "સુરેન્દ્રનગર"} 📍
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtitle */}
                  <p style={{ margin: "2px 0 0 0", color: "#b91c1c", fontSize: "11px", fontWeight: "900", fontStyle: "italic", textAlign: "center" }}>
                    "પ્રેમ, સેવા અને કરુણાથી બનાવીએ એક સુંદર સમાજ..."
                  </p>
                </div>

                {/* 2. Seva Activity Row */}
                {(() => {
                  const activeDetail = SEVA_DETAILS_MAP[donation.sevaTypeId] || SEVA_DETAILS_MAP["dudh-pova"];
                  return (
                    <div 
                      className="relative z-10" 
                      style={{ 
                        display: "flex", 
                        flexDirection: "row", 
                        gap: "10px", 
                        width: "100%",
                        height: "175px",
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Left Column: Activity Info Banner Card */}
                      <div 
                        className="gold-border"
                        style={{
                          width: "190px",
                          height: "175px",
                          backgroundColor: "#0B2F64",
                          border: "2.5px solid #C5A059",
                          borderRadius: "14px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          overflow: "hidden",
                          flexShrink: 0
                        }}
                      >
                        <div style={{ backgroundColor: "rgba(255,255,255,0.08)", padding: "4px", textAlign: "center", borderBottom: "1px solid rgba(197, 160, 89, 0.3)" }}>
                          <p style={{ margin: 0, color: "white", fontSize: "10.5px", fontWeight: "950", textAlign: "center" }}>🐾 {activeDetail.title} 🐾</p>
                        </div>
                        
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 6px", textAlign: "center" }}>
                          <p style={{ margin: 0, color: "#C5A059", fontSize: "11px", fontWeight: "900" }}>{activeDetail.subtitle}</p>
                          <p style={{ margin: "2px 0", color: "white", fontSize: "21px", fontWeight: "955", lineHeight: "1.1" }}>{activeDetail.highlightVal}</p>
                          <p style={{ margin: 0, color: "#C5A059", fontSize: "11px", fontWeight: "900" }}>{activeDetail.highlightUnit}</p>
                          
                          <div style={{ backgroundColor: "#b91c1c", color: "#f59e0b", padding: "2px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "955", border: "1px solid #C5A059", marginTop: "4px" }}>
                            {activeDetail.boxText}
                          </div>
                          <p style={{ margin: "3px 0 0 0", color: "white", fontSize: "9.5px", fontWeight: "900" }}>{activeDetail.verb}</p>
                        </div>

                        <div style={{ backgroundColor: "rgba(255,255,255,0.06)", padding: "3px", borderTop: "1px solid rgba(197, 160, 89, 0.2)" }}>
                          <p style={{ margin: 0, color: "white", fontSize: "8.5px", fontWeight: "900", textAlign: "center", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {activeDetail.bottomBar}
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Seva Photo (Dogs Collage / custom) - covers full remaining space */}
                      <div 
                        className="gold-border"
                        style={{ 
                          flex: 1,
                          height: "175px", 
                          borderRadius: "14px", 
                          overflow: "hidden", 
                          border: '2.5px solid #C5A059', 
                          backgroundColor: '#FAF9F6',
                          position: "relative"
                        }}
                      >
                        {bgBase64 ? (
                          <img 
                            src={bgBase64} 
                            alt="Seva Collage" 
                            style={{ 
                              width: "100%", 
                              height: "100%", 
                              objectFit: "cover", 
                              display: "block" 
                            }} 
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#9CA3AF" }}>
                            જીવદયા પ્રવૃત્તિઓ
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Donor Info Area (Main highlight block with dynamic photo alignment) */}
                {(() => {
                  const hasPhoto = donorPhotoBase64 && donorPhotoBase64.startsWith("data:");
                  const isDeceasedOccasion = donation.occasionType && ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(donation.occasionType);
                  return (
                    <div 
                      className="relative z-10 gold-border" 
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                        border: '2px solid #C5A059',
                        borderRadius: "18px",
                        padding: hasPhoto ? "12px 18px" : "10px 15px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: hasPhoto ? "space-between" : "center",
                        gap: "15px",
                        width: "100%",
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Left column: Text details */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "3px" }}>
                        {/* Header badge */}
                        <div style={{ backgroundColor: "#7f1d1d", color: "white", padding: "2px 16px", borderRadius: "9999px", fontSize: "11px", fontWeight: "955", border: "1.5px solid #C5A059", display: "inline-block" }}>
                          {activeSeva?.nameGujarati || donation.sevaNameSnapshot} ના દાતા શ્રી
                        </div>

                        <h3 style={{ color: '#7f1d1d', fontSize: hasPhoto ? "31px" : "36px", fontWeight: "950", margin: "4px 0 2px 0", lineHeight: "1.2", letterSpacing: "0.2px" }}>
                          {donation.donorNameSnapshot}
                        </h3>
                        
                        {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                          <p style={{ margin: 0, color: '#0b2f64', fontSize: "15px", fontWeight: "955" }}>
                            {donation.occasionType} {donation.occasionDate ? `(${donation.occasionDate})` : ""} {donation.occasionType.endsWith("સ્મરણાર્થે") || ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(donation.occasionType) ? "" : "નિમિત્તે"}
                          </p>
                        )}

                        {isDeceasedOccasion && (
                          <p style={{ margin: "2px 0", color: '#b91c1c', fontSize: "13px", fontWeight: "955", fontStyle: "italic" }}>
                            🙏 ભગવાન તેમના દિવ્ય આત્માને પરમ શાંતિ અર્પે 🙏
                          </p>
                        )}

                        {donation.customMessage ? (
                          <p style={{ margin: "2px 0", color: '#0B2F64', fontSize: "12.5px", fontWeight: "900", fontStyle: "italic", lineHeight: "1.3" }}>
                            "{donation.customMessage}"
                          </p>
                        ) : (
                          <div style={{ backgroundColor: "rgba(11, 47, 100, 0.05)", border: "1px dashed rgba(11, 47, 100, 0.2)", padding: "2px 15px", borderRadius: "9999px", fontSize: "11px", fontWeight: "900", color: "#0B2F64", marginTop: "2px" }}>
                            હસ્તે, {donation.hasteName ? donation.hasteName : `${donation.donorNameSnapshot} સહ પરિવાર`}
                          </div>
                        )}

                        {/* Amount Banner Box */}
                        <div 
                          style={{ 
                            background: "radial-gradient(circle, #7f1d1d 0%, #581c1c 100%)",
                            border: "3px double #C5A059",
                            color: "#f59e0b",
                            fontSize: "23px",
                            fontWeight: "955",
                            padding: "3px 28px",
                            borderRadius: "9999px",
                            display: "inline-block",
                            marginTop: "4px",
                            lineHeight: "1",
                            boxShadow: "0 3px 5px rgba(0,0,0,0.15)"
                          }}
                        >
                          ₹ {donation.amount ? Number(donation.amount).toLocaleString("en-IN") : "0"} /-
                        </div>
                      </div>

                      {/* Right column: Donor photo */}
                      {hasPhoto && (
                        <div 
                          className="gold-border"
                          style={{ 
                            width: "120px", 
                            height: "155px", 
                            borderRadius: "14px", 
                            overflow: "hidden", 
                            flexShrink: 0,
                            padding: "2px",
                            border: '2.5px solid #C5A059', 
                            backgroundColor: '#ffffff',
                            backgroundImage: `url(${donorPhotoBase64})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat"
                          }}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* 4. Hospital Activity / QR Code Grid */}
                <div 
                  className="relative z-10" 
                  style={{ 
                    display: footerBase64 ? "none" : "grid", 
                    gridTemplateColumns: showQrOnCard ? "1.45fr 0.55fr" : "1fr", 
                    gap: "10px", 
                    alignItems: "stretch",
                    width: "100%",
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Left/Main Card: Weekly Hospital Fruits Service */}
                  <div 
                    className="gold-border" 
                    style={{ 
                      backgroundColor: 'rgba(197, 160, 89, 0.04)', 
                      border: '1.5px solid rgba(197, 160, 89, 0.2)',
                      borderRadius: "14px",
                      padding: "8px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      justifyContent: "center"
                    }}
                  >
                    <p style={{ color: '#b91c1c', fontSize: "11px", fontWeight: "955", borderBottom: "1px solid rgba(185, 28, 28, 0.15)", paddingBottom: "2px", margin: 0 }}>
                      🏥 રવિવાર વિશેષ પ્રવૃતિ (Hospital Seva) :
                    </p>
                    <p style={{ margin: 0, fontSize: "10px", fontWeight: "900", color: "#374151", lineHeight: "1.4" }}>
                      દર રવિવારે ગાંધી હોસ્પિટલ, સી.જે. હોસ્પિટલ અને ટી.બી. હોસ્પિટલના જનરલ વોર્ડમાં દર્દીઓને પૌષ્ટિક ફ્રુટ (ફળ) વિતરણ કરવામાં આવે છે.
                    </p>
                  </div>

                  {/* Right: QR Scan Code (If toggled) */}
                  {showQrOnCard && settings?.qrImageUrl && settings.qrImageUrl.startsWith("data:") && (
                    <div 
                      className="gold-border" 
                      style={{ 
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #C5A059',
                        borderRadius: "14px",
                        padding: "6px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "3px"
                      }}
                    >
                      <img src={settings.qrImageUrl} alt="UPI QR" className="h-11 w-11 p-0.5 bg-white object-contain" />
                      <span style={{ fontSize: "6.5px", fontWeight: "955", color: "#0B2F64", textAlign: "center", lineHeight: "1" }}>UPI દાન સ્કેન કોડ</span>
                    </div>
                  )}
                </div>

                {/* 4. Footer Banner Image */}
                {footerBase64 && (
                  <img 
                    src={footerBase64} 
                    alt="Footer" 
                    style={{ 
                      width: "584px", 
                      height: "143px", 
                      marginLeft: "-20px",
                      marginRight: "-20px",
                      marginBottom: "-20px",
                      borderTop: "2.5px solid #C5A059",
                      zIndex: 10,
                      position: "relative",
                      display: "block"
                    }} 
                  />
                )}

                {/* 5. Footer quotes and slogans */}
                <div className="font-sans relative z-10" style={{ display: footerBase64 ? "none" : "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
                  
                  {/* Dark Green Motto Slogan Bar */}
                  <div 
                    className="w-full text-center" 
                    style={{ 
                      backgroundColor: '#043e22', 
                      color: '#C5A059', 
                      padding: "3px 0",
                      fontSize: "9px",
                      fontWeight: "955",
                      letterSpacing: "0.2px"
                    }}
                  >
                    🐾 સેવા એ જ ધર્મ, પ્રેમ એ જ શક્તિ, સહકાર એ જ મૈત્રી, જીવદયા એ જ મહાધર્મ 🐾
                  </div>

                  {/* Slogan */}
                  <p style={{ color: "#0B2F64", fontSize: "10px", fontWeight: "900", fontStyle: "italic", textAlign: "center", margin: "1px 0" }}>
                    “ભવિષ્યમાં આપના તરફથી આજ રીતે જીવદયાના કાર્યમાં સહકાર મળતો રહે તેવી અપેક્ષા સહ... આભાર.”
                  </p>

                  {/* Jai Jinendra and Contacts section */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", fontWeight: "955", color: "#374151", borderTop: "1px solid rgba(197, 160, 89, 0.2)", paddingTop: "4px", paddingLeft: "4px", paddingRight: "4px" }}>
                    <span style={{ color: "#b91c1c" }}>🙏 જય જિનેન્દ્ર</span>
                    <span>તારીખ: {donation.donationDate}</span>
                    <span style={{ color: "#b91c1c" }}>આભાર સહ ❇️</span>
                  </div>

                  {/* Three Contacts Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", textAlign: "center", fontSize: "8.5px", fontWeight: "955", color: "#4B5563", marginTop: "2px" }}>
                    <div className="bg-cream-50/50 p-1 border border-cream-100 rounded-lg">
                      <p style={{ margin: 0, color: "#0B2F64" }}>કેતલ વોરા</p>
                      <p style={{ margin: 0, fontFamily: "monospace" }}>9824255909</p>
                    </div>
                    <div className="bg-cream-50/50 p-1 border border-cream-100 rounded-lg">
                      <p style={{ margin: 0, color: "#0B2F64" }}>મયુર શાહ</p>
                      <p style={{ margin: 0, fontFamily: "monospace" }}>9429099906</p>
                    </div>
                    <div className="bg-cream-50/50 p-1 border border-cream-100 rounded-lg">
                      <p style={{ margin: 0, color: "#0B2F64" }}>મલય વસાણી</p>
                      <p style={{ margin: 0, fontFamily: "monospace" }}>9825530444</p>
                    </div>
                  </div>

                  {/* Funding and FB badge */}
                  <div 
                    className="w-full text-center" 
                    style={{ 
                      background: 'linear-gradient(to right, #7f1d1d, #b91c1c, #7f1d1d)', 
                      color: 'white', 
                      padding: "3px 0",
                      borderRadius: "8px",
                      fontSize: "8px",
                      fontWeight: "955",
                      display: "flex",
                      justifyContent: "space-around",
                      alignItems: "center"
                    }}
                  >
                    <span>💰 ઓનલાઈન ફંડ માટે Mo. 99041 37061</span>
                    <span style={{ opacity: 0.8 }}>f / KARUNA MAITRI GROUP, SURENDRANAGAR</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>

      {/* 
        Hidden rendering card for 100% safe html2canvas downloads (un-scaled, offscreen).
        Completely styled with inline style colors and fixed container size to ensure pixel-perfect rendering.
        Absolutely zero Tailwind classes for colors, borders, or shadows are used here to prevent oklch crashes!
      */}
      <div 
        className="absolute" 
        style={{ 
          left: "-9999px", 
          top: "0",
          width: "600px",
          height: "820px",
          overflow: "hidden"
        }}
      >
        <div 
          ref={cardRef}
          className="w-[600px] h-[820px] select-none flex flex-col justify-between relative overflow-hidden safe-card-export"
          style={{ 
            fontFamily: "'Noto Sans Gujarati', sans-serif",
            border: "8px solid #043e22", // Forest green outer border
            background: "#FAF5EC", // Match background to banner cream color
            boxSizing: 'border-box',
            padding: "20px"
          }}
        >
          {/* Cloned override stylesheet for sandbox styling inside html2canvas */}
          <style dangerouslySetInnerHTML={{__html: `
            .safe-card-export, .safe-card-export * {
              --border-color: #FAF5EC !important;
              border-color: #FAF5EC !important;
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

          {/* Watermark Background collage at 4% opacity behind details */}
          {bgBase64 && (
            <div 
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${bgBase64})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.04,
                zIndex: 0
              }}
            />
          )}

          {/* Inner gold frame border */}
          <div 
            className="absolute pointer-events-none z-20 gold-border" 
            style={{ inset: "8px", border: "2px solid #C5A059", borderRadius: "12px" }} 
          />

          {/* 4 Arched Green Corners */}
          {/* Top-Left */}
          <div style={{
            position: "absolute",
            top: 0, left: 0,
            width: "80px", height: "80px",
            background: "#043e22",
            borderBottomRightRadius: "100%",
            borderRight: "2.5px solid #C5A059",
            borderBottom: "2.5px solid #C5A059",
            zIndex: 30,
            display: headerBase64 ? "none" : "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingRight: "12px",
            paddingBottom: "12px",
            color: "white"
          }}>
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#C5A059", lineHeight: "1" }}>કરુણા</span>
            <span style={{ fontSize: "13px", marginTop: "2px" }}>🖐️</span>
          </div>
          {/* Top-Right */}
          <div style={{
            position: "absolute",
            top: 0, right: 0,
            width: "80px", height: "80px",
            background: "#043e22",
            borderBottomLeftRadius: "100%",
            borderLeft: "2.5px solid #C5A059",
            borderBottom: "2.5px solid #C5A059",
            zIndex: 30,
            display: headerBase64 ? "none" : "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: "12px",
            paddingBottom: "12px",
            color: "white"
          }}>
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#C5A059", lineHeight: "1" }}>મૈત્રી</span>
            <span style={{ fontSize: "13px", marginTop: "2px" }}>🤝</span>
          </div>
          {/* Bottom-Left */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0,
            width: "80px", height: "80px",
            background: "#043e22",
            borderTopRightRadius: "100%",
            borderRight: "2.5px solid #C5A059",
            borderTop: "2.5px solid #C5A059",
            zIndex: 30,
            display: footerBase64 ? "none" : "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingRight: "12px",
            paddingTop: "12px",
            color: "white"
          }}>
            <span style={{ fontSize: "13px", marginBottom: "2px" }}>❤️</span>
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#C5A059", lineHeight: "1" }}>અનુકંપા</span>
          </div>
          {/* Bottom-Right */}
          <div style={{
            position: "absolute",
            bottom: 0, right: 0,
            width: "80px", height: "80px",
            background: "#043e22",
            borderTopLeftRadius: "100%",
            borderLeft: "2.5px solid #C5A059",
            borderTop: "2.5px solid #C5A059",
            zIndex: 30,
            display: footerBase64 ? "none" : "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingLeft: "12px",
            paddingTop: "12px",
            color: "white"
          }}>
            <span style={{ fontSize: "13px", marginBottom: "2px" }}>🐾</span>
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#C5A059", lineHeight: "1" }}>જીવદયા</span>
          </div>

          {/* 1. Header Banner Image */}
          {headerBase64 && (
            <img 
              src={headerBase64} 
              alt="Header" 
              style={{ 
                width: "584px", 
                height: "217px", 
                marginLeft: "-20px",
                marginRight: "-20px",
                marginTop: "-20px",
                borderBottom: "2.5px solid #C5A059",
                zIndex: 10,
                position: "relative",
                display: "block"
              }} 
            />
          )}

          {/* 1. Header Area */}
          <div className="relative z-10" style={{ display: headerBase64 ? "none" : "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
            {/* Top Slogans */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", margin: "0 0 4px 0" }}>
              <span style={{ color: "#b91c1c", fontSize: "11.5px", fontWeight: "950" }}>॥ શ્રી મહાવીરાય નમઃ ॥</span>
              <span style={{ color: "#b91c1c", fontSize: "13.5px", fontWeight: "950", marginTop: "2px" }}>✨ અહિંસા પરમો ધર્મ ✨</span>
            </div>

            {/* Logo & Main Title Banner */}
            <div className="blue-border" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px", borderTop: "1.5px solid #0B2F64", borderBottom: "1.5px solid #0B2F64", padding: "5px 0", justifyContent: "center" }}>
              {logoBase64 && logoBase64.startsWith("data:") ? (
                <img 
                  src={logoBase64} 
                  alt="Logo" 
                  className="h-16 w-16 rounded-full object-cover bg-white gold-border shrink-0" 
                  style={{ border: '2px solid #C5A059' }}
                />
              ) : (
                <div className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-[9px] p-1.5 text-center leading-none gold-border shrink-0" style={{ border: '2px solid #C5A059', backgroundColor: '#0B2F64' }}>કરુણા મૈત્રી</div>
              )}
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h2 style={{ color: '#043e22', fontSize: "28px", fontWeight: "955", margin: 0, lineHeight: "1.1", textShadow: "1.5px 1.5px 0px rgba(185, 28, 28, 0.4)" }}>
                  {settings?.orgNameGujarati || "કરુણા મૈત્રી ગ્રુપ"}
                </h2>
                
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                  <span style={{ backgroundColor: '#0b2f64', color: 'white', fontSize: "11px", fontWeight: "955", padding: "1px 12px", borderRadius: "9999px" }}>
                    📍 {settings?.location || "સુરેન્દ્રનગર"} 📍
                  </span>
                </div>
              </div>
            </div>
            
            {/* Subtitle */}
            <p style={{ margin: "2px 0 0 0", color: "#b91c1c", fontSize: "11px", fontWeight: "900", fontStyle: "italic", textAlign: "center" }}>
              "પ્રેમ, સેવા અને કરુણાથી બનાવીએ એક સુંદર સમાજ..."
            </p>
          </div>

          {/* 2. Seva Activity Row */}
          {(() => {
            const activeDetail = SEVA_DETAILS_MAP[donation.sevaTypeId] || SEVA_DETAILS_MAP["dudh-pova"];
            return (
              <div 
                className="relative z-10" 
                style={{ 
                  display: "flex", 
                  flexDirection: "row", 
                  gap: "10px", 
                  width: "100%",
                  height: "175px",
                  boxSizing: 'border-box'
                }}
              >
                {/* Left Column: Activity Info Banner Card */}
                <div 
                  className="gold-border"
                  style={{
                    width: "190px",
                    height: "175px",
                    backgroundColor: "#0B2F64",
                    border: "2.5px solid #C5A059",
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    overflow: "hidden",
                    flexShrink: 0
                  }}
                >
                  <div style={{ backgroundColor: "rgba(255,255,255,0.08)", padding: "4px", textAlign: "center", borderBottom: "1px solid rgba(197, 160, 89, 0.3)" }}>
                    <p style={{ margin: 0, color: "white", fontSize: "10.5px", fontWeight: "950", textAlign: "center" }}>🐾 {activeDetail.title} 🐾</p>
                  </div>
                  
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 6px", textAlign: "center", justifyContent: "center" }}>
                    <p style={{ margin: 0, color: "#C5A059", fontSize: "11px", fontWeight: "900" }}>{activeDetail.subtitle}</p>
                    <p style={{ margin: "2px 0", color: "white", fontSize: "21px", fontWeight: "955", lineHeight: "1.1" }}>{activeDetail.highlightVal}</p>
                    <p style={{ margin: 0, color: "#C5A059", fontSize: "11px", fontWeight: "900" }}>{activeDetail.highlightUnit}</p>
                    
                    <div style={{ backgroundColor: "#b91c1c", color: "#f59e0b", padding: "2px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "955", border: "1px solid #C5A059", marginTop: "4px" }}>
                      {activeDetail.boxText}
                    </div>
                    <p style={{ margin: "3px 0 0 0", color: "white", fontSize: "9.5px", fontWeight: "900" }}>{activeDetail.verb}</p>
                  </div>

                  <div style={{ backgroundColor: "rgba(255,255,255,0.06)", padding: "3px", borderTop: "1px solid rgba(197, 160, 89, 0.2)" }}>
                    <p style={{ margin: 0, color: "white", fontSize: "8.5px", fontWeight: "900", textAlign: "center", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {activeDetail.bottomBar}
                    </p>
                  </div>
                </div>

                {/* Right Column: Seva Photo (Dogs Collage / custom) - covers full remaining space */}
                <div 
                  className="gold-border"
                  style={{ 
                    flex: 1,
                    height: "175px", 
                    borderRadius: "14px", 
                    overflow: "hidden", 
                    border: '2.5px solid #C5A059', 
                    backgroundColor: '#FAF9F6',
                    position: "relative"
                  }}
                >
                  {bgBase64 ? (
                    <img 
                      src={bgBase64} 
                      alt="Seva Collage" 
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover", 
                        display: "block" 
                      }} 
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#9CA3AF" }}>
                      જીવદયા પ્રવૃત્તિઓ
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 3. Donor Info Area (Main highlight block with dynamic photo alignment) */}
          {(() => {
            const hasPhoto = donorPhotoBase64 && donorPhotoBase64.startsWith("data:");
            const isDeceasedOccasion = donation.occasionType && ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(donation.occasionType);
            return (
              <div 
                className="relative z-10 gold-border" 
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                  border: '2px solid #C5A059',
                  borderRadius: "18px",
                  padding: hasPhoto ? "12px 18px" : "10px 15px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: hasPhoto ? "space-between" : "center",
                  gap: "15px",
                  width: "100%",
                  boxSizing: 'border-box'
                }}
              >
                {/* Left column: Text details */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "3px" }}>
                  {/* Header badge */}
                  <div style={{ backgroundColor: "#7f1d1d", color: "white", padding: "2px 16px", borderRadius: "9999px", fontSize: "11px", fontWeight: "955", border: "1.5px solid #C5A059", display: "inline-block" }}>
                    {activeSeva?.nameGujarati || donation.sevaNameSnapshot} ના દાતા શ્રી
                  </div>

                  <p style={{ margin: "2px 0 0 0", color: '#0b2f64', fontSize: "11px", fontWeight: "955" }}>
                    તારીખ: {donation.donationDate ? donation.donationDate.split('-').reverse().join('-') : ""}
                  </p>

                  <h3 style={{ color: '#7f1d1d', fontSize: hasPhoto ? "31px" : "36px", fontWeight: "950", margin: "4px 0 2px 0", lineHeight: "1.2", letterSpacing: "0.2px" }}>
                    {donation.donorNameSnapshot}
                  </h3>
                  
                  {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                    <p style={{ margin: 0, color: '#0b2f64', fontSize: "15px", fontWeight: "955" }}>
                      {donation.occasionType} {donation.occasionDate ? `(${donation.occasionDate})` : ""} {donation.occasionType.endsWith("સ્મરણાર્થે") || ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(donation.occasionType) ? "" : "નિમિત્તે"}
                    </p>
                  )}

                  {isDeceasedOccasion && (
                    <p style={{ margin: "2px 0", color: '#b91c1c', fontSize: "13px", fontWeight: "955", fontStyle: "italic" }}>
                      🙏 ભગવાન તેમના દિવ્ય આત્માને પરમ શાંતિ અર્પે 🙏
                    </p>
                  )}

                  {donation.customMessage ? (
                    <p style={{ margin: "2px 0", color: '#0B2F64', fontSize: "12.5px", fontWeight: "900", fontStyle: "italic", lineHeight: "1.3" }}>
                      "{donation.customMessage}"
                    </p>
                  ) : (
                    <div style={{ backgroundColor: "rgba(11, 47, 100, 0.05)", border: "1px dashed rgba(11, 47, 100, 0.2)", padding: "2px 15px", borderRadius: "9999px", fontSize: "11px", fontWeight: "900", color: "#0B2F64", marginTop: "2px" }}>
                      હસ્તે, {donation.hasteName ? donation.hasteName : `${donation.donorNameSnapshot} સહ પરિવાર`}
                    </div>
                  )}

                  {/* Amount Banner Box */}
                  <div 
                    style={{ 
                      background: "radial-gradient(circle, #7f1d1d 0%, #581c1c 100%)",
                      border: "3px double #C5A059",
                      color: "#f59e0b",
                      fontSize: "23px",
                      fontWeight: "955",
                      padding: "3px 28px",
                      borderRadius: "9999px",
                      display: "inline-block",
                      marginTop: "4px",
                      lineHeight: "1",
                      boxShadow: "0 3px 5px rgba(0,0,0,0.15)"
                    }}
                  >
                    ₹ {donation.amount ? Number(donation.amount).toLocaleString("en-IN") : "0"} /-
                  </div>
                </div>

                {/* Right column: Donor photo */}
                {hasPhoto && (
                  <div 
                    className="gold-border"
                    style={{ 
                      width: "120px", 
                      height: "155px", 
                      borderRadius: "14px", 
                      overflow: "hidden", 
                      flexShrink: 0,
                      padding: "2px",
                      border: '2.5px solid #C5A059', 
                      backgroundColor: '#ffffff',
                      backgroundImage: `url(${donorPhotoBase64})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat"
                    }}
                  />
                )}
              </div>
            );
          })()}

          {/* 4. Footer Banner Image */}
          {footerBase64 && (
            <img 
              src={footerBase64} 
              alt="Footer" 
              style={{ 
                width: "100%", 
                height: "auto", 
                borderRadius: "14px", 
                border: '2.5px solid #C5A059',
                zIndex: 10,
                position: "relative",
                display: "block"
              }} 
            />
          )}

          {/* 4. Hospital Activity / QR Code Grid */}
          <div 
            className="relative z-10" 
            style={{ 
              display: footerBase64 ? "none" : "grid", 
              gridTemplateColumns: showQrOnCard ? "1.45fr 0.55fr" : "1fr", 
              gap: "10px", 
              alignItems: "stretch",
              width: "100%",
              boxSizing: 'border-box'
            }}
          >
            {/* Left/Main Card: Weekly Hospital Fruits Service */}
            <div 
              className="gold-border" 
              style={{ 
                backgroundColor: 'rgba(197, 160, 89, 0.04)', 
                border: '1.5px solid rgba(197, 160, 89, 0.2)',
                borderRadius: "14px",
                padding: "8px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                justifyContent: "center"
              }}
            >
              <p style={{ color: '#b91c1c', fontSize: "11px", fontWeight: "955", borderBottom: "1px solid rgba(185, 28, 28, 0.15)", paddingBottom: "2px", margin: 0 }}>
                🏥 રવિવાર વિશેષ પ્રવૃતિ (Hospital Seva) :
              </p>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: "900", color: "#374151", lineHeight: "1.4" }}>
                દર રવિવારે ગાંધી હોસ્પિટલ, સી.જે. હોસ્પિટલ અને ટી.બી. હોસ્પિટલના જનરલ વોર્ડમાં દર્દીઓને પૌષ્ટિક ફ્રુટ (ફળ) વિતરણ કરવામાં આવે છે.
              </p>
            </div>

            {/* Right: QR Scan Code (If toggled) */}
            {showQrOnCard && settings?.qrImageUrl && settings.qrImageUrl.startsWith("data:") && (
              <div 
                className="gold-border" 
                style={{ 
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #C5A059',
                  borderRadius: "14px",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "3px"
                }}
              >
                <img src={settings.qrImageUrl} alt="UPI QR" className="h-11 w-11 p-0.5 bg-white object-contain" />
                <span style={{ fontSize: "6.5px", fontWeight: "955", color: "#0B2F64", textAlign: "center", lineHeight: "1" }}>UPI દાન સ્કેન કોડ</span>
              </div>
            )}
          </div>

          {/* 5. Footer & Contacts */}
          <div className="font-sans relative z-10" style={{ display: footerBase64 ? "none" : "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
            
            {/* Dark Green Motto Slogan Bar */}
            <div 
              className="w-full text-center" 
              style={{ 
                backgroundColor: '#043e22', 
                color: '#C5A059', 
                padding: "3px 0",
                fontSize: "9px",
                fontWeight: "955",
                letterSpacing: "0.2px"
              }}
            >
              🐾 સેવા એ જ ધર્મ, પ્રેમ એ જ શક્તિ, સહકાર એ જ મૈત્રી, જીવદયા એ જ મહાધર્મ 🐾
            </div>

            {/* Slogan */}
            <p style={{ color: "#0B2F64", fontSize: "10px", fontWeight: "900", fontStyle: "italic", textAlign: "center", margin: "1px 0" }}>
              “ભવિષ્યમાં આપના તરફથી આજ રીતે જીવદયાના કાર્યમાં સહકાર મળતો રહે તેવી અપેક્ષા સહ... આભાર.”
            </p>

            {/* Jai Jinendra and Contacts section */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", fontWeight: "955", color: "#374151", borderTop: "1px solid rgba(197, 160, 89, 0.2)", paddingTop: "4px", paddingLeft: "4px", paddingRight: "4px" }}>
              <span style={{ color: "#b91c1c" }}>🙏 જય જિનેન્દ્ર</span>
              <span>તારીખ: {donation.donationDate}</span>
              <span style={{ color: "#b91c1c" }}>આભાર સહ ❇️</span>
            </div>

            {/* Three Contacts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", textAlign: "center", fontSize: "8.5px", fontWeight: "955", color: "#4B5563", marginTop: "2px" }}>
              <div className="bg-cream-50/50 p-1 border border-cream-100 rounded-lg">
                <p style={{ margin: 0, color: "#0B2F64" }}>કેતલ વોરા</p>
                <p style={{ margin: 0, fontFamily: "monospace" }}>9824255909</p>
              </div>
              <div className="bg-cream-50/50 p-1 border border-cream-100 rounded-lg">
                <p style={{ margin: 0, color: "#0B2F64" }}>મયુર શાહ</p>
                <p style={{ margin: 0, fontFamily: "monospace" }}>9429099906</p>
              </div>
              <div className="bg-cream-50/50 p-1 border border-cream-100 rounded-lg">
                <p style={{ margin: 0, color: "#0B2F64" }}>મલય વસાણી</p>
                <p style={{ margin: 0, fontFamily: "monospace" }}>9825530444</p>
              </div>
            </div>

            {/* Funding and FB badge */}
            <div 
              className="w-full text-center" 
              style={{ 
                background: 'linear-gradient(to right, #7f1d1d, #b91c1c, #7f1d1d)', 
                color: 'white', 
                padding: "3px 0",
                borderRadius: "8px",
                fontSize: "8px",
                fontWeight: "955",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center"
              }}
            >
              <span>💰 ઓનલાઈન ફંડ માટે Mo. 99041 37061</span>
              <span style={{ opacity: 0.8 }}>f / KARUNA MAITRI GROUP, SURENDRANAGAR</span>
            </div>

          </div>

        </div>
      </div>

      {/* Generated image Modal Overlay for 100% reliable mobile long-press downloads */}
      {exportedImage && (
        <div className="fixed inset-0 bg-black/85 flex flex-col items-center justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white max-w-md w-full p-5 rounded-2xl shadow-2xl border border-cream-200 text-center space-y-4 my-8 relative">
            <button 
              onClick={() => setExportedImage(null)} 
              className="absolute top-3 right-3 text-gray-405 hover:text-gray-600 font-bold text-lg p-1 bg-cream-50 hover:bg-cream-100 rounded-full h-8 w-8 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <h3 className="text-royal-855 font-extrabold text-base flex items-center gap-1.5 justify-center">
              <Gift className="h-5 w-5 text-saffron-500 animate-bounce" />
              પત્રિકા સેવ કરો (Save Certificate)
            </h3>
            
            <div className="text-left text-xs text-saffron-800 bg-saffron-500/10 border border-saffron-500/20 p-3 rounded-xl space-y-1 font-sans">
              <p>📱 <strong>મોબાઈલ માટે:</strong> ફોટો પર થોડી સેકન્ડ આંગળી દબાવી રાખો (Long Press) અને <strong>"Save Image" (ફોટો સેવ)</strong> પસંદ કરો.</p>
              <p>💻 <strong>કોમ્પ્યુટર માટે:</strong> ફોટો પર રાઇટ ક્લિક (Right Click) કરી <strong>"Save Image As..."</strong> પસંદ કરો.</p>
            </div>

            {/* Rendered clean canvas image */}
            <div className="border border-cream-100 rounded-xl overflow-hidden shadow-inner bg-cream-50/20 max-h-[55vh] flex items-center justify-center p-1 bg-white">
              <img 
                src={exportedImage} 
                alt="Generated Appreciation Card" 
                className="max-w-full max-h-[50vh] object-contain rounded"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2 text-xs font-bold font-sans">
              <button
                onClick={() => setExportedImage(null)}
                className="w-full py-3 bg-royal-800 hover:bg-royal-900 text-cream-50 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                પૂર્ણ કરો (Done)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
