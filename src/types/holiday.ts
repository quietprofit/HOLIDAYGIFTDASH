export type ListStatus = 'nice' | 'naughty' | 'undecided';
export type GiftStatus = 'planned' | 'purchased' | 'wrapped' | 'delivered';
export type FulfillmentMode = 'in_store' | 'online';
export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'online_only' | 'unknown';
export type EventType = 'party' | 'exchange' | 'dinner' | 'errand' | 'other';
export type SupplyStockStatus = 'need_to_buy' | 'low' | 'stocked';

export const FIELD_LIMITS = {
  ID_MAX: 128,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  DISPLAY_NAME_MAX: 80,
  MEMBER_NAME_MAX: 80,
  RELATIONSHIP_MAX: 60,
  AGE_GROUP_MAX: 40,
  INTERESTS_MAX: 300,
  NICE_DEEDS_MAX: 300,
  NOTES_MAX: 400,
  GIFT_TITLE_MAX: 140,
  STORE_NAME_MAX: 80,
  URL_MAX: 500,
  EVENT_TITLE_MAX: 120,
  DATE_REGEX: /^\d{4}-\d{2}-\d{2}$/,
  TIME_MAX: 20,
  LOCATION_MAX: 120,
  ATTENDEES_MAX: 300,
  SUPPLY_NAME_MAX: 100,
  SUPPLY_CAT_MAX: 50,
  SUPPLY_QTY_MAX: 80,
  DRAW_TITLE_MAX: 120,
  MAX_PARTICIPANTS: 30,
  MONEY_MAX: 1000000,
} as const;

export function clampString(value: string | undefined | null, max: number, fallback = ''): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

export function clampMoney(value: number | string | undefined | null): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(Math.round(num * 100) / 100, FIELD_LIMITS.MONEY_MAX);
}

export function sanitizeId(value: string | undefined | null, fallback = 'general'): string {
  const cleaned = (value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, FIELD_LIMITS.ID_MAX);
  return cleaned.length > 0 ? cleaned : fallback;
}

export interface UserSettings {
  ownerId: string;
  displayName: string;
  overallBudget: number;
  alertThresholdPct: number;
  notificationsEnabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FamilyMember {
  id: string;
  ownerId: string;
  name: string;
  relationship: string;
  ageGroup: string;
  listStatus: ListStatus;
  budgetAllocated: number;
  interests: string;
  niceDeeds: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GiftItem {
  id: string;
  ownerId: string;
  memberId: string;
  memberName: string;
  title: string;
  estimatedPrice: number;
  actualPrice: number;
  storeName: string;
  storeStopOrder: number;
  fulfillmentMode: FulfillmentMode;
  purchaseUrl: string;
  availabilityStatus: AvailabilityStatus;
  priceAlertEnabled: boolean;
  status: GiftStatus;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdventEvent {
  id: string;
  ownerId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  eventType: EventType;
  participantCount: number;
  budgetPerPerson: number;
  totalBudget: number;
  attendeesText: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WrappingSupply {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  quantityNote: string;
  stockStatus: SupplyStockStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SecretSantaAssignment {
  giver: string;
  receiver: string;
}

export interface SecretSantaDraw {
  id: string;
  ownerId: string;
  title: string;
  exchangeDate: string;
  budgetLimit: number;
  participants: string[];
  assignments: SecretSantaAssignment[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface HolidayAlert {
  id: string;
  severity: 'danger' | 'warning' | 'info';
  category: 'budget' | 'deadline' | 'wrapping' | 'stock';
  title: string;
  detail: string;
}

export type ActiveTab =
  | 'overview'
  | 'naughty-nice'
  | 'workshop'
  | 'routes'
  | 'advent'
  | 'wrapping'
  | 'secret-santa';
