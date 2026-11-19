import {
  AdventEvent,
  AvailabilityStatus,
  clampMoney,
  clampString,
  EventType,
  FamilyMember,
  FIELD_LIMITS,
  FulfillmentMode,
  GiftItem,
  GiftStatus,
  ListStatus,
  sanitizeId,
  SecretSantaAssignment,
  SecretSantaDraw,
  SupplyStockStatus,
  UserSettings,
  WrappingSupply,
} from '../types/holiday';

export const LOCAL_WORKSPACE_UID = 'local';
const STORAGE_KEY = 'santas_helper_workspace_v1';

export interface LocalWorkspaceState {
  settings: UserSettings;
  members: FamilyMember[];
  gifts: GiftItem[];
  events: AdventEvent[];
  supplies: WrappingSupply[];
  savedDraws: SecretSantaDraw[];
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function createStarterWorkspace(uid = LOCAL_WORKSPACE_UID): LocalWorkspaceState {
  const mem1 = 'mem_starter_maya';
  const mem2 = 'mem_starter_leo';
  const mem3 = 'mem_starter_tyler';
  const mem4 = 'mem_starter_arthur';
  const mem5 = 'mem_starter_clara';

  return {
    settings: {
      ownerId: uid,
      displayName: 'Holiday Gift Dashboard',
      overallBudget: 1200,
      alertThresholdPct: 85,
      notificationsEnabled: false,
    },
    members: [
      {
        id: mem1,
        ownerId: uid,
        name: 'Granddaughter Maya',
        relationship: 'Granddaughter',
        ageGroup: 'Child (8-11)',
        listStatus: 'nice',
        budgetAllocated: 120,
        interests: 'Watercolor painting, chapter books, cozy blush pink sweaters',
        niceDeeds: 'Helped bake gingerbread cookies and read to little brother',
        notes: 'Size 10 youth clothes',
      },
      {
        id: mem2,
        ownerId: uid,
        name: 'Uncle Leo',
        relationship: 'Brother-in-Law',
        ageGroup: 'Adult',
        listStatus: 'nice',
        budgetAllocated: 85,
        interests: 'Pour-over coffee, grilling, leather travel gear',
        niceDeeds: 'Cleared driveway snow for Mom twice last winter',
        notes: 'Prefers dark roast beans',
      },
      {
        id: mem3,
        ownerId: uid,
        name: 'Cousin Tyler',
        relationship: 'Nephew',
        ageGroup: 'Teen',
        listStatus: 'undecided',
        budgetAllocated: 75,
        interests: 'Wireless audio, retro board games, cozy hoodies',
        niceDeeds: 'Helped carry groceries, needs to tidy room before Dec 15',
        notes: 'Ask his mom about shoe size',
      },
      {
        id: mem4,
        ownerId: uid,
        name: 'Grandpa Arthur',
        relationship: 'Dad / Grandpa',
        ageGroup: 'Senior',
        listStatus: 'nice',
        budgetAllocated: 150,
        interests: 'Birdwatching, wool cardigans, classic mysteries',
        niceDeeds: 'Tells the best Christmas Eve stories by the hearth',
        notes: 'Large cardigan size',
      },
      {
        id: mem5,
        ownerId: uid,
        name: 'Best Friend Clara',
        relationship: 'Best Friend',
        ageGroup: 'Adult',
        listStatus: 'nice',
        budgetAllocated: 65,
        interests: 'Scented candles, herbal tea tins, blush pink cashmere',
        niceDeeds: 'Hosted our neighborhood cookie & ornament swap',
        notes: 'Loves vanilla & cranberry scents',
      },
    ],
    gifts: [
      {
        id: 'gift_starter_1',
        ownerId: uid,
        memberId: mem1,
        memberName: 'Granddaughter Maya',
        title: 'Deluxe Watercolor Travel Tin & Brush Set',
        estimatedPrice: 38,
        actualPrice: 34.99,
        storeName: 'Target',
        storeStopOrder: 1,
        fulfillmentMode: 'in_store',
        purchaseUrl: 'https://www.target.com',
        availabilityStatus: 'in_stock',
        priceAlertEnabled: true,
        status: 'purchased',
        notes: 'Picked up on sale; wrap in blush pink paper',
      },
      {
        id: 'gift_starter_2',
        ownerId: uid,
        memberId: mem1,
        memberName: 'Granddaughter Maya',
        title: 'Hardcover Illustrated Holiday Storybook',
        estimatedPrice: 24,
        actualPrice: 0,
        storeName: 'Barnes & Noble',
        storeStopOrder: 2,
        fulfillmentMode: 'in_store',
        purchaseUrl: 'https://www.barnesandnoble.com',
        availabilityStatus: 'low_stock',
        priceAlertEnabled: true,
        status: 'planned',
        notes: 'Check local store shelf before weekend rush',
      },
      {
        id: 'gift_starter_3',
        ownerId: uid,
        memberId: mem2,
        memberName: 'Uncle Leo',
        title: 'Stainless Pour-Over Gooseneck Kettle',
        estimatedPrice: 65,
        actualPrice: 59.5,
        storeName: 'Williams Sonoma',
        storeStopOrder: 3,
        fulfillmentMode: 'online',
        purchaseUrl: 'https://www.williams-sonoma.com',
        availabilityStatus: 'in_stock',
        priceAlertEnabled: false,
        status: 'wrapped',
        notes: 'Wrapped with crimson velvet ribbon & kraft tag',
      },
      {
        id: 'gift_starter_4',
        ownerId: uid,
        memberId: mem4,
        memberName: 'Grandpa Arthur',
        title: 'Merino Wool Shawl Cardigan (Oatmeal)',
        estimatedPrice: 115,
        actualPrice: 0,
        storeName: "Macy's",
        storeStopOrder: 3,
        fulfillmentMode: 'in_store',
        purchaseUrl: 'https://www.macys.com',
        availabilityStatus: 'in_stock',
        priceAlertEnabled: true,
        status: 'planned',
        notes: 'Pick up alongside mall stop',
      },
      {
        id: 'gift_starter_5',
        ownerId: uid,
        memberId: mem5,
        memberName: 'Best Friend Clara',
        title: 'Frosted Cranberry & Vanilla Gift Candle Set',
        estimatedPrice: 42,
        actualPrice: 38.0,
        storeName: 'Nordstrom',
        storeStopOrder: 4,
        fulfillmentMode: 'online',
        purchaseUrl: 'https://www.nordstrom.com',
        availabilityStatus: 'in_stock',
        priceAlertEnabled: false,
        status: 'delivered',
        notes: 'Tucked under the blush pink tree!',
      },
    ],
    events: [
      {
        id: 'evt_starter_1',
        ownerId: uid,
        title: 'Grandma & Grandkids Gingerbread Cookie Swap',
        date: '2026-12-06',
        time: '2:00 PM',
        location: 'Hearth Kitchen',
        eventType: 'party',
        participantCount: 8,
        budgetPerPerson: 15,
        totalBudget: 120,
        attendeesText: 'Maya, Leo, Sarah, Grandma, Best Friend Clara',
        notes: 'Bring pink icing, bows, and gift tins for everyone to take home',
      },
      {
        id: 'evt_starter_2',
        ownerId: uid,
        title: 'Friends & Family Secret Santa Exchange',
        date: '2026-12-19',
        time: '5:30 PM',
        location: "Clara's Dining Room",
        eventType: 'exchange',
        participantCount: 12,
        budgetPerPerson: 35,
        totalBudget: 420,
        attendeesText: 'Friends, siblings, cousins, and grandparents',
        notes: 'Secret Santa reveal + peppermint cocoa bar',
      },
      {
        id: 'evt_starter_3',
        ownerId: uid,
        title: 'Christmas Eve Candlelight Dinner',
        date: '2026-12-24',
        time: '6:00 PM',
        location: 'Family Home',
        eventType: 'dinner',
        participantCount: 10,
        budgetPerPerson: 25,
        totalBudget: 250,
        attendeesText: 'Immediate family & Grandpa Arthur',
        notes: 'All presents wrapped & under the tree by 4 PM',
      },
    ],
    supplies: [
      {
        id: 'sup_starter_1',
        ownerId: uid,
        name: 'Blush Pink & Holly Wrapping Paper',
        category: 'Paper & Bags',
        quantityNote: '3 jumbo rolls',
        stockStatus: 'stocked',
      },
      {
        id: 'sup_starter_2',
        ownerId: uid,
        name: 'Cranberry Velvet Ribbon Spools',
        category: 'Ribbons & Bows',
        quantityNote: '1 spool left',
        stockStatus: 'low',
      },
      {
        id: 'sup_starter_3',
        ownerId: uid,
        name: 'Clear Satin Gift Tape (Multi-Pack)',
        category: 'Tools & Tape',
        quantityNote: 'Need 4-pack',
        stockStatus: 'need_to_buy',
      },
      {
        id: 'sup_starter_4',
        ownerId: uid,
        name: 'Gingerbread & Pink Tree Gift Tags',
        category: 'Tags & Cards',
        quantityNote: '50 tags',
        stockStatus: 'stocked',
      },
    ],
    savedDraws: [],
  };
}

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function loadLocalWorkspace(): LocalWorkspaceState {
  if (typeof window === 'undefined') {
    return createStarterWorkspace();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createStarterWorkspace();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<LocalWorkspaceState>;
    const starter = createStarterWorkspace();
    return {
      settings: parsed.settings ?? starter.settings,
      members: Array.isArray(parsed.members) ? parsed.members : [],
      gifts: Array.isArray(parsed.gifts) ? parsed.gifts : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      supplies: Array.isArray(parsed.supplies) ? parsed.supplies : [],
      savedDraws: Array.isArray(parsed.savedDraws) ? parsed.savedDraws : [],
    };
  } catch {
    return createStarterWorkspace();
  }
}

function saveLocalWorkspace(next: LocalWorkspaceState) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  notifyListeners();
}

export function subscribeLocalWorkspace(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function localUpdateSettings(
  updates: Partial<Pick<UserSettings, 'displayName' | 'overallBudget' | 'alertThresholdPct' | 'notificationsEnabled'>>
): void {
  const state = loadLocalWorkspace();
  const nextSettings = { ...state.settings };
  if (updates.displayName !== undefined) {
    nextSettings.displayName = clampString(updates.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX, 'Holiday Gift Dashboard');
  }
  if (updates.overallBudget !== undefined) {
    nextSettings.overallBudget = clampMoney(updates.overallBudget);
  }
  if (updates.alertThresholdPct !== undefined) {
    nextSettings.alertThresholdPct = Math.min(100, Math.max(50, Math.round(Number(updates.alertThresholdPct) || 85)));
  }
  if (updates.notificationsEnabled !== undefined) {
    nextSettings.notificationsEnabled = Boolean(updates.notificationsEnabled);
  }
  saveLocalWorkspace({ ...state, settings: nextSettings });
}

export function localSaveMember(
  input: Omit<FamilyMember, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
): string {
  const state = loadLocalWorkspace();
  const id = input.id ? sanitizeId(input.id, makeId('mem')) : makeId('mem');
  const record: FamilyMember = {
    id,
    ownerId: LOCAL_WORKSPACE_UID,
    name: clampString(input.name, FIELD_LIMITS.MEMBER_NAME_MAX, 'Friend or Family'),
    relationship: clampString(input.relationship, FIELD_LIMITS.RELATIONSHIP_MAX, 'Family'),
    ageGroup: clampString(input.ageGroup, FIELD_LIMITS.AGE_GROUP_MAX, 'Adult'),
    listStatus: (['nice', 'naughty', 'undecided'].includes(input.listStatus)
      ? input.listStatus
      : 'nice') as ListStatus,
    budgetAllocated: clampMoney(input.budgetAllocated),
    interests: clampString(input.interests, FIELD_LIMITS.INTERESTS_MAX, ''),
    niceDeeds: clampString(input.niceDeeds, FIELD_LIMITS.NICE_DEEDS_MAX, ''),
    notes: clampString(input.notes, FIELD_LIMITS.NOTES_MAX, ''),
  };
  const exists = state.members.some((m) => m.id === id);
  const members = exists
    ? state.members.map((m) => (m.id === id ? record : m))
    : [...state.members, record];
  saveLocalWorkspace({ ...state, members });
  return id;
}

export function localUpdateMemberStatus(memberId: string, listStatus: ListStatus): void {
  const state = loadLocalWorkspace();
  const members = state.members.map((m) => (m.id === memberId ? { ...m, listStatus } : m));
  saveLocalWorkspace({ ...state, members });
}

export function localDeleteMember(memberId: string): void {
  const state = loadLocalWorkspace();
  saveLocalWorkspace({
    ...state,
    members: state.members.filter((m) => m.id !== memberId),
  });
}

export function localSaveGift(
  input: Omit<GiftItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
): string {
  const state = loadLocalWorkspace();
  const id = input.id ? sanitizeId(input.id, makeId('gift')) : makeId('gift');
  const record: GiftItem = {
    id,
    ownerId: LOCAL_WORKSPACE_UID,
    memberId: sanitizeId(input.memberId, 'general'),
    memberName: clampString(input.memberName, FIELD_LIMITS.MEMBER_NAME_MAX, 'Family'),
    title: clampString(input.title, FIELD_LIMITS.GIFT_TITLE_MAX, 'Holiday Gift'),
    estimatedPrice: clampMoney(input.estimatedPrice),
    actualPrice: clampMoney(input.actualPrice),
    storeName: clampString(input.storeName, FIELD_LIMITS.STORE_NAME_MAX, 'Target'),
    storeStopOrder: Math.min(100, Math.max(0, Math.round(Number(input.storeStopOrder) || 1))),
    fulfillmentMode: (input.fulfillmentMode === 'online' ? 'online' : 'in_store') as FulfillmentMode,
    purchaseUrl: clampString(input.purchaseUrl, FIELD_LIMITS.URL_MAX, ''),
    availabilityStatus: (['in_stock', 'low_stock', 'online_only', 'unknown'].includes(
      input.availabilityStatus
    )
      ? input.availabilityStatus
      : 'unknown') as AvailabilityStatus,
    priceAlertEnabled: Boolean(input.priceAlertEnabled),
    status: (['planned', 'purchased', 'wrapped', 'delivered'].includes(input.status)
      ? input.status
      : 'planned') as GiftStatus,
    notes: clampString(input.notes, FIELD_LIMITS.NOTES_MAX, ''),
  };
  const exists = state.gifts.some((g) => g.id === id);
  const gifts = exists ? state.gifts.map((g) => (g.id === id ? record : g)) : [...state.gifts, record];
  saveLocalWorkspace({ ...state, gifts });
  return id;
}

export function localUpdateGiftStatus(giftId: string, status: GiftStatus, actualPrice?: number): void {
  const state = loadLocalWorkspace();
  const gifts = state.gifts.map((g) => {
    if (g.id !== giftId) return g;
    return {
      ...g,
      status,
      actualPrice: actualPrice !== undefined ? clampMoney(actualPrice) : g.actualPrice,
    };
  });
  saveLocalWorkspace({ ...state, gifts });
}

export function localUpdateGiftRouting(
  giftId: string,
  updates: Partial<Pick<GiftItem, 'fulfillmentMode' | 'storeStopOrder' | 'availabilityStatus' | 'priceAlertEnabled'>>
): void {
  const state = loadLocalWorkspace();
  const gifts = state.gifts.map((g) => {
    if (g.id !== giftId) return g;
    return {
      ...g,
      ...(updates.fulfillmentMode !== undefined ? { fulfillmentMode: updates.fulfillmentMode } : {}),
      ...(updates.storeStopOrder !== undefined
        ? { storeStopOrder: Math.min(100, Math.max(0, Math.round(updates.storeStopOrder))) }
        : {}),
      ...(updates.availabilityStatus !== undefined
        ? { availabilityStatus: updates.availabilityStatus }
        : {}),
      ...(updates.priceAlertEnabled !== undefined
        ? { priceAlertEnabled: Boolean(updates.priceAlertEnabled) }
        : {}),
    };
  });
  saveLocalWorkspace({ ...state, gifts });
}

export function localDeleteGift(giftId: string): void {
  const state = loadLocalWorkspace();
  saveLocalWorkspace({
    ...state,
    gifts: state.gifts.filter((g) => g.id !== giftId),
  });
}

export function localSaveEvent(
  input: Omit<AdventEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
): string {
  const state = loadLocalWorkspace();
  const id = input.id ? sanitizeId(input.id, makeId('evt')) : makeId('evt');
  const validDate = FIELD_LIMITS.DATE_REGEX.test(input.date) ? input.date : '2026-12-24';
  const participantCount = Math.min(500, Math.max(1, Math.round(Number(input.participantCount) || 1)));
  const budgetPerPerson = clampMoney(input.budgetPerPerson);
  const totalBudget = clampMoney(
    input.totalBudget > 0 ? input.totalBudget : participantCount * budgetPerPerson
  );
  const record: AdventEvent = {
    id,
    ownerId: LOCAL_WORKSPACE_UID,
    title: clampString(input.title, FIELD_LIMITS.EVENT_TITLE_MAX, 'Holiday Gathering'),
    date: validDate,
    time: clampString(input.time, FIELD_LIMITS.TIME_MAX, '6:00 PM'),
    location: clampString(input.location, FIELD_LIMITS.LOCATION_MAX, 'Family Home'),
    eventType: (['party', 'exchange', 'dinner', 'errand', 'other'].includes(input.eventType)
      ? input.eventType
      : 'party') as EventType,
    participantCount,
    budgetPerPerson,
    totalBudget,
    attendeesText: clampString(input.attendeesText, FIELD_LIMITS.ATTENDEES_MAX, ''),
    notes: clampString(input.notes, FIELD_LIMITS.NOTES_MAX, ''),
  };
  const exists = state.events.some((e) => e.id === id);
  const events = exists ? state.events.map((e) => (e.id === id ? record : e)) : [...state.events, record];
  saveLocalWorkspace({ ...state, events });
  return id;
}

export function localDeleteEvent(eventId: string): void {
  const state = loadLocalWorkspace();
  saveLocalWorkspace({
    ...state,
    events: state.events.filter((e) => e.id !== eventId),
  });
}

export function localSaveSupply(
  input: Omit<WrappingSupply, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
): string {
  const state = loadLocalWorkspace();
  const id = input.id ? sanitizeId(input.id, makeId('sup')) : makeId('sup');
  const record: WrappingSupply = {
    id,
    ownerId: LOCAL_WORKSPACE_UID,
    name: clampString(input.name, FIELD_LIMITS.SUPPLY_NAME_MAX, 'Wrapping Paper'),
    category: clampString(input.category, FIELD_LIMITS.SUPPLY_CAT_MAX, 'Paper & Bags'),
    quantityNote: clampString(input.quantityNote, FIELD_LIMITS.SUPPLY_QTY_MAX, '1 pack'),
    stockStatus: (['need_to_buy', 'low', 'stocked'].includes(input.stockStatus)
      ? input.stockStatus
      : 'need_to_buy') as SupplyStockStatus,
  };
  const exists = state.supplies.some((s) => s.id === id);
  const supplies = exists
    ? state.supplies.map((s) => (s.id === id ? record : s))
    : [...state.supplies, record];
  saveLocalWorkspace({ ...state, supplies });
  return id;
}

export function localUpdateSupplyStatus(supplyId: string, stockStatus: SupplyStockStatus): void {
  const state = loadLocalWorkspace();
  const supplies = state.supplies.map((s) => (s.id === supplyId ? { ...s, stockStatus } : s));
  saveLocalWorkspace({ ...state, supplies });
}

export function localDeleteSupply(supplyId: string): void {
  const state = loadLocalWorkspace();
  saveLocalWorkspace({
    ...state,
    supplies: state.supplies.filter((s) => s.id !== supplyId),
  });
}

export function localSaveDraw(input: {
  title: string;
  exchangeDate: string;
  budgetLimit: number;
  participants: string[];
  assignments: SecretSantaAssignment[];
}): string {
  const state = loadLocalWorkspace();
  const id = makeId('draw');
  const record: SecretSantaDraw = {
    id,
    ownerId: LOCAL_WORKSPACE_UID,
    title: clampString(input.title, FIELD_LIMITS.DRAW_TITLE_MAX, 'Family Secret Santa'),
    exchangeDate: clampString(input.exchangeDate, 10, '2026-12-20'),
    budgetLimit: clampMoney(input.budgetLimit),
    participants: input.participants
      .map((p) => clampString(p, FIELD_LIMITS.MEMBER_NAME_MAX))
      .filter(Boolean)
      .slice(0, FIELD_LIMITS.MAX_PARTICIPANTS),
    assignments: input.assignments
      .map((a) => ({
        giver: clampString(a.giver, FIELD_LIMITS.MEMBER_NAME_MAX),
        receiver: clampString(a.receiver, FIELD_LIMITS.MEMBER_NAME_MAX),
      }))
      .filter((a) => a.giver && a.receiver)
      .slice(0, FIELD_LIMITS.MAX_PARTICIPANTS),
  };
  saveLocalWorkspace({ ...state, savedDraws: [...state.savedDraws, record] });
  return id;
}

export function localDeleteDraw(drawId: string): void {
  const state = loadLocalWorkspace();
  saveLocalWorkspace({
    ...state,
    savedDraws: state.savedDraws.filter((d) => d.id !== drawId),
  });
}

export function localSeedStarter(): void {
  saveLocalWorkspace(createStarterWorkspace());
}
