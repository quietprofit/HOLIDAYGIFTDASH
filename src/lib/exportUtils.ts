import JSZip from 'jszip';
import { AdventEvent, FamilyMember, GiftItem, UserSettings, WrappingSupply } from '../types/holiday';

function csvCell(value: string | number | boolean): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildHolidayCsvContent(
  settings: UserSettings | null,
  members: FamilyMember[],
  gifts: GiftItem[],
  events: AdventEvent[] = [],
  supplies: WrappingSupply[] = []
): string {
  const rows: string[][] = [];

  const totalSpent = gifts.reduce(
    (sum, g) => sum + (g.status !== 'planned' ? g.actualPrice || g.estimatedPrice : 0),
    0
  );
  const totalPlanned = gifts.reduce(
    (sum, g) => sum + (g.actualPrice > 0 ? g.actualPrice : g.estimatedPrice),
    0
  );
  const totalEventsBudget = events.reduce((sum, e) => sum + (e.totalBudget || 0), 0);

  rows.push(['HOLIDAY GIFT DASHBOARD BUDGET & GIFT REPORT']);
  rows.push(['Generated On', new Date().toLocaleDateString()]);
  rows.push(['Planner Name', settings?.displayName || 'Holiday Planner']);
  rows.push(['Overall Holiday Budget ($)', (settings?.overallBudget ?? 0).toFixed(2)]);
  rows.push(['Actual Spent on Gifts ($)', totalSpent.toFixed(2)]);
  rows.push(['Total Planned Gift Spend ($)', totalPlanned.toFixed(2)]);
  if (events.length > 0) {
    rows.push(['Total Advent & Party Budgets ($)', totalEventsBudget.toFixed(2)]);
  }
  rows.push([]);

  rows.push(['--- GIFT LIST & BUDGET TRACKER ---']);
  rows.push([
    'Recipient',
    'Gift Title',
    'Status',
    'Fulfillment Mode',
    'Store',
    'Estimated Price ($)',
    'Actual Price ($)',
    'Availability',
    'Notes',
  ]);
  for (const g of gifts) {
    rows.push([
      g.memberName,
      g.title,
      g.status,
      g.fulfillmentMode === 'online' ? 'Buy Online' : 'In-Store Route',
      g.storeName,
      g.estimatedPrice.toFixed(2),
      g.actualPrice.toFixed(2),
      g.availabilityStatus,
      g.notes,
    ]);
  }
  rows.push([]);

  rows.push(['--- NAUGHTY & NICE FAMILY LIST ---']);
  rows.push(['Name', 'Relationship', 'Age Group', 'List Status', 'Allocated Budget ($)', 'Interests', 'Notes']);
  for (const m of members) {
    rows.push([
      m.name,
      m.relationship,
      m.ageGroup,
      m.listStatus.toUpperCase(),
      m.budgetAllocated.toFixed(2),
      m.interests,
      m.notes,
    ]);
  }

  if (events.length > 0) {
    rows.push([]);
    rows.push(['--- ADVENT CALENDAR EVENTS & PARTY BUDGETS ---']);
    rows.push(['Date', 'Time', 'Event Title', 'Type', 'Location', 'Participants', 'Budget / Person ($)', 'Total Budget ($)']);
    for (const e of events) {
      rows.push([
        e.date,
        e.time,
        e.title,
        e.eventType,
        e.location,
        String(e.participantCount),
        e.budgetPerPerson.toFixed(2),
        e.totalBudget.toFixed(2),
      ]);
    }
  }

  if (supplies.length > 0) {
    rows.push([]);
    rows.push(['--- WRAPPING SUPPLIES CHECKLIST ---']);
    rows.push(['Supply Item', 'Category', 'Quantity / Note', 'Stock Status']);
    for (const s of supplies) {
      rows.push([s.name, s.category, s.quantityNote, s.stockStatus]);
    }
  }

  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportHolidayCsv(
  settings: UserSettings | null,
  members: FamilyMember[],
  gifts: GiftItem[],
  events: AdventEvent[] = [],
  supplies: WrappingSupply[] = []
): void {
  const csvContent = buildHolidayCsvContent(settings, members, gifts, events, supplies);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `holiday-gift-dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`);
}

function buildShoppingRouteChecklist(settings: UserSettings | null, gifts: GiftItem[]): string {
  const overallBudget = settings?.overallBudget ?? 1200;
  const spent = gifts.reduce(
    (sum, g) => sum + (g.status !== 'planned' ? g.actualPrice || g.estimatedPrice : 0),
    0
  );
  const plannedGifts = gifts.filter((g) => g.status === 'planned');
  const inStore = plannedGifts.filter((g) => g.fulfillmentMode === 'in_store');
  const online = plannedGifts.filter((g) => g.fulfillmentMode === 'online');

  const stopGroups: Record<string, { stopOrder: number; items: GiftItem[] }> = {};
  for (const gift of inStore) {
    const store = (gift.storeName || 'Local Store').trim();
    if (!stopGroups[store]) {
      stopGroups[store] = { stopOrder: gift.storeStopOrder || 1, items: [] };
    }
    stopGroups[store].items.push(gift);
    stopGroups[store].stopOrder = Math.min(stopGroups[store].stopOrder, gift.storeStopOrder || 1);
  }

  const orderedStops = Object.entries(stopGroups).sort((a, b) => a[1].stopOrder - b[1].stopOrder);

  const lines: string[] = [
    'HOLIDAY GIFT DASHBOARD — SHOPPING ROUTE & ERRANDS CHECKLIST',
    `Generated: ${new Date().toLocaleString()}`,
    `Overall Budget: $${overallBudget.toFixed(2)} | Spent So Far: $${spent.toFixed(2)} | Remaining: $${(overallBudget - spent).toFixed(2)}`,
    '====================================================================',
    '',
    `IN-STORE ROUTE (${orderedStops.length} stops, ${inStore.length} items)`,
    '--------------------------------------------------------------------',
  ];

  if (orderedStops.length === 0) {
    lines.push('No unpurchased in-store items remaining.');
  } else {
    orderedStops.forEach(([store, group], idx) => {
      const subtotal = group.items.reduce((s, g) => s + (g.estimatedPrice || 0), 0);
      lines.push(`\nStop #${idx + 1}: ${store} (${group.items.length} items · Est. $${subtotal.toFixed(2)})`);
      for (const item of group.items) {
        lines.push(
          `  [ ] ${item.title} — For ${item.memberName} ($${item.estimatedPrice.toFixed(2)})${item.notes ? ` | ${item.notes}` : ''}`
        );
      }
    });
  }

  lines.push('');
  lines.push(`BUY ONLINE QUEUE (${online.length} items)`);
  lines.push('--------------------------------------------------------------------');
  if (online.length === 0) {
    lines.push('No unpurchased online items remaining.');
  } else {
    for (const item of online) {
      lines.push(
        `  [ ] ${item.title} (${item.storeName}) — For ${item.memberName} ($${item.estimatedPrice.toFixed(2)})${item.purchaseUrl ? ` | ${item.purchaseUrl}` : ''}`
      );
    }
  }

  return lines.join('\n');
}

function buildNaughtyNiceCsv(members: FamilyMember[], gifts: GiftItem[]): string {
  const rows: string[][] = [
    ['Name', 'Relationship', 'Age Group', 'List Status', 'Budget ($)', 'Planned/Spent ($)', 'Interests', 'Nice Deeds', 'Sizes & Notes'],
  ];
  for (const m of members) {
    const memberSpend = gifts
      .filter((g) => g.memberId === m.id)
      .reduce((sum, g) => sum + (g.actualPrice > 0 ? g.actualPrice : g.estimatedPrice), 0);
    rows.push([
      m.name,
      m.relationship,
      m.ageGroup,
      m.listStatus === 'undecided' ? 'Checking Twice' : m.listStatus.toUpperCase(),
      m.budgetAllocated.toFixed(2),
      memberSpend.toFixed(2),
      m.interests,
      m.niceDeeds,
      m.notes,
    ]);
  }
  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export async function exportCustomerZip(
  settings: UserSettings | null,
  members: FamilyMember[],
  gifts: GiftItem[]
): Promise<void> {
  const zip = new JSZip();
  const dateStamp = new Date().toISOString().slice(0, 10);

  zip.file('holiday-budget-report.csv', buildHolidayCsvContent(settings, members, gifts));
  zip.file('shopping-route-checklist.txt', buildShoppingRouteChecklist(settings, gifts));
  zip.file('naughty-nice-list.csv', buildNaughtyNiceCsv(members, gifts));
  zip.file(
    'holiday-gift-dashboard-backup.json',
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        app: 'Holiday Gift Dashboard',
        settings,
        members,
        gifts,
      },
      null,
      2
    )
  );
  zip.file(
    'README.txt',
    [
      'Holiday Gift Dashboard — Customer Holiday Bundle',
      `Exported on: ${new Date().toLocaleString()}`,
      '',
      'Included files:',
      '1. holiday-budget-report.csv          — Complete budget summary, gift list, and recipient totals.',
      '2. shopping-route-checklist.txt       — Ordered in-store stops and online shopping checklist.',
      '3. naughty-nice-list.csv              — Friends & family roster with sizes, interests, and budgets.',
      '4. holiday-gift-dashboard-backup.json — Full JSON snapshot of your Holiday Gift Dashboard data.',
    ].join('\n')
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, `holiday-gift-dashboard-bundle-${dateStamp}.zip`);
}

export function triggerPrintReport(): void {
  window.print();
}
