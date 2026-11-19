import React, { useState } from 'react';
import { AlertCircle, ArrowRight, KeyRound, Moon, Sun } from 'lucide-react';
import { BlushPinkTreeIcon, GirlyGingerbreadCookieIcon } from './HolidayVisualElements';

interface AccessCodeGateProps {
  onUnlocked: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export const AccessCodeGate: React.FC<AccessCodeGateProps> = ({
  onUnlocked,
  isDark,
  onToggleDark,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the access code from your Welcome PDF.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.unlocked) {
        setError(data?.error || 'That access code did not match. Please try again.');
        return;
      }
      onUnlocked();
    } catch {
      setError('Could not verify your access code right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#151012] text-[#26181C] dark:text-[#F5EFE8] flex flex-col items-center justify-center p-4 sm:p-6 relative">
      <button
        type="button"
        onClick={onToggleDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-5 right-5 p-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FFFDFB] dark:bg-[#1F171A] text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-[#F5EFE8] transition-colors cursor-pointer"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-md rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-2 shadow-sm">
        <div className="rounded-xl border border-[#E4D7C5] dark:border-[#523E43]/70 bg-gradient-to-br from-[#FFFDFB] via-[#FAF6F0] to-[#FBF0F3] dark:from-[#1F171A] dark:via-[#1C1417] dark:to-[#28191E] p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <BlushPinkTreeIcon className="w-11 h-11" />
              <GirlyGingerbreadCookieIcon className="w-10 h-10" />
            </div>
            <p className="font-script text-2xl text-[#9E1B24] dark:text-[#FB7185] leading-none pt-1">
              Holiday Planner
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#26181C] dark:text-[#F5EFE8]">
              Holiday Gift Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#7D6959] dark:text-[#C4B0A2]">
              Enjoy Christmas. Not the January money stress.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-[#E4D7C5] dark:border-[#3A2C30]">
            <div className="space-y-1.5">
              <label
                htmlFor="customer-access-code"
                className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]"
              >
                Customer Access Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#9E1B24] dark:text-[#FB7185] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="customer-access-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter code from your Welcome PDF"
                  autoComplete="off"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#C9B59C] dark:border-[#523E43] bg-[#FFFDFB] dark:bg-[#151012] text-sm font-semibold tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-[#9E1B24]"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] dark:bg-[#33131A] border border-[#FECACA] dark:border-[#7F1D1D] text-xs text-[#991B1B] dark:text-[#FCA5A5] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>{loading ? 'Unlocking...' : 'Unlock Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-center text-[#7D6959] dark:text-[#C4B0A2] leading-relaxed">
            Your gift lists, budgets, and shopping routes save privately in your own browser—no account or email required.
          </p>
        </div>
      </div>
    </div>
  );
};
