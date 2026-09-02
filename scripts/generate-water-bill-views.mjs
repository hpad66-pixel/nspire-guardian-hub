#!/usr/bin/env node
/**
 * Writes public/water-bills/*.html + archive JSON from the canonical
 * Glorieta WASD June 2026 statements.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const statements = [
  { accountNumber: '2745714336', meterNumber: '61302354', serviceAddress: '13010 Alexandria Dr', buildingLabel: 'Building 8 / 13200 Alexandria', periodStart: '2026-06-01', periodEnd: '2026-06-29', billingDate: '2026-07-13', dueDate: '2026-08-03', previousBalance: 113874.41, currentCharges: 8793.24, amountDue: 122667.65, waterCharges: 3426.54, sewerCharges: 4868.97, otherFees: 497.73, gallons: 423000, priorReading: 5994, currentReading: 6417, daysOfService: 28, estimated: false, status: 'disputed', notes: 'OCR Jun 2026 WASD statement. Unpaid $113,874.41 matches the 23 Jul 2026 formal dispute.', documentPath: '/water-bills/2745714336-2026-06.html' },
  { accountNumber: '1674911185', meterNumber: '16020263', serviceAddress: '13235 Alexandria Dr', buildingLabel: '13235 Alexandria', periodStart: '2026-06-01', periodEnd: '2026-06-29', billingDate: '2026-07-13', dueDate: '2026-08-03', previousBalance: 228.51, currentCharges: 248.99, amountDue: 248.99, waterCharges: 107.22, sewerCharges: 127.68, otherFees: 14.09, gallons: 6000, priorReading: 561, currentReading: 567, daysOfService: 28, estimated: false, status: 'open', notes: 'OCR Jun 2026 WASD statement.', documentPath: '/water-bills/1674911185-2026-06.html' },
  { accountNumber: '8082997418', meterNumber: '16020268', serviceAddress: '13210 Alexandria Dr', buildingLabel: '13210 Alexandria', periodStart: '2026-06-01', periodEnd: '2026-06-29', billingDate: '2026-07-13', dueDate: '2026-08-03', previousBalance: 351.44, currentCharges: 289.98, amountDue: 289.98, waterCharges: 123.14, sewerCharges: 150.42, otherFees: 16.42, gallons: 8000, priorReading: 402, currentReading: 410, daysOfService: 28, estimated: false, status: 'open', notes: 'OCR Jun 2026 WASD statement.', documentPath: '/water-bills/8082997418-2026-06.html' },
  { accountNumber: '2218802663', meterNumber: '19188783', serviceAddress: '13210 Alexandria Dr', buildingLabel: '13210 Alexandria (idle meter)', periodStart: '2026-03-23', periodEnd: '2026-06-22', billingDate: '2026-07-06', dueDate: '2026-07-27', previousBalance: 271.26, currentCharges: 221.26, amountDue: 221.26, waterCharges: 208.74, sewerCharges: 0, otherFees: 12.52, gallons: 0, priorReading: 420, currentReading: 420, daysOfService: 91, estimated: false, status: 'open', notes: 'OCR 23 Mar–22 Jun 2026. Zero consumption, base fees only.', documentPath: '/water-bills/2218802663-2026-03.html' },
  { accountNumber: '4621903166', meterNumber: '17096378', serviceAddress: '13180 Port Said Rd', buildingLabel: 'Port Said East', periodStart: '2026-06-01', periodEnd: '2026-06-29', billingDate: '2026-07-13', dueDate: '2026-08-03', previousBalance: 50.48, currentCharges: 132.43, amountDue: 132.43, waterCharges: 52.24, sewerCharges: 72.7, otherFees: 7.49, gallons: 6000, priorReading: 77, currentReading: 83, daysOfService: 28, estimated: false, status: 'open', notes: 'OCR Jun 2026 WASD statement.', documentPath: '/water-bills/4621903166-2026-06.html' },
  { accountNumber: '1787762492', meterNumber: '16081147', serviceAddress: '13120 NW 32nd Ct', buildingLabel: 'The Gardens', periodStart: '2026-06-01', periodEnd: '2026-06-29', billingDate: '2026-07-13', dueDate: '2026-08-03', previousBalance: 371.94, currentCharges: 412.92, amountDue: 1297.16, waterCharges: 170.9, sewerCharges: 218.64, otherFees: 23.38, gallons: 14000, priorReading: 7848, currentReading: 7862, daysOfService: 28, estimated: false, status: 'open', notes: 'OCR Jun 2026 WASD statement. Payment plan $884.24.', documentPath: '/water-bills/1787762492-2026-06.html' },
  { accountNumber: '7963207450', meterNumber: '16020115', serviceAddress: '13120 Port Said Rd', buildingLabel: 'Port Said West', periodStart: '2026-06-01', periodEnd: '2026-06-29', billingDate: '2026-07-13', dueDate: '2026-08-03', previousBalance: 351.44, currentCharges: 208.02, amountDue: 737.45, waterCharges: 91.3, sewerCharges: 104.94, otherFees: 11.78, gallons: 4000, priorReading: 7577, currentReading: 7581, daysOfService: 28, estimated: false, status: 'open', notes: 'OCR Jun 2026 WASD statement. Payment plan $529.43.', documentPath: '/water-bills/7963207450-2026-06.html' },
  { accountNumber: '1692380502', meterNumber: '61302335', serviceAddress: '13250 Alexandria Dr', buildingLabel: 'Building 7 / North', periodStart: '2026-06-01', periodEnd: '2026-06-29', billingDate: '2026-07-15', dueDate: '2026-08-05', previousBalance: 5142.1, currentCharges: 7912.18, amountDue: 19999.49, waterCharges: 3084.26, sewerCharges: 4380.06, otherFees: 447.86, gallons: 380000, priorReading: 8747, currentReading: 9127, daysOfService: 28, estimated: false, status: 'past_due', notes: 'OCR Jun 2026 WASD statement. Unpaid previous $5,142.10.', documentPath: '/water-bills/1692380502-2026-06.html' },
  { accountNumber: '0285466092', meterNumber: '61019149', serviceAddress: '13410 Aswan Rd', buildingLabel: 'Aswan South', periodStart: '2026-05-05', periodEnd: '2026-06-01', billingDate: '2026-07-15', dueDate: '2026-08-05', previousBalance: -3650.29, currentCharges: 3015.12, amountDue: 1972.8, waterCharges: 1181.82, sewerCharges: 1662.63, otherFees: 170.67, gallons: 141000, priorReading: 27293, currentReading: 27434, daysOfService: 27, estimated: false, status: 'open', notes: 'OCR 5 May–1 Jun 2026 WASD statement.', documentPath: '/water-bills/0285466092-2026-05.html' },
  { accountNumber: '9952938168', meterNumber: '1800224837', serviceAddress: '13440 Aswan Rd', buildingLabel: 'Aswan North', periodStart: '2026-06-01', periodEnd: '2026-06-29', billingDate: '2026-07-13', dueDate: '2026-08-03', previousBalance: 2933.16, currentCharges: 3117.56, amountDue: 6965.36, waterCharges: 1221.62, sewerCharges: 1719.48, otherFees: 176.46, gallons: 146000, priorReading: 13070, currentReading: 13216, daysOfService: 28, estimated: false, status: 'open', notes: 'OCR Jun 2026 WASD statement. Payment plan $3,847.80.', documentPath: '/water-bills/9952938168-2026-06.html' },
];

const usd = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const gal = (n) => `${Math.round(n).toLocaleString('en-US')} gal`;

function html(s) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WASD ${s.accountNumber} · ${s.periodStart}</title>
  <style>
    body { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; background: #F7F4EC; color: #08271f; margin: 0; padding: 24px; }
    main { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #dedbd1; border-radius: 20px; padding: 28px; }
    h1 { font-family: "Playfair Display", Georgia, serif; font-weight: 700; margin: 0 0 4px; }
    .meta { color: #8a8478; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
    th { text-align: left; color: #8a8478; font-size: 11px; text-transform: uppercase; padding: 8px 0; border-bottom: 1px solid #efe9da; }
    td { padding: 8px 0; border-bottom: 1px solid #f3eee3; }
    td:last-child, th:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .due { font-size: 28px; font-weight: 700; margin-top: 16px; }
    .notes { margin-top: 16px; font-size: 13px; color: #5c6863; }
    a { color: #1D6FE8; }
  </style>
</head>
<body>
  <main>
    <div class="meta">Miami-Dade WASD · Glorieta Gardens backup</div>
    <h1>${s.buildingLabel}</h1>
    <p>${s.serviceAddress}<br/>Account ${s.accountNumber} · Meter ${s.meterNumber}</p>
    <p class="due">${usd(s.amountDue)} due</p>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Service period</td><td>${s.periodStart} – ${s.periodEnd}</td></tr>
      <tr><td>Billing date</td><td>${s.billingDate}</td></tr>
      <tr><td>Due date</td><td>${s.dueDate}</td></tr>
      <tr><td>Previous balance</td><td>${usd(s.previousBalance)}</td></tr>
      <tr><td>Current charges</td><td>${usd(s.currentCharges)}</td></tr>
      <tr><td>Water</td><td>${usd(s.waterCharges)}</td></tr>
      <tr><td>Sewer</td><td>${usd(s.sewerCharges)}</td></tr>
      <tr><td>Other fees</td><td>${usd(s.otherFees)}</td></tr>
      <tr><td>Consumption</td><td>${gal(s.gallons)}</td></tr>
      <tr><td>Readings</td><td>${s.priorReading} → ${s.currentReading} (${s.daysOfService} days)</td></tr>
      <tr><td>Status</td><td>${s.status}${s.estimated ? ' · estimated' : ''}</td></tr>
    </table>
    <p class="notes">${s.notes}</p>
    <p class="notes"><a href="/water-bills/">All Glorieta WASD backups</a> · <a href="/water-bills/archive.json">JSON archive</a></p>
  </main>
</body>
</html>
`;
}

const outDir = path.join(root, 'public', 'water-bills');
fs.mkdirSync(outDir, { recursive: true });

for (const s of statements) {
  const file = path.basename(s.documentPath);
  fs.writeFileSync(path.join(outDir, file), html(s));
}

const archive = {
  property: 'Glorieta Gardens',
  provider: 'Miami-Dade WASD',
  cycle: 'June/July 2026',
  note: 'OCR reconstruction. Original PDF binaries were not committed to git.',
  statements,
};
fs.writeFileSync(path.join(outDir, 'archive.json'), JSON.stringify(archive, null, 2));
fs.writeFileSync(
  path.join(root, 'docs', 'water-intel', 'glorieta-wasd-june-2026.json'),
  JSON.stringify(archive, null, 2),
);

const index = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Glorieta WASD bill archive</title>
  <style>
    body { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; background: #F7F4EC; color: #08271f; margin: 0; padding: 24px; }
    main { max-width: 880px; margin: 0 auto; }
    a { color: #1D6FE8; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 16px; overflow: hidden; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #efe9da; text-align: left; font-size: 14px; }
    th { font-size: 11px; text-transform: uppercase; color: #8a8478; }
    td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <main>
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8a8478;font-weight:700">Backup</div>
    <h1>Glorieta Gardens · June/July 2026 WASD</h1>
    <p>Ten OCR'd statements. <a href="archive.json">Download JSON</a>.</p>
    <table>
      <tr><th>Building</th><th>Account</th><th>Period</th><th>Amount due</th></tr>
      ${statements.map((s) => `<tr><td><a href="${path.basename(s.documentPath)}">${s.buildingLabel}</a></td><td>${s.accountNumber}</td><td>${s.periodStart}</td><td>${usd(s.amountDue)}</td></tr>`).join('\n      ')}
    </table>
  </main>
</body>
</html>
`;
fs.writeFileSync(path.join(outDir, 'index.html'), index);
console.log(`Wrote ${statements.length} statement views to ${outDir}`);
