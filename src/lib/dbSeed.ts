import { doc, writeBatch, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { SevaType, OrganizationSettings } from "../types";

export const DEFAULT_SEVA_TYPES: Omit<SevaType, 'createdAt' | 'updatedAt'>[] = [
  {
    id: "dudh-pova",
    nameGujarati: "દરરોજ કૂતરાઓ માટે દૂધપૌવા",
    nameEnglish: "Daily Milk-Pova for Dogs",
    description: "Daily milk and food feeding service for street dogs in Surendranagar.",
    cardTitle: "અબોલ પશુ-પક્ષીઓ માટે દૂધપૌવા સેવા",
    defaultMessage: "તમારું દાન આ અબોલ પશુ-પક્ષીઓ માટે જીવનદાન છે. તમારી કરુણા અને દયાભાવ સદા યાદ રહેશે. આપનો હૃદયપૂર્વક આભાર.",
    heroImageUrl: "/dogs_collage.png",
    accentColor: "#0B2F64",
    active: true,
    sortOrder: 1,
  },
  {
    id: "bird-nest-pot",
    nameGujarati: "પંખીના માળા-કુંડાનું વિતરણ",
    nameEnglish: "Bird Nest & Water Pot Distribution",
    description: "Distribution of bird nests and water/food clay pots for summers.",
    cardTitle: "પંખીના માળા-કુંડા વિતરણ સેવા",
    defaultMessage: "અબોલ પંખીઓ માટે માળા અને પાણીના કુંડાની વ્યવસ્થામાં આપનો સહયોગ વંદનીય છે. પક્ષી સેવામાં ભાગીદાર બનવા બદલ આભાર.",
    heroImageUrl: "", // Will fall back to default bird graphic or empty
    accentColor: "#15803d",
    active: true,
    sortOrder: 2,
  },
  {
    id: "panjrapole-visit",
    nameGujarati: "પાંજરાપોળમાં મુલાકાત અને સેવા",
    nameEnglish: "Panjrapole Visits & Seva",
    description: "Visits and service activities for old, infirm, and rescued cattle at Panjrapoles.",
    cardTitle: "પાંજરાપોળ સેવા અને જીવદયા કાર્ય",
    defaultMessage: "પાંજરાપોળના અશક્ત અને નિરાધાર પશુઓની તૃપ્તિ અર્થે આપેલા ગૌ-ગ્રાસ અને સેવામાં સહયોગ બદલ આપનો ખૂબ આભાર.",
    heroImageUrl: "",
    accentColor: "#a16207",
    active: true,
    sortOrder: 3,
  },
  {
    id: "animal-treatment",
    nameGujarati: "બીમાર પશુ-પક્ષીઓની સારવાર",
    nameEnglish: "Treatment for Sick Animals/Birds",
    description: "Medical treatment and rescue services for injured or sick street animals and birds.",
    cardTitle: "બીમાર પશુ-પક્ષી સારવાર સેવા",
    defaultMessage: "પીડિત અને મૂંગા પશુ-પક્ષીઓની વેદના હરવાના આપના કરુણાસભર સારવાર સહયોગ બદલ આપનો હૃદયપૂર્વક આભાર.",
    heroImageUrl: "",
    accentColor: "#be123c",
    active: true,
    sortOrder: 4,
  },
  {
    id: "bird-camp",
    nameGujarati: "બર્ડ કેમ્પમાં સેવા (JCT અમદાવાદ)",
    nameEnglish: "Bird Camp Seva (JCT Ahmedabad)",
    description: "Volunteering and funding bird camps during Uttarayan with JCT Ahmedabad.",
    cardTitle: "બર્ડ કેમ્પ સેવા (JCT અમદાવાદ)",
    defaultMessage: "પતંગના દોરાથી ઘાયલ અબોલ પક્ષીઓને નવજીવન આપવાના આપના કરુણાસભર બર્ડ કેમ્પ સેવા સહયોગ બદલ આભાર.",
    heroImageUrl: "",
    accentColor: "#0369a1",
    active: true,
    sortOrder: 5,
  },
  {
    id: "sunday-fruits",
    nameGujarati: "દર રવિવારે ફળ વિતરણ સેવા",
    nameEnglish: "Sunday Fruit Distribution",
    description: "Fruit distribution to needy patients at Gandhi Hospital, CJ Hospital, and TB Hospital.",
    cardTitle: "જરૂરિયાતમંદ દર્દીઓ માટે ફળ વિતરણ સેવા",
    defaultMessage: "દર રવિવારે ગાંધી હોસ્પિટલ, સી.જે. હોસ્પિટલ અને ટી.બી. હોસ્પિટલના જરૂરિયાતમંદ દર્દીઓ માટે ફળ વિતરણ સેવા સહયોગ બદલ આભાર.",
    heroImageUrl: "",
    accentColor: "#d97706",
    active: true,
    sortOrder: 6,
  },
  {
    id: "other-seva",
    nameGujarati: "અન્ય",
    nameEnglish: "Other Custom Seva",
    description: "General compassion or humanitarian services as needed.",
    cardTitle: "માનવતા અને જીવદયા સેવા કાર્ય",
    defaultMessage: "જીવદયા અને પરોપકારના સેવા કાર્યમાં સહયોગી બનવા બદલ આપનો ખૂબ ખૂબ આભાર.",
    heroImageUrl: "",
    accentColor: "#4b5563",
    active: true,
    sortOrder: 7,
  },
];

export const DEFAULT_ORG_SETTINGS: Omit<OrganizationSettings, 'updatedAt'> = {
  orgNameGujarati: "કરુણા-મૈત્રી ગ્રુપ",
  orgNameEnglish: "Karuna-Maitri Group",
  location: "સુરેન્દ્રનગર",
  logoUrl: "/logo.jpg",
  tagline: "કરુણા થી કૃત્ય સુધી, મૈત્રી થી માનવતા સુધી",
  contacts: [
    { name: "હરેશભાઈ શાહ", phone: "9876543210" },
    { name: "દિનેશભાઈ મહેતા", phone: "9426284610" }
  ],
  whatsappNumber: "919876543210",
  email: "contact@karunamaitri.org",
  website: "www.karunamaitri.org",
  defaultHeader: "જય જિનેન્દ્ર",
  defaultFooter: "કરુણા-મૈત્રી ગ્રુપ — સુરેન્દ્રનગર",
  defaultThankYouMessage: "તમારું દાન આ અબોલ પશુ-પક્ષીઓ માટે જીવનદાન છે. તમારી કરુણા અને દયાભાવ સદા યાદ રહેશે. આપનો હૃદયપૂર્વક આભાર.",
  primaryColor: "#0B2F64",
  secondaryColor: "#15803d",
  accentColor: "#D4AF37",
  showQR: true,
  qrUrl: "https://pay.upilink.in/pay/karunamaitri@sbi",
  qrLabel: "સેવા સહયોગ માટે સ્કેન કરો",
  reminderWindowDays: 3,
  enableReminders: true,
  defaultReminderTemplate: "જય જિનેન્દ્ર [દાતા],\n\nગયા વર્ષે આપના [પ્રસંગ] નિમિત્તે આપ દ્વારા [સેવા] સેવા માટે ₹[રકમ]નું દાન કરવામાં આવ્યું હતું.\n\nઆ વર્ષે પણ સેવા કાર્યમાં આપનો સહયોગ આપવા ઇચ્છો તો અમને આનંદ થશે.\n\nકરુણા-મૈત્રી ગ્રુપ, સુરેન્દ્રનગર",
  donationMethods: "બેંક વિગત: કરુણા-મૈત્રી જીવદયા ગ્રુપ | SBI A/c: 39825284610 | IFSC: SBIN0060085 | GPay/UPI: 9876543210",
  defaultHeroImage: "/dogs_collage.png",
  members: [
    { name: "કેતલ વોરા", phone: "9824255909", showOnCard: true },
    { name: "મયુર શાહ", phone: "9429099906", showOnCard: true },
    { name: "મલય વસાણી", phone: "9825530444", showOnCard: true }
  ],
};

/**
 * Seeds Firestore with default sevaTypes and organizationSettings.
 * Safe to run multiple times (uses setDoc with override or check).
 */
export async function seedDatabase(force = false): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);

    // 1. Seed Organization Settings
    const settingsRef = doc(db, "settings", "org");
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      batch.set(settingsRef, {
        ...DEFAULT_ORG_SETTINGS,
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Seed Seva Types
    for (const seva of DEFAULT_SEVA_TYPES) {
      const sevaRef = doc(db, "sevaTypes", seva.id);
      const sevaSnap = await getDoc(sevaRef);

      if (force || !sevaSnap.exists()) {
        batch.set(sevaRef, {
          ...seva,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return { success: true, message: "ડેટાબેઝ સફળતાપૂર્વક સેટઅપ થઈ ગયો છે!" };
  } catch (error: any) {
    console.error("Seeding failed:", error);
    return { success: false, message: `ભૂલ આવી: ${error.message || error}` };
  }
}
