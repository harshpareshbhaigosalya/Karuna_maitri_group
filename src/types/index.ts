export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  active: boolean;
  createdAt: any;
}

export interface Donor {
  id: string;
  fullName: string;
  normalizedPhone: string;
  phone: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Donation {
  id: string;
  donorId: string;
  donorNameSnapshot: string;
  phoneSnapshot: string;
  sevaTypeId: string;
  sevaNameSnapshot: string;
  amount: number;
  donationDate: string; // Formatted as YYYY-MM-DD
  occasionType?: string; // e.g., 'જન્મદિવસ', 'લગ્ન વર્ષગાંઠ', etc.
  occasionDate?: string; // Formatted as MM-DD or YYYY-MM-DD
  customMessage?: string;
  donorPhotoUrl?: string;
  customImageUrl?: string;
  templateId?: string;
  hasteName?: string;
  createdBy: string; // User ID of creator
  createdAt: any;
  updatedAt: any;
}

export interface SevaType {
  id: string;
  nameGujarati: string;
  nameEnglish: string;
  description: string;
  cardTitle: string;
  defaultMessage: string;
  heroImageUrl: string; // Firebase Storage or fallback static URL
  iconUrl?: string;
  accentColor: string; // hex color e.g. #0B2F64
  active: boolean;
  sortOrder: number;
  createdAt: any;
  updatedAt: any;
}

export interface CardTemplate {
  id: string;
  name: string;
  sevaTypeId: string;
  backgroundUrl?: string;
  heroImageUrl?: string;
  configuration: {
    textColor?: string;
    borderColor?: string;
    layout?: 'standard' | 'minimal' | 'collage';
    showLogo?: boolean;
    showPhone?: boolean;
    showOccasion?: boolean;
    showQR?: boolean;
    showDonorPhoto?: boolean;
    customMessageSize?: string;
  };
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface ContactPerson {
  name: string;
  phone: string;
}

export interface YearlyArchive {
  yearLabel: string;
  totalAmount: number;
  totalCount: number;
  archivedAt: string;
}

export interface OrganizationSettings {
  orgNameGujarati: string;
  orgNameEnglish: string;
  location: string;
  logoUrl: string;
  tagline: string;
  contacts: ContactPerson[];
  whatsappNumber: string;
  email?: string;
  website?: string;
  defaultHeader: string;
  defaultFooter: string;
  defaultThankYouMessage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  showQR: boolean;
  qrUrl?: string;
  qrImageUrl?: string;
  qrLabel?: string;
  reminderWindowDays: number; // e.g., 3 means -3 to +3 days
  defaultReminderTemplate: string;
  enableReminders: boolean;
  donationMethods?: string; // Customizable bank transfer details
  defaultHeroImage?: string; // Base64 of default dog/cow collage image
  members?: Array<{ name: string; phone: string; showOnCard: boolean; }>;
  lifetimeArchivedAmount?: number;
  lifetimeArchivedCount?: number;
  yearlyArchives?: YearlyArchive[];
  updatedAt: any;
}

export interface Reminder {
  id: string;
  donorId: string;
  sourceDonationId: string;
  occasionType: string;
  occasionDate: string; // Formatted as MM-DD
  targetYear: number; // The year this reminder applies to (e.g. 2026)
  previousAmount: number;
  previousSeva: string;
  status: 'upcoming' | 'due' | 'overdue' | 'completed' | 'dismissed' | 'snoozed';
  reminderDate: string; // The exact date of occasion in target year (YYYY-MM-DD)
  snoozedUntil?: string; // YYYY-MM-DD
  completedAt?: any;
  dismissedAt?: any;
  createdAt: any;
  computedStatus?: 'upcoming' | 'due' | 'overdue' | 'completed' | 'dismissed' | 'snoozed';
}
