import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, getDocs, addDoc, doc, getDoc, serverTimestamp, where, updateDoc } from "firebase/firestore";
import { compressImageToBase64 } from "../utils/image";
import { 
  Search, 
  UserPlus, 
  Gift, 
  Calendar, 
  Heart, 
  Upload, 
  Share2, 
  Download, 
  Check, 
  AlertCircle,
  User
} from "lucide-react";
import { Donor, SevaType, OrganizationSettings } from "../types";
import { DEFAULT_SEVA_TYPES } from "../lib/dbSeed";
import { format, addYears } from "date-fns";
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

export const DonationEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const donorIdParam = searchParams.get("donorId");

  // Core configurations
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [sevaTypes, setSevaTypes] = useState<SevaType[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);

  // Search/Autocomplete Donor
  const [donorSearch, setDonorSearch] = useState("");
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isNewDonor, setIsNewDonor] = useState(false);

  // Form Fields
  const [donorName, setDonorName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedSevaId, setSelectedSevaId] = useState("");
  const [donationDate, setDonationDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [occasionType, setOccasionType] = useState("કોઈ પ્રસંગ નથી");
  const [occasionDate, setOccasionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customMessage, setCustomMessage] = useState("");
  const [hasteName, setHasteName] = useState("");
  const [showPhoneOnCard, setShowPhoneOnCard] = useState(true);
  
  // Base64 photos
  const [donorPhotoUrl, setDonorPhotoUrl] = useState("");
  const [showDonorPhoto, setShowDonorPhoto] = useState(true);
  const [showQrOnCard, setShowQrOnCard] = useState(true);

  // Pre-loaded Base64 local images to prevent html2canvas taint errors
  const [bgBase64, setBgBase64] = useState<string>("");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [headerBase64, setHeaderBase64] = useState<string>("");
  const [footerBase64, setFooterBase64] = useState<string>("");

  // Modal View state for mobile-safe downloads
  const [exportedImage, setExportedImage] = useState<string | null>(null);

  // Submission/Export States
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Load Initial Data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "org"));
        let activeSettings: OrganizationSettings;
        if (settingsSnap.exists()) {
          activeSettings = settingsSnap.data() as OrganizationSettings;
          setSettings(activeSettings);
          setShowQrOnCard(activeSettings.showQR);
        }

        const sevaSnap = await getDocs(query(collection(db, "sevaTypes"), where("active", "==", true)));
        const sevaItems: SevaType[] = [];
        sevaSnap.forEach((doc) => {
          sevaItems.push({ id: doc.id, ...doc.data() } as SevaType);
        });

        if (sevaItems.length > 0) {
          sevaItems.sort((a, b) => a.sortOrder - b.sortOrder);
          setSevaTypes(sevaItems);
          setSelectedSevaId(sevaItems[0].id);
        } else {
          setSevaTypes(DEFAULT_SEVA_TYPES as any);
          setSelectedSevaId(DEFAULT_SEVA_TYPES[0].id);
        }

        const donorSnap = await getDocs(collection(db, "donors"));
        const donorItems: Donor[] = [];
        donorSnap.forEach((doc) => {
          donorItems.push({ id: doc.id, ...doc.data() } as Donor);
        });
        setDonors(donorItems);

        if (donorIdParam) {
          const match = donorItems.find((d) => d.id === donorIdParam);
          if (match) {
            handleSelectDonor(match);
          }
        }
      } catch (err) {
        console.error("Error loading setup data:", err);
        setSevaTypes(DEFAULT_SEVA_TYPES as any);
        setSelectedSevaId(DEFAULT_SEVA_TYPES[0].id);
      }
    };

    loadInitialData();
  }, [donorIdParam]);

  // Load local images as Base64 to bypass CORS check in canvas downloads
  useEffect(() => {
    const loadAssetsAsBase64 = async () => {
      try {
        // Fetch Background
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

  // Click outside close autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDonor = (donor: Donor) => {
    setSelectedDonor(donor);
    setDonorName(donor.fullName);
    setPhone(donor.phone);
    setDonorSearch(`${donor.fullName} (${donor.phone})`);
    setIsNewDonor(false);
    setShowAutocomplete(false);
  };

  const handleCreateNewDonor = () => {
    setSelectedDonor(null);
    setDonorName(donorSearch);
    setPhone("");
    setIsNewDonor(true);
    setShowAutocomplete(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file, 450, 600, 0.85);
      setDonorPhotoUrl(base64);
      setShowDonorPhoto(true);
    } catch (err) {
      console.error("Image loading failed:", err);
      alert("ફોટો સેટ કરવામાં ભૂલ આવી.");
    }
  };

  const activeSeva = sevaTypes.find((s) => s.id === selectedSevaId);

  const normalizePhoneNumber = (num: string): string => {
    const cleaned = num.replace(/\D/g, "");
    return cleaned.slice(-10);
  };

  // Strips all oklch, oklab, shadows, and outline properties from cloned DOM before html2canvas converts it.
  const cleanCanvasOklch = (clonedDoc: Document) => {
    // 1. Clean the HTML root element
    if (clonedDoc.documentElement) {
      clonedDoc.documentElement.style.borderColor = "transparent";
      clonedDoc.documentElement.style.color = "#111827";
      clonedDoc.documentElement.style.backgroundColor = "#FAF9F6";
      clonedDoc.documentElement.style.boxShadow = "none";
      clonedDoc.documentElement.style.outlineColor = "transparent";
    }

    // 2. Clean the Body root element
    if (clonedDoc.body) {
      clonedDoc.body.style.borderColor = "transparent";
      clonedDoc.body.style.color = "#111827";
      clonedDoc.body.style.backgroundColor = "#FAF9F6";
      clonedDoc.body.style.boxShadow = "none";
      clonedDoc.body.style.outlineColor = "transparent";
    }

    // 3. Clean every element inside the document
    const elements = clonedDoc.querySelectorAll("*");
    elements.forEach((el: any) => {
      // Clear borders unless marked gold/blue/gray explicitly
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

      // Override computed text and background colors if they contain oklch
      const computed = window.getComputedStyle(el);
      if (computed.color && computed.color.includes("oklch")) {
        el.style.color = "#111827";
      }
      if (computed.backgroundColor && computed.backgroundColor.includes("oklch")) {
        el.style.backgroundColor = "transparent";
      }
    });
  };

  const handleSaveDonation = async () => {
    if (!donorName) {
      setErrorMsg("દાતાનું નામ જરૂરી છે.");
      return;
    }
    if (!phone || phone.length < 10) {
      setErrorMsg("૧૦ આંકડાનો ફોન નંબર જરૂરી છે.");
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg("માન્ય રકમ દાખલ કરો.");
      return;
    }
    if (!selectedSevaId) {
      setErrorMsg("સેવા પ્રકાર પસંદ કરો.");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");

      let finalDonorId = selectedDonor?.id || "";

      if (isNewDonor || !selectedDonor) {
        const normPhone = normalizePhoneNumber(phone);
        const dupQuery = query(collection(db, "donors"), where("normalizedPhone", "==", normPhone));
        const dupSnap = await getDocs(dupQuery);

        if (!dupSnap.empty) {
          finalDonorId = dupSnap.docs[0].id;
        } else {
          const newD = {
            fullName: donorName.trim(),
            phone: phone.trim(),
            normalizedPhone: normPhone,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          const dRef = await addDoc(collection(db, "donors"), newD);
          finalDonorId = dRef.id;
        }
      }

      // Convert occasionDate from YYYY-MM-DD back to MM-DD for reminder recurrences
      let finalOccasionDate = occasionDate;
      if (occasionType !== "કોઈ પ્રસંગ નથી" && occasionDate && occasionDate.includes("-")) {
        const dateParts = occasionDate.split("-");
        if (dateParts.length === 3) {
          finalOccasionDate = `${dateParts[1]}-${dateParts[2]}`; // MM-DD
        }
      }

      const donationData = {
        donorId: finalDonorId,
        donorNameSnapshot: donorName.trim(),
        phoneSnapshot: phone.trim(),
        sevaTypeId: selectedSevaId,
        sevaNameSnapshot: activeSeva?.nameGujarati || "",
        amount: Number(amount),
        donationDate: donationDate,
        occasionType: occasionType,
        occasionDate: occasionType !== "કોઈ પ્રસંગ નથી" ? finalOccasionDate : null,
        customMessage: customMessage.trim() || null,
        donorPhotoUrl: donorPhotoUrl || "",
        hasteName: hasteName.trim() || null,
        createdBy: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const donRef = await addDoc(collection(db, "donations"), donationData);

      // Handle automatic reminder updates
      if (occasionType && occasionType !== "કોઈ પ્રસંગ નથી") {
        try {
          const currentYear = new Date(donationDate).getFullYear();
          const remQuery = query(
            collection(db, "reminders"),
            where("donorId", "==", finalDonorId),
            where("occasionType", "==", occasionType),
            where("targetYear", "==", currentYear),
            where("status", "in", ["upcoming", "due", "overdue", "snoozed"])
          );
          const remSnap = await getDocs(remQuery);
          for (const docSnap of remSnap.docs) {
            await updateDoc(doc(db, "reminders", docSnap.id), {
              status: "completed",
              completedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error("Error resolving reminder:", err);
        }
      }

      // Record next year's reminder recurring
      if (occasionType && occasionType !== "કોઈ પ્રસંગ નથી" && finalOccasionDate) {
        const nextYearDate = addYears(new Date(donationDate), 1);
        const targetYear = nextYearDate.getFullYear();
        const nextYearStr = format(nextYearDate, "yyyy") + "-" + finalOccasionDate;

        const reminderData = {
          donorId: finalDonorId,
          sourceDonationId: donRef.id,
          occasionType: occasionType,
          occasionDate: finalOccasionDate,
          targetYear: targetYear,
          previousAmount: Number(amount),
          previousSeva: activeSeva?.nameGujarati || "",
          status: "upcoming",
          reminderDate: nextYearStr,
          createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, "reminders"), reminderData);
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Save donation error:", err);
      setErrorMsg(`દાન સાચવી શકાયું નથી: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPng = async () => {
    if (!cardRef.current) return;
    try {
      setSaving(true);
      setErrorMsg("");

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
      setExportedImage(imgData);

      // Trigger automatic file download attempt for desktop/PC
      try {
        const link = document.createElement("a");
        const cleanName = donorName.replace(/\s+/g, "-");
        link.download = `KM-Cert-${cleanName || "Anonymous"}-${selectedSevaId}-${donationDate}.png`;
        link.href = imgData;
        link.click();
      } catch (clickErr) {
        console.warn("Auto download triggered download pop-up blocker, opening modal fallback:", clickErr);
      }
    } catch (err: any) {
      console.error("Export card failed:", err);
      alert(`કાર્ડ એક્સપોર્ટ કરવામાં ખામી સર્જાઈ: ${err.message || String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Upgraded smart WhatsApp & File Web Share API Integration
  const handleShareCard = async () => {
    if (!cardRef.current) return;
    try {
      setSaving(true);
      setErrorMsg("");

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

      const cleanName = donorName.trim().replace(/\s+/g, "-") || "Anonymous";
      const shareText = `જય જિનેન્દ્ર,

કરુણા-મૈત્રી ગ્રુપ તરફથી આપના દાન બદલ હૃદયપૂર્વક આભાર.

*દાતાનું નામ:* ${donorName || "દાતાશ્રી"}
*સેવા પ્રકાર:* ${activeSeva?.nameGujarati || "જીવદયા સેવા"}
*દાનની રકમ:* ₹${amount ? Number(amount).toLocaleString("en-IN") : "0"}/-
*તારીખ:* ${donationDate}
${occasionType !== "કોઈ પ્રસંગ નથી" ? `*પ્રસંગ:* ${occasionType}` : ""}

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
        console.warn("Native file sharing not supported or cancelled:", shareErr);
      }

      // Fallback: Open WhatsApp and display long-press save modal
      setExportedImage(imgData);
      const cleanPhone = phone.replace(/\D/g, "");
      const whatsappPhone = cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone;
      const url = `https://api.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(shareText)}`;
      window.open(url, "_blank");

    } catch (err: any) {
      console.error("Export and share failed:", err);
      alert(`કાર્ડ શેર કરવામાં ભૂલ આવી: ${err.message || String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredAutocomplete = donors.filter((d) => {
    const q = donorSearch.toLowerCase();
    return d.fullName.toLowerCase().includes(q) || d.phone.includes(q);
  });

  const displayMembers = settings?.members?.filter(m => m.showOnCard) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">દાન પત્રિકા સન્માન પત્ર</h1>
        <p className="text-gray-500 mt-1">દાનની વિગત ભરો અને બાજુમાં લાઈવ સન્માન પત્ર જુઓ.</p>
      </div>

      {success ? (
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-cream-200 shadow-lg p-8 text-center space-y-6">
          <div className="bg-green-100 text-green-700 h-16 w-16 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-royal-855">સન્માન પત્ર તૈયાર છે!</h2>
            <p className="text-gray-500 mt-1">દાનની નોંધણી સફળતાપૂર્વક સાચવી લેવામાં આવી છે.</p>
          </div>

          <div className="border border-cream-100 p-4 rounded-xl bg-cream-50 text-left text-sm space-y-2">
            <p><strong>દાતા:</strong> {donorName}</p>
            <p><strong>રકમ:</strong> ₹{Number(amount).toLocaleString("en-IN")}/-</p>
            <p><strong>સેવા:</strong> {activeSeva?.nameGujarati}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleExportPng}
              className="flex items-center justify-center gap-2 bg-saffron-500 hover:bg-saffron-600 text-royal-800 font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <Download className="h-5 w-5" />
              <span>ડાઉનલોડ પત્રિકા</span>
            </button>
            <button
              onClick={handleShareCard}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <Share2 className="h-5 w-5" />
              <span>WhatsApp શેર કરો</span>
            </button>
          </div>

          <div className="pt-4 border-t border-cream-100">
            <button
              onClick={() => {
                setSuccess(false);
                setDonorSearch("");
                setSelectedDonor(null);
                setDonorName("");
                setPhone("");
                setAmount("");
                setOccasionType("કોઈ પ્રસંગ નથી");
                setOccasionDate(format(new Date(), "yyyy-MM-dd"));
                setCustomMessage("");
                setHasteName("");
                setDonorPhotoUrl("");
                setShowDonorPhoto(true);
              }}
              className="text-royal-800 hover:text-saffron-600 font-bold text-sm font-sans"
            >
              + બીજું દાન ઉમેરો
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
          
          {/* Form Side */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-royal-855 border-b border-cream-100 pb-3">દાનની માહિતી</h2>
            
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <span className="gujarati-text font-bold">{errorMsg}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Autocomplete */}
              <div className="relative" ref={autocompleteRef}>
                <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">દાતા શોધો અથવા ઉમેરો *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={donorSearch}
                    onChange={(e) => {
                      setDonorSearch(e.target.value);
                      setShowAutocomplete(true);
                      setSelectedDonor(null);
                      setIsNewDonor(true);
                      setDonorName(e.target.value);
                    }}
                    onFocus={() => setShowAutocomplete(true)}
                    placeholder="દાતાનું નામ અથવા ફોન નંબર..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-cream-200 text-sm"
                  />
                </div>

                {showAutocomplete && donorSearch && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-cream-200 rounded-xl shadow-lg z-55 max-h-60 overflow-y-auto divide-y divide-cream-50">
                    {filteredAutocomplete.map((donor) => (
                      <div
                        key={donor.id}
                        onClick={() => handleSelectDonor(donor)}
                        className="p-3.5 hover:bg-cream-50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-royal-800 text-sm">{donor.fullName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{donor.phone}</p>
                        </div>
                        <Check className="h-4 w-4 text-emerald-600" />
                      </div>
                    ))}
                    <div
                      onClick={handleCreateNewDonor}
                      className="p-3.5 hover:bg-royal-800 hover:text-white cursor-pointer text-royal-855 font-bold text-xs flex items-center gap-1.5"
                    >
                      <UserPlus className="h-4.5 w-4.5" />
                      <span>નવા દાતા ઉમેરો: "{donorSearch}"</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">દાતાનું નામ</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">ફોન નંબર *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="૧૦ આંકડાનો ફોન"
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Seva Selector Dropdown (Gujarati Only) */}
              <div>
                <label className="block text-xs font-extrabold text-royal-800 uppercase tracking-wider mb-2">સેવા પ્રકાર પસંદ કરો *</label>
                <select
                  value={selectedSevaId}
                  onChange={(e) => setSelectedSevaId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-cream-200 text-base font-extrabold text-royal-900 bg-white focus:outline-none focus:ring-2 focus:ring-royal-800 transition-all cursor-pointer shadow-sm"
                >
                  {sevaTypes.map((seva) => (
                    <option key={seva.id} value={seva.id}>
                      {seva.nameGujarati}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">દાનની રકમ *</label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm font-mono font-bold text-royal-850"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">તારીખ *</label>
                  <input
                    type="date"
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Occasion & Calendar Date Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">દાનનો પ્રસંગ</label>
                  <select
                    value={occasionType}
                    onChange={(e) => setOccasionType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-cream-200 text-sm"
                  >
                    <option value="કોઈ પ્રસંગ નથી">કોઈ પ્રસંગ નથી</option>
                    <option value="જન્મદિવસ">જન્મદિવસ</option>
                    <option value="તિથિ">તિથિ</option>
                    <option value="લગ્ન વર્ષગાંઠ">લગ્ન વર્ષગાંઠ</option>
                    <option value="પુણ્યતિથિ">પુણ્યતિથિ</option>
                    <option value="સ્મૃતિ દિવસ">સ્મૃતિ દિવસ</option>
                    <option value="સ્વર્ગવાસી">સ્વર્ગવાસી</option>
                    <option value="વર્ષગાંઠ">વર્ષગાંઠ</option>
                    <option value="અન્ય">અન્ય</option>
                  </select>
                </div>
                {occasionType !== "કોઈ પ્રસંગ નથી" && (
                  <div>
                    <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">પ્રસંગ તારીખ (કૅલેન્ડર પસંદગી) *</label>
                    <input
                      type="date"
                      value={occasionDate}
                      onChange={(e) => setOccasionDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Haste (Presented By) Input */}
              <div>
                <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">હસ્તે (Presented By / Through) - વૈકલ્પિક</label>
                <input
                  type="text"
                  value={hasteName}
                  onChange={(e) => setHasteName(e.target.value)}
                  placeholder="જો દાન આપનારનું નામ અલગ હોય (દા.ત. રમણભાઈ વસા)"
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm"
                />
              </div>

              {/* Image upload (Donor face photo only) */}
              <div>
                <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">દાતાશ્રીનો ફોટો</label>
                <div className="border border-dashed border-cream-300 p-4 rounded-xl flex flex-col items-center justify-center text-center bg-white relative hover:bg-cream-50/20">
                  <span className="text-[11px] font-bold text-royal-855">દાતાનો ફોટો (Donor Photo)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {donorPhotoUrl && <span className="text-[10px] text-emerald-600 font-bold mt-1">અપલોડ થયો ✓</span>}
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-cream-50/50 p-4 rounded-xl border border-cream-200/50 space-y-2 text-xs font-bold text-royal-800">
                <div className="flex items-center justify-between">
                  <span>કાર્ડ પર દાતાનો ફોન નંબર બતાવો?</span>
                  <input
                    type="checkbox"
                    checked={showPhoneOnCard}
                    onChange={(e) => setShowPhoneOnCard(e.target.checked)}
                    className="h-4.5 w-4.5 accent-royal-800"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>કાર્ડ પર QR કોડ બતાવવો?</span>
                  <input
                    type="checkbox"
                    checked={showQrOnCard}
                    onChange={(e) => setShowQrOnCard(e.target.checked)}
                    className="h-4.5 w-4.5 accent-royal-800"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">પત્રિકા આભાર સંદેશ</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={activeSeva?.defaultMessage}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-cream-100">
              <button
                onClick={handleSaveDonation}
                disabled={saving}
                className="w-full bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold py-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                {saving ? "સેવા થઈ રહી છે..." : "દાન વિગત નોંધો અને કાર્ડ બનાવો"}
              </button>
            </div>
          </div>

          {/* Card Preview Column */}
          <div className="lg:col-span-7 flex flex-col items-center gap-4 w-full">
            
            {/* Download/Share Actions */}
            <div className="flex items-center gap-3 w-full max-w-[400px]">
              <button
                onClick={handleExportPng}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-saffron-500 hover:bg-saffron-600 text-royal-800 font-bold py-2.5 px-3 rounded-xl shadow-sm text-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{saving ? "તૈયાર થઈ રહ્યું છે..." : "ડાઉનલોડ (PNG)"}</span>
              </button>
              <button
                onClick={handleShareCard}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-sm text-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                <span>WhatsApp શેર</span>
              </button>
            </div>

            {/* Scale container to display on screen */}
            <div className="w-full flex justify-center overflow-hidden py-4 border border-cream-100 rounded-2xl bg-cream-50/20">
              <div className="w-[600px] h-[820px] scale-[0.48] sm:scale-[0.72] md:scale-100 origin-top shrink-0 -mb-[420px] sm:-mb-[220px] md:mb-0">
                
                {/* Visual design replica only */}
                <div 
                  
                  className="w-[600px] h-[820px] select-none flex flex-col justify-between relative overflow-hidden safe-card-export"
                  style={{ 
                    fontFamily: "'Noto Sans Gujarati', sans-serif",
                    border: "8px solid #043e22",
                    background: "#FAF5EC",
                    boxSizing: 'border-box',
                    padding: "0"
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
                    .safe-card-export .gold-border {
                      border-color: #C5A059 !important;
                    }
                    .safe-card-export p, .safe-card-export h1, .safe-card-export h2, .safe-card-export h3, .safe-card-export h4 {
                      margin: 0 !important;
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

                  <div 
                    className="absolute pointer-events-none z-20 gold-border" 
                    style={{ inset: "8px", border: "2px solid #C5A059", borderRadius: "12px" }} 
                  />

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

                  <div style={{ flex: 1, padding: "12px 20px", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: "10px", zIndex: 10, position: "relative" }}>
                    
                    {(() => {
                      const activeDetail = SEVA_DETAILS_MAP[selectedSevaId] || SEVA_DETAILS_MAP["dudh-pova"];
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
                              <p style={{ margin: "2px 0", color: "#FFFFFF", fontSize: "23px", fontWeight: "955", lineHeight: "1.1", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{activeDetail.highlightVal}</p>
                              <p style={{ margin: 0, color: "#FDE68A", fontSize: "11.5px", fontWeight: "900" }}>{activeDetail.highlightUnit}</p>
                              
                              <p style={{ margin: "4px 0 0 0", color: "#FDE68A", fontSize: "13.5px", fontWeight: "955", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
     {activeDetail.boxText}
   </p>
                              <p style={{ margin: "3.5px 0 0 0", color: "#FFFFFF", fontSize: "9.5px", fontWeight: "900" }}>{activeDetail.verb}</p>
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

                    {(() => {
                      const hasPhoto = donorPhotoUrl && donorPhotoUrl.startsWith("data:");
                      const isDeceasedOccasion = ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(occasionType);
                      return (
                        <div 
                          className="relative z-10 gold-border" 
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                            border: '2px solid #C5A059',
                            borderRadius: "20px",
                            padding: hasPhoto ? "12px 18px" : "12px 16px",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: hasPhoto ? "space-between" : "center",
                            gap: "15px",
                            width: "100%",
                            boxSizing: 'border-box',
                            boxShadow: "0 4px 12px rgba(11, 47, 100, 0.06)"
                          }}
                        >
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "2px" }}>
                            
                            <div style={{ color: "#0B2F64", fontSize: "15px", fontWeight: "955", borderBottom: "2px solid #C5A059", paddingBottom: "2px", display: "inline-block", letterSpacing: "0.3px", margin: 0 }}>
     ✨ {activeSeva?.nameGujarati || "જીવદયા"} સેવા ના દાતા શ્રી ✨
   </div>

                            <p style={{ margin: "2px 0 0 0", color: '#0b2f64', fontSize: "11px", fontWeight: "955" }}>
                              તારીખ: {donationDate ? donationDate.split('-').reverse().join('-') : ""}
                            </p>

                            <h3 style={{ color: '#7f1d1d', fontSize: hasPhoto ? "30px" : "35px", fontWeight: "950", margin: "3px 0 1px 0", lineHeight: "1.2", letterSpacing: "0.2px" }}>
                              {donorName || "દાતાશ્રી..."}
                            </h3>
                            
                            {occasionType !== "કોઈ પ્રસંગ નથી" && (
                              <p style={{ margin: 0, color: '#0b2f64', fontSize: "14.5px", fontWeight: "955" }}>
                                {occasionType} {occasionType.endsWith("સ્મરણાર્થે") || ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(occasionType) ? "" : "નિમિત્તે"}
                              </p>
                            )}

                            {isDeceasedOccasion && (
                              <p style={{ margin: "2px 0", color: '#b91c1c', fontSize: "12.5px", fontWeight: "955", fontStyle: "italic" }}>
                                🙏 ભગવાન તેમના દિવ્ય આત્માને પરમ શાંતિ અર્પે 🙏
                              </p>
                            )}

                            {customMessage ? (
                              <p style={{ margin: "2px 0", color: '#0B2F64', fontSize: "12px", fontWeight: "900", fontStyle: "italic", lineHeight: "1.3" }}>
                                "{customMessage}"
                              </p>
                            ) : (
                              <p style={{ margin: "3px 0 0 0", color: "#0B2F64", fontSize: "13px", fontWeight: "900", fontStyle: "italic" }}>
     હસ્તે: {hasteName ? hasteName : (donorName ? `${donorName} સહ પરિવાર` : "દાતાશ્રી સહ પરિવાર")}
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
                               ₹ {amount ? Number(amount).toLocaleString("en-IN") : "0"} /-
                             </div>
                          </div>

                          {hasPhoto && (
                            <div 
                              className="gold-border shrink-0"
                              style={{ 
                                width: "120px", 
                                height: "155px", 
                                borderRadius: "16px", 
                                overflow: "hidden", 
                                border: '2.5px solid #C5A059', 
                                backgroundColor: '#ffffff',
                                boxShadow: "0 3px 8px rgba(0,0,0,0.12)"
                              }}
                            >
                              <img 
                                src={donorPhotoUrl} 
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
      )}

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
                    border: "8px solid #043e22",
                    background: "#FAF5EC",
                    boxSizing: 'border-box',
                    padding: "0"
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
                    .safe-card-export .gold-border {
                      border-color: #C5A059 !important;
                    }
                    .safe-card-export p, .safe-card-export h1, .safe-card-export h2, .safe-card-export h3, .safe-card-export h4 {
                      margin: 0 !important;
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

                  <div 
                    className="absolute pointer-events-none z-20 gold-border" 
                    style={{ inset: "8px", border: "2px solid #C5A059", borderRadius: "12px" }} 
                  />

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

                  <div style={{ flex: 1, padding: "12px 20px", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: "10px", zIndex: 10, position: "relative" }}>
                    
                    {(() => {
                      const activeDetail = SEVA_DETAILS_MAP[selectedSevaId] || SEVA_DETAILS_MAP["dudh-pova"];
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
                              <p style={{ margin: "2px 0", color: "#FFFFFF", fontSize: "23px", fontWeight: "955", lineHeight: "1.1", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{activeDetail.highlightVal}</p>
                              <p style={{ margin: 0, color: "#FDE68A", fontSize: "11.5px", fontWeight: "900" }}>{activeDetail.highlightUnit}</p>
                              
                              <p style={{ margin: "4px 0 0 0", color: "#FDE68A", fontSize: "13.5px", fontWeight: "955", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
     {activeDetail.boxText}
   </p>
                              <p style={{ margin: "3.5px 0 0 0", color: "#FFFFFF", fontSize: "9.5px", fontWeight: "900" }}>{activeDetail.verb}</p>
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

                    {(() => {
                      const hasPhoto = donorPhotoUrl && donorPhotoUrl.startsWith("data:");
                      const isDeceasedOccasion = ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(occasionType);
                      return (
                        <div 
                          className="relative z-10 gold-border" 
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                            border: '2px solid #C5A059',
                            borderRadius: "20px",
                            padding: hasPhoto ? "12px 18px" : "12px 16px",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: hasPhoto ? "space-between" : "center",
                            gap: "15px",
                            width: "100%",
                            boxSizing: 'border-box',
                            boxShadow: "0 4px 12px rgba(11, 47, 100, 0.06)"
                          }}
                        >
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "2px" }}>
                            
                            <div style={{ color: "#0B2F64", fontSize: "15px", fontWeight: "955", borderBottom: "2px solid #C5A059", paddingBottom: "2px", display: "inline-block", letterSpacing: "0.3px", margin: 0 }}>
     ✨ {activeSeva?.nameGujarati || "જીવદયા"} સેવા ના દાતા શ્રી ✨
   </div>

                            <p style={{ margin: "2px 0 0 0", color: '#0b2f64', fontSize: "11px", fontWeight: "955" }}>
                              તારીખ: {donationDate ? donationDate.split('-').reverse().join('-') : ""}
                            </p>

                            <h3 style={{ color: '#7f1d1d', fontSize: hasPhoto ? "30px" : "35px", fontWeight: "950", margin: "3px 0 1px 0", lineHeight: "1.2", letterSpacing: "0.2px" }}>
                              {donorName || "દાતાશ્રી..."}
                            </h3>
                            
                            {occasionType !== "કોઈ પ્રસંગ નથી" && (
                              <p style={{ margin: 0, color: '#0b2f64', fontSize: "14.5px", fontWeight: "955" }}>
                                {occasionType} {occasionType.endsWith("સ્મરણાર્થે") || ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(occasionType) ? "" : "નિમિત્તે"}
                              </p>
                            )}

                            {isDeceasedOccasion && (
                              <p style={{ margin: "2px 0", color: '#b91c1c', fontSize: "12.5px", fontWeight: "955", fontStyle: "italic" }}>
                                🙏 ભગવાન તેમના દિવ્ય આત્માને પરમ શાંતિ અર્પે 🙏
                              </p>
                            )}

                            {customMessage ? (
                              <p style={{ margin: "2px 0", color: '#0B2F64', fontSize: "12px", fontWeight: "900", fontStyle: "italic", lineHeight: "1.3" }}>
                                "{customMessage}"
                              </p>
                            ) : (
                              <p style={{ margin: "3px 0 0 0", color: "#0B2F64", fontSize: "13px", fontWeight: "900", fontStyle: "italic" }}>
     હસ્તે: {hasteName ? hasteName : (donorName ? `${donorName} સહ પરિવાર` : "દાતાશ્રી સહ પરિવાર")}
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
                               ₹ {amount ? Number(amount).toLocaleString("en-IN") : "0"} /-
                             </div>
                          </div>

                          {hasPhoto && (
                            <div 
                              className="gold-border shrink-0"
                              style={{ 
                                width: "120px", 
                                height: "155px", 
                                borderRadius: "16px", 
                                overflow: "hidden", 
                                border: '2.5px solid #C5A059', 
                                backgroundColor: '#ffffff',
                                boxShadow: "0 3px 8px rgba(0,0,0,0.12)"
                              }}
                            >
                              <img 
                                src={donorPhotoUrl} 
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
