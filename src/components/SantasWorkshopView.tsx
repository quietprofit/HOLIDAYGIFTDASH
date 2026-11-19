import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BellRing,
  Check,
  ExternalLink,
  Gift,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Store,
  Tag,
} from 'lucide-react';
import {
  AvailabilityStatus,
  FamilyMember,
  FulfillmentMode,
  GiftItem,
} from '../types/holiday';
import { saveGiftItem, updateGiftRouting } from '../lib/holidayService';
import { BlushPinkTreeIcon, GirlyGingerbreadCookieIcon } from './HolidayVisualElements';

interface SantasWorkshopViewProps {
  uid: string;
  members: FamilyMember[];
  gifts: GiftItem[];
  preselectedMemberId?: string | null;
  onBackToCommandCenter?: () => void;
}

interface GiftSuggestion {
  title: string;
  estimatedPrice: number;
  recommendedStore: string;
  whyItFits: string;
  fulfillmentSuggestion: 'in_store' | 'online';
  wrappingTip: string;
}

interface RetailerPriceRow {
  store: string;
  price: number;
  availabilityStatus: AvailabilityStatus;
  availabilityLabel: string;
  fulfillmentMode: FulfillmentMode;
  shippingOrPickupNote: string;
  url: string;
}

interface ComparisonResult {
  itemName: string;
  msrp?: number;
  bestDealSummary: string;
  localPickupAlert: string;
  retailers: RetailerPriceRow[];
  sources?: { uri: string; title?: string }[];
}

export const SantasWorkshopView: React.FC<SantasWorkshopViewProps> = ({
  uid,
  members,
  gifts,
  preselectedMemberId,
  onBackToCommandCenter,
}) => {
  const [bannerImgError, setBannerImgError] = useState(false);

  // AI Gift Concierge state
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    preselectedMemberId || members[0]?.id || 'custom'
  );
  const [customRecipient, setCustomRecipient] = useState('Best Friend');
  const [customInterests, setCustomInterests] = useState('');
  const [maxBudget, setMaxBudget] = useState('65');
  const [vibeNotes, setVibeNotes] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GiftSuggestion[]>([]);
  const [addedTitles, setAddedTitles] = useState<Record<string, boolean>>({});

  // Price Comparison & Local Stock state
  const [compareItem, setCompareItem] = useState('');
  const [compareBudget, setCompareBudget] = useState('80');
  const [cityOrZip, setCityOrZip] = useState('');
  const [preferOnline, setPreferOnline] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    if (preselectedMemberId) {
      setSelectedMemberId(preselectedMemberId);
      const m = members.find((mem) => mem.id === preselectedMemberId);
      if (m) {
        setMaxBudget(String(m.budgetAllocated || 60));
        setCustomInterests(m.interests || '');
      }
    }
  }, [preselectedMemberId, members]);

  const activeMember = members.find((m) => m.id === selectedMemberId);

  const handleMemberSelect = (id: string) => {
    setSelectedMemberId(id);
    const m = members.find((mem) => mem.id === id);
    if (m) {
      setMaxBudget(String(m.budgetAllocated || 60));
      setCustomInterests(m.interests || '');
    }
  };

  const handleGenerateSuggestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestLoading(true);
    setSuggestError(null);
    try {
      const existingGifts = activeMember
        ? gifts.filter((g) => g.memberId === activeMember.id).map((g) => g.title)
        : [];

      const res = await fetch('/api/workshop/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: activeMember ? activeMember.name : customRecipient,
          relationship: activeMember ? activeMember.relationship : 'Loved One',
          ageGroup: activeMember ? activeMember.ageGroup : 'Adult',
          interests: customInterests || activeMember?.interests || '',
          maxBudget: Number(maxBudget) || 50,
          vibeNotes: vibeNotes || activeMember?.notes || '',
          existingGifts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not generate suggestions.');
      }
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Unable to reach Santa's Workshop AI.");
    } finally {
      setSuggestLoading(false);
    }
  };

  const runPriceCompare = async (itemToCompare: string, targetBudget?: number) => {
    if (!itemToCompare.trim()) return;
    setCompareItem(itemToCompare);
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await fetch('/api/workshop/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: itemToCompare.trim(),
          maxBudget: targetBudget ?? (Number(compareBudget) || 100),
          cityOrZip,
          preferOnline,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Price comparison failed.');
      }
      setComparison(data);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Unable to compare prices right now.');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleAddSuggestedGift = async (s: GiftSuggestion) => {
    const member = activeMember;
    await saveGiftItem(uid, {
      memberId: member ? member.id : 'general',
      memberName: member ? member.name : customRecipient || 'Family',
      title: s.title,
      estimatedPrice: s.estimatedPrice,
      actualPrice: 0,
      storeName: s.recommendedStore,
      storeStopOrder: 1,
      fulfillmentMode: s.fulfillmentSuggestion === 'online' ? 'online' : 'in_store',
      purchaseUrl: '',
      availabilityStatus: 'in_stock',
      priceAlertEnabled: true,
      status: 'planned',
      notes: s.wrappingTip,
    });
    setAddedTitles((prev) => ({ ...prev, [s.title]: true }));
  };

  const handleAddComparedRetailer = async (row: RetailerPriceRow) => {
    const member = activeMember;
    const label = `${comparison?.itemName || compareItem} (${row.store})`;
    await saveGiftItem(uid, {
      memberId: member ? member.id : 'general',
      memberName: member ? member.name : customRecipient || 'Family',
      title: comparison?.itemName || compareItem,
      estimatedPrice: row.price,
      actualPrice: 0,
      storeName: row.store,
      storeStopOrder: 1,
      fulfillmentMode: row.fulfillmentMode === 'online' ? 'online' : 'in_store',
      purchaseUrl: row.url || '',
      availabilityStatus: row.availabilityStatus || 'unknown',
      priceAlertEnabled: true,
      status: 'planned',
      notes: `${row.availabilityLabel} · ${row.shippingOrPickupNote}`,
    });
    setAddedTitles((prev) => ({ ...prev, [label]: true }));
  };

  const watchedGifts = gifts.filter(
    (g) => g.status === 'planned' && (g.priceAlertEnabled || g.availabilityStatus === 'low_stock')
  );

  return (
    <div className="space-y-6">
      {onBackToCommandCenter && (
        <button
          type="button"
          onClick={onBackToCommandCenter}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#9E1B24] dark:hover:text-[#FB7185] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Command Center</span>
        </button>
      )}

      {/* Editorial Header Banner */}
      <section className="rounded-2xl overflow-hidden border border-[#C9B59C] dark:border-[#3A2C30] bg-[#FFFDFB] dark:bg-[#1F171A] grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-center space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
            Santa&apos;s Workshop · Concierge &amp; Price Finder
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#26181C] dark:text-[#F5EFE8] text-balance">
            Gift Idea Generator
          </h1>
          <p className="text-xs sm:text-sm text-[#7D6959] dark:text-[#C4B0A2] leading-relaxed">
            Pick a loved one to generate tailored gift ideas within budget, compare retailer prices, check local pickup stock, and add directly to their gift list.
          </p>
        </div>
        <div className="lg:col-span-5 min-h-[160px] bg-[#FBF0F3] dark:bg-[#2B1D22]">
          {!bannerImgError ? (
            <img
              src="/src/assets/images/hero_workshop_banner_1795049059713.jpg"
              alt="Cream gift boxes with blush pink silk ribbon and holly"
              referrerPolicy="no-referrer"
              onError={() => setBannerImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6">
              <Gift className="w-12 h-12 text-[#9E1B24] dark:text-[#FB7185]" />
            </div>
          )}
        </div>
      </section>

      {/* Main 2-column Workshop Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: AI Gift Idea Suggestions */}
        <section className="xl:col-span-6 rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-6 space-y-5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#9E1B24] dark:text-[#FB7185]" />
              <h2 className="font-display text-xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                Tailored Gift Suggestions
              </h2>
            </div>
            <BlushPinkTreeIcon className="w-8 h-8 shrink-0" />
          </div>

          <form onSubmit={handleGenerateSuggestions} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Who are you shopping for?</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.relationship})
                    </option>
                  ))}
                  <option value="custom">Someone else (custom)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Max Budget ($)</label>
                <input
                  type="number"
                  min="5"
                  max="5000"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm tabular-nums"
                />
              </div>
            </div>

            {selectedMemberId === 'custom' && (
              <div>
                <label className="block text-xs font-medium mb-1">Recipient Label</label>
                <input
                  type="text"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  placeholder="e.g., Kindergarten Teacher, Book Club Host"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Interests, Hobbies &amp; Favorites</label>
              <input
                type="text"
                value={customInterests}
                onChange={(e) => setCustomInterests(e.target.value)}
                placeholder="e.g., cozy baking, gardening, puzzle books, pink cashmere..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Extra Guidance &amp; Sizing Notes</label>
              <input
                type="text"
                value={vibeNotes}
                onChange={(e) => setVibeNotes(e.target.value)}
                placeholder={activeMember?.notes || 'e.g., easy to wrap, no clutter, fits in carry-on...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={suggestLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{suggestLoading ? 'Crafting personalized gift ideas...' : 'Suggest Perfect Gifts'}</span>
            </button>
          </form>

          {suggestError && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[#33131A] border border-[#FECACA] dark:border-[#7F1D1D] text-xs text-[#991B1B] dark:text-[#FCA5A5] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{suggestError}</span>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#E4D7C5] dark:border-[#3A2C30]">
              <p className="text-xs font-semibold text-[#7D6959] dark:text-[#C4B0A2]">
                Tailored ideas for {activeMember ? activeMember.name : customRecipient}
              </p>
              {suggestions.map((s) => {
                const isAdded = Boolean(addedTitles[s.title]);
                return (
                  <div
                    key={s.title}
                    className="p-4 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-sm text-[#26181C] dark:text-[#F5EFE8]">
                          {s.title}
                        </h4>
                        <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums">
                          Est. ${Number(s.estimatedPrice).toFixed(2)} · {s.recommendedStore} ·{' '}
                          {s.fulfillmentSuggestion === 'online' ? 'Online Best' : 'In-Store Friendly'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-[#26181C] dark:text-[#F5EFE8] leading-relaxed">
                      {s.whyItFits}
                    </p>
                    {s.wrappingTip && (
                      <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                        Note: {s.wrappingTip}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => runPriceCompare(s.title, s.estimatedPrice)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C9B59C] dark:border-[#3A2C30] bg-[#FFFDFB] dark:bg-[#1F171A] text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
                        Compare Prices
                      </button>
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddSuggestedGift(s)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          isAdded
                            ? 'bg-[#1D6B3C]/15 text-[#1D6B3C] dark:text-[#4ADE80]'
                            : 'bg-[#9E1B24] hover:bg-[#7F141C] text-white'
                        }`}
                      >
                        {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isAdded ? 'Added to Gift List' : 'Add to Gift List'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Automated Price Comparison & Local Availability */}
        <section className="xl:col-span-6 rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-6 space-y-5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Tag className="w-5 h-5 text-[#9E1B24] dark:text-[#FB7185]" />
              <h2 className="font-display text-xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                Price Comparison &amp; Store Stock
              </h2>
            </div>
            <GirlyGingerbreadCookieIcon className="w-8 h-8 shrink-0" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runPriceCompare(compareItem);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium mb-1">Gift Item to Compare</label>
              <input
                type="text"
                value={compareItem}
                onChange={(e) => setCompareItem(e.target.value)}
                placeholder="e.g., KitchenAid Hand Mixer, LEGO Botanicals Orchid..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">City or ZIP (for Local Pickup)</label>
                <input
                  type="text"
                  value={cityOrZip}
                  onChange={(e) => setCityOrZip(e.target.value)}
                  placeholder="e.g., 60611 or Portland, OR"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Target Budget ($)</label>
                <input
                  type="number"
                  min="5"
                  value={compareBudget}
                  onChange={(e) => setCompareBudget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm tabular-nums"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-medium text-[#26181C] dark:text-[#F5EFE8] cursor-pointer">
              <input
                type="checkbox"
                checked={preferOnline}
                onChange={(e) => setPreferOnline(e.target.checked)}
                className="rounded border-[#C9B59C] text-[#9E1B24]"
              />
              <span>Prefer online delivery deals over local store pickup</span>
            </label>

            <button
              type="submit"
              disabled={compareLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#26181C] dark:bg-[#9E1B24] hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold transition-opacity cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{compareLoading ? 'Checking store prices & availability...' : 'Compare Prices & Store Stock'}</span>
            </button>
          </form>

          {compareError && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[#33131A] border border-[#FECACA] dark:border-[#7F1D1D] text-xs text-[#991B1B] dark:text-[#FCA5A5] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{compareError}</span>
            </div>
          )}

          {comparison && (
            <div className="space-y-4 pt-2 border-t border-[#E4D7C5] dark:border-[#3A2C30]">
              <div className="p-4 rounded-xl bg-[#FBF0F3] dark:bg-[#2B1D22] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm text-[#26181C] dark:text-[#F5EFE8]">
                    {comparison.itemName}
                  </h4>
                  {comparison.msrp ? (
                    <span className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums">
                      Typical MSRP ${Number(comparison.msrp).toFixed(2)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[#26181C] dark:text-[#F5EFE8]">
                  {comparison.bestDealSummary}
                </p>
                {comparison.localPickupAlert && (
                  <p className="text-xs font-medium text-[#9E1B24] dark:text-[#FB7185] flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{comparison.localPickupAlert}</span>
                  </p>
                )}
              </div>

              <div className="divide-y divide-[#E4D7C5] dark:divide-[#3A2C30] border border-[#E4D7C5] dark:border-[#3A2C30] rounded-xl overflow-hidden">
                {(comparison.retailers || []).map((row, idx) => {
                  const key = `${comparison.itemName} (${row.store})`;
                  const isAdded = Boolean(addedTitles[key]);
                  return (
                    <div
                      key={`${row.store}-${idx}`}
                      className="p-3.5 bg-[#FAF6F0] dark:bg-[#151012] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185] shrink-0" />
                          <span className="font-semibold text-sm text-[#26181C] dark:text-[#F5EFE8]">
                            {row.store}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-[#1D6B3C] dark:text-[#4ADE80]">
                            ${Number(row.price).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                          {row.availabilityLabel} · {row.shippingOrPickupNote}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {row.url && (
                          <a
                            href={row.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#C9B59C] dark:border-[#3A2C30] text-xs font-medium hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22]"
                          >
                            <span>Visit</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddComparedRetailer(row)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            isAdded
                              ? 'bg-[#1D6B3C]/15 text-[#1D6B3C] dark:text-[#4ADE80]'
                              : 'bg-[#9E1B24] hover:bg-[#7F141C] text-white'
                          }`}
                        >
                          {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {isAdded ? 'Saved' : 'Save Gift'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {comparison.sources && comparison.sources.length > 0 && (
                <div className="text-xs text-[#7D6959] dark:text-[#C4B0A2] space-y-1">
                  <p className="font-medium">Search sources:</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {comparison.sources.map((src, i) => (
                      <a
                        key={`${src.uri}-${i}`}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-[#9E1B24] dark:hover:text-[#FB7185] truncate max-w-[220px]"
                      >
                        {src.title || src.uri}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Watched Gifts for Local Store Stock Alerts */}
          <div className="pt-4 border-t border-[#E4D7C5] dark:border-[#3A2C30] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8]">
              <BellRing className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
              <span>Monitored Planned Gifts ({watchedGifts.length})</span>
            </div>
            {watchedGifts.length === 0 ? (
              <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                Planned gifts with price/stock watch enabled appear here for quick re-checking.
              </p>
            ) : (
              <div className="space-y-2">
                {watchedGifts.slice(0, 4).map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate text-[#26181C] dark:text-[#F5EFE8]">
                        {g.title}
                      </p>
                      <p className="text-[#7D6959] dark:text-[#C4B0A2]">
                        {g.storeName} ·{' '}
                        {g.availabilityStatus === 'low_stock' ? 'Low Stock Alert' : 'Watching Price'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => runPriceCompare(g.title, g.estimatedPrice)}
                        className="text-[#9E1B24] dark:text-[#FB7185] font-semibold hover:underline cursor-pointer"
                      >
                        Re-check
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateGiftRouting(uid, g.id, { priceAlertEnabled: !g.priceAlertEnabled })
                        }
                        className="text-[#7D6959] hover:underline cursor-pointer"
                      >
                        Mute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
