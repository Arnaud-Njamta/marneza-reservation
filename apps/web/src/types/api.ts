export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export type BookingType = {
  id: string;
  code: string;
  name: string;
  defaultStartTime: string;
  defaultEndTime: string;
  spansOvernight: boolean;
};

export type PricingRule = {
  amount: string | number;
  amountPersonnel?: string | number | null;
  amountEntreprise?: string | number | null;
  compareAtAmount?: string | number | null;
  promoLabel?: string | null;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
  isActive?: boolean;
  bookingType: BookingType;
};

export type Resource = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  resourceType: {
    code: string;
    name: string;
    bookingTypes: BookingType[];
  };
  pricingRules: PricingRule[];
};

export type AvailabilityResult = {
  available: string[];
  unavailable: string[];
  resource: { slug: string; name: string };
};

export type Quote = {
  amount: number;
  currency: string;
  compareAtAmount?: number;
  promoLabel?: string;
  customerCategory?: CustomerCategory;
  note?: string;
  promoCode?: string;
  promoDiscount?: number;
  amountBeforePromo?: number;
  includesApartment?: boolean;
  apartmentAddon?: number;
};

export type AdminPricingRule = {
  id: string;
  amount: string | number;
  amountPersonnel?: string | number | null;
  amountEntreprise?: string | number | null;
  compareAtAmount: string | number | null;
  promoLabel: string | null;
  currency: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  resource: { id: string; slug: string; name: string };
  bookingType: { id: string; code: string; name: string };
};

export type CustomerCategory = 'personnel' | 'entreprise';

export type BookingFeeLine = {
  id?: string;
  label: string;
  amount: number | string;
};

export type Booking = {
  id: string;
  referenceNumber?: string | null;
  status: string;
  startAt: string;
  endAt: string;
  expiresAt: string | null;
  customerCategory: CustomerCategory;
  companyName?: string | null;
  quotedAmount?: string | number | null;
  priceNote?: string | null;
  totalAmount: string | number;
  currency: string;
  eventType: string;
  notes?: string | null;
  termsAcceptedAt?: string | null;
  invoiceSentAt?: string | null;
  paymentClaimedAt?: string | null;
  accessToken?: string;
  accessTokenExpiresAt?: string | null;
  feeLines?: BookingFeeLine[];
  includesApartment?: boolean;
  odooSaleOrderId?: number | null;
  resource: { name: string; slug: string };
  bookingType: { name: string; code: string; spansOvernight?: boolean };
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  payments?: Array<{
    id: string;
    status: string;
    amount: string | number;
    paidAt?: string | null;
  }>;
};

export type AdminStats = {
  created: number;
  processing: number;
  paid: number;
  thisMonth: number;
};

export type CalendarBooking = Booking & {
  resource?: { name: string; slug: string };
};

export type AdminCalendarData = {
  resource: { id: string; name: string; slug: string };
  resources?: Array<{ id: string; name: string; slug: string }>;
  bookings: CalendarBooking[];
  blockedPeriods: {
    id: string;
    startAt: string;
    endAt: string;
    reason: string | null;
    resource?: { name: string; slug: string };
  }[];
};

export type UpcomingBooking = CalendarBooking & {
  daysUntil: number;
  urgency: 'today' | '1day' | '3days' | null;
};

export type EventType = 'wedding' | 'party' | 'ceremony' | 'conference' | 'other';

export type EmailTemplate = {
  id: string | null;
  code: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  useRichEditor?: boolean;
  isActive?: boolean;
};

export type ReminderConfig = {
  id: string;
  name: string;
  horizonMonths: number;
  statuses: string[];
  resourceIds?: string[] | null;
  showInDashboard: boolean;
  emailEnabled: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type SynthesisResult = {
  horizonMonths: number;
  from: string;
  to: string;
  count: number;
  totalAmount: number;
  currency: string;
  byResource: Record<string, number>;
  bookings: Booking[];
};

export type PromoCode = {
  id: string;
  code: string;
  discountAmount: string | number;
  currency: string;
  validFrom?: string | null;
  validTo?: string | null;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  label?: string | null;
};

/** Point de condition de location (éditable admin). */
export type RentalTerm = {
  id: string;
  body: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Coordonnées de paiement (virement / mobile money) — injectées dans l'email de synthèse. */
export type PaymentSettings = {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  mobileMoney: string;
  referenceHelp: string;
};
