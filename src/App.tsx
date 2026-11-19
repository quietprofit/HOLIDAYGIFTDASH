import React, { useEffect, useMemo, useState } from 'react';
import {
  FileDown,
  Gift,
  Heart,
  Lock,
  MapPin,
  Moon,
  ShoppingBag,
  Sparkles,
  Sun,
} from 'lucide-react';
import { seedStarterHolidayData } from './lib/holidayService';
import {
  LOCAL_WORKSPACE_UID,
  loadLocalWorkspace,
  subscribeLocalWorkspace,
} from './lib/localHolidayStore';
import { FamilyMember, GiftItem, UserSettings } from './types/holiday';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AccessCodeGate } from './components/AccessCodeGate';
import { AccessPdfModal } from './components/AccessPdfModal';
import { AppPageId, CommandCenterView } from './components/CommandCenterView';
import { ShoppingModeView } from './components/ShoppingModeView';
import { ShoppingRoutesView } from './components/ShoppingRoutesView';
import { NaughtyNiceView } from './components/NaughtyNiceView';
import { SantasWorkshopView } from './components/SantasWorkshopView';
import { BlushPinkTreeIcon } from './components/HolidayVisualElements';

const ACCESS_UNLOCKED_KEY = 'holiday_gift_dashboard_unlocked_v1';

const PAGE_NAV: {
  id: AppPageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'command-center', label: 'Command Center', icon: Gift },
  { id: 'shopping-route', label: 'Shopping Route', icon: MapPin },
  { id: 'naughty-nice', label: 'Naughty & Nice List', icon: Heart },
  { id: 'gift-ideas', label: 'Gift Idea Generator', icon: Sparkles },
];

function HolidayDashboardApp() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved =
      localStorage.getItem('santas_helper_theme') ??
      localStorage.getItem('holly_hearth_theme');
    return saved === 'dark';
  });

  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ACCESS_UNLOCKED_KEY) === 'true';
  });
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const [shoppingMode, setShoppingMode] = useState(false);
  const [activePage, setActivePage] = useState<AppPageId>('command-center');
  const [workshopMemberId, setWorkshopMemberId] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // Instant localStorage workspace with zero login wall
  const initialLocal = useMemo(() => loadLocalWorkspace(), []);
  const [settings, setSettings] = useState<UserSettings | null>(initialLocal.settings);
  const [members, setMembers] = useState<FamilyMember[]>(initialLocal.members);
  const [gifts, setGifts] = useState<GiftItem[]>(initialLocal.gifts);

  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('santas_helper_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('santas_helper_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const syncFromLocal = () => {
      const local = loadLocalWorkspace();
      setSettings(local.settings);
      setMembers(local.members);
      setGifts(local.gifts);
    };
    syncFromLocal();
    return subscribeLocalWorkspace(syncFromLocal);
  }, []);

  const unpurchasedCount = useMemo(
    () => gifts.filter((g) => g.status === 'planned').length,
    [gifts]
  );

  const handleNavigatePage = (page: AppPageId, preselectMemberId?: string) => {
    setWorkshopMemberId(preselectMemberId ?? null);
    setActivePage(page);
    setShoppingMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUnlocked = () => {
    localStorage.setItem(ACCESS_UNLOCKED_KEY, 'true');
    setUnlocked(true);
  };

  const handleLock = () => {
    localStorage.removeItem(ACCESS_UNLOCKED_KEY);
    setUnlocked(false);
  };

  if (!unlocked) {
    return (
      <AccessCodeGate
        onUnlocked={handleUnlocked}
        isDark={isDark}
        onToggleDark={() => setIsDark((prev) => !prev)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#151012] text-[#26181C] dark:text-[#F5EFE8] flex flex-col">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Calm Editorial Top Navigation & Shopping Mode Bar */}
      <header className="sticky top-0 z-30 bg-[#FFFDFB]/95 dark:bg-[#1F171A]/95 backdrop-blur-sm border-b border-[#E4D7C5] dark:border-[#3A2C30] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* Brand Title */}
            <button
              type="button"
              onClick={() => {
                if (!shoppingMode) {
                  setActivePage('command-center');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer"
            >
              <BlushPinkTreeIcon className="w-8 h-8 shrink-0" />
              <div className="leading-tight">
                <span className="font-display text-lg font-semibold tracking-tight text-[#26181C] dark:text-[#F5EFE8] block whitespace-nowrap">
                  Holiday Gift Dashboard
                </span>
                <span className="font-script text-base text-[#9E1B24] dark:text-[#FB7185] block -mt-1 whitespace-nowrap">
                  Holiday Planner
                </span>
              </div>
            </button>

            {/* Desktop Sub-Page Navigation (Hidden when Shopping Mode is ON) */}
            {!shoppingMode ? (
              <nav
                aria-label="Primary navigation"
                className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] overflow-x-auto"
              >
                {PAGE_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigatePage(item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#FFFDFB] dark:bg-[#2B1D22] text-[#9E1B24] dark:text-[#FB7185] shadow-xs'
                          : 'text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-[#F5EFE8]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            ) : (
              <p className="hidden sm:block text-xs font-semibold uppercase tracking-[0.14em] text-[#9E1B24] dark:text-[#FB7185]">
                Shopping Mode Active · Store Stops &amp; Unpurchased Items
              </p>
            )}

            {/* Right Controls: Prominent Shopping Mode Switch + Dark Mode Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={shoppingMode}
                onClick={() => setShoppingMode((prev) => !prev)}
                className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  shoppingMode
                    ? 'bg-[#9E1B24] border-[#9E1B24] text-white'
                    : 'bg-[#FBF0F3] dark:bg-[#2B1D22] border-[#C9B59C] dark:border-[#523E43] text-[#26181C] dark:text-[#F5EFE8] hover:border-[#9E1B24]'
                }`}
              >
                <ShoppingBag
                  className={`w-3.5 h-3.5 shrink-0 ${
                    shoppingMode ? 'text-white' : 'text-[#9E1B24] dark:text-[#FB7185]'
                  }`}
                />
                <span>Shopping Mode</span>
                <span
                  className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider tabular-nums ${
                    shoppingMode
                      ? 'bg-white/20 text-white'
                      : 'bg-[#FFFDFB] dark:bg-[#151012] text-[#9E1B24] dark:text-[#FB7185] border border-[#E4D7C5] dark:border-[#3A2C30]'
                  }`}
                >
                  {shoppingMode ? 'ON' : `OFF · ${unpurchasedCount}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsDark((prev) => !prev)}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
                className="p-2 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-[#F5EFE8] transition-colors shrink-0 cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Sub-Page Strip (Hidden when Shopping Mode is ON) */}
          {!shoppingMode && (
            <nav
              aria-label="Mobile page navigation"
              className="flex md:hidden items-center gap-1.5 pb-2.5 overflow-x-auto"
            >
              {PAGE_NAV.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigatePage(item.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#9E1B24] text-white'
                        : 'bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] text-[#7D6959] dark:text-[#C4B0A2]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {shoppingMode ? (
          <ShoppingModeView
            uid={LOCAL_WORKSPACE_UID}
            settings={settings}
            gifts={gifts}
            onTurnOffShoppingMode={() => setShoppingMode(false)}
          />
        ) : activePage === 'command-center' ? (
          <CommandCenterView
            uid={LOCAL_WORKSPACE_UID}
            settings={settings}
            members={members}
            gifts={gifts}
            onSeedStarter={() => seedStarterHolidayData(LOCAL_WORKSPACE_UID)}
            onNavigatePage={handleNavigatePage}
          />
        ) : activePage === 'shopping-route' ? (
          <ShoppingRoutesView
            uid={LOCAL_WORKSPACE_UID}
            gifts={gifts}
            onBackToCommandCenter={() => handleNavigatePage('command-center')}
          />
        ) : activePage === 'naughty-nice' ? (
          <NaughtyNiceView
            uid={LOCAL_WORKSPACE_UID}
            members={members}
            gifts={gifts}
            onFindGiftForMember={(mId) => handleNavigatePage('gift-ideas', mId)}
            onBackToCommandCenter={() => handleNavigatePage('command-center')}
          />
        ) : (
          <SantasWorkshopView
            uid={LOCAL_WORKSPACE_UID}
            members={members}
            gifts={gifts}
            preselectedMemberId={workshopMemberId}
            onBackToCommandCenter={() => handleNavigatePage('command-center')}
          />
        )}
      </main>

      {!shoppingMode && (
        <footer className="border-t border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FFFDFB]/80 dark:bg-[#1F171A]/80 py-4 px-4 sm:px-6 lg:px-8 no-print">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-[#7D6959] dark:text-[#C4B0A2]">
            <span>Holiday Gift Dashboard · Saves privately in your browser</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPdfModalOpen(true)}
                className="inline-flex items-center gap-1.5 font-semibold text-[#9E1B24] dark:text-[#FB7185] hover:underline cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Customer Access PDF</span>
              </button>
              <button
                type="button"
                onClick={handleLock}
                className="inline-flex items-center gap-1 hover:text-[#26181C] dark:hover:text-[#F5EFE8] cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock</span>
              </button>
            </div>
          </div>
        </footer>
      )}

      <AccessPdfModal open={pdfModalOpen} onClose={() => setPdfModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HolidayDashboardApp />
    </ErrorBoundary>
  );
}
