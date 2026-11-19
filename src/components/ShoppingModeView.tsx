import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Globe,
  RotateCcw,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { GiftItem, UserSettings } from '../types/holiday';
import { updateGiftStatus } from '../lib/holidayService';
import { BlushPinkTreeIcon, GirlyGingerbreadCookieIcon } from './HolidayVisualElements';

interface ShoppingModeViewProps {
  uid: string;
  settings: UserSettings | null;
  gifts: GiftItem[];
  onTurnOffShoppingMode: () => void;
}

interface OrderedStop {
  key: string;
  storeName: string;
  stopOrder: number;
  fulfillmentMode: 'in_store' | 'online';
  items: GiftItem[];
  subtotal: number;
}

export const ShoppingModeView: React.FC<ShoppingModeViewProps> = ({
  uid,
  settings,
  gifts,
  onTurnOffShoppingMode,
}) => {
  const [channelFilter, setChannelFilter] = useState<'all' | 'in_store' | 'online'>('all');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [lastPurchasedGift, setLastPurchasedGift] = useState<GiftItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const overallBudget = settings?.overallBudget ?? 1200;

  const spentSoFar = useMemo(
    () =>
      gifts.reduce(
        (sum, g) => sum + (g.status !== 'planned' ? g.actualPrice || g.estimatedPrice : 0),
        0
      ),
    [gifts]
  );

  const unpurchasedGifts = useMemo(
    () => gifts.filter((g) => g.status === 'planned'),
    [gifts]
  );

  const filteredUnpurchased = useMemo(() => {
    return unpurchasedGifts.filter((g) => {
      if (channelFilter !== 'all' && g.fulfillmentMode !== channelFilter) return false;
      if (
        selectedStoreFilter !== 'all' &&
        (g.storeName || 'Local Store').trim() !== selectedStoreFilter
      ) {
        return false;
      }
      return true;
    });
  }, [unpurchasedGifts, channelFilter, selectedStoreFilter]);

  const storeNames = useMemo(() => {
    const unique: string[] = [];
    for (const g of unpurchasedGifts) {
      const name = (g.storeName || 'Local Store').trim();
      if (!unique.includes(name)) unique.push(name);
    }
    return unique;
  }, [unpurchasedGifts]);

  const orderedStops = useMemo<OrderedStop[]>(() => {
    const groups: Record<string, OrderedStop> = {};

    for (const gift of filteredUnpurchased) {
      const storeName = (gift.storeName || 'Local Store').trim();
      const mode = gift.fulfillmentMode === 'online' ? 'online' : 'in_store';
      const key = `${mode}::${storeName}`;
      const price = gift.estimatedPrice || 0;

      if (!groups[key]) {
        groups[key] = {
          key,
          storeName,
          stopOrder: gift.storeStopOrder || 1,
          fulfillmentMode: mode,
          items: [gift],
          subtotal: price,
        };
      } else {
        groups[key].items.push(gift);
        groups[key].subtotal += price;
        groups[key].stopOrder = Math.min(groups[key].stopOrder, gift.storeStopOrder || 1);
      }
    }

    return Object.values(groups).sort((a, b) => {
      if (a.fulfillmentMode !== b.fulfillmentMode) {
        return a.fulfillmentMode === 'in_store' ? -1 : 1;
      }
      return a.stopOrder - b.stopOrder;
    });
  }, [filteredUnpurchased]);

  const remainingItemsTotal = useMemo(
    () => unpurchasedGifts.reduce((sum, g) => sum + (g.estimatedPrice || 0), 0),
    [unpurchasedGifts]
  );

  const remainingBudget = overallBudget - spentSoFar;

  const handleMarkPurchased = async (gift: GiftItem) => {
    setBusyId(gift.id);
    try {
      const priceToRecord = gift.actualPrice > 0 ? gift.actualPrice : gift.estimatedPrice;
      await updateGiftStatus(uid, gift.id, 'purchased', priceToRecord);
      setLastPurchasedGift(gift);
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckOffStop = async (stop: OrderedStop) => {
    setBusyId(stop.key);
    try {
      await Promise.all(
        stop.items.map((item) =>
          updateGiftStatus(
            uid,
            item.id,
            'purchased',
            item.actualPrice > 0 ? item.actualPrice : item.estimatedPrice
          )
        )
      );
      if (stop.items.length > 0) {
        setLastPurchasedGift(stop.items[stop.items.length - 1]);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleUndoLast = async () => {
    if (!lastPurchasedGift) return;
    await updateGiftStatus(uid, lastPurchasedGift.id, 'planned', 0);
    setLastPurchasedGift(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Live Shopping Trip Totals Strip */}
      <section className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
              Active Shopping Checklist
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
              Store Stops &amp; Remaining Items
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <BlushPinkTreeIcon className="w-8 h-8" />
            <GirlyGingerbreadCookieIcon className="w-8 h-8" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#E4D7C5] dark:border-[#3A2C30]">
          <div className="rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] p-3.5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
              Items Left
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#26181C] dark:text-[#F5EFE8]">
              {unpurchasedGifts.length}
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] p-3.5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
              List Total
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#9E1B24] dark:text-[#FB7185]">
              ${remainingItemsTotal.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] p-3.5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#7D6959] dark:text-[#C4B0A2]">
              Budget Left
            </p>
            <p
              className={`mt-1 font-display text-2xl font-semibold tabular-nums ${
                remainingBudget < 0
                  ? 'text-[#9E1B24] dark:text-[#FB7185]'
                  : 'text-[#1D6B3C] dark:text-[#4ADE80]'
              }`}
            >
              ${remainingBudget.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Fast Store / Channel Filter */}
        {unpurchasedGifts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30]">
              {(
                [
                  { id: 'all', label: 'All Stops' },
                  { id: 'in_store', label: 'In-Store' },
                  { id: 'online', label: 'Online' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChannelFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    channelFilter === tab.id
                      ? 'bg-[#9E1B24] text-white'
                      : 'text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {storeNames.length > 1 && (
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                aria-label="Filter by store"
                className="px-3 py-2 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-xs font-medium text-[#26181C] dark:text-[#F5EFE8]"
              >
                <option value="all">All Stores ({storeNames.length})</option>
                {storeNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </section>

      {/* Undo Quick Action */}
      {lastPurchasedGift && (
        <div className="rounded-xl bg-[#FBF0F3] dark:bg-[#2B1D22] border border-[#C9B59C] dark:border-[#523E43] px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-[#26181C] dark:text-[#F5EFE8]">
            Checked off <span className="font-semibold">{lastPurchasedGift.title}</span> (${(lastPurchasedGift.actualPrice || lastPurchasedGift.estimatedPrice).toFixed(2)}).
          </p>
          <button
            type="button"
            onClick={handleUndoLast}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9E1B24] dark:text-[#FB7185] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      )}

      {/* Ordered Store Stops + Unpurchased Items */}
      {orderedStops.length === 0 ? (
        <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-12 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <BlushPinkTreeIcon className="w-11 h-11" />
            <GirlyGingerbreadCookieIcon className="w-11 h-11" />
          </div>
          <h2 className="font-display text-xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
            All unpurchased items checked off!
          </h2>
          <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] max-w-sm mx-auto">
            Every planned gift on your current list has been marked as purchased.
          </p>
          <button
            type="button"
            onClick={onTurnOffShoppingMode}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Return to Command Center
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedStops.map((stop, index) => (
            <section
              key={stop.key}
              className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] overflow-hidden"
            >
              {/* Store Stop Header — tap to check off entire stop */}
              <div className="px-5 py-4 bg-[#FAF6F0] dark:bg-[#151012] border-b border-[#E4D7C5] dark:border-[#3A2C30] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-[#9E1B24] text-white text-xs font-bold flex items-center justify-center tabular-nums shrink-0">
                    {stop.fulfillmentMode === 'online' ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      String(index + 1).padStart(2, '0')
                    )}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-[#26181C] dark:text-[#F5EFE8] truncate flex items-center gap-2">
                      <span>{stop.storeName}</span>
                    </h2>
                    <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums">
                      {stop.fulfillmentMode === 'online' ? 'Online Checkout' : `Store Stop #${index + 1}`} ·{' '}
                      {stop.items.length} item{stop.items.length === 1 ? '' : 's'} · $
                      {stop.subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyId === stop.key}
                  onClick={() => handleCheckOffStop(stop)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C9B59C] dark:border-[#523E43] bg-[#FFFDFB] dark:bg-[#1F171A] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1D6B3C] dark:text-[#4ADE80]" />
                  <span>Check Off Stop</span>
                </button>
              </div>

              {/* Unpurchased Items inside this Stop */}
              <div className="divide-y divide-[#E4D7C5] dark:divide-[#3A2C30]">
                {stop.items.map((item) => (
                  <div
                    key={item.id}
                    className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-[#FAF6F0]/60 dark:hover:bg-[#2B1D22]/40 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-sm text-[#26181C] dark:text-[#F5EFE8]">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                        For {item.memberName}
                        {item.availabilityStatus === 'low_stock' ? ' · Low local stock' : ''}
                        {item.notes ? ` · ${item.notes}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#26181C] dark:text-[#F5EFE8]">
                        ${item.estimatedPrice.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleMarkPurchased(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Purchased</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="pt-2 flex items-center justify-center gap-2 text-xs text-[#7D6959] dark:text-[#C4B0A2]">
        <ShoppingBag className="w-3.5 h-3.5" />
        <span>Items tapped as Purchased update your Budget &amp; Gift List immediately.</span>
      </div>
    </div>
  );
};
