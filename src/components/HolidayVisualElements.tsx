import React from 'react';
import { CalendarHeart, Gift, Scissors, Snowflake } from 'lucide-react';

export const BlushPinkTreeIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Star topper */}
    <path
      d="M32 4.5L34.3 9.2L39.5 9.9L35.7 13.5L36.6 18.7L32 16.2L27.4 18.7L28.3 13.5L24.5 9.9L29.7 9.2L32 4.5Z"
      fill="#DFB668"
      stroke="#A37A34"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Top blush frosted bough */}
    <path
      d="M32 15L43 28.5C39.2 29.5 35.6 29.8 32 29.8C28.4 29.8 24.8 29.5 21 28.5L32 15Z"
      fill="#FBE4EB"
      stroke="#C98A9E"
      strokeOpacity="0.6"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    {/* Middle blush frosted bough */}
    <path
      d="M32 24.5L47.5 40.5C42.3 41.8 37.1 42.3 32 42.3C26.9 42.3 21.7 41.8 16.5 40.5L32 24.5Z"
      fill="#F6CBD8"
      stroke="#C98A9E"
      strokeOpacity="0.6"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    {/* Bottom blush frosted bough */}
    <path
      d="M32 35L52 52.5C45.3 54 38.7 54.6 32 54.6C25.3 54.6 18.7 54 12 52.5L32 35Z"
      fill="#EEB0C4"
      stroke="#B36E84"
      strokeOpacity="0.6"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    {/* Warm ivory frosting garlands */}
    <path
      d="M25.5 26C28.8 28.2 34.5 28.2 38.5 25.8"
      stroke="#FAF6F0"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M21 37.2C26.5 40 37 40 43 37"
      stroke="#FAF6F0"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16.8 49.2C24.5 52.2 39 52.2 47.2 49"
      stroke="#FAF6F0"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Cranberry & pearl ornaments */}
    <circle cx="32" cy="23.5" r="2.2" fill="#9E1B24" />
    <circle cx="27" cy="34.5" r="2.2" fill="#FAF6F0" stroke="#C9B59C" strokeWidth="0.6" />
    <circle cx="37.5" cy="35" r="2.2" fill="#9E1B24" />
    <circle cx="22.5" cy="46.8" r="2.4" fill="#9E1B24" />
    <circle cx="32" cy="45.5" r="2.4" fill="#FAF6F0" stroke="#C9B59C" strokeWidth="0.6" />
    <circle cx="41.8" cy="46.5" r="2.4" fill="#C44D67" />
    {/* Champagne-taupe pot */}
    <rect x="28" y="54" width="8" height="5.5" rx="2" fill="#9E7E5F" />
  </svg>
);

export const GirlyGingerbreadCookieIcon: React.FC<{ className?: string }> = ({
  className = 'w-10 h-10',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Cookie base silhouette */}
    <circle cx="32" cy="19.5" r="11.5" fill="#C88D55" stroke="#8C592C" strokeWidth="1.5" />
    <path
      d="M15.5 31.5C12.5 31.5 10.5 33.8 11 36.6C11.4 39 13.7 40.3 16.3 40L21.5 39.2L19.2 53.5C18.8 56.2 20.8 58.5 23.4 58.5C25.5 58.5 27.3 57 27.7 54.8L29.5 46.5H34.5L36.3 54.8C36.7 57 38.5 58.5 40.6 58.5C43.2 58.5 45.2 56.2 44.8 53.5L42.5 39.2L47.7 40C50.3 40.3 52.6 39 53 36.6C53.5 33.8 51.5 31.5 48.5 31.5H15.5Z"
      fill="#C88D55"
      stroke="#8C592C"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Blush pink icing hair bow */}
    <path
      d="M36 9.5C39.2 6.8 43.2 7.4 43.8 10.2C44.4 13 40.8 14.8 36.8 12.6L36 9.5Z"
      fill="#EEB0C4"
      stroke="#9E1B24"
      strokeOpacity="0.6"
      strokeWidth="1.1"
    />
    <path
      d="M34.2 10C30.4 7.8 27 9.6 27.8 12.4C28.6 15.2 32.5 14.8 34.8 12.3L34.2 10Z"
      fill="#EEB0C4"
      stroke="#9E1B24"
      strokeOpacity="0.6"
      strokeWidth="1.1"
    />
    <circle cx="35.3" cy="11.2" r="2.2" fill="#9E1B24" />
    {/* Eyes, rosy cheeks, sweet smile */}
    <circle cx="27.8" cy="18.8" r="1.7" fill="#FAF6F0" />
    <circle cx="36.2" cy="18.8" r="1.7" fill="#FAF6F0" />
    <circle cx="25.2" cy="22" r="2.1" fill="#F6CBD8" fillOpacity="0.92" />
    <circle cx="38.8" cy="22" r="2.1" fill="#F6CBD8" fillOpacity="0.92" />
    <path
      d="M28.2 23.6C29.7 25.7 34.3 25.7 35.8 23.6"
      stroke="#FAF6F0"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Ivory royal icing cuffs */}
    <path d="M14.5 33.8C15.5 36.2 16 37.8 15 39.2" stroke="#FAF6F0" strokeWidth="2" strokeLinecap="round" />
    <path d="M49.5 33.8C48.5 36.2 48 37.8 49 39.2" stroke="#FAF6F0" strokeWidth="2" strokeLinecap="round" />
    {/* Scalloped blush icing skirt */}
    <path
      d="M21 44.5C23.5 46.5 26 46.5 28.5 44.5C31 46.5 33 46.5 35.5 44.5C38 46.5 40.5 46.5 43 44.5"
      stroke="#FBE4EB"
      strokeWidth="2.3"
      strokeLinecap="round"
    />
    {/* Blush & cranberry icing buttons */}
    <circle cx="32" cy="34.5" r="2.1" fill="#F6CBD8" stroke="#FAF6F0" strokeWidth="0.9" />
    <circle cx="32" cy="40.5" r="2.1" fill="#9E1B24" stroke="#FAF6F0" strokeWidth="0.9" />
  </svg>
);

interface HolidayCountdownRibbonProps {
  totalGifts: number;
  wrappedCount: number;
  budgetPctUsed: number;
  stockedSupplies: number;
  totalSupplies: number;
}

function CircularGauge({
  percent,
  strokeColor,
  label,
  sublabel,
}: {
  percent: number;
  strokeColor: string;
  label: string;
  sublabel: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-[#E4D7C5] dark:text-[#3A2C30]"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute text-[11px] font-semibold tabular-nums text-[#26181C] dark:text-[#F5EFE8]">
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#26181C] dark:text-[#F5EFE8] truncate">{label}</p>
        <p className="text-[11px] text-[#7D6959] dark:text-[#C4B0A2] truncate tabular-nums">
          {sublabel}
        </p>
      </div>
    </div>
  );
}

export const HolidayCountdownRibbon: React.FC<HolidayCountdownRibbonProps> = ({
  totalGifts,
  wrappedCount,
  budgetPctUsed,
  stockedSupplies,
  totalSupplies,
}) => {
  const now = new Date();
  const year = now.getMonth() === 11 && now.getDate() > 25 ? now.getFullYear() + 1 : now.getFullYear();
  const christmas = new Date(year, 11, 25);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysLeft = Math.max(
    0,
    Math.round((christmas.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24))
  );

  const wrappedPct = totalGifts > 0 ? Math.round((wrappedCount / totalGifts) * 100) : 0;
  const suppliesPct = totalSupplies > 0 ? Math.round((stockedSupplies / totalSupplies) * 100) : 0;

  return (
    <section className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-5 sm:px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative overflow-hidden">
      <div className="flex items-center gap-4 z-10 min-w-0">
        <div className="w-14 h-14 rounded-2xl bg-[#9E1B24] text-white flex flex-col items-center justify-center shrink-0">
          <span className="font-display text-xl font-bold leading-none tabular-nums">
            {daysLeft}
          </span>
          <span className="text-[9px] font-medium tracking-widest uppercase">Days</span>
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
            <Snowflake className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185] shrink-0" />
            <span>Christmas Morning Countdown</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#26181C] dark:text-[#F5EFE8] leading-tight">
            {daysLeft === 0
              ? 'Merry Christmas! Everything is under the tree.'
              : `${daysLeft} day${daysLeft === 1 ? '' : 's'} until Christmas morning`}
          </h1>
          <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] max-w-xl">
            Enjoy Christmas. Not the January money stress.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 shrink-0 pl-2">
          <BlushPinkTreeIcon className="w-11 h-11" />
          <GirlyGingerbreadCookieIcon className="w-11 h-11" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 z-10 shrink-0">
        <CircularGauge
          percent={budgetPctUsed}
          strokeColor={budgetPctUsed >= 100 ? '#9E1B24' : budgetPctUsed >= 85 ? '#B45309' : '#9E1B24'}
          label="Budget Used"
          sublabel={`${budgetPctUsed}% of goal`}
        />
        <CircularGauge
          percent={wrappedPct}
          strokeColor="#1D6B3C"
          label="Gifts Wrapped"
          sublabel={`${wrappedCount} of ${totalGifts} gifts`}
        />
        <CircularGauge
          percent={suppliesPct}
          strokeColor="#C98A9E"
          label="Wrap Supplies"
          sublabel={`${stockedSupplies} of ${totalSupplies} stocked`}
        />
      </div>
    </section>
  );
};

export const FestiveSectionIconBadge: React.FC<{
  kind: 'gift' | 'calendar' | 'scissors';
}> = ({ kind }) => {
  const Icon = kind === 'gift' ? Gift : kind === 'calendar' ? CalendarHeart : Scissors;
  return (
    <span className="w-8 h-8 rounded-xl bg-[#FBF0F3] dark:bg-[#2B1D22] border border-[#E4D7C5] dark:border-[#3A2C30] text-[#9E1B24] dark:text-[#FB7185] inline-flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4" />
    </span>
  );
};
