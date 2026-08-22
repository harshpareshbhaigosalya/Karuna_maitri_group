import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore";
import { ArrowLeft, Download, Share2, Calendar, User, Heart, Gift } from "lucide-react";
import { Donation, OrganizationSettings, SevaType } from "../types";
import html2canvas from "html2canvas";

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
            <div className="w-[600px] h-[780px] scale-[0.52] sm:scale-[0.78] md:scale-100 origin-top shrink-0 -mb-[360px] sm:-mb-[170px] md:mb-0">
              
              {/* Visual preview replica */}
              <div 
                className="w-[600px] h-[780px] select-none flex flex-col justify-between relative overflow-hidden safe-card-export"
                style={{ 
                  fontFamily: "'Noto Sans Gujarati', sans-serif",
                  border: "6px solid #C5A059",
                  backgroundImage: "linear-gradient(180deg, #FAF9F6 0%, #FFFDF9 100%)",
                  boxSizing: 'border-box',
                  padding: "20px"
                }}
              >
                {/* Cloned override stylesheet for sandbox styling inside html2canvas */}
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

                {/* Watermark Background collage at 5% opacity behind details */}
                {bgBase64 && (
                  <div 
                    style={{
                      position: "absolute",
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundImage: `url(${bgBase64})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: 0.05,
                      zIndex: 0
                    }}
                  />
                )}

                <div 
                  className="absolute pointer-events-none z-20 gold-border" 
                  style={{ inset: "8px", border: "2px solid #C5A059", borderRadius: "12px" }} 
                />

                {/* Corner leafs */}
                <div className="absolute w-2 h-2 z-30" style={{ top: "12px", left: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
                <div className="absolute w-2 h-2 z-30" style={{ top: "12px", right: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
                <div className="absolute w-2 h-2 z-30" style={{ bottom: "12px", left: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
                <div className="absolute w-2 h-2 z-30" style={{ bottom: "12px", right: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />

                {/* 1. Header (Compact reference design layout) */}
                <div className="relative z-10" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* Top Slogan Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0 10px" }}>
                    <span style={{ color: "#b91c1c", fontSize: "13px", fontWeight: "900" }}>🚩 જીવદયા</span>
                    <span style={{ color: "#0B2F64", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" }}>અહિંસા પરમો ધર્મઃ</span>
                    <span style={{ color: "#b91c1c", fontSize: "13px", fontWeight: "900" }}>કરુણા 🚩</span>
                  </div>

                  {/* Logo & Org left, Contacts right */}
                  <div className="blue-border" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #0B2F64", borderBottom: "1px solid #0B2F64", padding: "6px 10px", marginTop: "2px" }}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
                      {logoBase64 && logoBase64.startsWith("data:") ? (
                        <img 
                          src={logoBase64} 
                          alt="Logo" 
                          className="h-14 w-14 rounded-full object-contain bg-white gold-border" 
                          style={{ border: '2px solid #C5A059' }}
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-[10px] p-2 text-center leading-none gold-border" style={{ border: '2px solid #C5A059', backgroundColor: '#0B2F64' }}>કરુણા મૈત્રી</div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <h2 style={{ color: '#0B2F64', fontSize: "17px", fontWeight: "900", margin: 0, lineHeight: "1.1" }}>{settings?.orgNameGujarati || "કરુણા-મૈત્રી ગ્રુપ"}</h2>
                        <span style={{ color: '#C5A059', fontSize: "10.5px", fontWeight: "900", margin: 0 }}>📍 {settings?.location || "સુરેન્દ્રનગર"}</span>
                      </div>
                    </div>

                    {/* Members list */}
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

                {/* 2. Donor Details Box */}
                <div 
                  className="text-center relative z-10" 
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    color: '#111827',
                    padding: "8px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                    boxSizing: 'border-box'
                  }}
                >
                  <p style={{ margin: 0, color: '#0B2F64', fontSize: "18px", fontWeight: "900" }}>
                    આજના <span style={{ textDecoration: "underline", textUnderlineOffset: "4px" }}>{activeSeva?.nameGujarati || donation.sevaNameSnapshot}</span> ના દાતા શ્રી,
                  </p>
                  <h3 style={{ color: '#b91c1c', fontSize: "24px", fontWeight: "950", margin: "2px 0" }}>
                    {donation.donorNameSnapshot}
                  </h3>
                  
                  {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
                    <p style={{ margin: 0, color: '#C5A059', fontSize: "16px", fontWeight: "900" }}>
                      🎉 {donation.occasionType} {donation.occasionDate ? `(${donation.occasionDate})` : ""} નિમિત્તે
                    </p>
                  )}

                  {donation.customMessage ? (
                    <p style={{ margin: 0, color: '#0B2F64', fontSize: "14px", fontWeight: "900", fontStyle: "italic" }}>
                      {donation.customMessage}
                    </p>
                  ) : (
                    <p style={{ margin: 0, color: '#0B2F64', fontSize: "14px", fontWeight: "900", fontStyle: "italic" }}>
                      હસ્તે, {donation.donorNameSnapshot} સહ પરિવાર
                    </p>
                  )}
                </div>

                {/* 3. Photos Side-by-Side (large Portrait donor image, covered Dogs Collage) */}
                <div 
                  className="relative z-10" 
                  style={{ 
                    display: "flex", 
                    flexDirection: "row", 
                    gap: "12px", 
                    justifyContent: "space-between", 
                    width: "100%",
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Left: Donor Portrait Image */}
                  {donorPhotoBase64 && donorPhotoBase64.startsWith("data:") ? (
                    <div 
                      className="gold-border"
                      style={{ 
                        width: "160px", 
                        height: "190px", 
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
                  ) : (
                    <div 
                      className="gold-border"
                      style={{ 
                        width: "160px", 
                        height: "190px", 
                        borderRadius: "14px", 
                        overflow: "hidden", 
                        flexShrink: 0, 
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center", 
                        justifyContent: "center",
                        border: '2.5px solid #C5A059', 
                        backgroundColor: '#ffffff',
                        color: '#D1D5DB'
                      }} 
                    >
                      <User className="h-10 w-10 mx-auto mb-1" style={{ color: '#D1D5DB' }} />
                      <p style={{ fontSize: "9px", fontWeight: "900", margin: 0, color: "#9CA3AF" }}>દાતાશ્રીનો ફોટો</p>
                    </div>
                  )}

                  {/* Right: Covered Dogs Collage */}
                  <div 
                    className="gold-border"
                    style={{ 
                      flex: 1,
                      height: "190px", 
                      borderRadius: "14px", 
                      overflow: "hidden", 
                      border: '2.5px solid #C5A059', 
                      backgroundColor: '#FAF9F6',
                      backgroundImage: bgBase64 ? `url(${bgBase64})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat"
                    }}
                  >
                    {!bgBase64 && (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#9CA3AF" }}>
                        જીવદયા પ્રવૃત્તિઓ
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Services list & Donation Details/QR Grid */}
                <div 
                  className="relative z-10" 
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1.2fr 0.8fr", 
                    gap: "12px", 
                    alignItems: "stretch",
                    width: "100%",
                    boxSizing: 'border-box'
                  }}
                >
                  
                  {/* Left: main services list */}
                  <div 
                    className="gold-border" 
                    style={{ 
                      backgroundColor: 'rgba(197, 160, 89, 0.04)', 
                      border: '1.5px solid rgba(197, 160, 89, 0.2)',
                      borderRadius: "14px",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <p style={{ color: '#0B2F64', fontSize: "11px", fontWeight: "900", borderBottom: "1.5px solid rgba(11, 47, 100, 0.15)", paddingBottom: "2px", margin: 0 }}>
                      🐾 કરુણા-મૈત્રી મુખ્ય જીવદયા કાર્યો :
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "10.5px", fontWeight: "900", color: "#374151" }}>
                      {sevaList.slice(0, 5).map((s, idx) => (
                        <p key={idx} style={{ margin: 0 }}>
                          <span style={{ color: '#b91c1c' }}>{idx + 1})</span> {s.nameGujarati}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Right: Donation Details and QR scanner */}
                  <div 
                    className="gold-border" 
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1.5px solid #C5A059',
                      borderRadius: "14px",
                      padding: "8px 12px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ textAlign: "center", width: "100%" }}>
                      <p style={{ margin: 0, fontSize: "10px", fontWeight: "900", color: "#6B7280" }}>દાન રકમ (Amount)</p>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: "950", color: "#0B2F64", fontFamily: "monospace" }}>
                        ₹{donation.amount.toLocaleString("en-IN")}/-
                      </p>
                      <p style={{ margin: "2px 0 0 0", fontSize: "10px", fontWeight: "900", color: "#374151", fontFamily: "monospace" }}>
                        તારીખ: {donation.donationDate}
                      </p>
                    </div>

                    {/* QR code */}
                    {settings?.showQR && settings?.qrImageUrl && settings.qrImageUrl.startsWith("data:") ? (
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px", borderTop: "1.5px solid #FAF9F6", paddingTop: "4.5px", marginTop: "4.5px", width: "100%", justifyContent: "center" }}>
                        <img src={settings.qrImageUrl} alt="Custom QR" className="h-10 w-10 p-0.5 bg-white object-contain" />
                        <span style={{ fontSize: "7px", fontWeight: "900", color: "#374151", lineHeight: "1.1", width: "45px" }}>UPI દાન સ્કેન કોડ</span>
                      </div>
                    ) : null}
                  </div>

                </div>

                {/* 5. Footer quotes and slogans */}
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
          height: "780px",
          overflow: "hidden"
        }}
      >
        <div 
          ref={cardRef}
          className="w-[600px] h-[780px] select-none flex flex-col justify-between relative overflow-hidden safe-card-export"
          style={{ 
            fontFamily: "'Noto Sans Gujarati', sans-serif",
            border: "6px solid #C5A059", // Solid Gold border
            background: "linear-gradient(180deg, #FAF9F6 0%, #FFFDF9 100%)",
            boxSizing: 'border-box',
            padding: "20px"
          }}
        >
          {/* Cloned override stylesheet for sandbox styling inside html2canvas */}
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

          {/* Watermark Background collage at 5% opacity behind details */}
          {bgBase64 && (
            <div 
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${bgBase64})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.05,
                zIndex: 0
              }}
            />
          )}

          {/* Inner gold border */}
          <div 
            className="absolute pointer-events-none z-20 gold-border" 
            style={{ inset: "8px", border: "2px solid #C5A059", borderRadius: "12px" }} 
          />

          {/* Corner leafs */}
          <div className="absolute w-2.5 h-2.5 z-30" style={{ top: "12px", left: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
          <div className="absolute w-2.5 h-2.5 z-30" style={{ top: "12px", right: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
          <div className="absolute w-2.5 h-2.5 z-30" style={{ bottom: "12px", left: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />
          <div className="absolute w-2.5 h-2.5 z-30" style={{ bottom: "12px", right: "12px", backgroundColor: "#C5A059", borderRadius: "9999px" }} />

          {/* 1. Header (Compact reference design layout) */}
          <div className="relative z-10" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {/* Top Slogan Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0 10px" }}>
              <span style={{ color: "#b91c1c", fontSize: "13px", fontWeight: "900" }}>🚩 જીવદયા</span>
              <span style={{ color: "#0B2F64", fontSize: "18px", fontWeight: "900", letterSpacing: "1px" }}>અહિંસા પરમો ધર્મઃ</span>
              <span style={{ color: "#b91c1c", fontSize: "13px", fontWeight: "900" }}>કરુણા 🚩</span>
            </div>

            {/* Logo & Org left, Contacts right */}
            <div className="blue-border" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #0B2F64", borderBottom: "1px solid #0B2F64", padding: "6px 10px", marginTop: "2px" }}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
                {logoBase64 && logoBase64.startsWith("data:") ? (
                  <img 
                    src={logoBase64} 
                    alt="Logo" 
                    className="h-14 w-14 rounded-full object-contain bg-white gold-border" 
                    style={{ border: '2.5px solid #C5A059' }}
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-[10px] p-2 text-center leading-none gold-border" style={{ border: '2.5px solid #C5A059', backgroundColor: '#0B2F64' }}>કરુણા મૈત્રી</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <h2 style={{ color: '#0B2F64', fontSize: "17px", fontWeight: "900", margin: 0, lineHeight: "1.1" }}>{settings?.orgNameGujarati || "કરુણા-મૈત્રી ગ્રુપ"}</h2>
                  <span style={{ color: '#C5A059', fontSize: "10.5px", fontWeight: "900", margin: 0 }}>📍 {settings?.location || "સુરેન્દ્રનગર"}</span>
                </div>
              </div>

              {/* Members list */}
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

          {/* 2. Donor Details Box */}
          <div 
            className="text-center relative z-10" 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.98)', 
              color: '#111827',
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              boxSizing: 'border-box'
            }}
          >
            <p style={{ margin: 0, color: '#0B2F64', fontSize: "18px", fontWeight: "900" }}>
              આજના <span style={{ textDecoration: "underline", textUnderlineOffset: "4px" }}>{activeSeva?.nameGujarati || donation.sevaNameSnapshot}</span> ના દાતા શ્રી,
            </p>
            <h3 style={{ color: '#b91c1c', fontSize: "24px", fontWeight: "950", margin: "2px 0" }}>
              {donation.donorNameSnapshot}
            </h3>
            
            {donation.occasionType && donation.occasionType !== "કોઈ પ્રસંગ નથી" && (
              <p style={{ margin: 0, color: '#C5A059', fontSize: "16px", fontWeight: "900" }}>
                🎉 {donation.occasionType} {donation.occasionDate ? `(${donation.occasionDate})` : ""} નિમિત્તે
              </p>
            )}

            {donation.customMessage ? (
              <p style={{ margin: 0, color: '#0B2F64', fontSize: "14px", fontWeight: "900", fontStyle: "italic" }}>
                {donation.customMessage}
              </p>
            ) : (
              <p style={{ margin: 0, color: '#0B2F64', fontSize: "14px", fontWeight: "900", fontStyle: "italic" }}>
                હસ્તે, {donation.donorNameSnapshot} સહ પરિવાર
              </p>
            )}
          </div>

          {/* 3. Photos Side-by-Side (large Portrait donor image, covered Dogs Collage) */}
          <div 
            className="relative z-10" 
            style={{ 
              display: "flex", 
              flexDirection: "row", 
              gap: "12px", 
              justifyContent: "space-between", 
              width: "100%",
              boxSizing: 'border-box'
            }}
          >
            {/* Left: Donor Portrait Image */}
            {donorPhotoBase64 && donorPhotoBase64.startsWith("data:") ? (
              <div 
                className="gold-border"
                style={{ 
                  width: "160px", 
                  height: "190px", 
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
            ) : (
              <div 
                className="gold-border"
                style={{ 
                  width: "160px", 
                  height: "190px", 
                  borderRadius: "14px", 
                  overflow: "hidden", 
                  flexShrink: 0, 
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center",
                  border: '2.5px solid #C5A059', 
                  backgroundColor: '#ffffff',
                  color: '#D1D5DB'
                }} 
              >
                <User className="h-10 w-10 mx-auto mb-1" style={{ color: '#D1D5DB' }} />
                <p style={{ fontSize: "9px", fontWeight: "900", margin: 0, color: "#9CA3AF" }}>દાતાશ્રીનો ફોટો</p>
              </div>
            )}

            {/* Right: Covered Dogs Collage */}
            <div 
              className="gold-border"
              style={{ 
                flex: 1,
                height: "190px", 
                borderRadius: "14px", 
                overflow: "hidden", 
                border: '2.5px solid #C5A059', 
                backgroundColor: '#FAF9F6',
                backgroundImage: bgBase64 ? `url(${bgBase64})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              }}
            >
              {!bgBase64 && (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#9CA3AF" }}>
                  જીવદયા પ્રવૃત્તિઓ
                </div>
              )}
            </div>
          </div>

          {/* 4. Services list & Donation Details/QR Grid */}
          <div 
            className="relative z-10" 
            style={{ 
              display: "grid", 
              gridTemplateColumns: "1.2fr 0.8fr", 
              gap: "12px", 
              alignItems: "stretch",
              width: "100%",
              boxSizing: 'border-box'
            }}
          >
            
            {/* Left: main services list */}
            <div 
              className="gold-border" 
              style={{ 
                backgroundColor: 'rgba(197, 160, 89, 0.04)', 
                border: '1.5px solid rgba(197, 160, 89, 0.2)',
                borderRadius: "14px",
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}
            >
              <p style={{ color: '#0B2F64', fontSize: "11px", fontWeight: "900", borderBottom: "1.5px solid rgba(11, 47, 100, 0.15)", paddingBottom: "2px", margin: 0 }}>
                🐾 કરુણા-મૈત્રી મુખ્ય જીવદયા કાર્યો :
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "10.5px", fontWeight: "900", color: "#374151" }}>
                {sevaList.slice(0, 5).map((s, idx) => (
                  <p key={idx} style={{ margin: 0 }}>
                    <span style={{ color: '#b91c1c' }}>{idx + 1})</span> {s.nameGujarati}
                  </p>
                ))}
              </div>
            </div>

            {/* Right: Donation Details and QR scanner */}
            <div 
              className="gold-border" 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1.5px solid #C5A059',
                borderRadius: "14px",
                padding: "8px 12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ textAlign: "center", width: "100%" }}>
                <p style={{ margin: 0, fontSize: "10px", fontWeight: "900", color: "#6B7280" }}>દાન રકમ (Amount)</p>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: "950", color: "#0B2F64", fontFamily: "monospace" }}>
                  ₹{donation.amount.toLocaleString("en-IN")}/-
                </p>
                <p style={{ margin: "2px 0 0 0", fontSize: "10px", fontWeight: "900", color: "#374151", fontFamily: "monospace" }}>
                  તારીખ: {donation.donationDate}
                </p>
              </div>

              {/* QR code */}
              {settings?.showQR && settings?.qrImageUrl && settings.qrImageUrl.startsWith("data:") ? (
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px", borderTop: "1.5px solid #FAF9F6", paddingTop: "4.5px", marginTop: "4.5px", width: "100%", justifyContent: "center" }}>
                  <img src={settings.qrImageUrl} alt="Custom QR" className="h-10 w-10 p-0.5 bg-white object-contain" />
                  <span style={{ fontSize: "7px", fontWeight: "900", color: "#374151", lineHeight: "1.1", width: "45px" }}>UPI દાન સ્કેન કોડ</span>
                </div>
              ) : null}
            </div>

          </div>

          {/* 5. Footer quotes and slogans */}
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
