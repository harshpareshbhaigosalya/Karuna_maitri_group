import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { ArrowLeft, Download, Share2, Gift } from "lucide-react";
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
    highlightVal: "400+",
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
  const [, setSevaList] = useState<SevaType[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-loaded Base64 assets
  const [bgBase64, setBgBase64] = useState<string>("");
  const [, setLogoBase64] = useState<string>("");
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
        if (settings?.defaultHeroImage) {
          setBgBase64(settings.defaultHeroImage);
        } else {
          try {
            const bgRes = await fetch("/card_bg.jpg");
            if (bgRes.ok) {
              const bgBlob = await bgRes.blob();
              const bgReader = new FileReader();
              bgReader.onloadend = () => setBgBase64(bgReader.result as string);
              bgReader.readAsDataURL(bgBlob);
            }
          } catch (e) {
            console.log("No card_bg fallback");
          }
        }

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

        const headerRes = await fetch("/header_banner.jpg");
        const headerBlob = await headerRes.blob();
        const headerReader = new FileReader();
        headerReader.onloadend = () => setHeaderBase64(headerReader.result as string);
        headerReader.readAsDataURL(headerBlob);

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
  }, [settings?.logoUrl, settings?.defaultHeroImage]);

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
        setDonorPhotoBase64(donation.donorPhotoUrl);
      }
    };
    loadDonorPhoto();
  }, [donation?.donorPhotoUrl]);

  const cleanCanvasOklch = (clonedDoc: Document) => {
    if (clonedDoc.documentElement) {
      clonedDoc.documentElement.style.borderColor = "transparent";
      clonedDoc.documentElement.style.color = "#111827";
      clonedDoc.documentElement.style.backgroundColor = "#FAF5EC";
      clonedDoc.documentElement.style.boxShadow = "none";
      clonedDoc.documentElement.style.outlineColor = "transparent";
    }

    if (clonedDoc.body) {
      clonedDoc.body.style.borderColor = "transparent";
      clonedDoc.body.style.color = "#111827";
      clonedDoc.body.style.backgroundColor = "#FAF5EC";
      clonedDoc.body.style.boxShadow = "none";
      clonedDoc.body.style.outlineColor = "transparent";
    }

    const elements = clonedDoc.querySelectorAll("*");
    elements.forEach((el: any) => {
      if (["P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(el.tagName)) {
        el.style.marginTop = "0px";
        el.style.marginBottom = "0px";
      }
      if (el.classList.contains("gold-border")) {
        el.style.borderColor = "#C5A059";
      } else if (el.classList.contains("blue-border")) {
        el.style.borderColor = "#0B2F64";
      } else if (el.classList.contains("safe-card-export")) {
        el.style.borderColor = "#043e22";
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
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#FAF5EC",
        logging: false,
        onclone: (clonedDoc) => {
          cleanCanvasOklch(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL("image/png");
      setExportedImage(imgData);

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

  const handleShareCard = async () => {
    if (!cardRef.current || !donation) return;
    try {
      setExporting(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#FAF5EC",
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

તમારું દાન આ અબોલ પશુ-પક્ષીઓ માટે જીવનદાન છે. આપનો હૃદયપૂર્વક આભાર.

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
        console.warn("Native file sharing failed, using fallback:", shareErr);
      }

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link
          to="/donations"
          className="inline-flex items-center gap-2 text-royal-800 hover:text-royal-900 font-bold transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="gujarati-text">દાન સૂચિ પર પાછા જાઓ</span>
        </Link>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportPng}
            disabled={exporting}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-gradient-to-r from-saffron-500 to-amber-600 hover:from-saffron-600 hover:to-amber-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? "ડાઉનલોડ થઈ રહ્યું છે..." : "કાર્ડ ડાઉનલોડ કરો"}</span>
          </button>

          <button
            onClick={handleShareCard}
            disabled={exporting}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            <span>શેર કરો (WhatsApp)</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Cols: Donation Metadata Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-200 space-y-4">
            <h2 className="text-lg font-bold text-royal-900 border-b border-cream-100 pb-3 font-sans flex items-center justify-between">
              <span>દાન રસીદ વિગતો</span>
              <span className="text-xs bg-royal-50 text-royal-800 px-2.5 py-1 rounded-full border border-royal-200">
                #{donation.id.slice(0, 8)}
              </span>
            </h2>

            <div className="space-y-3 font-sans text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-cream-50">
                <span className="text-gray-500">દાતાનું નામ:</span>
                <span className="font-bold text-royal-900">{donation.donorNameSnapshot}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-cream-50">
                <span className="text-gray-500">મોબાઈલ નંબર:</span>
                <span className="font-semibold text-gray-800">{donation.phoneSnapshot}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-cream-50">
                <span className="text-gray-500">સેવા પ્રકાર:</span>
                <span className="font-bold text-royal-800">{donation.sevaNameSnapshot}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-cream-50">
                <span className="text-gray-500">રકમ:</span>
                <span className="font-black text-emerald-700 text-base">₹ {donation.amount.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-cream-50">
                <span className="text-gray-500">દાન તારીખ:</span>
                <span className="font-medium text-gray-700">{donation.donationDate}</span>
              </div>

              {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                <div className="flex justify-between items-center py-1.5 border-b border-cream-50">
                  <span className="text-gray-500">પ્રસંગ પ્રકાર:</span>
                  <span className="font-bold text-royal-800">{donation.occasionType}</span>
                </div>
              )}

              {donation.hasteName && (
                <div className="flex justify-between items-center py-1.5 border-b border-cream-50">
                  <span className="text-gray-500">હસ્તે (દરમિયાન):</span>
                  <span className="font-semibold text-gray-800">{donation.hasteName}</span>
                </div>
              )}

              {donation.customMessage && (
                <div className="py-1.5 border-b border-cream-50">
                  <span className="text-gray-500 block mb-1">ખાસ સંદેશ:</span>
                  <span className="font-medium text-gray-800 italic bg-cream-50/50 p-2 rounded-lg block">"{donation.customMessage}"</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Interactive Certificate Card Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-cream-200 text-center space-y-4">
            <h3 className="text-royal-900 font-bold text-base flex items-center justify-center gap-2">
              <Gift className="h-5 w-5 text-saffron-500" />
              <span>ડિજિટલ સન્માન પત્રિકા પૂર્વાવલોકન (Card Preview)</span>
            </h3>

            {/* Scaled Responsive Card Container */}
            <div className="w-full flex justify-center overflow-hidden py-4 border border-cream-100 rounded-2xl bg-cream-50/20">
              <div className="w-[600px] h-[820px] scale-[0.48] sm:scale-[0.72] md:scale-100 origin-top shrink-0 -mb-[420px] sm:-mb-[220px] md:mb-0">
                
                {/* Visual preview replica */}

                <div 
                  
                  className="w-[600px] h-[820px] select-none flex flex-col justify-between relative overflow-hidden safe-card-export"
                  style={{ 
                    fontFamily: "'Noto Sans Gujarati', sans-serif",
                    background: "#FAF5EC",
                    boxSizing: 'border-box',
                    padding: "0",
                    margin: "0"
                  }}
                >
                  <style dangerouslySetInnerHTML={{__html: `
                    .safe-card-export, .safe-card-export * {
                      --border-color: #FAF5EC !important;
                      border-color: #FAF5EC !important;
                      outline-color: transparent !important;
                      box-shadow: none !important;
                      text-shadow: none !important;
                    }
                    .safe-card-export p, .safe-card-export h1, .safe-card-export h2, .safe-card-export h3, .safe-card-export h4 {
                      margin: 0 !important;
                      line-height: 1.2 !important;
                    }
                    .safe-card-export .gold-border {
                      border-color: #C5A059 !important;
                    }
                    .safe-card-export .blue-border {
                      border-color: #0B2F64 !important;
                    }
                  `}} />

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

                  {/* Top Header Banner Image */}
                  <img 
                    src={headerBase64 || "/header_banner.jpg"} 
                    alt="Header Banner" 
                    style={{ 
                      width: "100%", 
                      height: "217px", 
                      borderBottom: "2.5px solid #C5A059",
                      zIndex: 10,
                      position: "relative",
                      display: "block",
                      objectFit: "cover"
                    }} 
                  />

                  {/* Main Middle Container */}
                  <div style={{ flex: 1, padding: "12px 20px", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: "10px", zIndex: 10, position: "relative" }}>
                    
                    {/* Seva Activity Row */}
                    {(() => {
                      const activeDetail = SEVA_DETAILS_MAP[donation.sevaTypeId] || SEVA_DETAILS_MAP["dudh-pova"];
                      return (
                        <div 
                          className="relative z-10" 
                          style={{ 
                            display: "flex", 
                            flexDirection: "row", 
                            gap: "12px", 
                            width: "100%",
                            height: "175px",
                            boxSizing: 'border-box'
                          }}
                        >
                          <div 
                            className="gold-border"
                            style={{
                              width: "190px",
                              height: "175px",
                              backgroundColor: "#0B2F64",
                              border: "2.5px solid #C5A059",
                              borderRadius: "16px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              overflow: "hidden",
                              flexShrink: 0,
                              boxShadow: "0 4px 10px rgba(11, 47, 100, 0.18)"
                            }}
                          >
                            <div style={{ backgroundColor: "rgba(197, 160, 89, 0.22)", padding: "5px 4px", textAlign: "center", borderBottom: "1.5px solid #C5A059" }}>
                              <p style={{ margin: 0, color: "#FFFFFF", fontSize: "11px", fontWeight: "955", textAlign: "center", letterSpacing: "0.2px" }}>🐾 {activeDetail.title} 🐾</p>
                            </div>
                            
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 8px", textAlign: "center" }}>
                              <p style={{ margin: 0, color: "#FDE68A", fontSize: "11.5px", fontWeight: "900" }}>{activeDetail.subtitle}</p>
                              <p style={{ margin: "2px 0", color: "#FFFFFF", fontSize: "24px", fontWeight: "955", lineHeight: "1.1", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{activeDetail.highlightVal}</p>
                              <p style={{ margin: 0, color: "#FDE68A", fontSize: "11.5px", fontWeight: "900" }}>{activeDetail.highlightUnit}</p>
                              
                              <p style={{ margin: "4px 0 0 0", color: "#FDE68A", fontSize: "13.5px", fontWeight: "955", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                                {activeDetail.boxText}
                              </p>
                              <p style={{ margin: "2px 0 0 0", color: "#FFFFFF", fontSize: "9.5px", fontWeight: "900" }}>{activeDetail.verb}</p>
                            </div>

                            <div style={{ backgroundColor: "rgba(0, 0, 0, 0.35)", padding: "4px", borderTop: "1px solid rgba(197, 160, 89, 0.4)" }}>
                              <p style={{ margin: 0, color: "#FDE68A", fontSize: "9px", fontWeight: "955", textAlign: "center", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {activeDetail.bottomBar}
                              </p>
                            </div>
                          </div>

                          <div 
                            className="gold-border"
                            style={{ 
                              flex: 1,
                              height: "175px", 
                              borderRadius: "16px", 
                              overflow: "hidden", 
                              border: '2.5px solid #C5A059', 
                              backgroundColor: '#FAF9F6',
                              position: "relative",
                              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)"
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

                    {/* Donor Certificate Info (Pure Typography - ZERO Background Boxes / ZERO Capsules) */}
                    {(() => {
                      const hasPhoto = donorPhotoBase64 && donorPhotoBase64.startsWith("data:");
                      const isDeceasedOccasion = donation.occasionType && ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(donation.occasionType);
                      return (
                        <div 
                          className="relative z-10" 
                          style={{ 
                            padding: "6px 10px",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: hasPhoto ? "space-between" : "center",
                            gap: "15px",
                            width: "100%",
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "4px" }}>
                            
                            <div style={{ color: "#0B2F64", fontSize: "15px", fontWeight: "955", borderBottom: "2px solid #C5A059", paddingBottom: "2px", display: "inline-block", letterSpacing: "0.3px", margin: 0 }}>
                              ✨ {activeSeva?.nameGujarati || donation.sevaNameSnapshot} ના દાતા શ્રી ✨
                            </div>

                            <p style={{ margin: "2px 0 0 0", color: '#4B5563', fontSize: "12px", fontWeight: "900" }}>
                              તારીખ: {donation.donationDate ? donation.donationDate.split('-').reverse().join('-') : ""}
                            </p>

                            <h3 style={{ color: '#7f1d1d', fontSize: hasPhoto ? "32px" : "38px", fontWeight: "950", margin: "4px 0 2px 0", lineHeight: "1.1", letterSpacing: "0.2px" }}>
                              {donation.donorNameSnapshot}
                            </h3>
                            
                            {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                              <p style={{ margin: "1px 0 0 0", color: '#0b2f64', fontSize: "16px", fontWeight: "955" }}>
                                {donation.occasionType} {donation.occasionDate ? `(${donation.occasionDate})` : ""} {donation.occasionType.endsWith("સ્મરણાર્થે") || ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(donation.occasionType) ? "" : "નિમિત્તે"}
                              </p>
                            )}

                            {isDeceasedOccasion && (
                              <p style={{ margin: "2px 0 0 0", color: '#b91c1c', fontSize: "13.5px", fontWeight: "955", fontStyle: "italic" }}>
                                🙏 ભગવાન તેમના દિવ્ય આત્માને પરમ શાંતિ અર્પે 🙏
                              </p>
                            )}

                            {donation.customMessage ? (
                              <p style={{ margin: "2px 0 0 0", color: '#0B2F64', fontSize: "13px", fontWeight: "900", fontStyle: "italic", lineHeight: "1.3" }}>
                                "{donation.customMessage}"
                              </p>
                            ) : (
                              <p style={{ margin: "3px 0 0 0", color: '#0B2F64', fontSize: "13px", fontWeight: "900", fontStyle: "italic" }}>
                                હસ્તે: {donation.hasteName ? donation.hasteName : `${donation.donorNameSnapshot} સહ પરિવાર`}
                              </p>
                            )}

                            <div 
                              style={{ 
                                color: "#B45309",
                                fontSize: "32px",
                                fontWeight: "950",
                                marginTop: "6px",
                                lineHeight: "1",
                                letterSpacing: "0.5px",
                                borderBottom: "2px solid #C5A059",
                                paddingBottom: "2px",
                                display: "inline-block"
                              }}
                            >
                              ₹ {donation.amount ? Number(donation.amount).toLocaleString("en-IN") : "0"} /-
                            </div>
                          </div>

                          {hasPhoto && (
                            <div 
                              className="gold-border shrink-0"
                              style={{ 
                                width: "125px", 
                                height: "160px", 
                                borderRadius: "16px", 
                                overflow: "hidden", 
                                border: '2.5px solid #C5A059', 
                                backgroundColor: '#ffffff',
                                boxShadow: "0 3px 8px rgba(0,0,0,0.12)"
                              }}
                            >
                              <img 
                                src={donorPhotoBase64} 
                                alt="Donor" 
                                style={{ 
                                  width: "100%", 
                                  height: "100%", 
                                  objectFit: "cover", 
                                  display: "block" 
                                }} 
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>

                  {/* Bottom Footer Banner Image */}
                  <img 
                    src={footerBase64 || "/footer_banner.jpg"} 
                    alt="Footer Banner" 
                    style={{ 
                      width: "100%", 
                      height: "143px", 
                      borderTop: "2.5px solid #C5A059",
                      zIndex: 10,
                      position: "relative",
                      display: "block",
                      objectFit: "cover"
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden rendering card for 100% safe html2canvas downloads */}
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
                    background: "#FAF5EC",
                    boxSizing: 'border-box',
                    padding: "0",
                    margin: "0"
                  }}
                >
                  <style dangerouslySetInnerHTML={{__html: `
                    .safe-card-export, .safe-card-export * {
                      --border-color: #FAF5EC !important;
                      border-color: #FAF5EC !important;
                      outline-color: transparent !important;
                      box-shadow: none !important;
                      text-shadow: none !important;
                    }
                    .safe-card-export p, .safe-card-export h1, .safe-card-export h2, .safe-card-export h3, .safe-card-export h4 {
                      margin: 0 !important;
                      line-height: 1.2 !important;
                    }
                    .safe-card-export .gold-border {
                      border-color: #C5A059 !important;
                    }
                    .safe-card-export .blue-border {
                      border-color: #0B2F64 !important;
                    }
                  `}} />

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

                  {/* Top Header Banner Image */}
                  <img 
                    src={headerBase64 || "/header_banner.jpg"} 
                    alt="Header Banner" 
                    style={{ 
                      width: "100%", 
                      height: "217px", 
                      borderBottom: "2.5px solid #C5A059",
                      zIndex: 10,
                      position: "relative",
                      display: "block",
                      objectFit: "cover"
                    }} 
                  />

                  {/* Main Middle Container */}
                  <div style={{ flex: 1, padding: "12px 20px", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: "10px", zIndex: 10, position: "relative" }}>
                    
                    {/* Seva Activity Row */}
                    {(() => {
                      const activeDetail = SEVA_DETAILS_MAP[donation.sevaTypeId] || SEVA_DETAILS_MAP["dudh-pova"];
                      return (
                        <div 
                          className="relative z-10" 
                          style={{ 
                            display: "flex", 
                            flexDirection: "row", 
                            gap: "12px", 
                            width: "100%",
                            height: "175px",
                            boxSizing: 'border-box'
                          }}
                        >
                          <div 
                            className="gold-border"
                            style={{
                              width: "190px",
                              height: "175px",
                              backgroundColor: "#0B2F64",
                              border: "2.5px solid #C5A059",
                              borderRadius: "16px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              overflow: "hidden",
                              flexShrink: 0,
                              boxShadow: "0 4px 10px rgba(11, 47, 100, 0.18)"
                            }}
                          >
                            <div style={{ backgroundColor: "rgba(197, 160, 89, 0.22)", padding: "5px 4px", textAlign: "center", borderBottom: "1.5px solid #C5A059" }}>
                              <p style={{ margin: 0, color: "#FFFFFF", fontSize: "11px", fontWeight: "955", textAlign: "center", letterSpacing: "0.2px" }}>🐾 {activeDetail.title} 🐾</p>
                            </div>
                            
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 8px", textAlign: "center" }}>
                              <p style={{ margin: 0, color: "#FDE68A", fontSize: "11.5px", fontWeight: "900" }}>{activeDetail.subtitle}</p>
                              <p style={{ margin: "2px 0", color: "#FFFFFF", fontSize: "24px", fontWeight: "955", lineHeight: "1.1", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{activeDetail.highlightVal}</p>
                              <p style={{ margin: 0, color: "#FDE68A", fontSize: "11.5px", fontWeight: "900" }}>{activeDetail.highlightUnit}</p>
                              
                              <p style={{ margin: "4px 0 0 0", color: "#FDE68A", fontSize: "13.5px", fontWeight: "955", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                                {activeDetail.boxText}
                              </p>
                              <p style={{ margin: "2px 0 0 0", color: "#FFFFFF", fontSize: "9.5px", fontWeight: "900" }}>{activeDetail.verb}</p>
                            </div>

                            <div style={{ backgroundColor: "rgba(0, 0, 0, 0.35)", padding: "4px", borderTop: "1px solid rgba(197, 160, 89, 0.4)" }}>
                              <p style={{ margin: 0, color: "#FDE68A", fontSize: "9px", fontWeight: "955", textAlign: "center", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                {activeDetail.bottomBar}
                              </p>
                            </div>
                          </div>

                          <div 
                            className="gold-border"
                            style={{ 
                              flex: 1,
                              height: "175px", 
                              borderRadius: "16px", 
                              overflow: "hidden", 
                              border: '2.5px solid #C5A059', 
                              backgroundColor: '#FAF9F6',
                              position: "relative",
                              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)"
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

                    {/* Donor Certificate Info (Pure Typography - ZERO Background Boxes / ZERO Capsules) */}
                    {(() => {
                      const hasPhoto = donorPhotoBase64 && donorPhotoBase64.startsWith("data:");
                      const isDeceasedOccasion = donation.occasionType && ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(donation.occasionType);
                      return (
                        <div 
                          className="relative z-10" 
                          style={{ 
                            padding: "6px 10px",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: hasPhoto ? "space-between" : "center",
                            gap: "15px",
                            width: "100%",
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "4px" }}>
                            
                            <div style={{ color: "#0B2F64", fontSize: "15px", fontWeight: "955", borderBottom: "2px solid #C5A059", paddingBottom: "2px", display: "inline-block", letterSpacing: "0.3px", margin: 0 }}>
                              ✨ {activeSeva?.nameGujarati || donation.sevaNameSnapshot} ના દાતા શ્રી ✨
                            </div>

                            <p style={{ margin: "2px 0 0 0", color: '#4B5563', fontSize: "12px", fontWeight: "900" }}>
                              તારીખ: {donation.donationDate ? donation.donationDate.split('-').reverse().join('-') : ""}
                            </p>

                            <h3 style={{ color: '#7f1d1d', fontSize: hasPhoto ? "32px" : "38px", fontWeight: "950", margin: "4px 0 2px 0", lineHeight: "1.1", letterSpacing: "0.2px" }}>
                              {donation.donorNameSnapshot}
                            </h3>
                            
                            {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                              <p style={{ margin: "1px 0 0 0", color: '#0b2f64', fontSize: "16px", fontWeight: "955" }}>
                                {donation.occasionType} {donation.occasionDate ? `(${donation.occasionDate})` : ""} {donation.occasionType.endsWith("સ્મરણાર્થે") || ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(donation.occasionType) ? "" : "નિમિત્તે"}
                              </p>
                            )}

                            {isDeceasedOccasion && (
                              <p style={{ margin: "2px 0 0 0", color: '#b91c1c', fontSize: "13.5px", fontWeight: "955", fontStyle: "italic" }}>
                                🙏 ભગવાન તેમના દિવ્ય આત્માને પરમ શાંતિ અર્પે 🙏
                              </p>
                            )}

                            {donation.customMessage ? (
                              <p style={{ margin: "2px 0 0 0", color: '#0B2F64', fontSize: "13px", fontWeight: "900", fontStyle: "italic", lineHeight: "1.3" }}>
                                "{donation.customMessage}"
                              </p>
                            ) : (
                              <p style={{ margin: "3px 0 0 0", color: '#0B2F64', fontSize: "13px", fontWeight: "900", fontStyle: "italic" }}>
                                હસ્તે: {donation.hasteName ? donation.hasteName : `${donation.donorNameSnapshot} સહ પરિવાર`}
                              </p>
                            )}

                            <div 
                              style={{ 
                                color: "#B45309",
                                fontSize: "32px",
                                fontWeight: "950",
                                marginTop: "6px",
                                lineHeight: "1",
                                letterSpacing: "0.5px",
                                borderBottom: "2px solid #C5A059",
                                paddingBottom: "2px",
                                display: "inline-block"
                              }}
                            >
                              ₹ {donation.amount ? Number(donation.amount).toLocaleString("en-IN") : "0"} /-
                            </div>
                          </div>

                          {hasPhoto && (
                            <div 
                              className="gold-border shrink-0"
                              style={{ 
                                width: "125px", 
                                height: "160px", 
                                borderRadius: "16px", 
                                overflow: "hidden", 
                                border: '2.5px solid #C5A059', 
                                backgroundColor: '#ffffff',
                                boxShadow: "0 3px 8px rgba(0,0,0,0.12)"
                              }}
                            >
                              <img 
                                src={donorPhotoBase64} 
                                alt="Donor" 
                                style={{ 
                                  width: "100%", 
                                  height: "100%", 
                                  objectFit: "cover", 
                                  display: "block" 
                                }} 
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                  </div>

                  {/* Bottom Footer Banner Image */}
                  <img 
                    src={footerBase64 || "/footer_banner.jpg"} 
                    alt="Footer Banner" 
                    style={{ 
                      width: "100%", 
                      height: "143px", 
                      borderTop: "2.5px solid #C5A059",
                      zIndex: 10,
                      position: "relative",
                      display: "block",
                      objectFit: "cover"
                    }} 
                  />
                </div>
      </div>

      {/* Generated image Modal Overlay */}
      {exportedImage && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center p-4 z-50 overflow-y-auto font-sans">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-2xl border border-cream-200 text-center space-y-4 my-8 relative">
            <button 
              onClick={() => setExportedImage(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-sm"
            >
              ✕
            </button>
            <h3 className="text-royal-900 font-bold text-lg">સન્માન પત્ર સેવ કરો (Save Certificate)</h3>
            
            <div className="text-left text-xs text-amber-800 bg-amber-50 p-3 rounded-xl space-y-1">
              <p>📱 <strong>મોબાઈલ માટે:</strong> ફોટો પર થોડી સેકન્ડ આંગળી દબાવી રાખો (Long Press) અને <strong>"Save Image" (ફોટો સેવ)</strong> પસંદ કરો.</p>
              <p>💻 <strong>કોમ્પ્યુટર માટે:</strong> ફોટો પર રાઇટ ક્લિક (Right Click) કરી <strong>"Save Image As..."</strong> પસંદ કરો.</p>
            </div>

            <div className="border border-cream-100 rounded-xl overflow-hidden shadow-inner bg-cream-50/20 max-h-[60vh] flex items-center justify-center p-2">
              <img 
                src={exportedImage} 
                alt="Generated Certificate" 
                className="max-w-full max-h-[55vh] object-contain rounded"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setExportedImage(null)}
                className="w-full py-2.5 bg-royal-800 text-white font-bold rounded-xl hover:bg-royal-900 transition-colors text-sm"
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