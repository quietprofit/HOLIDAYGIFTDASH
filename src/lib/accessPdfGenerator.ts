import { jsPDF } from 'jspdf';

export function buildCustomerAccessPdf(appUrl: string, accessCode: string): jsPDF {
  const cleanUrl = (appUrl || 'https://your-holiday-dashboard-url.com').trim();
  const cleanCode = (accessCode || 'HOLIDAY2026').trim().toUpperCase();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 612pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 792pt

  // Warm ivory outer canvas (#FAF6F0)
  doc.setFillColor(250, 246, 240);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Elevated cream card (#FFFDFB) with champagne taupe border (#C9B59C)
  doc.setFillColor(255, 253, 251);
  doc.setDrawColor(201, 181, 156);
  doc.setLineWidth(1.5);
  doc.roundedRect(36, 36, pageWidth - 72, pageHeight - 72, 16, 16, 'FD');

  // Inner delicate hairline frame (#E4D7C5)
  doc.setDrawColor(228, 215, 197);
  doc.setLineWidth(0.75);
  doc.roundedRect(46, 46, pageWidth - 92, pageHeight - 92, 12, 12, 'S');

  // Blush pink top ribbon band (#FBF0F3)
  doc.setFillColor(251, 240, 243);
  doc.roundedRect(58, 58, pageWidth - 116, 118, 10, 10, 'F');

  // Editorial label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(158, 27, 36); // Cranberry #9E1B24
  doc.text('CUSTOMER WELCOME PASS  ·  INSTANT ACCESS', pageWidth / 2, 86, { align: 'center' });

  // Main Title
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(38, 24, 28); // Deep burgundy charcoal #26181C
  doc.text('Holiday Gift Dashboard', pageWidth / 2, 120, { align: 'center' });

  // Tagline
  doc.setFont('times', 'italic');
  doc.setFontSize(12.5);
  doc.setTextColor(125, 105, 89); // Muted taupe #7D6959
  doc.text('Enjoy Christmas. Not the January money stress.', pageWidth / 2, 143, {
    align: 'center',
  });

  // Step 1: Open Your Dashboard
  let y = 212;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(158, 27, 36);
  doc.text('STEP 1  ·  OPEN YOUR DASHBOARD LINK', 64, y);

  y += 14;
  doc.setFillColor(250, 246, 240);
  doc.setDrawColor(228, 215, 197);
  doc.setLineWidth(1);
  doc.roundedRect(64, y, pageWidth - 128, 54, 8, 8, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(125, 105, 89);
  doc.text('Click or tap the link below to launch on your phone, tablet, or computer:', 80, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(158, 27, 36);
  const displayUrl = cleanUrl.length > 64 ? `${cleanUrl.slice(0, 61)}...` : cleanUrl;
  doc.textWithLink(displayUrl, 80, y + 39, { url: cleanUrl });

  // Step 2: Enter Access Code Box
  y += 82;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(158, 27, 36);
  doc.text('STEP 2  ·  ENTER YOUR PRIVATE ACCESS CODE', 64, y);

  y += 14;
  doc.setFillColor(251, 240, 243);
  doc.setDrawColor(201, 181, 156);
  doc.setLineWidth(1.2);
  doc.roundedRect(64, y, pageWidth - 128, 86, 10, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(125, 105, 89);
  doc.text('YOUR ACCESS CODE', pageWidth / 2, y + 24, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(158, 27, 36);
  doc.text(cleanCode, pageWidth / 2, y + 54, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(38, 24, 28);
  doc.text(
    'Your device remembers this code automatically so you stay unlocked in stores.',
    pageWidth / 2,
    y + 73,
    { align: 'center' }
  );

  // Step 3: Save Like an App
  y += 116;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(158, 27, 36);
  doc.text('STEP 3  ·  SAVE TO YOUR HOME SCREEN (OPTIONAL)', 64, y);

  y += 18;
  const saveTips = [
    'iPhone / iPad (Safari): Tap the Share icon at the bottom, then choose "Add to Home Screen".',
    'Android (Chrome): Tap the 3-dot menu in the top right, then choose "Add to Home screen".',
    'Laptop / Desktop: Bookmark the page in your browser for instant one-click access.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(38, 24, 28);
  for (const tip of saveTips) {
    const wrapped = doc.splitTextToSize(`•  ${tip}`, pageWidth - 136);
    doc.text(wrapped, 68, y);
    y += wrapped.length * 14 + 4;
  }

  // Step 4: Quick Start Features
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(158, 27, 36);
  doc.text('WHAT IS INCLUDED IN YOUR DASHBOARD', 64, y);

  y += 18;
  const features = [
    'Command Center & Budget Pie Chart — Set your overall budget, track spending, and update gift statuses (Planned -> Purchased -> Wrapped -> Under Tree).',
    'Shopping Mode Toggle — Flip Shopping Mode ON in stores to see only your remaining stops, unpurchased items, and live running total.',
    'Shopping Route Map — Plot local stores in driving order or toggle any item to Buy Online.',
    'Naughty & Nice List — Track sizes, interests, individual budgets, and Nice / Checking Twice / Naughty statuses.',
    'Gift Idea Generator — Get AI-tailored gift suggestions and compare store prices & local availability.',
    'Export CSV & Customer ZIP — Save printable checklists and spreadsheet backups anytime.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(38, 24, 28);
  for (const feat of features) {
    const wrapped = doc.splitTextToSize(`•  ${feat}`, pageWidth - 136);
    doc.text(wrapped, 68, y);
    y += wrapped.length * 13.5 + 5;
  }

  // Footer note
  doc.setDrawColor(228, 215, 197);
  doc.line(64, pageHeight - 78, pageWidth - 64, pageHeight - 78);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(125, 105, 89);
  doc.text(
    'Your lists save privately in your own browser. Tap "Sample Starter" inside the dashboard to explore examples first.',
    pageWidth / 2,
    pageHeight - 58,
    { align: 'center' }
  );

  return doc;
}

export function downloadCustomerAccessPdf(appUrl: string, accessCode: string): void {
  const doc = buildCustomerAccessPdf(appUrl, accessCode);
  doc.save('Holiday-Gift-Dashboard-Access.pdf');
}
