import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, deleteDoc, writeBatch } from "firebase/firestore";
import { seedDatabase, DEFAULT_ORG_SETTINGS, DEFAULT_SEVA_TYPES } from "../lib/dbSeed";
import { compressImageToBase64 } from "../utils/image";
import { Heart, Building, Phone, QrCode, Bell, Plus, Edit, Upload, Sparkles, CreditCard, Trash2, UserPlus, CheckCircle, FileSpreadsheet, Archive, AlertTriangle, Database, ShieldAlert, Download, Calendar, Filter, X } from "lucide-react";
import { OrganizationSettings, SevaType, Donation } from "../types";

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [sevaTypes, setSevaTypes] = useState<SevaType[]>([]);
  
  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Member Management Form States
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");

  // Seva Edit/Create Modal states
  const [editSeva, setEditSeva] = useState<SevaType | null>(null);
  const [isCreatingSeva, setIsCreatingSeva] = useState(false);
  
  // Seva Form States
  const [sevaNameGujarati, setSevaNameGujarati] = useState("");
  const [sevaNameEnglish, setSevaNameEnglish] = useState("");
  const [sevaDescription, setSevaDescription] = useState("");
  const [sevaCardTitle, setSevaCardTitle] = useState("");
  const [sevaDefaultMessage, setSevaDefaultMessage] = useState("");
  const [sevaAccentColor, setSevaAccentColor] = useState("#0B2F64");
  const [sevaActive, setSevaActive] = useState(true);
  const [sevaSortOrder, setSevaSortOrder] = useState("1");
  const [sevaHeroImageBase64, setSevaHeroImageBase64] = useState("");

  // Archive & Full Reset Modal state
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isFullResetModalOpen, setIsFullResetModalOpen] = useState(false);
  const [archiveConfirmInput, setArchiveConfirmInput] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveProgressMsg, setArchiveProgressMsg] = useState("");

  // Excel Export Date Range & Modal States
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelExportMode, setExcelExportMode] = useState<"full" | "month" | "range">("full");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = String(now.getMonth() + 1).padStart(2, "0");
  const [excelSelectedMonth, setExcelSelectedMonth] = useState<string>(`${currentYear}-${currentMonthNum}`);
  const [excelStartDate, setExcelStartDate] = useState(
    `${currentYear}-${currentMonthNum}-01`
  );
  const [excelEndDate, setExcelEndDate] = useState(
    `${currentYear}-${currentMonthNum}-${new Date(currentYear, now.getMonth() + 1, 0).getDate()}`
  );
  const [exportingExcel, setExportingExcel] = useState(false);

  // Helper to normalize date strings
  const normalizeDateStr = (d?: string): string => {
    if (!d) return "";
    const clean = String(d).split("T")[0].trim().replace(/\//g, "-");
    if (clean.includes("-")) {
      const parts = clean.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else if (parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    }
    return clean;
  };

  // Function to export donation entries to a UTF-8 BOM CSV/Excel file (supports full backup, month, or date-range filter)
  const exportFullBackupToExcel = async (startDate?: string, endDate?: string, month?: string) => {
    try {
      setExportingExcel(true);
      const donSnap = await getDocs(collection(db, "donations"));
      let docsList: Donation[] = [];
      donSnap.forEach((d) => docsList.push({ id: d.id, ...d.data() } as Donation));

      // Filter by month if provided (e.g. 2026-11)
      if (month) {
        docsList = docsList.filter((d) => {
          const dDate = normalizeDateStr(d.donationDate);
          return dDate.startsWith(month);
        });
      } else {
        // Filter by date range if provided
        if (startDate) {
          docsList = docsList.filter((d) => {
            const dDate = normalizeDateStr(d.donationDate);
            return dDate && dDate >= startDate;
          });
        }
        if (endDate) {
          docsList = docsList.filter((d) => {
            const dDate = normalizeDateStr(d.donationDate);
            return dDate && dDate <= endDate;
          });
        }
      }

      if (docsList.length === 0 && (startDate || endDate || month)) {
        alert("પસંદ કરેલ તારીખ/મહિના ગાળામાં કોઈ દાન એન્ટ્રી મળી નથી.");
        return [];
      }

      // Sort by date descending
      docsList.sort((a, b) => (b.donationDate || "").localeCompare(a.donationDate || ""));

      // Define CSV headers
      const headers = [
        "એન્ટ્રી ID",
        "તારીખ (Date)",
        "દાતાનું નામ (Donor Name)",
        "ફોન નંબર (Phone Number)",
        "સેવા પ્રવૃત્તિ (Seva Type)",
        "રકમ (Amount ₹)",
        "પ્રસંગ પ્રકાર (Occasion)",
        "પ્રસંગ તારીખ (Occasion Date)",
        "હસ્તે (Presented By / Through)",
        "સંદેશા (Custom Message)"
      ];

      const csvRows = [headers.join(",")];

      docsList.forEach((don) => {
        const row = [
          `"${don.id || ""}"`,
          `"${don.donationDate || ""}"`,
          `"${(don.donorNameSnapshot || "").replace(/"/g, '""')}"`,
          `"${don.phoneSnapshot || ""}"`,
          `"${(don.sevaNameSnapshot || "").replace(/"/g, '""')}"`,
          don.amount || 0,
          `"${(don.occasionType || "").replace(/"/g, '""')}"`,
          `"${don.occasionDate || ""}"`,
          `"${(don.hasteName || "").replace(/"/g, '""')}"`,
          `"${(don.customMessage || "").replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(","));
      });

      // Include UTF-8 BOM byte marker so Excel opens Gujarati text cleanly
      const csvContent = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      const nowD = new Date();
      const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}-${String(nowD.getDate()).padStart(2, "0")}`;
      link.setAttribute("href", url);
      let downloadFileName = `Karuna_Maitri_Full_Donation_Backup_${todayStr}.csv`;
      if (month) {
        downloadFileName = `Karuna_Maitri_Donations_${month}.csv`;
      } else if (startDate || endDate) {
        downloadFileName = `Karuna_Maitri_Donations_${startDate || "Start"}_to_${endDate || "Today"}.csv`;
      }
      link.setAttribute("download", downloadFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return docsList;
    } catch (err) {
      console.error("Backup export failed:", err);
      alert("Excel બેકઅપ ફાઈલ બનાવવામાં ખામી સર્જાઈ.");
      throw err;
    } finally {
      setExportingExcel(false);
    }
  };

  // Safe Archive and Database Reset Handler
  const handleArchiveAndResetDatabase = async () => {
    if (archiveConfirmInput.trim().toUpperCase() !== "ARCHIVE") {
      alert("કૃપા કરીને ખાતરી કરવા માટે 'ARCHIVE' ટાઇપ કરો.");
      return;
    }

    try {
      setArchiving(true);
      
      // Step 1: Export complete Excel backup
      setArchiveProgressMsg("૧/૪: બધા દાનનો Excel બેકઅપ ડાઉનલોડ થઈ રહ્યો છે...");
      const currentDonations = await exportFullBackupToExcel();

      // Step 2: Calculate total amount and count
      setArchiveProgressMsg("૨/૪: જૂના હિસાબની ગણતરી અને કાયમી સંગ્રહ...");
      let currentTotalAmount = 0;
      currentDonations.forEach((d) => {
        currentTotalAmount += Number(d.amount || 0);
      });
      const currentTotalCount = currentDonations.length;

      // Update Settings org document with cumulative archived numbers
      const prevArchivedAmount = settings?.lifetimeArchivedAmount || 0;
      const prevArchivedCount = settings?.lifetimeArchivedCount || 0;
      const prevYearlyArchives = settings?.yearlyArchives || [];

      const newYearLabel = `Reset-${new Date().toISOString().split("T")[0]}`;
      const newYearlyEntry = {
        yearLabel: newYearLabel,
        totalAmount: currentTotalAmount,
        totalCount: currentTotalCount,
        archivedAt: new Date().toISOString()
      };

      const updatedArchivedAmount = prevArchivedAmount + currentTotalAmount;
      const updatedArchivedCount = prevArchivedCount + currentTotalCount;
      const updatedYearlyArchives = [...prevYearlyArchives, newYearlyEntry];

      const orgDocRef = doc(db, "settings", "org");
      await updateDoc(orgDocRef, {
        lifetimeArchivedAmount: updatedArchivedAmount,
        lifetimeArchivedCount: updatedArchivedCount,
        yearlyArchives: updatedYearlyArchives,
        updatedAt: serverTimestamp()
      });

      // Step 3: Batch delete active donations collection
      setArchiveProgressMsg("૩/૪: દાન એન્ટ્રીઓ ડિલીટ થઈ રહી છે (ડેટાબેઝ ક્લીનઅપ)...");
      const BATCH_SIZE = 400;
      for (let i = 0; i < currentDonations.length; i += BATCH_SIZE) {
        const chunk = currentDonations.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((don) => {
          batch.delete(doc(db, "donations", don.id));
        });
        await batch.commit();
      }

      // Step 4: Finish up
      setArchiveProgressMsg("૪/૪: સફળતાપૂર્વક આર્કાઇવ પૂર્ણ થયું!");
      
      // Update local state
      if (settings) {
        setSettings({
          ...settings,
          lifetimeArchivedAmount: updatedArchivedAmount,
          lifetimeArchivedCount: updatedArchivedCount,
          yearlyArchives: updatedYearlyArchives
        });
      }

      setMsg({ text: "ડેટાબેઝ સફળતાપૂર્વક આર્કાઇવ થઈ ગયો છે! દાનનો હિસાબ સુરક્ષિત છે.", type: "success" });
      setIsArchiveModalOpen(false);
      setArchiveConfirmInput("");
    } catch (err) {
      console.error("Archive failed:", err);
      alert("ડેટાબેઝ આર્કાઇવ કરવામાં ખામી સર્જાઈ.");
    } finally {
      setArchiving(false);
      setArchiveProgressMsg("");
    }
  };

  // Full Market Reset (Purge all test donations, test donors, and test reminders)
  const handleFullMarketReset = async () => {
    if (archiveConfirmInput.trim().toUpperCase() !== "RESET") {
      alert("કૃપા કરીને ખાતરી કરવા માટે 'RESET' ટાઇપ કરો.");
      return;
    }

    try {
      setArchiving(true);
      
      // Step 1: Export complete Excel backup
      setArchiveProgressMsg("૧/૫: બધા દાનનો Excel બેકઅપ ડાઉનલોડ થઈ રહ્યો છે...");
      try {
        await exportFullBackupToExcel();
      } catch (e) {
        console.log("No donations to backup.");
      }

      // Step 2: Batch delete active donations collection
      setArchiveProgressMsg("૨/૫: દાન એન્ટ્રીઓ સાફ થઈ રહી છે...");
      const donSnap = await getDocs(collection(db, "donations"));
      const donBatch = writeBatch(db);
      donSnap.forEach((d) => donBatch.delete(doc(db, "donations", d.id)));
      await donBatch.commit();

      // Step 3: Delete donors
      setArchiveProgressMsg("૩/૫: દાતાશ્રીઓની પ્રોફાઈલ સાફ થઈ રહી છે...");
      const donorSnap = await getDocs(collection(db, "donors"));
      const donorBatch = writeBatch(db);
      donorSnap.forEach((d) => donorBatch.delete(doc(db, "donors", d.id)));
      await donorBatch.commit();

      // Step 4: Delete reminders
      setArchiveProgressMsg("૪/૫: રિમાઇન્ડર સાફ થઈ રહ્યા છે...");
      const remSnap = await getDocs(collection(db, "reminders"));
      const remBatch = writeBatch(db);
      remSnap.forEach((d) => remBatch.delete(doc(db, "reminders", d.id)));
      await remBatch.commit();

      // Step 5: Reset cumulative archived totals to 0
      setArchiveProgressMsg("૫/૫: હિસાબી સરવાળો અને આર્કાઇવ ટોટલ રીસેટ (₹ 0) થઈ રહ્યા છે...");
      const orgDocRef = doc(db, "settings", "org");
      await updateDoc(orgDocRef, {
        lifetimeArchivedAmount: 0,
        lifetimeArchivedCount: 0,
        yearlyArchives: [],
        updatedAt: serverTimestamp()
      });

      if (settings) {
        setSettings({
          ...settings,
          lifetimeArchivedAmount: 0,
          lifetimeArchivedCount: 0,
          yearlyArchives: []
        });
      }

      setMsg({ text: "માર્કેટ લોન્ચ માટે ડેટાબેઝ અને કુલ હિસાબ (₹ 0) સંપૂર્ણપણે ક્લીન અને રીસેટ થઈ ગયા છે!", type: "success" });
      setIsFullResetModalOpen(false);
      setArchiveConfirmInput("");
    } catch (err) {
      console.error("Full reset failed:", err);
      alert("ડેટાબેઝ રીસેટ કરવામાં ખામી સર્જાઈ.");
    } finally {
      setArchiving(false);
      setArchiveProgressMsg("");
    }
  };

  // Dedicated button to zero out cumulative total counters
  const handleResetCumulativeTotalOnly = async () => {
    if (!window.confirm("શું તમે ખરેખર કાયમી જૂની આર્કાઇવ રકમ અને એન્ટ્રી સંખ્યા (₹ 0) રીસેટ કરવા માંગો છો?")) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, "settings", "org"), {
        lifetimeArchivedAmount: 0,
        lifetimeArchivedCount: 0,
        yearlyArchives: [],
        updatedAt: serverTimestamp()
      });
      if (settings) {
        setSettings({
          ...settings,
          lifetimeArchivedAmount: 0,
          lifetimeArchivedCount: 0,
          yearlyArchives: []
        });
      }
      setMsg({ text: "કાયમી આર્કાઇવ હિસાબ સફળતાપૂર્વક ₹ 0 રીસેટ થઈ ગયો છે!", type: "success" });
    } catch (err: any) {
      alert(`ભૂલ આવી: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSettingsAndSeva = async () => {
    try {
      setLoading(true);
      
      // 1. Settings
      const settingsSnap = await getDoc(doc(db, "settings", "org"));
      let activeSettings: OrganizationSettings;
      
      if (settingsSnap.exists()) {
        activeSettings = settingsSnap.data() as OrganizationSettings;
      } else {
        activeSettings = DEFAULT_ORG_SETTINGS as any;
      }
      
      // Ensure members array exists
      if (!activeSettings.members) {
        activeSettings.members = [
          { name: "કેતલ વોરા", phone: "9824255909", showOnCard: true },
          { name: "મયુર શાહ", phone: "9429099906", showOnCard: true },
          { name: "મલય વસાણી", phone: "9825530444", showOnCard: true }
        ];
      }
      setSettings(activeSettings);

      // 2. Seva Types
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
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndSeva();
  }, []);

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    try {
      const base64 = await compressImageToBase64(file, 200, 200, 0.75);
      setSettings({ ...settings, logoUrl: base64 });
    } catch (err) {
      console.error("Logo upload error:", err);
      alert("લોગો કમ્પ્રેસ કરવામાં ભૂલ આવી.");
    }
  };

  // Handle Default Hero Collage Image Upload
  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    try {
      const base64 = await compressImageToBase64(file, 600, 350, 0.7);
      setSettings({ ...settings, defaultHeroImage: base64 });
    } catch (err) {
      console.error("Hero upload error:", err);
      alert("બેનર કમ્પ્રેસ કરવામાં ભૂલ આવી.");
    }
  };

  // Handle QR Image Upload
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    try {
      const base64 = await compressImageToBase64(file, 300, 300, 0.75);
      setSettings({ ...settings, qrImageUrl: base64 });
    } catch (err) {
      console.error("QR upload error:", err);
      alert("QR ઈમેજ કમ્પ્રેસ કરવામાં ભૂલ આવી.");
    }
  };

  // Handle Seva Image Upload
  const handleSevaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageToBase64(file, 500, 300, 0.7);
      setSevaHeroImageBase64(base64);
    } catch (err) {
      console.error("Seva image upload error:", err);
      alert("સેવા ફોટો કમ્પ્રેસ કરવામાં ભૂલ આવી.");
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setSavingSettings(true);
      setMsg({ text: "", type: "" });
      
      await setDoc(doc(db, "settings", "org"), {
        ...settings,
        updatedAt: serverTimestamp(),
      });

      setMsg({ text: "બધા ફેરફારો સાચવી લેવામાં આવ્યા છે!", type: "success" });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setMsg({ text: `સાચવવામાં નિષ્ફળતા: ${error.message || error}`, type: "error" });
    } finally {
      setSavingSettings(false);
    }
  };

  // Seva Delete Helper
  const handleDeleteSeva = async (id: string) => {
    if (!window.confirm("શું તમે ખરેખર આ સેવા પ્રકાર કાઢી નાખવા માંગો છો?")) return;
    try {
      await deleteDoc(doc(db, "sevaTypes", id));
      await loadSettingsAndSeva();
      alert("સેવા પ્રકાર કાઢી નાખવામાં આવ્યો.");
    } catch (error) {
      console.error("Delete seva error:", error);
    }
  };

  // Member Management Helpers
  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberPhone.trim()) {
      alert("નામ અને ફોન નંબર જરૂરી છે.");
      return;
    }
    if (!settings) return;

    const currentMembers = settings.members || [];
    const updatedMembers = [
      ...currentMembers,
      { name: newMemberName.trim(), phone: newMemberPhone.trim(), showOnCard: true }
    ];

    // Maintain contacts array for compatibility (first 2 members)
    const contacts = updatedMembers.slice(0, 2).map(m => ({ name: m.name, phone: m.phone }));

    setSettings({
      ...settings,
      members: updatedMembers,
      contacts: contacts
    });

    setNewMemberName("");
    setNewMemberPhone("");
  };

  const handleRemoveMember = (idx: number) => {
    if (!settings) return;
    const currentMembers = settings.members || [];
    const updatedMembers = currentMembers.filter((_, i) => i !== idx);
    const contacts = updatedMembers.slice(0, 2).map(m => ({ name: m.name, phone: m.phone }));
    
    setSettings({
      ...settings,
      members: updatedMembers,
      contacts: contacts
    });
  };

  const handleToggleMemberCard = (idx: number) => {
    if (!settings) return;
    const currentMembers = settings.members || [];
    const updatedMembers = currentMembers.map((m, i) => 
      i === idx ? { ...m, showOnCard: !m.showOnCard } : m
    );

    setSettings({
      ...settings,
      members: updatedMembers
    });
  };

  // Run database seeder
  const handleRunSeed = async () => {
    if (!window.confirm("આ કરવાથી નવો ડેટાબેઝ સેટઅપ થશે. શું તમે આગળ વધવા માંગો છો?")) {
      return;
    }
    try {
      setSeeding(true);
      setMsg({ text: "", type: "" });
      const res = await seedDatabase(true); 
      if (res.success) {
        setMsg({ text: res.message, type: "success" });
        await loadSettingsAndSeva();
      } else {
        setMsg({ text: res.message, type: "error" });
      }
    } catch (error: any) {
      console.error("Seeding failed:", error);
      setMsg({ text: `સીડીંગ નિષ્ફળ: ${error.message || error}`, type: "error" });
    } finally {
      setSeeding(false);
    }
  };

  // Seva save
  const handleSaveSeva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sevaNameGujarati || !sevaCardTitle) {
      alert("ગુજરાતી નામ અને પત્રિકા શીર્ષક જરૂરી છે.");
      return;
    }

    try {
      const data = {
        nameGujarati: sevaNameGujarati.trim(),
        nameEnglish: sevaNameEnglish.trim(),
        description: sevaDescription.trim(),
        cardTitle: sevaCardTitle.trim(),
        defaultMessage: sevaDefaultMessage.trim(),
        accentColor: sevaAccentColor,
        active: sevaActive,
        sortOrder: Number(sevaSortOrder),
        heroImageUrl: sevaHeroImageBase64,
        updatedAt: serverTimestamp(),
      };

      if (editSeva) {
        await updateDoc(doc(db, "sevaTypes", editSeva.id), data);
      } else {
        const newRef = doc(collection(db, "sevaTypes"));
        await setDoc(newRef, {
          ...data,
          createdAt: serverTimestamp(),
        });
      }

      setEditSeva(null);
      setIsCreatingSeva(false);
      setSevaHeroImageBase64("");
      await loadSettingsAndSeva();
      setMsg({ text: "સેવા પ્રકાર સફળતાપૂર્વક સાચવવામાં આવ્યો છે!", type: "success" });
    } catch (error: any) {
      console.error("Save seva error:", error);
      alert(`ભૂલ: ${error.message || error}`);
    }
  };

  const handleEditSevaClick = (seva: SevaType) => {
    setEditSeva(seva);
    setSevaNameGujarati(seva.nameGujarati);
    setSevaNameEnglish(seva.nameEnglish);
    setSevaDescription(seva.description);
    setSevaCardTitle(seva.cardTitle);
    setSevaDefaultMessage(seva.defaultMessage);
    setSevaAccentColor(seva.accentColor);
    setSevaActive(seva.active);
    setSevaSortOrder(String(seva.sortOrder));
    setSevaHeroImageBase64(seva.heroImageUrl || "");
    setIsCreatingSeva(true);
  };

  const handleCreateSevaClick = () => {
    setEditSeva(null);
    setSevaNameGujarati("");
    setSevaNameEnglish("");
    setSevaDescription("");
    setSevaCardTitle("");
    setSevaDefaultMessage("");
    setSevaAccentColor("#0B2F64");
    setSevaActive(true);
    setSevaSortOrder(String(sevaTypes.length + 1));
    setSevaHeroImageBase64("");
    setIsCreatingSeva(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal-800 mb-2" />
        <p className="gujarati-text text-sm">લોડ થઈ રહ્યું છે...</p>
      </div>
    );
  }

  const activeMembers = settings?.members || [];

  return (
    <div className="space-y-8 pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-royal-800 tracking-tight">સિસ્ટમ સેટિંગ્સ (Settings Panel)</h1>
          <p className="text-gray-500 mt-1">અહીંથી તમે સંસ્થાના લોગો, સભ્યોના નામ, ક્યૂઆર કોડ અને દાન પ્રકારો કસ્ટમાઇઝ કરી શકો છો.</p>
        </div>
        <button
          onClick={handleRunSeed}
          disabled={seeding}
          className="flex items-center justify-center gap-1.5 bg-royal-800 hover:bg-royal-900 text-cream-50 text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm"
        >
          <Sparkles className="h-4 w-4 text-saffron-500" />
          <span>{seeding ? "સેટઅપ થઈ રહ્યું છે..." : "પ્રારંભિક ડેટા સેટઅપ (Database Seed)"}</span>
        </button>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
          msg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        }`}>
          <span>{msg.text}</span>
        </div>
      )}

      {settings && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Columns Settings Form */}
          <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-6">
            
            {/* Identity details */}
            <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-5">
              <h2 className="text-lg font-bold text-royal-800 border-b border-cream-100 pb-3 flex items-center gap-2">
                <Building className="h-5 w-5 text-saffron-500" />
                સંસ્થા પરિચય (Identity Settings)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ગુજરાતી સંસ્થા નામ</label>
                  <input
                    type="text"
                    required
                    value={settings.orgNameGujarati}
                    onChange={(e) => setSettings({ ...settings, orgNameGujarati: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-1 focus:ring-royal-850"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">અંગ્રેજી સંસ્થા નામ</label>
                  <input
                    type="text"
                    required
                    value={settings.orgNameEnglish}
                    onChange={(e) => setSettings({ ...settings, orgNameEnglish: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-1 focus:ring-royal-850 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">મુખ્ય મથક (Location)</label>
                  <input
                    type="text"
                    required
                    value={settings.location}
                    onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-1 focus:ring-royal-850"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ધ્યેય સૂત્ર (Tagline)</label>
                  <input
                    type="text"
                    required
                    value={settings.tagline}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-1 focus:ring-royal-850"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Logo Image */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">સંસ્થા લોગો (Logo)</label>
                  <div className="flex items-center gap-3">
                    <img 
                      src={settings.logoUrl} 
                      alt="Logo" 
                      className="h-12 w-12 rounded-full border object-cover bg-white shrink-0 shadow-sm"
                      onError={(e) => { (e.target as any).src = "https://placehold.co/100?text=KM"; }}
                    />
                    <div className="relative border border-dashed border-cream-300 rounded-xl p-3 text-center w-full hover:bg-cream-100/20 cursor-pointer flex items-center justify-center gap-1.5 text-xs text-royal-800 font-bold bg-cream-50/20">
                      <Upload className="h-4 w-4" />
                      <span>અપલોડ લોગો</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>


              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">WhatsApp ફોન નંબર</label>
                <input
                  type="text"
                  required
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  placeholder="e.g. 919876543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm font-mono"
                />
              </div>
            </div>

            {/* Member Management Panel */}
            <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-5">
              <h2 className="text-lg font-bold text-royal-800 border-b border-cream-100 pb-3 flex items-center gap-2">
                <Phone className="h-5 w-5 text-saffron-500" />
                સભ્યોની સૂચિ અને સંપર્ક સેટિંગ્સ (Staff Members Manager)
              </h2>

              {/* Add New Member Input form */}
              <div className="bg-cream-50/50 p-4 rounded-xl border border-cream-200/50 space-y-4">
                <p className="text-xs font-bold text-royal-800 flex items-center gap-1">
                  <UserPlus className="h-4 w-4" />
                  નવા સભ્ય ઉમેરો
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">સભ્યનું નામ (દા.ત. કેતલ વોરા)</label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="નામ"
                      className="w-full px-3 py-2 rounded-lg border border-cream-200 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ફોન નંબર (૧૦ આંકડા)</label>
                    <input
                      type="tel"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      placeholder="નંબર"
                      className="w-full px-3 py-2 rounded-lg border border-cream-200 bg-white text-xs font-mono"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm"
                >
                  સભ્ય ઉમેરો
                </button>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">સક્રિય સભ્યો ({activeMembers.length})</p>
                
                <div className="border border-cream-200 rounded-xl divide-y divide-cream-100 overflow-hidden bg-cream-50/10">
                  {activeMembers.map((member, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-royal-800">{member.name}</p>
                        <p className="font-semibold font-mono text-gray-500">{member.phone}</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer text-royal-800 font-bold select-none">
                          <input
                            type="checkbox"
                            checked={member.showOnCard}
                            onChange={() => handleToggleMemberCard(idx)}
                            className="h-4 w-4 accent-royal-800"
                          />
                          <span>કાર્ડ પર બતાવો</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="કાઢી નાખો"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {activeMembers.length === 0 && (
                    <div className="p-6 text-center text-gray-400 italic">કોઈ સભ્ય નોંધાયેલ નથી.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Donation Methods configuration */}
            {/* Donation Methods */}
            <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-royal-800 border-b border-cream-100 pb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-saffron-500" />
                સેવા સહયોગ વિગતો (Donation Methods Text)
              </h2>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">કાર્ડની નીચે પ્રદર્શિત કરવા માટેની બેંક વિગતો / નોંધ</label>
                <textarea
                  value={settings.donationMethods || ""}
                  onChange={(e) => setSettings({ ...settings, donationMethods: e.target.value })}
                  placeholder="બેંક વિગત: કરુણા-મૈત્રી જીવદયા ગ્રુપ | SBI A/c: 39825284610 | IFSC: SBIN0060085"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* QR Settings */}
            <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-royal-800 border-b border-cream-100 pb-3 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-saffron-500" />
                UPI / QR કોડ સેટિંગ્સ
              </h2>

              <div className="flex items-center justify-between bg-cream-50/50 p-3.5 rounded-xl border border-cream-100 text-xs font-bold text-royal-800">
                <span>પત્રિકા પર QR કોડ બતાવવો?</span>
                <input
                  type="checkbox"
                  checked={settings.showQR}
                  onChange={(e) => setSettings({ ...settings, showQR: e.target.checked })}
                  className="h-4.5 w-4.5 accent-royal-800"
                />
              </div>

              {settings.showQR && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">તમારી સંસ્થાનો UPI QR કોડ અપલોડ કરો</label>
                    <div className="flex items-center gap-4">
                      {settings.qrImageUrl ? (
                        <img 
                          src={settings.qrImageUrl} 
                          alt="Custom QR" 
                          className="h-16 w-16 border bg-white p-1 rounded shrink-0 object-contain shadow-sm" 
                        />
                      ) : (
                        <div className="h-16 w-16 border border-dashed border-cream-300 bg-cream-50 flex items-center justify-center text-[10px] text-gray-400 font-bold font-sans">QR નથી</div>
                      )}
                      <div className="relative border border-dashed border-cream-300 rounded-xl p-3 bg-cream-50/20 text-center w-full hover:bg-cream-100/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs text-royal-855 font-bold">
                        <Upload className="h-4.5 w-4.5" />
                        <span>UPI QR કોડ અપલોડ કરો (Base64)</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleQrUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reminders Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-royal-800 border-b border-cream-100 pb-3 flex items-center gap-2">
                <Bell className="h-5 w-5 text-saffron-500" />
                રિમાઇન્ડર સેટિંગ્સ
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-cream-50/50 p-3 rounded-xl border border-cream-100 text-xs font-bold text-royal-800">
                  <span>રિમાઇન્ડર એન્જિન સક્રિય?</span>
                  <input
                    type="checkbox"
                    checked={settings.enableReminders}
                    onChange={(e) => setSettings({ ...settings, enableReminders: e.target.checked })}
                    className="h-4.5 w-4.5 accent-royal-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">રીમાઇન્ડર વિન્ડો (દિવસો)</label>
                  <input
                    type="number"
                    required
                    value={settings.reminderWindowDays}
                    onChange={(e) => setSettings({ ...settings, reminderWindowDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">મોકલવાનો ડિફોલ્ટ સંદેશ *</label>
                <textarea
                  value={settings.defaultReminderTemplate}
                  onChange={(e) => setSettings({ ...settings, defaultReminderTemplate: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-cream-200 text-xs leading-relaxed"
                />
              </div>
            </div>

            {/* Database Archive & Maintenance (Reset) Section */}
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-300 shadow-sm space-y-4 relative overflow-hidden bg-gradient-to-b from-amber-50/30 to-white">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <h2 className="text-lg font-bold text-royal-850 flex items-center gap-2">
                  <Database className="h-5 w-5 text-amber-600" />
                  ડેટાબેઝ આર્કાઇવ અને રીસેટ (Database Archive & Maintenance)
                </h2>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-amber-300">
                  Firebase Free Tier Safe
                </span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2 text-xs text-amber-900 leading-relaxed">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">સુરક્ષા અને કાયમી સંગ્રહ માર્ગદર્શિકા:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
                      <li><strong>દાતાઓની યાદી (Donors Directory)</strong> સંપૂર્ણ સુરક્ષિત રહેશે - કોઈ દાતા કાઢી નાખવામાં આવશે નહીં.</li>
                      <li><strong>કુલ દાન રકમ અને વાર્ષિક હિસાબ</strong> કાયમી ધોરણે સુરક્ષિત સંગ્રહિત થશે.</li>
                      <li>આર્કાઇવ કરતાં પહેલાં <strong>તમામ દાનનો પૂરતો Excel બેકઅપ</strong> સ્વચાલિત ડાઉનલોડ થશે.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Archive Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-cream-50/60 p-3 rounded-xl border border-cream-200 text-center relative group">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">કાયમી આર્કાઇવ થયેલ રકમ (All-Time Saved ₹)</p>
                  <p className="text-lg font-extrabold text-royal-850 mt-0.5">
                    ₹ {(settings.lifetimeArchivedAmount || 0).toLocaleString("en-IN")}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetCumulativeTotalOnly}
                    className="mt-1 text-[10px] font-bold text-red-600 hover:text-red-800 underline transition-colors"
                  >
                    સરવાળો (₹ 0) રીસેટ કરો
                  </button>
                </div>
                <div className="bg-cream-50/60 p-3 rounded-xl border border-cream-200 text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">આર્કાઇવ થયેલ દાન સંખ્યા (Archived Entries)</p>
                  <p className="text-lg font-extrabold text-royal-850 mt-0.5">
                    {(settings.lifetimeArchivedCount || 0).toLocaleString("en-IN")} દાન એન્ટ્રીઓ
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExcelModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-sm text-xs transition-all active:scale-[0.98]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>ડાઉનલોડ કરો Excel બેકઅપ / તારીખ મુજબ રિપોર્ટ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsArchiveModalOpen(true);
                    setArchiveConfirmInput("");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm text-xs transition-all active:scale-[0.98]"
                >
                  <Archive className="h-4 w-4" />
                  <span>આર્કાઇવ રીસેટ (વર્ષના અંતે)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFullResetModalOpen(true);
                    setArchiveConfirmInput("");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-xl shadow-sm text-xs transition-all active:scale-[0.98]"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>સંપૂર્ણ માર્કેટ ક્લીન રીસેટ</span>
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div>
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full bg-royal-800 hover:bg-royal-900 text-cream-50 font-bold py-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                {savingSettings ? "બધા ફેરફારો સાચવાઈ રહ્યા છે..." : "બધા ફેરફારો સાચવો (Save All Settings)"}
              </button>
            </div>
          </form>

          {/* Right Column: Seva Category Editor */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-cream-100 pb-3">
                <h2 className="text-lg font-bold text-royal-800 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-saffron-500" />
                  સેવા શ્રેણીઓ (Seva Types)
                </h2>
                <button
                  onClick={handleCreateSevaClick}
                  className="bg-royal-800 text-cream-50 p-1.5 rounded-lg hover:bg-royal-900 transition-colors"
                  title="નવી સેવા ઉમેરો"
                >
                  <Plus className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {sevaTypes.map((seva) => (
                  <div
                    key={seva.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                      seva.active
                        ? "bg-cream-50/30 border-cream-200"
                        : "bg-gray-55 border-gray-100 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full shrink-0 border" style={{ backgroundColor: seva.accentColor }} />
                        <h4 className="font-extrabold text-royal-800 text-sm leading-none">{seva.nameGujarati}</h4>
                      </div>
                      <p className="text-[10px] text-gray-550 mt-2 font-semibold">કાર્ડ નામ: "{seva.cardTitle}"</p>
                      <p className="text-[9px] text-gray-400 font-bold tracking-wider mt-1">{seva.nameEnglish} • ક્રમ: {seva.sortOrder}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditSevaClick(seva)}
                        className="p-1.5 text-gray-400 hover:text-royal-805 hover:bg-cream-100 rounded-lg transition-colors"
                        title="સુધારો"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSeva(seva.id)}
                        className="p-1.5 text-gray-400 hover:text-red-655 hover:bg-red-50 rounded-lg transition-colors"
                        title="કાઢી નાખો"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SEVA MODAL POPUP */}
      {isCreatingSeva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white max-w-lg w-full p-6 rounded-2xl shadow-xl border border-cream-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-cream-100 pb-3">
              <h3 className="text-lg font-bold text-royal-800 flex items-center gap-2">
                <Heart className="h-5.5 w-5.5 text-saffron-500" />
                {editSeva ? "સેવા પ્રવૃત્તિમાં સુધારો" : "નવી સેવા પ્રવૃત્તિ"}
              </h3>
              <button onClick={() => setIsCreatingSeva(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSeva} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ગુજરાતી નામ *</label>
                  <input
                    type="text"
                    required
                    value={sevaNameGujarati}
                    onChange={(e) => setSevaNameGujarati(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">અંગ્રેજી નામ *</label>
                  <input
                    type="text"
                    required
                    value={sevaNameEnglish}
                    onChange={(e) => setSevaNameEnglish(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">વર્ણન (Description) *</label>
                <input
                  type="text"
                  required
                  value={sevaDescription}
                  onChange={(e) => setSevaDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">પત્રિકા શીર્ષક (Card Title) *</label>
                <input
                  type="text"
                  required
                  value={sevaCardTitle}
                  onChange={(e) => setSevaCardTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">સેવા હેડર ઇમેજ (Seva Banner Image)</label>
                <div className="flex items-center gap-4">
                  {sevaHeroImageBase64 && (
                    <img 
                      src={sevaHeroImageBase64} 
                      alt="Seva Banner" 
                      className="h-16 w-32 border bg-white p-0.5 rounded object-cover" 
                      onError={(e) => { (e.target as any).src = "/dogs_collage.png"; }}
                    />
                  )}
                  <div className="relative border border-dashed border-cream-300 rounded-xl p-3 bg-cream-50/20 text-center w-full hover:bg-cream-100/10 cursor-pointer flex items-center justify-center gap-1.5 text-xs text-royal-850 font-bold">
                    <Upload className="h-4.5 w-4.5" />
                    <span>અપલોડ બેનર (Base64)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleSevaImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">થીમ કલર *</label>
                  <input
                    type="color"
                    required
                    value={sevaAccentColor}
                    onChange={(e) => setSevaAccentColor(e.target.value)}
                    className="w-full h-10 p-1 rounded-xl border border-cream-200 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">શ્રેણી ક્રમ *</label>
                  <input
                    type="number"
                    required
                    value={sevaSortOrder}
                    onChange={(e) => setSevaSortOrder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm font-mono"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center justify-between border border-cream-200 p-2.5 rounded-xl h-10 text-xs font-bold text-royal-800">
                    <span>સક્રિય (Active)?</span>
                    <input
                      type="checkbox"
                      checked={sevaActive}
                      onChange={(e) => setSevaActive(e.target.checked)}
                      className="h-4.5 w-4.5 accent-royal-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">આભાર સંદેશ *</label>
                <textarea
                  value={sevaDefaultMessage}
                  onChange={(e) => setSevaDefaultMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-cream-200 text-xs leading-relaxed"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsCreatingSeva(false)}
                  className="px-4 py-2.5 border border-cream-200 rounded-xl text-gray-500"
                >
                  રદ કરો
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-royal-800 hover:bg-royal-900 text-cream-50 rounded-xl shadow-sm"
                >
                  સાચવો
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Export Selection Modal (Full Database or Date-Range Filter) */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3 text-emerald-800">
                <div className="p-2.5 bg-emerald-100 rounded-2xl">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-royal-950">Excel રિપોર્ટ અને બેકઅપ ડાઉનલોડ</h3>
                  <p className="text-[11px] font-bold text-gray-500">સંપૂર્ણ ડેટાબેઝ અથવા તારીખ પસંદ કરીને મેળવો</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Selection Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-cream-50 p-1.5 rounded-2xl border border-cream-200">
              <button
                type="button"
                onClick={() => setExcelExportMode("full")}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  excelExportMode === "full"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-gray-600 hover:text-royal-800"
                }`}
              >
                📁 તમામ ડેટા
              </button>
              <button
                type="button"
                onClick={() => setExcelExportMode("month")}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  excelExportMode === "month"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-gray-600 hover:text-royal-800"
                }`}
              >
                🗓️ મહિનો
              </button>
              <button
                type="button"
                onClick={() => setExcelExportMode("range")}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  excelExportMode === "range"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-gray-600 hover:text-royal-800"
                }`}
              >
                📅 તારીખ ગાળો
              </button>
            </div>

            {excelExportMode === "full" ? (
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-2 text-xs text-emerald-950">
                <p className="font-bold">સંપૂર્ણ ડેટાબેઝ એક્સપોર્ટ:</p>
                <p className="text-gray-700 leading-relaxed">
                  શરૂઆતથી અત્યાર સુધીની તમામ દાન એન્ટ્રીઓ (દાતાનું નામ, ફોન, રકમ, સેવા, તારીખ, સંદેશ) સંપૂર્ણ ગુજરાતી UTF-8 BOM સપોર્ટ સાથે ડાઉનલોડ થશે.
                </p>
              </div>
            ) : excelExportMode === "month" ? (
              <div className="space-y-4 bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100">
                <div>
                  <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-1.5">
                    મહિનો પસંદ કરો (Select Month) *
                  </label>
                  <input
                    type="month"
                    value={excelSelectedMonth}
                    onChange={(e) => e.target.value && setExcelSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-cream-200 text-sm font-mono bg-white"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = new Date();
                      setExcelSelectedMonth(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
                    }}
                    className="text-xs bg-white border border-cream-300 hover:border-emerald-600 px-3 py-1.5 rounded-lg font-bold text-royal-800 transition-colors"
                  >
                    આ મહિનો
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = new Date();
                      const prevD = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
                      setExcelSelectedMonth(`${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}`);
                    }}
                    className="text-xs bg-white border border-cream-300 hover:border-emerald-600 px-3 py-1.5 rounded-lg font-bold text-royal-800 transition-colors"
                  >
                    ગત મહિનો
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  પસંદ કરેલ મહિનાની શરૂઆતથી અંત સુધીની તમામ દાન એન્ટ્રીઓ એક ક્લિકમાં Excel રિપોર્ટ તરીકે મળશે.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-1.5">
                      તારીખથી (From Date) *
                    </label>
                    <input
                      type="date"
                      value={excelStartDate}
                      onChange={(e) => setExcelStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-cream-200 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-royal-800 uppercase tracking-wider mb-1.5">
                      તારીખ સુધી (To Date) *
                    </label>
                    <input
                      type="date"
                      value={excelEndDate}
                      onChange={(e) => setExcelEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-cream-200 text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-gray-500 self-center mr-1">ઝડપી પસંદગી:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
                      const today = now.toISOString().split("T")[0];
                      setExcelStartDate(first);
                      setExcelEndDate(today);
                    }}
                    className="text-[11px] bg-white border border-cream-300 hover:border-emerald-600 px-2.5 py-1 rounded-lg font-bold text-royal-800 transition-colors"
                  >
                    આ મહિનો
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
                      const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
                      setExcelStartDate(firstPrev);
                      setExcelEndDate(lastPrev);
                    }}
                    className="text-[11px] bg-white border border-cream-300 hover:border-emerald-600 px-2.5 py-1 rounded-lg font-bold text-royal-800 transition-colors"
                  >
                    ગત મહિનો
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const curYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                      setExcelStartDate(`${curYear}-04-01`);
                      setExcelEndDate(now.toISOString().split("T")[0]);
                    }}
                    className="text-[11px] bg-white border border-cream-300 hover:border-emerald-600 px-2.5 py-1 rounded-lg font-bold text-royal-800 transition-colors"
                  >
                    ચાલુ નાણાકીય વર્ષ (FY)
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                બંધ કરો (Close)
              </button>
              <button
                type="button"
                disabled={exportingExcel}
                onClick={async () => {
                  if (excelExportMode === "full") {
                    await exportFullBackupToExcel();
                  } else if (excelExportMode === "month") {
                    await exportFullBackupToExcel(undefined, undefined, excelSelectedMonth);
                  } else {
                    await exportFullBackupToExcel(excelStartDate, excelEndDate);
                  }
                  setIsExcelModalOpen(false);
                }}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                <span>{exportingExcel ? "ડાઉનલોડ થઈ રહ્યું છે..." : "Excel (.csv) ડાઉનલોડ કરો"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive & Reset Safety Confirmation Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-red-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 border-b border-red-100 pb-3">
              <div className="p-2.5 bg-red-100 rounded-2xl">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-950">⚠️ ડેટાબેઝ આર્કાઇવ સુરક્ષા ખરાઈ</h3>
                <p className="text-[11px] font-bold text-red-700">ડેટાબેઝ રીસેટ કરતાં પહેલાં ધ્યાન આપો</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed bg-red-50/50 p-4 rounded-2xl border border-red-100">
              <p className="font-bold text-red-950">પ્રક્રિયા દરમિયાન શું થશે?</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-800 font-medium">
                <li>સૌપ્રથમ <strong>બધા દાનનો પૂરતો Excel બેકઅપ ફાઈલ (.csv)</strong> આપોઆપ ડાઉનલોડ થઈ જશે.</li>
                <li>તમામ જૂની એન્ટ્રીઓનો <strong>કુલ દાન રકમનો સરવાળો</strong> કાયમી ધોરણે હિસાબમાં ઉમેરાઈ જશે.</li>
                <li><strong>દાતાઓની માહિતી અને ફોન નંબરો</strong> સંપૂર્ણ સુરક્ષિત રહેશે (કાઢી નાખવામાં આવશે નહીં).</li>
                <li>ડેટાબેઝમાંથી જૂના દાનની એન્ટ્રીઓ સાફ કરવામાં આવશે.</li>
              </ol>
            </div>

            {archiving ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-amber-600 border-t-transparent"></div>
                <p className="text-xs font-bold text-amber-900">{archiveProgressMsg}</p>
                <p className="text-[10px] text-amber-700 font-medium">કૃપા કરીને પૃષ્ઠ બંધ કરશો નહીં...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ખાતરી કરવા માટે નીચેના બોક્સમાં <span className="text-red-600 font-mono font-extrabold">ARCHIVE</span> લખો:
                  </label>
                  <input
                    type="text"
                    value={archiveConfirmInput}
                    onChange={(e) => setArchiveConfirmInput(e.target.value)}
                    placeholder="ARCHIVE"
                    className="w-full px-3.5 py-2.5 border-2 border-red-200 focus:border-red-500 rounded-xl text-sm font-mono font-bold uppercase tracking-wider outline-none transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsArchiveModalOpen(false);
                      setArchiveConfirmInput("");
                    }}
                    className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    રદ કરો (Cancel)
                  </button>
                  <button
                    type="button"
                    disabled={archiveConfirmInput.trim().toUpperCase() !== "ARCHIVE"}
                    onClick={handleArchiveAndResetDatabase}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    હા, આર્કાઇવ કરો
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Full Market Reset Modal */}
      {isFullResetModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 border border-red-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-2xl">
                <ShieldAlert className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-red-950">🚨 સંપૂર્ણ માર્કેટ રીસેટ (Full Reset)</h3>
                <p className="text-[11px] font-bold text-red-700">તમામ ટેસ્ટ ડેટા કાયમી ધોરણે સાફ કરો</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed bg-red-50/50 p-4 rounded-2xl border border-red-100">
              <p className="font-bold text-red-950">પ્રક્રિયા દરમિયાન શું થશે?</p>
              <ol className="list-decimal list-inside space-y-1.5 text-gray-800 font-medium">
                <li>સૌપ્રથમ <strong>બધા દાનનો પૂરતો Excel બેકઅપ ફાઈલ (.csv)</strong> આપોઆપ ડાઉનલોડ થઈ જશે.</li>
                <li>તમામ ટેસ્ટ દાન એન્ટ્રીઓ (Donations) સાફ થશે.</li>
                <li>તમામ ટેસ્ટ દાતાશ્રીઓની પ્રોફાઈલ (Donors Directory) સાફ થશે.</li>
                <li>તમામ ટેસ્ટ રિમાઇન્ડર સાફ થશે (સંસ્થા સેટિંગ્સ સુરક્ષિત રહેશે).</li>
              </ol>
            </div>

            {archiving ? (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-center space-y-2">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent"></div>
                <p className="text-xs font-bold text-red-900">{archiveProgressMsg}</p>
                <p className="text-[10px] text-red-700 font-medium">કૃપા કરીને પૃષ્ઠ બંધ કરશો નહીં...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ખાતરી કરવા માટે નીચેના બોક્સમાં <span className="text-red-600 font-mono font-extrabold">RESET</span> લખો:
                  </label>
                  <input
                    type="text"
                    value={archiveConfirmInput}
                    onChange={(e) => setArchiveConfirmInput(e.target.value)}
                    placeholder="RESET"
                    className="w-full px-3.5 py-2.5 border-2 border-red-200 focus:border-red-500 rounded-xl text-sm font-mono font-bold uppercase tracking-wider outline-none transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullResetModalOpen(false);
                      setArchiveConfirmInput("");
                    }}
                    className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    રદ કરો (Cancel)
                  </button>
                  <button
                    type="button"
                    disabled={archiveConfirmInput.trim().toUpperCase() !== "RESET"}
                    onClick={handleFullMarketReset}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    હા, ૧૦૦% રીસેટ કરો
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
