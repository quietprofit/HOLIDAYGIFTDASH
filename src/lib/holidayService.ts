import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
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
import {
  LOCAL_WORKSPACE_UID,
  localDeleteDraw,
  localDeleteEvent,
  localDeleteGift,
  localDeleteMember,
  localDeleteSupply,
  localSaveDraw,
  localSaveEvent,
  localSaveGift,
  localSaveMember,
  localSaveSupply,
  localSeedStarter,
  localUpdateGiftRouting,
  localUpdateGiftStatus,
  localUpdateMemberStatus,
  localUpdateSettings,
  localUpdateSupplyStatus,
} from './localHolidayStore';

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function ensureUserWorkspace(uid: string, displayName: string): Promise<void> {
  const userPath = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: uid,
        displayName: clampString(displayName, FIELD_LIMITS.DISPLAY_NAME_MAX, 'Holiday Planner'),
        overallBudget: 1200,
        alertThresholdPct: 85,
        notificationsEnabled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateUserSettings(
  uid: string,
  updates: Partial<Pick<UserSettings, 'displayName' | 'overallBudget' | 'alertThresholdPct' | 'notificationsEnabled'>>
): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localUpdateSettings(updates);
    return;
  }
  const userPath = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined) {
      payload.displayName = clampString(updates.displayName, FIELD_LIMITS.DISPLAY_NAME_MAX, 'Holiday Planner');
    }
    if (updates.overallBudget !== undefined) {
      payload.overallBudget = clampMoney(updates.overallBudget);
    }
    if (updates.alertThresholdPct !== undefined) {
      const pct = Math.min(100, Math.max(50, Math.round(Number(updates.alertThresholdPct) || 85)));
      payload.alertThresholdPct = pct;
    }
    if (updates.notificationsEnabled !== undefined) {
      payload.notificationsEnabled = Boolean(updates.notificationsEnabled);
    }
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

// --- Family Members (Naughty & Nice) ---
export async function saveFamilyMember(
  uid: string,
  input: Omit<FamilyMember, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  if (uid === LOCAL_WORKSPACE_UID) {
    return localSaveMember(input);
  }
  const id = input.id ? sanitizeId(input.id, makeDocId('mem')) : makeDocId('mem');
  const path = `users/${uid}/members/${id}`;
  try {
    const data = {
      ownerId: uid,
      name: clampString(input.name, FIELD_LIMITS.MEMBER_NAME_MAX, 'Family Member'),
      relationship: clampString(input.relationship, FIELD_LIMITS.RELATIONSHIP_MAX, 'Family'),
      ageGroup: clampString(input.ageGroup, FIELD_LIMITS.AGE_GROUP_MAX, 'Adult'),
      listStatus: (['nice', 'naughty', 'undecided'].includes(input.listStatus)
        ? input.listStatus
        : 'nice') as ListStatus,
      budgetAllocated: clampMoney(input.budgetAllocated),
      interests: clampString(input.interests, FIELD_LIMITS.INTERESTS_MAX, ''),
      niceDeeds: clampString(input.niceDeeds, FIELD_LIMITS.NICE_DEEDS_MAX, ''),
      notes: clampString(input.notes, FIELD_LIMITS.NOTES_MAX, ''),
      updatedAt: serverTimestamp(),
    };
    if (input.id) {
      await updateDoc(doc(db, 'users', uid, 'members', id), data);
    } else {
      await setDoc(doc(db, 'users', uid, 'members', id), {
        ...data,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, input.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateMemberListStatus(
  uid: string,
  memberId: string,
  listStatus: ListStatus
): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localUpdateMemberStatus(memberId, listStatus);
    return;
  }
  const path = `users/${uid}/members/${memberId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'members', memberId), {
      listStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFamilyMember(uid: string, memberId: string): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localDeleteMember(memberId);
    return;
  }
  const path = `users/${uid}/members/${memberId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'members', memberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Gifts ---
export async function saveGiftItem(
  uid: string,
  input: Omit<GiftItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  if (uid === LOCAL_WORKSPACE_UID) {
    return localSaveGift(input);
  }
  const id = input.id ? sanitizeId(input.id, makeDocId('gift')) : makeDocId('gift');
  const path = `users/${uid}/gifts/${id}`;
  try {
    const data = {
      ownerId: uid,
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
      updatedAt: serverTimestamp(),
    };
    if (input.id) {
      await updateDoc(doc(db, 'users', uid, 'gifts', id), data);
    } else {
      await setDoc(doc(db, 'users', uid, 'gifts', id), {
        ...data,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, input.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateGiftStatus(
  uid: string,
  giftId: string,
  status: GiftStatus,
  actualPrice?: number
): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localUpdateGiftStatus(giftId, status, actualPrice);
    return;
  }
  const path = `users/${uid}/gifts/${giftId}`;
  try {
    const payload: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (actualPrice !== undefined) {
      payload.actualPrice = clampMoney(actualPrice);
    }
    await updateDoc(doc(db, 'users', uid, 'gifts', giftId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateGiftRouting(
  uid: string,
  giftId: string,
  updates: Partial<Pick<GiftItem, 'fulfillmentMode' | 'storeStopOrder' | 'availabilityStatus' | 'priceAlertEnabled'>>
): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localUpdateGiftRouting(giftId, updates);
    return;
  }
  const path = `users/${uid}/gifts/${giftId}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.fulfillmentMode !== undefined) payload.fulfillmentMode = updates.fulfillmentMode;
    if (updates.storeStopOrder !== undefined) {
      payload.storeStopOrder = Math.min(100, Math.max(0, Math.round(updates.storeStopOrder)));
    }
    if (updates.availabilityStatus !== undefined) payload.availabilityStatus = updates.availabilityStatus;
    if (updates.priceAlertEnabled !== undefined) payload.priceAlertEnabled = Boolean(updates.priceAlertEnabled);
    await updateDoc(doc(db, 'users', uid, 'gifts', giftId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGiftItem(uid: string, giftId: string): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localDeleteGift(giftId);
    return;
  }
  const path = `users/${uid}/gifts/${giftId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'gifts', giftId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Advent Events ---
export async function saveAdventEvent(
  uid: string,
  input: Omit<AdventEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  if (uid === LOCAL_WORKSPACE_UID) {
    return localSaveEvent(input);
  }
  const id = input.id ? sanitizeId(input.id, makeDocId('evt')) : makeDocId('evt');
  const path = `users/${uid}/events/${id}`;
  const validDate = FIELD_LIMITS.DATE_REGEX.test(input.date) ? input.date : '2026-12-24';
  const participantCount = Math.min(500, Math.max(1, Math.round(Number(input.participantCount) || 1)));
  const budgetPerPerson = clampMoney(input.budgetPerPerson);
  const totalBudget = clampMoney(
    input.totalBudget > 0 ? input.totalBudget : participantCount * budgetPerPerson
  );
  try {
    const data = {
      ownerId: uid,
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
      updatedAt: serverTimestamp(),
    };
    if (input.id) {
      await updateDoc(doc(db, 'users', uid, 'events', id), data);
    } else {
      await setDoc(doc(db, 'users', uid, 'events', id), {
        ...data,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, input.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteAdventEvent(uid: string, eventId: string): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localDeleteEvent(eventId);
    return;
  }
  const path = `users/${uid}/events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Wrapping Supplies ---
export async function saveWrappingSupply(
  uid: string,
  input: Omit<WrappingSupply, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  if (uid === LOCAL_WORKSPACE_UID) {
    return localSaveSupply(input);
  }
  const id = input.id ? sanitizeId(input.id, makeDocId('sup')) : makeDocId('sup');
  const path = `users/${uid}/supplies/${id}`;
  try {
    const data = {
      ownerId: uid,
      name: clampString(input.name, FIELD_LIMITS.SUPPLY_NAME_MAX, 'Wrapping Paper'),
      category: clampString(input.category, FIELD_LIMITS.SUPPLY_CAT_MAX, 'Paper & Bags'),
      quantityNote: clampString(input.quantityNote, FIELD_LIMITS.SUPPLY_QTY_MAX, '1 pack'),
      stockStatus: (['need_to_buy', 'low', 'stocked'].includes(input.stockStatus)
        ? input.stockStatus
        : 'need_to_buy') as SupplyStockStatus,
      updatedAt: serverTimestamp(),
    };
    if (input.id) {
      await updateDoc(doc(db, 'users', uid, 'supplies', id), data);
    } else {
      await setDoc(doc(db, 'users', uid, 'supplies', id), {
        ...data,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, input.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function updateSupplyStatus(
  uid: string,
  supplyId: string,
  stockStatus: SupplyStockStatus
): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localUpdateSupplyStatus(supplyId, stockStatus);
    return;
  }
  const path = `users/${uid}/supplies/${supplyId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'supplies', supplyId), {
      stockStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteWrappingSupply(uid: string, supplyId: string): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localDeleteSupply(supplyId);
    return;
  }
  const path = `users/${uid}/supplies/${supplyId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'supplies', supplyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Secret Santa Draws ---
export async function saveSecretSantaDraw(
  uid: string,
  input: {
    title: string;
    exchangeDate: string;
    budgetLimit: number;
    participants: string[];
    assignments: SecretSantaAssignment[];
  }
): Promise<string> {
  if (uid === LOCAL_WORKSPACE_UID) {
    return localSaveDraw(input);
  }
  const id = makeDocId('draw');
  const path = `users/${uid}/secretSantaDraws/${id}`;
  const cleanParticipants = input.participants
    .map((p) => clampString(p, FIELD_LIMITS.MEMBER_NAME_MAX))
    .filter(Boolean)
    .slice(0, FIELD_LIMITS.MAX_PARTICIPANTS);
  const cleanAssignments = input.assignments
    .map((a) => ({
      giver: clampString(a.giver, FIELD_LIMITS.MEMBER_NAME_MAX),
      receiver: clampString(a.receiver, FIELD_LIMITS.MEMBER_NAME_MAX),
    }))
    .filter((a) => a.giver && a.receiver)
    .slice(0, FIELD_LIMITS.MAX_PARTICIPANTS);

  try {
    await setDoc(doc(db, 'users', uid, 'secretSantaDraws', id), {
      ownerId: uid,
      title: clampString(input.title, FIELD_LIMITS.DRAW_TITLE_MAX, 'Family Secret Santa'),
      exchangeDate: clampString(input.exchangeDate, 10, '2026-12-20'),
      budgetLimit: clampMoney(input.budgetLimit),
      participants: cleanParticipants,
      assignments: cleanAssignments,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteSecretSantaDraw(uid: string, drawId: string): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localDeleteDraw(drawId);
    return;
  }
  const path = `users/${uid}/secretSantaDraws/${drawId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'secretSantaDraws', drawId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Starter Holiday Plan Helper (only triggered explicitly by user on empty workspace) ---
export async function seedStarterHolidayData(uid: string): Promise<void> {
  if (uid === LOCAL_WORKSPACE_UID) {
    localSeedStarter();
    return;
  }
  const batchPath = `users/${uid}/starter_batch`;
  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    const mem1 = makeDocId('mem');
    const mem2 = makeDocId('mem');
    const mem3 = makeDocId('mem');
    const mem4 = makeDocId('mem');

    batch.set(doc(db, 'users', uid, 'members', mem1), {
      ownerId: uid,
      name: 'Granddaughter Maya',
      relationship: 'Granddaughter',
      ageGroup: 'Child (8-11)',
      listStatus: 'nice',
      budgetAllocated: 120,
      interests: 'Watercolor painting, chapter books, cozy pink sweaters',
      niceDeeds: 'Helped bake ginger cookies and read to little brother',
      notes: 'Size 10 youth clothes',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'users', uid, 'members', mem2), {
      ownerId: uid,
      name: 'Uncle Leo',
      relationship: 'Brother-in-Law',
      ageGroup: 'Adult',
      listStatus: 'nice',
      budgetAllocated: 85,
      interests: 'Pour-over coffee, grilling, leather travel gear',
      niceDeeds: 'Cleared driveway snow for Mom twice last winter',
      notes: 'Prefers dark roast beans',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'users', uid, 'members', mem3), {
      ownerId: uid,
      name: 'Cousin Tyler',
      relationship: 'Nephew',
      ageGroup: 'Teen',
      listStatus: 'undecided',
      budgetAllocated: 75,
      interests: 'Wireless audio, retro board games, cozy hoodies',
      niceDeeds: 'Helped carry groceries, needs to tidy room before Dec 15',
      notes: 'Ask his mom about shoe size',
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'users', uid, 'members', mem4), {
      ownerId: uid,
      name: 'Grandpa Arthur',
      relationship: 'Dad / Grandpa',
      ageGroup: 'Senior',
      listStatus: 'nice',
      budgetAllocated: 150,
      interests: 'Birdwatching, wool cardigans, classic mysteries',
      niceDeeds: 'Tells the best Christmas Eve stories by the hearth',
      notes: 'Large cardigan size',
      createdAt: now,
      updatedAt: now,
    });

    const gifts = [
      {
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
        memberId: mem4,
        memberName: 'Grandpa Arthur',
        title: 'Merino Wool Shawl Cardigan (Oatmeal)',
        estimatedPrice: 115,
        actualPrice: 0,
        storeName: 'Macy\'s',
        storeStopOrder: 1,
        fulfillmentMode: 'in_store',
        purchaseUrl: 'https://www.macys.com',
        availabilityStatus: 'in_stock',
        priceAlertEnabled: true,
        status: 'planned',
        notes: 'Stop 1 at the mall with Target nearby',
      },
    ];

    for (const g of gifts) {
      batch.set(doc(db, 'users', uid, 'gifts', makeDocId('gift')), {
        ownerId: uid,
        ...g,
        createdAt: now,
        updatedAt: now,
      });
    }

    const events = [
      {
        title: 'Grandma & Grandkids Cookie Swap',
        date: '2026-12-06',
        time: '2:00 PM',
        location: 'Hearth Kitchen',
        eventType: 'party',
        participantCount: 8,
        budgetPerPerson: 15,
        totalBudget: 120,
        attendeesText: 'Maya, Leo, Sarah, Grandma, Aunt Clara',
        notes: 'Bring pink sprinkles and gift tins for everyone to take home',
      },
      {
        title: 'Extended Family Gift Exchange',
        date: '2026-12-19',
        time: '5:30 PM',
        location: 'Aunt Clara\'s Dining Room',
        eventType: 'exchange',
        participantCount: 12,
        budgetPerPerson: 35,
        totalBudget: 420,
        attendeesText: 'All siblings, cousins, and grandparents',
        notes: 'Secret Santa reveal + hot cocoa bar',
      },
      {
        title: 'Christmas Eve Candlelight Dinner',
        date: '2026-12-24',
        time: '6:00 PM',
        location: 'Family Home',
        eventType: 'dinner',
        participantCount: 10,
        budgetPerPerson: 25,
        totalBudget: 250,
        attendeesText: 'Immediate family & Grandpa Arthur',
        notes: 'All presents under the tree by 4 PM',
      },
    ];

    for (const ev of events) {
      batch.set(doc(db, 'users', uid, 'events', makeDocId('evt')), {
        ownerId: uid,
        ...ev,
        createdAt: now,
        updatedAt: now,
      });
    }

    const supplies = [
      {
        name: 'Blush Pink & Holly Wrapping Paper',
        category: 'Paper & Bags',
        quantityNote: '3 jumbo rolls',
        stockStatus: 'stocked',
      },
      {
        name: 'Cranberry Velvet Ribbon Spools',
        category: 'Ribbons & Bows',
        quantityNote: '1 spool left',
        stockStatus: 'low',
      },
      {
        name: 'Clear Satin Gift Tape (Multi-Pack)',
        category: 'Tools & Tape',
        quantityNote: 'Need 4-pack',
        stockStatus: 'need_to_buy',
      },
      {
        name: 'Cream Kraft To/From Gift Tags',
        category: 'Tags & Cards',
        quantityNote: '50 tags',
        stockStatus: 'stocked',
      },
    ];

    for (const sup of supplies) {
      batch.set(doc(db, 'users', uid, 'supplies', makeDocId('sup')), {
        ownerId: uid,
        ...sup,
        createdAt: now,
        updatedAt: now,
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, batchPath);
  }
}
