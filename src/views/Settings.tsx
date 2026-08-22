import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp, deleteDoc } from "firebase/firestore";
import { seedDatabase, DEFAULT_ORG_SETTINGS, DEFAULT_SEVA_TYPES } from "../lib/dbSeed";
import { compressImageToBase64 } from "../utils/image";
import { Heart, Building, Phone, QrCode, Bell, Plus, Edit, Upload, Sparkles, CreditCard, Trash2, UserPlus, CheckCircle } from "lucide-react";
import { OrganizationSettings, SevaType } from "../types";

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
    </div>
  );
};
