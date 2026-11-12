// Makes public/og-image.png, the 1200×630 picture shown when a pulsarworkouts.app link is
// pasted into Messages, WhatsApp, Slack and the like. It puts a real share card (the dev mode
// gallery's sample streak, drawn by the app's own renderer) on the homepage's nebula.
// Usage: npm run build && npx vite preview --port 4173 & node scripts/generate-og-image.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.env.SHOTS_BASE || 'http://localhost:4173';
const OUT = 'public/og-image.png';

const browser = await chromium.launch();
try {
  const app = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await app.addInitScript(() => localStorage.setItem('pulsar:shareSize', 'story'));
  await app.goto(`${BASE}/app/settings?dev=1`);
  await app.getByRole('button', { name: 'Preview share cards' }).click();
  await app.getByRole('button', { name: 'Streak', exact: true }).click();
  const preview = app.getByTestId('share-preview');
  await preview.waitFor();
  await app.waitForTimeout(500);
  const card = await preview.evaluate(async (img) => {
    const blob = await fetch(img.src).then((r) => r.blob());
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  });
  const nebula = `data:image/jpeg;base64,${readFileSync('home/nebula.jpg').toString('base64')}`;

  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(`<!doctype html><html><head><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: 1200px; height: 630px; overflow: hidden; background: #07040f url(${nebula}) center / cover;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #f4efff;
      display: flex; align-items: center; padding: 0 80px; gap: 64px; }
    .text { flex: 1; }
    .brand { font-size: 30px; font-weight: 800; letter-spacing: 0.32em; margin-bottom: 28px; opacity: 0.92; }
    h1 { font-size: 66px; line-height: 1.05; font-weight: 900; letter-spacing: -0.02em; }
    h1 span { background: linear-gradient(100deg, #a78bfa 0%, #d946ef 45%, #ef4444 100%); -webkit-background-clip: text; color: transparent; }
    p { font-size: 28px; color: #b9add6; margin-top: 22px; line-height: 1.35; }
    img { height: 560px; border-radius: 28px; box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.08); transform: rotate(4deg); }
  </style></head><body>
    <div class="text">
      <div class="brand">PULSAR</div>
      <h1>Routines built<br/>around <span>you.</span></h1>
      <p>Plan it, train it, keep the streak,<br/>and share the win.</p>
    </div>
    <img src="${card}" alt="" />
  </body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT });
  console.log('saved', OUT);
} finally {
  await browser.close();
}
