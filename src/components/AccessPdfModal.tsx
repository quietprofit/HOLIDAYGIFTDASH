import React, { useState } from 'react';
import { FileDown, Globe, KeyRound, X } from 'lucide-react';
import { downloadCustomerAccessPdf } from '../lib/accessPdfGenerator';

interface AccessPdfModalProps {
  open: boolean;
  onClose: () => void;
}

export const AccessPdfModal: React.FC<AccessPdfModalProps> = ({ open, onClose }) => {
  const [liveUrl, setLiveUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  const [accessCode, setAccessCode] = useState('HOLIDAY2026');

  if (!open) return null;

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault();
    downloadCustomerAccessPdf(liveUrl, accessCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
              Shopify Digital Downloads Kit
            </p>
            <h2 className="font-display text-xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
              Generate Customer Access PDF
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#7D6959] hover:bg-[#FAF6F0] dark:hover:bg-[#2B1D22] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] leading-relaxed">
          Download a ready-to-upload 1-page PDF containing your live dashboard link, customer access code, and phone Home Screen setup steps for Shopify&apos;s Digital Downloads app.
        </p>

        <form onSubmit={handleDownload} className="space-y-4">
          <div>
            <label
              htmlFor="seller-live-url"
              className="block text-xs font-medium text-[#26181C] dark:text-[#F5EFE8] mb-1"
            >
              Your Deployed Live Dashboard URL
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-[#9E1B24] dark:text-[#FB7185] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="seller-live-url"
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://your-deployed-dashboard.run.app"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="seller-access-code"
              className="block text-xs font-medium text-[#26181C] dark:text-[#F5EFE8] mb-1"
            >
              Customer Access Code
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#9E1B24] dark:text-[#FB7185] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="seller-access-code"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-sm font-semibold tracking-wider uppercase"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#7D6959] dark:text-[#C4B0A2]">
              Default server code is <span className="font-mono font-semibold">HOLIDAY2026</span>. If you customize this, set <span className="font-mono">CUSTOMER_ACCESS_CODE</span> to the same value on your host.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E4D7C5] dark:border-[#3A2C30] text-sm font-medium cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-sm font-semibold cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Access PDF</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
