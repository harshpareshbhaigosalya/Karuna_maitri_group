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
  User,
  BookUser,
  Smartphone,
  Users,
  Edit3,
  Palette,
  Sparkles,
  Type,
  ImagePlus,
  RotateCcw,
  Plus,
  Trash2,
  X,
  Sliders,
  CheckCircle2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Square,
  Circle,
  ImageIcon
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
    subtitle: "દરરોજ બીમાર",
    highlightVal: "અબોલ પશુ-પક્ષીઓ",
    highlightUnit: "માટે સ્થળ પર",
    boxText: "સારવાર-પાટાપીંડી",
    verb: "કરી સેવા આપીએ છીએ.",
    bottomBar: "ઓન-ધ-સ્પોટ સારવાર સેવા."
  },
  "water-pot": {
    title: "અમારી રોજની પ્રવૃતિ",
    subtitle: "ઉનાળામાં પક્ષીઓ",
    highlightVal: "હજારો અબોલ",
    highlightUnit: "જીવો માટે ઠંડુ",
    boxText: "પાણીના કુંડા",
    verb: "મુક્ત વિતરણ કરીએ છીએ.",
    bottomBar: "પાણીના કુંડા સેવા ઉપલબ્ધ."
  },
  "dog-shelter": {
    title: "અમારી રોજની પ્રવૃતિ",
    subtitle: "નિરાધાર શ્વાન",
    highlightVal: "શેલ્ટર હાઉસ",
    highlightUnit: "માં આશરો આપી",
    boxText: "રક્ષણ-ખોરાક",
    verb: "પૂરો પાડીએ છીએ.",
    bottomBar: "શેલ્ટર અને આજીવન આશરો."
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

type CardThemeId = "royal-cream" | "golden-divine" | "majestic-navy" | "sacred-green" | "canva-custom";

interface ThemeConfig {
  name: string;
  icon: string;
  desc: string;
  bg: string;
  outerBorder: string;
  innerBorder: string;
  sevaBoxBg: string;
  sevaBoxBorder: string;
  donorBoxBg: string;
  donorBoxBorder: string;
  donorColor: string;
  amountColor: string;
  accentColor: string;
}

const THEMES: Record<CardThemeId, ThemeConfig> = {
  "royal-cream": {
    name: "રોયલ હેરિટેજ",
    icon: "👑",
    desc: "પરંપરાગત ગોલ્ડ & ક્રીમ",
    bg: "#FAF5EC",
    outerBorder: "#043e22",
    innerBorder: "#C5A059",
    sevaBoxBg: "#0B2F64",
    sevaBoxBorder: "#C5A059",
    donorBoxBg: "rgba(255, 255, 255, 0.98)",
    donorBoxBorder: "#C5A059",
    donorColor: "#7f1d1d",
    amountColor: "#B45309",
    accentColor: "#0B2F64",
  },
  "golden-divine": {
    name: "ગોલ્ડન પ્રીમિયમ",
    icon: "🌟",
    desc: "દિવ્ય સોનેરી આભા",
    bg: "#FFFDF5",
    outerBorder: "#92400E",
    innerBorder: "#D97706",
    sevaBoxBg: "#78350F",
    sevaBoxBorder: "#F59E0B",
    donorBoxBg: "rgba(255, 255, 255, 0.98)",
    donorBoxBorder: "#F59E0B",
    donorColor: "#991B1B",
    amountColor: "#B45309",
    accentColor: "#78350F",
  },
  "majestic-navy": {
    name: "શાહી બ્લુ",
    icon: "🌊",
    desc: "શાહી નેવી અને ગોલ્ડ",
    bg: "#F8FAFC",
    outerBorder: "#0F172A",
    innerBorder: "#38BDF8",
    sevaBoxBg: "#0A2540",
    sevaBoxBorder: "#60A5FA",
    donorBoxBg: "rgba(255, 255, 255, 0.98)",
    donorBoxBorder: "#3B82F6",
    donorColor: "#0B2F64",
    amountColor: "#0284C7",
    accentColor: "#1E3A8A",
  },
  "sacred-green": {
    name: "પવિત્ર જીવદયા",
    icon: "🌿",
    desc: "પ્રકૃતિ અને કરુણા ગ્રીન",
    bg: "#F0FDF4",
    outerBorder: "#14532D",
    innerBorder: "#22C55E",
    sevaBoxBg: "#064E3B",
    sevaBoxBorder: "#10B981",
    donorBoxBg: "rgba(255, 255, 255, 0.98)",
    donorBoxBorder: "#10B981",
    donorColor: "#15803D",
    amountColor: "#B45309",
    accentColor: "#065F46",
  },
  "canva-custom": {
    name: "કેનવા કસ્ટમ",
    icon: "🎨",
    desc: "મનપસંદ રંગ & વિગતો",
    bg: "#FAF5EC",
    outerBorder: "#043e22",
    innerBorder: "#C5A059",
    sevaBoxBg: "#0B2F64",
    sevaBoxBorder: "#C5A059",
    donorBoxBg: "rgba(255, 255, 255, 0.98)",
    donorBoxBorder: "#C5A059",
    donorColor: "#7f1d1d",
    amountColor: "#B45309",
    accentColor: "#0B2F64",
  }
};

interface CustomSticker {
  id: string;
  imgUrl: string;
  width: number; // 30 to 250
  align: "left" | "center" | "right";
  positionY: "top" | "middle" | "bottom";
  shape: "rounded" | "circle" | "square";
  border: boolean;
}

interface CustomTextBox {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
}

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
  const [customSevaName, setCustomSevaName] = useState("");
  const [donationDate, setDonationDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [occasionType, setOccasionType] = useState("કોઈ પ્રસંગ નથી");
  const [customOccasion, setCustomOccasion] = useState("");
  const [occasionDate, setOccasionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customMessage, setCustomMessage] = useState("");
  const [hasteName, setHasteName] = useState("");
  const [showPhoneOnCard, setShowPhoneOnCard] = useState(true);
  
  // Base64 photos
  const [donorPhotoUrl, setDonorPhotoUrl] = useState("");
  const [showDonorPhoto, setShowDonorPhoto] = useState(true);
  const [donorPhotoWidth, setDonorPhotoWidth] = useState<number>(115);
  const [donorPhotoShape, setDonorPhotoShape] = useState<"rounded" | "circle" | "square">("rounded");
  const [showQrOnCard, setShowQrOnCard] = useState(true);

  // Seva Collage Image States
  const [sevaCollageImg, setSevaCollageImg] = useState<string>("");
  const [showSevaCollage, setShowSevaCollage] = useState<boolean>(true);

  // Pre-loaded Base64 local images to prevent html2canvas taint errors
  const [bgBase64, setBgBase64] = useState<string>("");
  const [logoBase64, setLogoBase64] = useState<string>("");
  const [headerBase64, setHeaderBase64] = useState<string>("");
  const [footerBase64, setFooterBase64] = useState<string>("");

  // Modal View state for mobile-safe downloads
  const [exportedImage, setExportedImage] = useState<string | null>(null);

  // Contact Picker Modal state
  const [showContactPickerModal, setShowContactPickerModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");

  // Canva Customizer & Design Card Theme States
  const [cardTheme, setCardTheme] = useState<CardThemeId>("royal-cream");
  const [isCanvaMode, setIsCanvaMode] = useState(false);
  const [cardBgColor, setCardBgColor] = useState("#FAF5EC");
  const [cardOuterBorder, setCardOuterBorder] = useState("#043e22");
  const [cardInnerBorder, setCardInnerBorder] = useState("#C5A059");
  const [donorFontSize, setDonorFontSize] = useState<number>(32);
  const [donorFontColor, setDonorFontColor] = useState<string>("#7f1d1d");
  const [amountFontSize, setAmountFontSize] = useState<number>(32);
  const [amountFontColor, setAmountFontColor] = useState<string>("#B45309");
  const [customTextBoxes, setCustomTextBoxes] = useState<CustomTextBox[]>([]);
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
  const [newTextContent, setNewTextContent] = useState("");

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
          if (activeSettings.defaultHeroImage) {
            setSevaCollageImg(activeSettings.defaultHeroImage);
          }
        }

        const sevaSnap = await getDocs(query(collection(db, "sevaTypes"), where("active", "==", true)));
        const sevaItems: SevaType[] = [];
        sevaSnap.forEach((doc) => {
          sevaItems.push({ id: doc.id, ...doc.data() } as SevaType);
        });

        if (sevaItems.length > 0) {
          setSevaTypes(sevaItems);
          setSelectedSevaId(sevaItems[0].id);
        } else {
          setSevaTypes(DEFAULT_SEVA_TYPES as any);
          setSelectedSevaId(DEFAULT_SEVA_TYPES[0].id);
        }

        const donorsSnap = await getDocs(collection(db, "donors"));
        const donorList: Donor[] = [];
        donorsSnap.forEach((doc) => {
          donorList.push({ id: doc.id, ...doc.data() } as Donor);
        });
        setDonors(donorList);

        if (donorIdParam) {
          const match = donorList.find((d) => d.id === donorIdParam);
          if (match) {
            handleSelectDonor(match);
          }
        }
      } catch (err) {
        console.error("Error loading donation entry data:", err);
        setSevaTypes(DEFAULT_SEVA_TYPES as any);
        if (DEFAULT_SEVA_TYPES.length > 0) {
          setSelectedSevaId(DEFAULT_SEVA_TYPES[0].id);
        }
      }
    };

    loadInitialData();
  }, [donorIdParam]);

  // Pre-load local images and convert to Base64 to bypass CORS in html2canvas
  useEffect(() => {
    const loadAssetsAsBase64 = async () => {
      try {
        // Seva collage fallback
        if (settings?.defaultHeroImage) {
          setSevaCollageImg(settings.defaultHeroImage);
        } else {
          try {
            const bgRes = await fetch("/card_bg.jpg");
            if (bgRes.ok) {
              const bgBlob = await bgRes.blob();
              const bgReader = new FileReader();
              bgReader.onloadend = () => {
                const b64 = bgReader.result as string;
                setBgBase64(b64);
                if (!sevaCollageImg) setSevaCollageImg(b64);
              };
              bgReader.readAsDataURL(bgBlob);
            }
          } catch (e) {
            console.log("No card_bg file");
          }
        }

        // Fetch Logo
        const logoUrl = settings?.logoUrl || "/logo.jpg";
        const logoRes = await fetch(logoUrl);
        if (logoRes.ok) {
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
  }, [settings?.logoUrl, settings?.defaultHeroImage]);

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
    setShowContactPickerModal(false);
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

  // Upload custom Seva Collage directly on this card
  const handleCustomSevaCollageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file, 600, 350, 0.75);
      setSevaCollageImg(base64);
      setShowSevaCollage(true);
    } catch (err) {
      console.error("Collage upload failed:", err);
      alert("કોલાજ ફોટો અપલોડ કરવામાં ભૂલ આવી.");
    }
  };

  // Web Contact Picker API Handler for Mobile Browsers
  const handlePickPhoneContact = async () => {
    try {
      if ("contacts" in navigator && "ContactsManager" in window) {
        const props = ["name", "tel"];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const c = contacts[0];
          if (c.name && c.name.length > 0 && c.name[0]) {
            setDonorName(c.name[0]);
            setDonorSearch(c.name[0]);
          }
          if (c.tel && c.tel.length > 0 && c.tel[0]) {
            const clean = c.tel[0].replace(/\D/g, "").slice(-10);
            setPhone(clean || c.tel[0]);
          }
          setShowContactPickerModal(false);
        }
      } else {
        alert(
          "આ બ્રાઉઝરમાં સીધો ફોનબુક એક્સેસ સપોર્ટ નથી. (Chrome Mobile / Android PWA માં આ ફીચર કામ કરે છે).\n\nતમે નીચે આપેલા 'એપમાં સેવ થયેલા દાતાઓ'માંથી પસંદ કરી શકો છો અથવા જાતે નંબર દાખલ કરી શકો છો."
        );
      }
    } catch (err: any) {
      console.log("Contact pick cancelled or error:", err);
    }
  };

  // Theme selection handler
  const handleSelectTheme = (themeKey: CardThemeId) => {
    setCardTheme(themeKey);
    const t = THEMES[themeKey];
    if (t) {
      setCardBgColor(t.bg);
      setCardOuterBorder(t.outerBorder);
      setCardInnerBorder(t.innerBorder);
      setDonorFontColor(t.donorColor);
      setAmountFontColor(t.amountColor);
    }
    if (themeKey === "canva-custom") {
      setIsCanvaMode(true);
    }
  };

  // Add custom sticker
  const handleAddSticker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file, 300, 300, 0.85);
      const newSticker: CustomSticker = {
        id: "stk-" + Date.now(),
        imgUrl: base64,
        width: 80,
        align: "center",
        positionY: "middle",
        shape: "rounded",
        border: true
      };
      setCustomStickers((prev) => [...prev, newSticker]);
    } catch (err) {
      console.error("Sticker upload failed:", err);
    }
  };

  // Update a sticker property
  const updateSticker = (id: string, updates: Partial<CustomSticker>) => {
    setCustomStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Remove sticker
  const removeSticker = (id: string) => {
    setCustomStickers((prev) => prev.filter((s) => s.id !== id));
  };

  // Add custom text box
  const handleAddCustomText = () => {
    if (!newTextContent.trim()) return;
    const newBox: CustomTextBox = {
      id: "tb-" + Date.now(),
      text: newTextContent.trim(),
      fontSize: 14,
      color: "#0B2F64",
      align: "center",
      bold: true
    };
    setCustomTextBoxes((prev) => [...prev, newBox]);
    setNewTextContent("");
  };

  // Update a text box property
  const updateTextBox = (id: string, updates: Partial<CustomTextBox>) => {
    setCustomTextBoxes((prev) =>
      prev.map((tb) => (tb.id === id ? { ...tb, ...updates } : tb))
    );
  };

  // Remove text box
  const removeTextBox = (id: string) => {
    setCustomTextBoxes((prev) => prev.filter((tb) => tb.id !== id));
  };

  const handleResetCanvaDesign = () => {
    handleSelectTheme("royal-cream");
    setDonorFontSize(32);
    setAmountFontSize(32);
    setDonorPhotoWidth(115);
    setDonorPhotoShape("rounded");
    setShowDonorPhoto(true);
    setShowSevaCollage(true);
    setCustomTextBoxes([]);
    setCustomStickers([]);
    setIsCanvaMode(false);
  };

  const activeSeva = sevaTypes.find((s) => s.id === selectedSevaId);

  // Compute final display values
  const displaySevaName = selectedSevaId === "other"
    ? (customSevaName.trim() || "અન્ય સેવા")
    : (activeSeva?.nameGujarati || "જીવદયા સેવા");

  const displayOccasionName = occasionType === "અન્ય"
    ? (customOccasion.trim() || "અન્ય પ્રસંગ")
    : occasionType;

  const normalizePhoneNumber = (num: string): string => {
    const cleaned = num.replace(/\D/g, "");
    return cleaned.slice(-10);
  };

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
        el.style.borderColor = cardInnerBorder;
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
    if (selectedSevaId === "other" && !customSevaName.trim()) {
      setErrorMsg("કૃપા કરીને સેવા પ્રવૃત્તિનું નામ જાતે દાખલ કરો.");
      return;
    }
    if (occasionType === "અન્ય" && !customOccasion.trim()) {
      setErrorMsg("કૃપા કરીને પ્રસંગનું નામ જાતે દાખલ કરો.");
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
        sevaNameSnapshot: displaySevaName,
        amount: Number(amount),
        donationDate: donationDate,
        occasionType: displayOccasionName,
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
            where("occasionType", "==", displayOccasionName),
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
          occasionType: displayOccasionName,
          occasionDate: finalOccasionDate,
          targetYear: targetYear,
          previousAmount: Number(amount),
          previousSeva: displaySevaName,
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
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: cardBgColor,
        logging: false,
        onclone: (clonedDoc) => {
          cleanCanvasOklch(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL("image/png");
      setExportedImage(imgData);

      try {
        const link = document.createElement("a");
        const cleanName = donorName.replace(/\s+/g, "-");
        link.download = `KM-Cert-${cleanName || "Anonymous"}-${selectedSevaId}-${donationDate}.png`;
        link.href = imgData;
        link.click();
      } catch (clickErr) {
        console.warn("Auto download triggered popup blocker, opening modal fallback:", clickErr);
      }
    } catch (err: any) {
      console.error("Export card failed:", err);
      alert(`કાર્ડ એક્સપોર્ટ કરવામાં ખામી સર્જાઈ: ${err.message || String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleShareCard = async () => {
    if (!cardRef.current) return;
    try {
      setSaving(true);
      setErrorMsg("");

      const canvas = await html2canvas(cardRef.current, {
        scale: 2.0,
        useCORS: true,
        allowTaint: false,
        backgroundColor: cardBgColor,
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
*સેવા પ્રકાર:* ${displaySevaName}
*દાનની રકમ:* ₹${amount ? Number(amount).toLocaleString("en-IN") : "0"}/-
*તારીખ:* ${donationDate}
${occasionType !== "કોઈ પ્રસંગ નથી" ? `*પ્રસંગ:* ${displayOccasionName}` : ""}

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

  const filteredModalDonors = donors.filter((d) => {
    const q = contactSearchQuery.toLowerCase();
    return d.fullName.toLowerCase().includes(q) || d.phone.includes(q);
  });

  const getActiveSevaDetails = () => {
    if (selectedSevaId !== "other" && SEVA_DETAILS_MAP[selectedSevaId]) {
      return SEVA_DETAILS_MAP[selectedSevaId];
    }
    return {
      title: "અમારી રોજની પ્રવૃતિ",
      subtitle: "અબોલ પશુ-પક્ષીઓ કાજે",
      highlightVal: "જીવદયા",
      highlightUnit: "સેવા અર્થે",
      boxText: displaySevaName,
      verb: "સમર્પિત કરવામાં આવે છે.",
      bottomBar: `${displaySevaName} કરવામાં આવે છે.`
    };
  };

  // Helper to render custom stickers by vertical placement (top, middle, bottom)
  const renderStickersByPosition = (pos: "top" | "middle" | "bottom") => {
    const list = customStickers.filter((s) => s.positionY === pos);
    if (list.length === 0) return null;

    return (
      <div className="w-full flex flex-wrap gap-2 items-center my-1 z-20" style={{
        justifyContent: list[0].align === "left" ? "flex-start" : list[0].align === "right" ? "flex-end" : "center"
      }}>
        {list.map((stk) => {
          const shapeStyle =
            stk.shape === "circle"
              ? "rounded-full"
              : stk.shape === "square"
              ? "rounded-none"
              : "rounded-xl";

          return (
            <div
              key={stk.id}
              className={`shrink-0 overflow-hidden ${shapeStyle} ${
                stk.border ? "gold-border shadow-md" : ""
              }`}
              style={{
                width: `${stk.width}px`,
                height: `${stk.width}px`,
                border: stk.border ? `2px solid ${cardInnerBorder}` : "none",
                backgroundColor: "#FFFFFF"
              }}
            >
              <img
                src={stk.imgUrl}
                alt="Custom Sticker"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // Reusable Certificate Card Renderer used for both on-screen preview and high-res export
  const renderCertificateCard = (isExport: boolean) => {
    const activeDetail = getActiveSevaDetails();
    const hasPhoto = showDonorPhoto && donorPhotoUrl && donorPhotoUrl.startsWith("data:");
    const isDeceasedOccasion = ["તિથિ", "પુણ્યતિથિ", "સ્મૃતિ દિવસ", "સ્વર્ગવાસી"].includes(displayOccasionName);
    const activeTheme = THEMES[cardTheme] || THEMES["royal-cream"];
    const collageSrc = sevaCollageImg || bgBase64 || "/card_bg.jpg";

    return (
      <div 
        ref={isExport ? cardRef : undefined}
        className="w-[600px] h-[820px] select-none flex flex-col justify-between relative overflow-hidden safe-card-export"
        style={{ 
          fontFamily: "'Noto Sans Gujarati', sans-serif",
          border: `8px solid ${cardOuterBorder}`,
          background: cardBgColor,
          boxSizing: 'border-box',
          padding: "0"
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          .safe-card-export, .safe-card-export * {
            --border-color: ${cardBgColor} !important;
            border-color: ${cardBgColor} !important;
            outline-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .safe-card-export .gold-border {
            border-color: ${cardInnerBorder} !important;
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

        {/* Decorative Inner Border */}
        <div 
          className="absolute pointer-events-none z-20 gold-border" 
          style={{ inset: "8px", border: `2px solid ${cardInnerBorder}`, borderRadius: "12px" }} 
        />

        {/* Top Header Banner */}
        <img 
          src={headerBase64 || "/header_banner.jpg"} 
          alt="Header Banner" 
          style={{ 
            width: "100%", 
            height: "217px", 
            borderBottom: `2.5px solid ${cardInnerBorder}`,
            zIndex: 10,
            position: "relative",
            display: "block",
            objectFit: "cover"
          }} 
        />

        {/* Middle Content Section */}
        <div style={{ flex: 1, padding: "8px 18px", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: "6px", zIndex: 10, position: "relative" }}>
          
          {/* Top Positioned Stickers */}
          {renderStickersByPosition("top")}

          {/* Seva Showcase Box */}
          <div 
            className="relative z-10" 
            style={{ 
              display: "flex", 
              flexDirection: "row", 
              gap: "12px", 
              width: "100%",
              height: "172px",
              boxSizing: 'border-box'
            }}
          >
            <div 
              className="gold-border"
              style={{
                width: showSevaCollage ? "190px" : "100%",
                height: "172px",
                backgroundColor: activeTheme.sevaBoxBg,
                border: `2.5px solid ${cardInnerBorder}`,
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
                flexShrink: 0,
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.16)"
              }}
            >
              <div style={{ backgroundColor: "rgba(197, 160, 89, 0.22)", padding: "5px 4px", textAlign: "center", borderBottom: `1.5px solid ${cardInnerBorder}` }}>
                <p style={{ margin: 0, color: "#FFFFFF", fontSize: "11px", fontWeight: "955", textAlign: "center", letterSpacing: "0.2px" }}>🐾 {activeDetail.title} 🐾</p>
              </div>
              
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 8px", textAlign: "center" }}>
                <p style={{ margin: 0, color: "#FDE68A", fontSize: "11px", fontWeight: "900" }}>{activeDetail.subtitle}</p>
                <p style={{ margin: "2px 0", color: "#FFFFFF", fontSize: "22px", fontWeight: "955", lineHeight: "1.1", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>{activeDetail.highlightVal}</p>
                <p style={{ margin: 0, color: "#FDE68A", fontSize: "11px", fontWeight: "900" }}>{activeDetail.highlightUnit}</p>
                <p style={{ margin: "3px 0 0 0", color: "#FDE68A", fontSize: "13px", fontWeight: "955", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                  {activeDetail.boxText}
                </p>
                <p style={{ margin: "3px 0 0 0", color: "#FFFFFF", fontSize: "9px", fontWeight: "900" }}>{activeDetail.verb}</p>
              </div>

              <div style={{ backgroundColor: "rgba(0, 0, 0, 0.35)", padding: "4px", borderTop: `1px solid ${cardInnerBorder}` }}>
                <p style={{ margin: 0, color: "#FDE68A", fontSize: "9px", fontWeight: "955", textAlign: "center", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {activeDetail.bottomBar}
                </p>
              </div>
            </div>

            {/* Seva Activity Collage Image Section */}
            {showSevaCollage && (
              <div 
                className="gold-border"
                style={{ 
                  flex: 1,
                  height: "172px", 
                  borderRadius: "16px", 
                  overflow: "hidden", 
                  border: `2.5px solid ${cardInnerBorder}`, 
                  backgroundColor: '#FAF9F6',
                  position: "relative",
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)"
                }}
              >
                {collageSrc ? (
                  <img 
                    src={collageSrc} 
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
            )}
          </div>

          {/* Middle Positioned Stickers */}
          {renderStickersByPosition("middle")}

          {/* Donor Felicitation Main Box */}
          <div 
            className="relative z-10 gold-border" 
            style={{ 
              backgroundColor: activeTheme.donorBoxBg, 
              border: `2px solid ${cardInnerBorder}`,
              borderRadius: "20px",
              padding: hasPhoto ? "10px 16px" : "10px 14px",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: hasPhoto ? "space-between" : "center",
              gap: "12px",
              width: "100%",
              boxSizing: 'border-box',
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)"
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "2px" }}>
              
              <div style={{ color: activeTheme.accentColor, fontSize: "14.5px", fontWeight: "955", borderBottom: `2px solid ${cardInnerBorder}`, paddingBottom: "2px", display: "inline-block", letterSpacing: "0.3px", margin: 0 }}>
                ✨ {displaySevaName} ના દાતા શ્રી ✨
              </div>

              <p style={{ margin: "2px 0 0 0", color: activeTheme.accentColor, fontSize: "11px", fontWeight: "955" }}>
                તારીખ: {donationDate ? donationDate.split('-').reverse().join('-') : ""}
              </p>

              <h3 style={{ 
                color: donorFontColor, 
                fontSize: `${donorFontSize}px`, 
                fontWeight: "950", 
                margin: "2px 0 1px 0", 
                lineHeight: "1.2", 
                letterSpacing: "0.2px" 
              }}>
                {donorName || "દાતાશ્રી..."}
              </h3>
              
              {occasionType !== "કોઈ પ્રસંગ નથી" && (
                <p style={{ margin: 0, color: activeTheme.accentColor, fontSize: "14px", fontWeight: "955" }}>
                  {displayOccasionName} {displayOccasionName.endsWith("સ્મરણાર્થે") || isDeceasedOccasion ? "" : "નિમિત્તે"}
                </p>
              )}

              {isDeceasedOccasion && (
                <p style={{ margin: "2px 0", color: '#b91c1c', fontSize: "12px", fontWeight: "955", fontStyle: "italic" }}>
                  🙏 ભગવાન તેમના દિવ્ય આત્માને પરમ શાંતિ અર્પે 🙏
                </p>
              )}

              {customMessage ? (
                <p style={{ margin: "2px 0", color: activeTheme.accentColor, fontSize: "11.5px", fontWeight: "900", fontStyle: "italic", lineHeight: "1.3" }}>
                  "{customMessage}"
                </p>
              ) : (
                <p style={{ margin: "2px 0 0 0", color: activeTheme.accentColor, fontSize: "12.5px", fontWeight: "900", fontStyle: "italic" }}>
                  હસ્તે: {hasteName ? hasteName : (donorName ? `${donorName} સહ પરિવાર` : "દાતાશ્રી સહ પરિવાર")}
                </p>
              )}

              {/* Amount Presentation */}
              <div 
                style={{ 
                  color: amountFontColor,
                  fontSize: `${amountFontSize}px`,
                  fontWeight: "950",
                  marginTop: "4px",
                  lineHeight: "1",
                  letterSpacing: "0.5px",
                  borderBottom: `2px solid ${cardInnerBorder}`,
                  paddingBottom: "2px",
                  display: "inline-block"
                }}
              >
                ₹ {amount ? Number(amount).toLocaleString("en-IN") : "0"} /-
              </div>

              {/* Custom User Added Text Boxes */}
              {customTextBoxes.map((tb) => (
                <div 
                  key={tb.id} 
                  style={{ 
                    marginTop: "3px", 
                    color: tb.color, 
                    fontSize: `${tb.fontSize}px`, 
                    fontWeight: tb.bold ? "950" : "700",
                    textAlign: tb.align,
                    width: "100%",
                    lineHeight: "1.2"
                  }}
                >
                  {tb.text}
                </div>
              ))}
            </div>

            {/* Donor Face Photo with Shape & Width Controls */}
            {hasPhoto && (
              <div 
                className={`gold-border shrink-0 ${
                  donorPhotoShape === "circle"
                    ? "rounded-full"
                    : donorPhotoShape === "square"
                    ? "rounded-none"
                    : "rounded-2xl"
                }`}
                style={{ 
                  width: `${donorPhotoWidth}px`, 
                  height: `${Math.round(donorPhotoWidth * 1.3)}px`, 
                  overflow: "hidden", 
                  border: `2.5px solid ${cardInnerBorder}`, 
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

          {/* Bottom Positioned Stickers */}
          {renderStickersByPosition("bottom")}
        </div>

        {/* Bottom Footer Banner */}
        <img 
          src={footerBase64 || "/footer_banner.jpg"} 
          alt="Footer Banner" 
          style={{ 
            width: "100%", 
            height: "143px", 
            borderTop: `2.5px solid ${cardInnerBorder}`,
            zIndex: 10,
            position: "relative",
            display: "block",
            objectFit: "cover"
          }} 
        />
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">દાન પત્રિકા સન્માન પત્ર</h1>
        <p className="text-gray-500 mt-1">દાનની વિગત ભરો, મનપસંદ ડિઝાઇન પસંદ કરો અને સન્માન પત્ર તૈયાર કરો.</p>
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
            <p><strong>સેવા:</strong> {displaySevaName}</p>
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
                setCustomOccasion("");
                setOccasionDate(format(new Date(), "yyyy-MM-dd"));
                setCustomMessage("");
                setHasteName("");
                setDonorPhotoUrl("");
                setShowDonorPhoto(true);
                handleResetCanvaDesign();
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

              {/* Name & Phone with Contact Picker Button */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">દાતાનું નામ *</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="દા.ત. મહેશભાઈ શાહ"
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider">ફોન નંબર *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowContactPickerModal(true);
                        setContactSearchQuery("");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-royal-50 hover:bg-royal-100 text-royal-800 rounded-lg text-[11px] font-bold border border-royal-200 transition-colors shadow-2xs active:scale-95"
                    >
                      <BookUser className="h-3.5 w-3.5 text-royal-700" />
                      <span>+ સંપર્ક પસંદ કરો</span>
                    </button>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="૧૦ આંકડાનો ફોન"
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Seva Selector Dropdown + Manual Fill Option */}
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
                  <option value="other">અન્ય સેવા (જાતે લખો / Fill Manually)</option>
                </select>

                {selectedSevaId === "other" && (
                  <div className="mt-2.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider mb-1">
                      સેવા પ્રવૃત્તિનું નામ જાતે લખો (Fill Manually) *
                    </label>
                    <input
                      type="text"
                      value={customSevaName}
                      onChange={(e) => setCustomSevaName(e.target.value)}
                      placeholder="દા.ત. ગાયો માટે લીલો ઘાસચારો, ઘાયલ પક્ષી સારવાર..."
                      className="w-full px-3.5 py-2 rounded-xl border border-amber-300 focus:border-amber-600 bg-white text-sm font-bold text-royal-900 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-2">દાનની રકમ *</label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="દા.ત. 1100"
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

              {/* Occasion & Calendar Date Picker + Manual Fill Option */}
              <div className="space-y-3">
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
                      <option value="અન્ય">અન્ય (જાતે લખો / Fill Manually)</option>
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

                {occasionType === "અન્ય" && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                    <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wider mb-1">
                      પ્રસંગનું નામ જાતે લખો (Fill Manually) *
                    </label>
                    <input
                      type="text"
                      value={customOccasion}
                      onChange={(e) => setCustomOccasion(e.target.value)}
                      placeholder="દા.ત. નવું મકાન વાસ્તુ, નિવૃત્તિ સન્માન, પરીક્ષા સફળતા..."
                      className="w-full px-3.5 py-2 rounded-xl border border-amber-300 focus:border-amber-600 bg-white text-sm font-bold text-royal-900 outline-none"
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

          {/* Card Preview & Advanced Canva Editor Column */}
          <div className="lg:col-span-7 flex flex-col items-center gap-4 w-full">
            
            {/* Top Download/Share Actions */}
            <div className="flex items-center gap-3 w-full max-w-[500px]">
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

            {/* Design Themes Selection Carousel */}
            <div className="w-full max-w-[600px] bg-white p-3.5 rounded-2xl border border-cream-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-royal-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>પત્રિકા ડિઝાઇન પસંદ કરો (Design Themes)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCanvaMode(!isCanvaMode)}
                  className="text-[11px] font-bold text-royal-800 hover:text-royal-950 flex items-center gap-1 bg-cream-100/70 hover:bg-cream-200/70 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>{isCanvaMode ? "સામાન્ય મોડ" : "🎨 કેનવા કસ્ટમાઇઝેશન એડિટર"}</span>
                </button>
              </div>

              {/* Theme Pill Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(THEMES) as CardThemeId[]).map((themeKey) => {
                  const t = THEMES[themeKey];
                  const isSelected = cardTheme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      type="button"
                      onClick={() => handleSelectTheme(themeKey)}
                      className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? "border-royal-800 bg-royal-50/80 shadow-xs ring-2 ring-royal-700/20"
                          : "border-cream-200 bg-cream-50/30 hover:bg-cream-100/50"
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="text-[11px] font-bold text-royal-900 leading-tight">{t.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Advanced Canva Editor Controls Drawer */}
              {isCanvaMode && (
                <div className="pt-3 border-t border-cream-100 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-royal-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="h-4 w-4 text-royal-700" />
                      <span>કેનવા કસ્ટમાઇઝેશન ટૂલ (Canva Editor)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetCanvaDesign}
                      className="text-[10px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>મૂળ ડિઝાઇન લાવો</span>
                    </button>
                  </div>

                  {/* 1. SEVA COLLAGE IMAGE CONTROLS */}
                  <div className="p-3 bg-cream-50/60 rounded-xl border border-cream-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-royal-900 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-royal-700" />
                        <span>સેવા કોલાજ ફોટો (Seva Activity Photo)</span>
                      </span>
                      <label className="text-[11px] font-bold text-royal-800 flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSevaCollage}
                          onChange={(e) => setShowSevaCollage(e.target.checked)}
                          className="accent-royal-800"
                        />
                        <span>કાર્ડ પર બતાવો</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={sevaCollageImg || bgBase64 || "/card_bg.jpg"}
                        alt="Current Collage"
                        className="h-10 w-16 object-cover rounded-lg border border-cream-300 bg-white shrink-0"
                      />
                      <label className="flex-1 py-1.5 px-3 bg-white border border-dashed border-royal-400 hover:bg-royal-50 text-royal-900 rounded-lg text-xs font-bold text-center cursor-pointer transition-colors shadow-2xs">
                        <span>અહીંથી નવો કોલાજ ફોટો અપલોડ કરો</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomSevaCollageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 2. DONOR PHOTO CONTROLS */}
                  {donorPhotoUrl && (
                    <div className="p-3 bg-cream-50/60 rounded-xl border border-cream-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-royal-900">દાતાશ્રીનો ફોટો કંટ્રોલ:</span>
                        <label className="text-[11px] font-bold text-royal-800 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showDonorPhoto}
                            onChange={(e) => setShowDonorPhoto(e.target.checked)}
                            className="accent-royal-800"
                          />
                          <span>બતાવો</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold block mb-1">
                            સાઇઝ ({donorPhotoWidth}px):
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDonorPhotoWidth((p) => Math.max(70, p - 10))}
                              className="px-2 py-0.5 bg-white border rounded font-bold"
                            >
                              -
                            </button>
                            <input
                              type="range"
                              min="70"
                              max="160"
                              value={donorPhotoWidth}
                              onChange={(e) => setDonorPhotoWidth(Number(e.target.value))}
                              className="flex-1 accent-royal-800"
                            />
                            <button
                              type="button"
                              onClick={() => setDonorPhotoWidth((p) => Math.min(160, p + 10))}
                              className="px-2 py-0.5 bg-white border rounded font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-500 font-bold block mb-1">આકાર (Shape):</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setDonorPhotoShape("rounded")}
                              className={`flex-1 py-1 text-[10px] font-bold rounded border ${
                                donorPhotoShape === "rounded" ? "bg-royal-800 text-white" : "bg-white"
                              }`}
                            >
                              સામાન્ય
                            </button>
                            <button
                              type="button"
                              onClick={() => setDonorPhotoShape("circle")}
                              className={`flex-1 py-1 text-[10px] font-bold rounded border ${
                                donorPhotoShape === "circle" ? "bg-royal-800 text-white" : "bg-white"
                              }`}
                            >
                              ગોળ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. UPLOADED STICKERS & BADGES MANAGER */}
                  <div className="p-3 bg-cream-50/60 rounded-xl border border-cream-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-royal-900 flex items-center gap-1">
                        <ImagePlus className="h-4 w-4 text-emerald-700" />
                        <span>અપલોડ કરેલા સ્ટીકર્સ અને બેજ ({customStickers.length})</span>
                      </span>
                      <label className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1 transition-colors">
                        <Plus className="h-3 w-3" />
                        <span>+ નવું સ્ટીકર / ફોટો</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAddSticker}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {customStickers.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic text-center py-1">
                        કોઈ કસ્ટમ સ્ટીકર ઉમેરાયેલ નથી. ઉપર બટનથી કોઈપણ લોગો કે સ્ટીકર ઉમેરી શકાય છે.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {customStickers.map((stk, idx) => (
                          <div
                            key={stk.id}
                            className="bg-white p-2.5 rounded-xl border border-cream-200 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img
                                  src={stk.imgUrl}
                                  alt="Sticker thumbnail"
                                  className="w-8 h-8 rounded object-cover border"
                                />
                                <span className="text-xs font-bold text-royal-950">
                                  સ્ટીકર #{idx + 1} ({stk.width}px)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSticker(stk.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="સ્ટીકર કાઢી નાખો"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Resize Slider */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 font-bold shrink-0">સાઇઝ:</span>
                              <button
                                type="button"
                                onClick={() => updateSticker(stk.id, { width: Math.max(30, stk.width - 10) })}
                                className="px-1.5 py-0.5 bg-cream-100 rounded text-xs font-bold"
                              >
                                -
                              </button>
                              <input
                                type="range"
                                min="30"
                                max="220"
                                value={stk.width}
                                onChange={(e) => updateSticker(stk.id, { width: Number(e.target.value) })}
                                className="flex-1 accent-royal-800"
                              />
                              <button
                                type="button"
                                onClick={() => updateSticker(stk.id, { width: Math.min(220, stk.width + 10) })}
                                className="px-1.5 py-0.5 bg-cream-100 rounded text-xs font-bold"
                              >
                                +
                              </button>
                            </div>

                            {/* Position Controls */}
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              {/* Horizontal Alignment */}
                              <div className="flex items-center gap-1 bg-cream-50 p-1 rounded-lg">
                                <span className="text-gray-400 font-bold">સ્થાન:</span>
                                <button
                                  type="button"
                                  onClick={() => updateSticker(stk.id, { align: "left" })}
                                  className={`p-1 rounded ${stk.align === "left" ? "bg-royal-800 text-white" : "text-gray-600"}`}
                                  title="ડાબે"
                                >
                                  <AlignLeft className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSticker(stk.id, { align: "center" })}
                                  className={`p-1 rounded ${stk.align === "center" ? "bg-royal-800 text-white" : "text-gray-600"}`}
                                  title="વચ્ચે"
                                >
                                  <AlignCenter className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSticker(stk.id, { align: "right" })}
                                  className={`p-1 rounded ${stk.align === "right" ? "bg-royal-800 text-white" : "text-gray-600"}`}
                                  title="જમણે"
                                >
                                  <AlignRight className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Vertical Section */}
                              <div className="flex items-center gap-1 bg-cream-50 p-1 rounded-lg">
                                <span className="text-gray-400 font-bold">ભાગ:</span>
                                <button
                                  type="button"
                                  onClick={() => updateSticker(stk.id, { positionY: "top" })}
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    stk.positionY === "top" ? "bg-royal-800 text-white" : "text-gray-600"
                                  }`}
                                >
                                  ઉપર
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSticker(stk.id, { positionY: "middle" })}
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    stk.positionY === "middle" ? "bg-royal-800 text-white" : "text-gray-600"
                                  }`}
                                >
                                  મધ્ય
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSticker(stk.id, { positionY: "bottom" })}
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    stk.positionY === "bottom" ? "bg-royal-800 text-white" : "text-gray-600"
                                  }`}
                                >
                                  નીચે
                                </button>
                              </div>
                            </div>

                            {/* Shape & Border Controls */}
                            <div className="flex items-center justify-between text-[10px] pt-0.5">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400 font-bold">આકાર:</span>
                                <button
                                  type="button"
                                  onClick={() => updateSticker(stk.id, { shape: "rounded" })}
                                  className={`px-1.5 py-0.5 rounded border ${
                                    stk.shape === "rounded" ? "bg-royal-800 text-white" : "bg-white text-gray-700"
                                  }`}
                                >
                                  રાઉન્ડ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSticker(stk.id, { shape: "circle" })}
                                  className={`px-1.5 py-0.5 rounded border ${
                                    stk.shape === "circle" ? "bg-royal-800 text-white" : "bg-white text-gray-700"
                                  }`}
                                >
                                  ગોળ બેજ
                                </button>
                              </div>

                              <label className="flex items-center gap-1 cursor-pointer font-bold text-royal-900">
                                <input
                                  type="checkbox"
                                  checked={stk.border}
                                  onChange={(e) => updateSticker(stk.id, { border: e.target.checked })}
                                  className="accent-royal-800"
                                />
                                <span>ગોલ્ડ બોર્ડર</span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. CUSTOM TEXT BOXES MANAGER */}
                  <div className="p-3 bg-cream-50/60 rounded-xl border border-cream-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-royal-900 flex items-center gap-1">
                        <Type className="h-4 w-4 text-royal-700" />
                        <span>કસ્ટમ લખાણ લાઈનો ({customTextBoxes.length})</span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTextContent}
                        onChange={(e) => setNewTextContent(e.target.value)}
                        placeholder="નવું લખાણ (દા.ત. જય જિનેન્દ્ર, ગુરુકૃપા)..."
                        className="flex-1 px-3 py-1.5 text-xs border border-cream-300 rounded-xl bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomText}
                        className="px-3 py-1.5 bg-royal-800 hover:bg-royal-900 text-white rounded-xl text-xs font-bold shrink-0"
                      >
                        + ઉમેરો
                      </button>
                    </div>

                    {customTextBoxes.map((tb) => (
                      <div
                        key={tb.id}
                        className="bg-white p-2.5 rounded-xl border border-cream-200 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tb.text}
                            onChange={(e) => updateTextBox(tb.id, { text: e.target.value })}
                            className="flex-1 text-xs font-bold px-2 py-1 border rounded bg-cream-50/40"
                          />
                          <button
                            type="button"
                            onClick={() => removeTextBox(tb.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 font-bold">સાઇઝ ({tb.fontSize}px):</span>
                            <button
                              type="button"
                              onClick={() => updateTextBox(tb.id, { fontSize: Math.max(10, tb.fontSize - 1) })}
                              className="px-1.5 py-0.5 bg-cream-100 rounded font-bold"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => updateTextBox(tb.id, { fontSize: Math.min(32, tb.fontSize + 1) })}
                              className="px-1.5 py-0.5 bg-cream-100 rounded font-bold"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 font-bold">રંગ:</span>
                            {["#7f1d1d", "#0B2F64", "#B45309", "#15803D", "#111827", "#6B21A8"].map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => updateTextBox(tb.id, { color: col })}
                                className="w-3.5 h-3.5 rounded-full border border-gray-300"
                                style={{ backgroundColor: col }}
                              />
                            ))}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateTextBox(tb.id, { align: "left" })}
                              className={`p-1 rounded ${tb.align === "left" ? "bg-royal-800 text-white" : "text-gray-600"}`}
                            >
                              <AlignLeft className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateTextBox(tb.id, { align: "center" })}
                              className={`p-1 rounded ${tb.align === "center" ? "bg-royal-800 text-white" : "text-gray-600"}`}
                            >
                              <AlignCenter className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateTextBox(tb.id, { align: "right" })}
                              className={`p-1 rounded ${tb.align === "right" ? "bg-royal-800 text-white" : "text-gray-600"}`}
                            >
                              <AlignRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 5. CORE TYPOGRAPHY SIZING & COLORS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream-50/50 p-2.5 rounded-xl border border-cream-200">
                    {/* Donor Name Font Controls */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-royal-800">દાતા નામ સાઇઝ ({donorFontSize}px):</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDonorFontSize((p) => Math.max(20, p - 2))}
                          className="px-2 py-0.5 bg-white border border-cream-300 rounded text-xs font-bold"
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          onClick={() => setDonorFontSize((p) => Math.min(46, p + 2))}
                          className="px-2 py-0.5 bg-white border border-cream-300 rounded text-xs font-bold"
                        >
                          A+
                        </button>
                        <div className="flex gap-1 ml-1">
                          {["#7f1d1d", "#0B2F64", "#B45309", "#15803D", "#111827"].map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setDonorFontColor(col)}
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Amount Font Controls */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-royal-800">રકમ સાઇઝ ({amountFontSize}px):</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAmountFontSize((p) => Math.max(22, p - 2))}
                          className="px-2 py-0.5 bg-white border border-cream-300 rounded text-xs font-bold"
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          onClick={() => setAmountFontSize((p) => Math.min(46, p + 2))}
                          className="px-2 py-0.5 bg-white border border-cream-300 rounded text-xs font-bold"
                        >
                          A+
                        </button>
                        <div className="flex gap-1 ml-1">
                          {["#B45309", "#0B2F64", "#7f1d1d", "#0284C7", "#15803D"].map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setAmountFontColor(col)}
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. BACKGROUND & BORDER COLOR CHOICES */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">કાર્ડ બેકગ્રાઉન્ડ રંગ:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "ક્રીમ", hex: "#FAF5EC" },
                          { label: "સફેદ", hex: "#FFFFFF" },
                          { label: "આઇવરી", hex: "#FFFDF5" },
                          { label: "ગ્રીન", hex: "#F0FDF4" },
                          { label: "સોફ્ટ બ્લુ", hex: "#F8FAFC" },
                          { label: "રોઝ", hex: "#FFF1F2" }
                        ].map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setCardBgColor(c.hex)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                              cardBgColor === c.hex ? "ring-2 ring-royal-800 border-transparent shadow-xs" : "border-cream-300"
                            }`}
                            style={{ backgroundColor: c.hex }}
                          >
                            <span className="h-2 w-2 rounded-full border" style={{ backgroundColor: c.hex }} />
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">મુખ્ય બોર્ડર રંગ:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "ડાર્ક ગ્રીન", hex: "#043e22" },
                          { label: "ગોલ્ડ", hex: "#C5A059" },
                          { label: "રોયલ બ્લુ", hex: "#0B2F64" },
                          { label: "મેરૂન", hex: "#7f1d1d" },
                          { label: "બ્લેક", hex: "#1F2937" }
                        ].map((b) => (
                          <button
                            key={b.hex}
                            type="button"
                            onClick={() => {
                              setCardOuterBorder(b.hex);
                              if (b.hex === "#C5A059") setCardInnerBorder("#B45309");
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold text-white ${
                              cardOuterBorder === b.hex ? "ring-2 ring-amber-500 scale-105" : "opacity-90"
                            }`}
                            style={{ backgroundColor: b.hex }}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scale container to display on screen */}
            <div className="w-full flex justify-center overflow-hidden py-4 border border-cream-100 rounded-2xl bg-cream-50/20">
              <div className="w-[600px] h-[820px] scale-[0.48] sm:scale-[0.72] md:scale-100 origin-top shrink-0 -mb-[420px] sm:-mb-[220px] md:mb-0">
                {renderCertificateCard(false)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen DOM used strictly for html2canvas export */}
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
        {renderCertificateCard(true)}
      </div>

      {/* Contact Picker Modal */}
      {showContactPickerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-cream-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5 text-royal-900">
                <BookUser className="h-5 w-5 text-royal-700" />
                <h3 className="text-base font-extrabold">દાતાનો સંપર્ક પસંદ કરો</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactPickerModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Option 1: Mobile Phone Contacts */}
            <button
              type="button"
              onClick={handlePickPhoneContact}
              className="w-full flex items-center gap-3 p-3.5 bg-royal-50 hover:bg-royal-100/80 border border-royal-200 rounded-2xl transition-all text-left group"
            >
              <div className="p-2.5 bg-royal-700 text-white rounded-xl group-hover:scale-105 transition-transform">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-extrabold text-royal-950">મોબાઈલ ફોનબુકમાંથી પસંદ કરો</p>
                <p className="text-[11px] text-gray-500">ફોનમાં સેવ થયેલા સંપર્કમાંથી સીધો નંબર મેળવો</p>
              </div>
            </button>

            {/* Option 2: Saved App Donors */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-xs font-bold text-royal-900">
                <Users className="h-4 w-4 text-emerald-600" />
                <span>એપમાં સેવ થયેલા દાતાઓ ({donors.length})</span>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  placeholder="નામ અથવા ફોન નંબરથી શોધો..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-cream-200 rounded-xl"
                />
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-cream-100 border border-cream-100 rounded-xl bg-cream-50/20">
                {filteredModalDonors.slice(0, 15).map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleSelectDonor(d)}
                    className="p-2.5 hover:bg-royal-50/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-royal-900">{d.fullName}</p>
                      <p className="text-[11px] text-gray-500">{d.phone}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                ))}
                {filteredModalDonors.length === 0 && (
                  <p className="text-center py-4 text-xs text-gray-400">કોઈ દાતા મળ્યા નથી.</p>
                )}
              </div>
            </div>

            {/* Option 3: Manual Entry */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowContactPickerModal(false);
                }}
                className="w-full py-2.5 text-center text-xs font-bold text-gray-600 hover:text-royal-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ✍️ જાતે મેન્યુઅલ નંબર ટાઇપ કરો
              </button>
            </div>
          </div>
        </div>
      )}

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
