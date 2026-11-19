import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Download,
  Gift,
  Heart,
  MapPin,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AvailabilityStatus,
  FamilyMember,
  FulfillmentMode,
  GiftItem,
  GiftStatus,
  UserSettings,
} from '../types/holiday';
import {
  deleteGiftItem,
  saveGiftItem,
  updateGiftStatus,
  updateUserSettings,
} from '../lib/holidayService';
import { exportCustomerZip, exportHolidayCsv } from '../lib/exportUtils';
import { BlushPinkTreeIcon, GirlyGingerbreadCookieIcon } from './HolidayVisualElements';

export type AppPageId =
  | 'command-center'
  | 'shopping-route'
  | 'naughty-nice'
  | 'gift-ideas';

interface CommandCenterViewProps {
  uid: string;
  settings: UserSettings | null;
  members: FamilyMember[];
  gifts: GiftItem[];
  onSeedStarter: () => Promise<void>;
  onNavigatePage: (page: AppPageId, preselectMemberId?: string) => void;
}

const STATUS_LABELS: Record<GiftStatus, string> = {
  planned: 'Planned',
  purchased: 'Purchased',
  wrapped: 'Wrapped',
  delivered: 'Under Tree',
};

const NEXT_STATUS: Record<GiftStatus, GiftStatus> = {
  planned: 'purchased',
  purchased: 'wrapped',
  wrapped: 'delivered',
  delivered: 'planned',
};

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  uid,
  settings,
  members,
  gifts,
  onSeedStarter,
  onNavigatePage,
}) => {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(settings?.overallBudget ?? 1200));
  const [thresholdDraft, setThresholdDraft] = useState(String(settings?.alertThresholdPct ?? 85));
  const [savingBudget, setSavingBudget] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | GiftStatus>('all');
  const [pieMode, setPieMode] = useState<'breakdown' | 'recipients'>('breakdown');

  const [showGiftModal, setShowGiftModal] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Gift modal state
  const [gMemberId, setGMemberId] = useState('');
  const [gTitle, setGTitle] = useState('');
  const [gEstimated, setGEstimated] = useState('45');
  const [gActual, setGActual] = useState('0');
  const [gStore, setGStore] = useState('Target');
  const [gMode, setGMode] = useState<FulfillmentMode>('in_store');
  const [gStatus, setGStatus] = useState<GiftStatus>('planned');
  const [gAvailability, setGAvailability] = useState<AvailabilityStatus>('in_stock');
  const [gUrl, setGUrl] = useState('');
  const [gNotes, setGNotes] = useState('');
  const [savingGift, setSavingGift] = useState(false);

  const overallBudget = settings?.overallBudget ?? 1200;
  const alertThresholdPct = settings?.alertThresholdPct ?? 85;

  const daysUntilChristmas = useMemo(() => {
    const now = new Date();
    const year = now.getMonth() === 11 && now.getDate() > 25 ? now.getFullYear() + 1 : now.getFullYear();
    const christmas = new Date(year, 11, 25);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.round((christmas.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);

  const metrics = useMemo(() => {
    const giftSpent = gifts.reduce(
      (sum, g) => sum + (g.status !== 'planned' ? g.actualPrice || g.estimatedPrice : 0),
      0
    );
    const giftPlannedOnly = gifts.reduce(
      (sum, g) => sum + (g.status === 'planned' ? g.estimatedPrice : 0),
      0
    );
    const remaining = overallBudget - giftSpent;
    const pctUsed = overallBudget > 0 ? Math.round((giftSpent / overallBudget) * 100) : 0;
    const wrappedCount = gifts.filter((g) => g.status === 'wrapped' || g.status === 'delivered').length;
    const purchasedCount = gifts.filter((g) => g.status !== 'planned').length;

    return {
      giftSpent,
      giftPlannedOnly,
      remaining,
      pctUsed,
      wrappedCount,
      purchasedCount,
    };
  }, [gifts, overallBudget]);

  // Single editorial Budget Pie Chart data
  const budgetPieData = useMemo(() => {
    const spent = Math.round(metrics.giftSpent * 100) / 100;
    const planned = Math.round(metrics.giftPlannedOnly * 100) / 100;
    const remaining = Math.max(0, Math.round((overallBudget - spent - planned) * 100) / 100);
    const overage = Math.max(0, Math.round((spent + planned - overallBudget) * 100) / 100);

    const slices = [
      { name: 'Spent So Far', value: spent, color: '#9E1B24' },
      { name: 'Planned Gifts', value: planned, color: '#E39BAE' },
      remaining > 0
        ? { name: 'Remaining Budget', value: remaining, color: '#1D6B3C' }
        : { name: 'Over Budget', value: overage, color: '#7F1D1D' },
    ].filter((s) => s.value > 0);

    if (slices.length === 0 && overallBudget > 0) {
      return [{ name: 'Available Budget', value: overallBudget, color: '#E39BAE' }];
    }
    return slices;
  }, [metrics, overallBudget]);

  const recipientPieData = useMemo(() => {
    const palette = ['#9E1B24', '#E39BAE', '#C9A875', '#1D6B3C', '#8C4658', '#B88B72'];
    return members
      .map((m, idx) => {
        const total = gifts
          .filter((g) => g.memberId === m.id)
          .reduce((s, g) => s + (g.actualPrice > 0 ? g.actualPrice : g.estimatedPrice), 0);
        return {
          name: m.name,
          value: Math.round(total * 100) / 100,
          color: palette[idx % palette.length],
        };
      })
      .filter((d) => d.value > 0);
  }, [members, gifts]);

  const filteredGifts = useMemo(() => {
    if (statusFilter === 'all') return gifts;
    return gifts.filter((g) => g.status === statusFilter);
  }, [gifts, statusFilter]);

  const routePreview = useMemo(() => {
    const unpurchased = gifts.filter((g) => g.status === 'planned');
    const inStore = unpurchased.filter((g) => g.fulfillmentMode === 'in_store');
    const online = unpurchased.filter((g) => g.fulfillmentMode === 'online');

    const stopMap: Record<string, { storeName: string; stopOrder: number; count: number; total: number }> = {};
    for (const g of inStore) {
      const store = (g.storeName || 'Local Store').trim();
      if (!stopMap[store]) {
        stopMap[store] = { storeName: store, stopOrder: g.storeStopOrder || 1, count: 0, total: 0 };
      }
      stopMap[store].count += 1;
      stopMap[store].total += g.estimatedPrice || 0;
      stopMap[store].stopOrder = Math.min(stopMap[store].stopOrder, g.storeStopOrder || 1);
    }
    const stops = Object.values(stopMap).sort((a, b) => a.stopOrder - b.stopOrder);
    return {
      inStoreCount: inStore.length,
      onlineCount: online.length,
      stops,
    };
  }, [gifts]);

  const listPreview = useMemo(() => {
    return {
      nice: members.filter((m) => m.listStatus === 'nice').length,
      undecided: members.filter((m) => m.listStatus === 'undecided').length,
      naughty: members.filter((m) => m.listStatus === 'naughty').length,
      featured: members.slice(0, 4),
    };
  }, [members]);

  const ideaPreview = useMemo(() => {
    const membersNeedingGifts = members.filter(
      (m) => !gifts.some((g) => g.memberId === m.id)
    );
    return {
      needingCount: membersNeedingGifts.length,
      suggestedTarget: membersNeedingGifts[0] || members[0] || null,
    };
  }, [members, gifts]);

  const openAddGift = () => {
    setEditingGift(null);
    setGMemberId(members[0]?.id ?? 'general');
    setGTitle('');
    setGEstimated('40');
    setGActual('0');
    setGStore('Target');
    setGMode('in_store');
    setGStatus('planned');
    setGAvailability('in_stock');
    setGUrl('');
    setGNotes('');
    setShowGiftModal(true);
  };

  const openEditGift = (gift: GiftItem) => {
    setEditingGift(gift);
    setGMemberId(gift.memberId);
    setGTitle(gift.title);
    setGEstimated(String(gift.estimatedPrice));
    setGActual(String(gift.actualPrice));
    setGStore(gift.storeName);
    setGMode(gift.fulfillmentMode);
    setGStatus(gift.status);
    setGAvailability(gift.availabilityStatus);
    setGUrl(gift.purchaseUrl);
    setGNotes(gift.notes);
    setShowGiftModal(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBudget(true);
    try {
      await updateUserSettings(uid, {
        overallBudget: Number(budgetDraft) || 0,
        alertThresholdPct: Number(thresholdDraft) || 85,
      });
      setEditingBudget(false);
    } finally {
      setSavingBudget(false);
    }
  };

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gTitle.trim()) return;
    setSavingGift(true);
    try {
      const matched = members.find((m) => m.id === gMemberId);
      await saveGiftItem(uid, {
        id: editingGift?.id,
        memberId: matched ? matched.id : 'general',
        memberName: matched ? matched.name : 'Family / Host',
        title: gTitle,
        estimatedPrice: Number(gEstimated) || 0,
        actualPrice: Number(gActual) || 0,
        storeName: gStore || 'Target',
        storeStopOrder: editingGift?.storeStopOrder ?? 1,
        fulfillmentMode: gMode,
        purchaseUrl: gUrl,
        availabilityStatus: gAvailability,
        priceAlertEnabled: editingGift?.priceAlertEnabled ?? true,
        status: gStatus,
        notes: gNotes,
      });
      setShowGiftModal(false);
    } finally {
      setSavingGift(false);
    }
  };

  const handleAdvanceStatus = async (gift: GiftItem) => {
    const next = NEXT_STATUS[gift.status];
    const nextActual =
      next !== 'planned' && gift.actualPrice === 0 ? gift.estimatedPrice : gift.actualPrice;
    await updateGiftStatus(uid, gift.id, next, nextActual);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedStarter();
    } finally {
      setSeeding(false);
    }
  };

  const handleExportZip = async () => {
    setZipping(true);
    try {
      await exportCustomerZip(settings, members, gifts);
    } finally {
      setZipping(false);
    }
  };

  const isEmpty = members.length === 0 && gifts.length === 0;
  const activePieData = pieMode === 'breakdown' ? budgetPieData : recipientPieData;
  const activePieTotal = activePieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Framed Editorial Holiday Banner */}
      <section className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-1.5">
        <div className="rounded-xl border border-[#E4D7C5] dark:border-[#523E43]/70 bg-gradient-to-br from-[#FFFDFB] via-[#FAF6F0] to-[#FBF0F3] dark:from-[#1F171A] dark:via-[#1C1417] dark:to-[#28191E] px-5 py-5 sm:px-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <BlushPinkTreeIcon className="w-11 h-11" />
              <GirlyGingerbreadCookieIcon className="w-10 h-10" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="font-script text-2xl text-[#9E1B24] dark:text-[#FB7185] leading-none">
                  Holiday Planner
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
                  {daysUntilChristmas === 0
                    ? 'Christmas Morning'
                    : `${daysUntilChristmas} Days Until Christmas`}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#26181C] dark:text-[#F5EFE8]">
                Holiday Gift Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-[#7D6959] dark:text-[#C4B0A2]">
                Enjoy Christmas. Not the January money stress.
              </p>
            </div>
          </div>

          {/* Framed Summary Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#C9B59C] dark:border-[#523E43] bg-[#FFFDFB] dark:bg-[#151012] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
              <span>{seeding ? 'Loading...' : 'Sample Starter'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBudgetDraft(String(overallBudget));
                setThresholdDraft(String(alertThresholdPct));
                setEditingBudget(!editingBudget);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#C9B59C] dark:border-[#523E43] bg-[#FFFDFB] dark:bg-[#151012] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
              <span>Edit Budget</span>
            </button>
            <button
              type="button"
              onClick={() => exportHolidayCsv(settings, members, gifts, [], [])}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#C9B59C] dark:border-[#523E43] bg-[#FFFDFB] dark:bg-[#151012] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportZip}
              disabled={zipping}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#C9B59C] dark:border-[#523E43] bg-[#FFFDFB] dark:bg-[#151012] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <Archive className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
              <span>{zipping ? 'Creating ZIP...' : 'Customer ZIP'}</span>
            </button>
            <button
              type="button"
              onClick={openAddGift}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Gift</span>
            </button>
          </div>
        </div>
      </section>

      {/* Starter Plan Prompt when empty */}
      {isEmpty && (
        <div className="rounded-2xl border border-[#C9B59C] dark:border-[#3A2C30] bg-[#FBF0F3] dark:bg-[#1F171A] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="font-display text-lg font-semibold text-[#26181C] dark:text-[#F5EFE8]">
              Your holiday list is ready to start
            </h2>
            <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
              Add your first gift or load our sample family &amp; store starter list in one click.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {seeding ? 'Loading...' : 'Load Sample Starter List'}
          </button>
        </div>
      )}

      {/* Inline Budget Editor */}
      {editingBudget && (
        <form
          onSubmit={handleSaveBudget}
          className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
        >
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2] mb-1">
              Holiday Budget ($)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={budgetDraft}
              onChange={(e) => setBudgetDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm tabular-nums"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2] mb-1">
              Alert Threshold (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={thresholdDraft}
              onChange={(e) => setThresholdDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm tabular-nums"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={savingBudget}
              className="px-4 py-2 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {savingBudget ? 'Saving...' : 'Save Budget'}
            </button>
            <button
              type="button"
              onClick={() => setEditingBudget(false)}
              className="px-4 py-2 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Budget & Gifts Summary (Single Pie Chart + KPI Row + Gift Status Toggles) */}
      <section className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4D7C5] dark:border-[#3A2C30] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
              Budget &amp; Gifts Summary
            </p>
            <h2 className="font-display text-xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
              Santa Tracker Overview
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] self-start sm:self-auto no-print">
            <button
              type="button"
              onClick={() => setPieMode('breakdown')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                pieMode === 'breakdown'
                  ? 'bg-[#FFFDFB] dark:bg-[#2B1D22] text-[#26181C] dark:text-[#F5EFE8] shadow-xs'
                  : 'text-[#7D6959] dark:text-[#C4B0A2]'
              }`}
            >
              Budget Split
            </button>
            <button
              type="button"
              onClick={() => setPieMode('recipients')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                pieMode === 'recipients'
                  ? 'bg-[#FFFDFB] dark:bg-[#2B1D22] text-[#26181C] dark:text-[#F5EFE8] shadow-xs'
                  : 'text-[#7D6959] dark:text-[#C4B0A2]'
              }`}
            >
              By Person
            </button>
          </div>
        </div>

        {/* Clean 4-Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E4D7C5] dark:divide-[#3A2C30] border-b border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0]/55 dark:bg-[#151012]/55">
          <div className="p-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
              Total Budget
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#26181C] dark:text-[#F5EFE8]">
              ${overallBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
              Spent So Far
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#9E1B24] dark:text-[#FB7185]">
              ${metrics.giftSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
              Remaining Budget
            </p>
            <p
              className={`mt-1 font-display text-2xl font-semibold tabular-nums ${
                metrics.remaining < 0
                  ? 'text-[#9E1B24] dark:text-[#FB7185]'
                  : 'text-[#1D6B3C] dark:text-[#4ADE80]'
              }`}
            >
              ${metrics.remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
              Wrapped &amp; Ready
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#26181C] dark:text-[#F5EFE8]">
              {metrics.wrappedCount} / {gifts.length}
            </p>
          </div>
        </div>

        {/* Single Pie Chart + Compact Gift Status Tracker Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E4D7C5] dark:divide-[#3A2C30]">
          {/* Left 5 cols: Single Circle Pie Chart */}
          <div className="lg:col-span-5 p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#9E1B24] dark:text-[#FB7185]" />
              <h3 className="text-sm font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                {pieMode === 'breakdown' ? 'Holiday Budget Pie Chart' : 'Gift Spend by Person'}
              </h3>
            </div>

            {activePieData.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                Add gifts to view your budget pie chart.
              </div>
            ) : (
              <>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={80}
                        paddingAngle={1.5}
                        stroke="#FAF6F0"
                        strokeWidth={2}
                      >
                        {activePieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const item = payload[0].payload as { name: string; value: number };
                          const pct =
                            activePieTotal > 0 ? Math.round((item.value / activePieTotal) * 100) : 0;
                          return (
                            <div className="rounded-xl bg-[#FFFDFB] dark:bg-[#151012] border border-[#C9B59C] dark:border-[#3A2C30] px-3.5 py-2 shadow-md text-xs space-y-0.5">
                              <p className="font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                                {item.name}
                              </p>
                              <p className="tabular-nums text-[#9E1B24] dark:text-[#FB7185] font-semibold">
                                ${item.value.toFixed(2)} ({pct}%)
                              </p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {activePieData.map((slice) => {
                    const pct =
                      activePieTotal > 0 ? Math.round((slice.value / activePieTotal) * 100) : 0;
                    return (
                      <div
                        key={slice.name}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30]"
                      >
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: slice.color }}
                          />
                          <span className="truncate text-[#26181C] dark:text-[#F5EFE8]">
                            {slice.name}
                          </span>
                        </span>
                        <span className="font-semibold tabular-nums text-[#7D6959] dark:text-[#C4B0A2] shrink-0">
                          ${slice.value.toFixed(0)} · {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right 7 cols: Gift List & One-Tap Status Toggles */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E4D7C5] dark:border-[#3A2C30] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                  Gift List &amp; Status Toggles
                </h3>
                <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                  Tap status to cycle Planned → Purchased → Wrapped → Under Tree.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] overflow-x-auto max-w-full no-print">
                {(['all', 'planned', 'purchased', 'wrapped', 'delivered'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#FFFDFB] dark:bg-[#2B1D22] text-[#26181C] dark:text-[#F5EFE8] shadow-xs'
                        : 'text-[#7D6959] dark:text-[#C4B0A2]'
                    }`}
                  >
                    {st === 'all' ? 'All' : STATUS_LABELS[st]}
                  </button>
                ))}
              </div>
            </div>

            {filteredGifts.length === 0 ? (
              <div className="p-10 text-center space-y-2 my-auto">
                <Gift className="w-8 h-8 text-[#C9B59C] mx-auto" />
                <p className="text-sm font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                  No gifts in this view
                </p>
                <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                  Add a gift directly or open the Gift Idea Generator for ideas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E4D7C5] dark:divide-[#3A2C30] max-h-[320px] overflow-y-auto">
                {filteredGifts.map((gift) => {
                  const displayPrice =
                    gift.actualPrice > 0 ? gift.actualPrice : gift.estimatedPrice;
                  return (
                    <div
                      key={gift.id}
                      className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#FAF6F0]/60 dark:hover:bg-[#2B1D22]/35 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-semibold text-sm text-[#26181C] dark:text-[#F5EFE8] truncate">
                          {gift.title}
                        </p>
                        <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] truncate">
                          For {gift.memberName} · {gift.storeName || 'Any Store'} ·{' '}
                          {gift.fulfillmentMode === 'online' ? 'Online' : 'In-Store'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="font-mono text-xs font-semibold tabular-nums text-[#26181C] dark:text-[#F5EFE8]">
                          ${displayPrice.toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleAdvanceStatus(gift)}
                          title="Tap to advance gift status"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                            gift.status === 'wrapped' || gift.status === 'delivered'
                              ? 'border-[#1D6B3C]/30 bg-[#1D6B3C]/10 text-[#1D6B3C] dark:text-[#4ADE80]'
                              : gift.status === 'purchased'
                                ? 'border-[#B45309]/30 bg-[#B45309]/10 text-[#B45309] dark:text-[#FBBF24]'
                                : 'border-[#C9B59C] dark:border-[#523E43] bg-[#FAF6F0] dark:bg-[#151012] text-[#7D6959] dark:text-[#C4B0A2]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{STATUS_LABELS[gift.status]}</span>
                        </button>

                        <div className="hidden sm:flex items-center gap-0.5 no-print">
                          <button
                            type="button"
                            onClick={() => openEditGift(gift)}
                            aria-label={`Edit ${gift.title}`}
                            className="p-1.5 rounded-lg text-[#7D6959] hover:text-[#26181C] hover:bg-[#FAF6F0] dark:hover:bg-[#2B1D22] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGiftItem(uid, gift.id)}
                            aria-label={`Delete ${gift.title}`}
                            className="p-1.5 rounded-lg text-[#7D6959] hover:text-[#9E1B24] hover:bg-[#FAF6F0] dark:hover:bg-[#2B1D22] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3 Calm Sub-Page Preview Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Preview 1: Santa's Shopping Route */}
        <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
                  Route &amp; Errands
                </p>
                <h3 className="font-display text-lg font-semibold text-[#26181C] dark:text-[#F5EFE8] mt-0.5">
                  Santa&apos;s Shopping Route
                </h3>
              </div>
              <span className="w-9 h-9 rounded-xl bg-[#FBF0F3] dark:bg-[#2B1D22] border border-[#E4D7C5] dark:border-[#3A2C30] text-[#9E1B24] dark:text-[#FB7185] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
            </div>

            <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums">
              {routePreview.stops.length} store stop{routePreview.stops.length === 1 ? '' : 's'} ({routePreview.inStoreCount} in-store) · {routePreview.onlineCount} online
            </p>

            {routePreview.stops.length === 0 ? (
              <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] py-3 border-y border-[#E4D7C5] dark:border-[#3A2C30]">
                No in-store stops queued right now. Open the interactive map to plan or toggle items online.
              </p>
            ) : (
              <div className="divide-y divide-[#E4D7C5] dark:divide-[#3A2C30] border-y border-[#E4D7C5] dark:border-[#3A2C30]">
                {routePreview.stops.slice(0, 3).map((stop, idx) => (
                  <div key={stop.storeName} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#26181C] dark:text-[#F5EFE8] truncate">
                      {idx + 1}. {stop.storeName}
                    </span>
                    <span className="tabular-nums text-[#7D6959] dark:text-[#C4B0A2] shrink-0">
                      {stop.count} item{stop.count === 1 ? '' : 's'} · ${stop.total.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigatePage('shopping-route')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#C9B59C] dark:border-[#523E43] bg-[#FAF6F0] dark:bg-[#151012] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] transition-colors cursor-pointer"
          >
            <span>Open Shopping Route</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
          </button>
        </div>

        {/* Preview 2: Naughty & Nice List */}
        <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
                  Friends &amp; Family
                </p>
                <h3 className="font-display text-lg font-semibold text-[#26181C] dark:text-[#F5EFE8] mt-0.5">
                  Naughty &amp; Nice List
                </h3>
              </div>
              <span className="w-9 h-9 rounded-xl bg-[#FBF0F3] dark:bg-[#2B1D22] border border-[#E4D7C5] dark:border-[#3A2C30] text-[#9E1B24] dark:text-[#FB7185] flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4" />
              </span>
            </div>

            <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums">
              {listPreview.nice} Nice · {listPreview.undecided} Checking Twice · {listPreview.naughty} Naughty
            </p>

            {listPreview.featured.length === 0 ? (
              <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] py-3 border-y border-[#E4D7C5] dark:border-[#3A2C30]">
                Add loved ones to track their sizes, notes, and gift budgets.
              </p>
            ) : (
              <div className="divide-y divide-[#E4D7C5] dark:divide-[#3A2C30] border-y border-[#E4D7C5] dark:border-[#3A2C30]">
                {listPreview.featured.map((m) => (
                  <div key={m.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#26181C] dark:text-[#F5EFE8] truncate">
                      {m.name} <span className="text-[#7D6959] dark:text-[#C4B0A2]">({m.relationship})</span>
                    </span>
                    <span
                      className={`font-semibold shrink-0 ${
                        m.listStatus === 'nice'
                          ? 'text-[#1D6B3C] dark:text-[#4ADE80]'
                          : m.listStatus === 'naughty'
                            ? 'text-[#9E1B24] dark:text-[#FB7185]'
                            : 'text-[#B45309] dark:text-[#FBBF24]'
                      }`}
                    >
                      {m.listStatus === 'nice'
                        ? 'Nice'
                        : m.listStatus === 'naughty'
                          ? 'Naughty'
                          : 'Checking'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigatePage('naughty-nice')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#C9B59C] dark:border-[#523E43] bg-[#FAF6F0] dark:bg-[#151012] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] transition-colors cursor-pointer"
          >
            <span>Open Naughty &amp; Nice List</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
          </button>
        </div>

        {/* Preview 3: Gift Idea Generator */}
        <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
                  Santa&apos;s Workshop
                </p>
                <h3 className="font-display text-lg font-semibold text-[#26181C] dark:text-[#F5EFE8] mt-0.5">
                  Gift Idea Generator
                </h3>
              </div>
              <span className="w-9 h-9 rounded-xl bg-[#FBF0F3] dark:bg-[#2B1D22] border border-[#E4D7C5] dark:border-[#3A2C30] text-[#9E1B24] dark:text-[#FB7185] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>

            <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] leading-relaxed">
              Generate tailored gift suggestions by recipient &amp; budget, compare retailer prices, and check store availability.
            </p>

            <div className="rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] p-3 space-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
                Suggested Focus
              </p>
              <p className="text-xs font-medium text-[#26181C] dark:text-[#F5EFE8]">
                {ideaPreview.suggestedTarget
                  ? `${ideaPreview.suggestedTarget.name} · Budget $${ideaPreview.suggestedTarget.budgetAllocated.toFixed(0)}`
                  : 'Custom gift search & price check'}
              </p>
              {ideaPreview.needingCount > 0 && (
                <p className="text-[11px] text-[#9E1B24] dark:text-[#FB7185]">
                  {ideaPreview.needingCount} person{ideaPreview.needingCount === 1 ? '' : 's'} still waiting for a gift
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onNavigatePage('gift-ideas', ideaPreview.suggestedTarget?.id)
            }
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Open Gift Idea Generator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Add / Edit Gift Modal */}
      {showGiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                {editingGift ? 'Edit Gift Item' : 'Add Holiday Gift'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGiftModal(false)}
                className="p-1.5 rounded-lg text-[#7D6959] hover:bg-[#FAF6F0] dark:hover:bg-[#2B1D22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGift} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Gift Name</label>
                <input
                  type="text"
                  value={gTitle}
                  onChange={(e) => setGTitle(e.target.value)}
                  placeholder="e.g., Cashmere Wrap Scarf"
                  maxLength={140}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Recipient</label>
                  <select
                    value={gMemberId}
                    onChange={(e) => setGMemberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  >
                    <option value="general">Family / Host Gift</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Store Name</label>
                  <input
                    type="text"
                    value={gStore}
                    onChange={(e) => setGStore(e.target.value)}
                    maxLength={80}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Estimated ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={gEstimated}
                    onChange={(e) => setGEstimated(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Actual Paid ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={gActual}
                    onChange={(e) => setGActual(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm tabular-nums"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium mb-1">Status</label>
                  <select
                    value={gStatus}
                    onChange={(e) => setGStatus(e.target.value as GiftStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  >
                    <option value="planned">Planned</option>
                    <option value="purchased">Purchased</option>
                    <option value="wrapped">Wrapped</option>
                    <option value="delivered">Under Tree</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Shopping Mode</label>
                  <select
                    value={gMode}
                    onChange={(e) => setGMode(e.target.value as FulfillmentMode)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  >
                    <option value="in_store">In-Store Route</option>
                    <option value="online">Buy Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Local Stock Status</label>
                  <select
                    value={gAvailability}
                    onChange={(e) => setGAvailability(e.target.value as AvailabilityStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                  >
                    <option value="in_stock">In Stock Locally</option>
                    <option value="low_stock">Low Stock Alert</option>
                    <option value="online_only">Online Only</option>
                    <option value="unknown">Check Availability</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Product Link (optional)</label>
                <input
                  type="url"
                  value={gUrl}
                  onChange={(e) => setGUrl(e.target.value)}
                  placeholder="https://..."
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Notes (size, color, wrapping)</label>
                <textarea
                  rows={2}
                  value={gNotes}
                  onChange={(e) => setGNotes(e.target.value)}
                  maxLength={400}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGiftModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGift}
                  className="px-5 py-2.5 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {savingGift ? 'Saving...' : editingGift ? 'Update Gift' : 'Save Gift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
