// Draws a share card on a canvas. Hand-drawn rather than a screenshot of React components:
// DOM-to-image libraries are unreliable on iOS Safari, and this gives the same pixels on every
// phone. Each card's content is laid out once in a 1080×1300 box, which the Story size shows
// at full size and the Square size scales down between the same header and footer.
import type { DayLabel } from '../../utils/dayDetail';
import {
  formatCardDuration, SHARE_SIZES, type MonthCard, type ShareCard, type ShareSize, type StreakCard,
  type TotalCard, type WeekCard, type WorkoutCard,
} from './cards';

type Ctx = CanvasRenderingContext2D;

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif';
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const CYAN = '#00eaff';
const VIOLET = '#7f5fff';
const PINK = '#ff46a1';
const GOLD = '#ffcc4d';
const BG = '#0b0d1a';
const BOX_W = 1080;
const BOX_H = 1300;
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const font = (weight: number, px: number) => `${weight} ${px}px ${FONT}`;

export function drawShareCard(ctx: Ctx, card: ShareCard, size: ShareSize): void {
  const { width: W, height: H } = SHARE_SIZES[size];
  const story = size === 'story';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  drawBackground(ctx, W, H);
  drawWordmark(ctx, W / 2, story ? 200 : 100);

  ctx.font = font(600, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.fillText('pulsarworkouts.app', W / 2, H - (story ? 140 : 56));

  const top = story ? 360 : 140;
  const boxHeight = story ? BOX_H : H - 140 - 100;
  const scale = boxHeight / BOX_H;
  ctx.save();
  ctx.translate(W / 2 - (BOX_W / 2) * scale, top);
  ctx.scale(scale, scale);
  switch (card.kind) {
    case 'workout': drawWorkout(ctx, card); break;
    case 'streak': drawStreak(ctx, card); break;
    case 'week': drawWeek(ctx, card); break;
    case 'month': drawMonth(ctx, card); break;
    case 'total': drawTotal(ctx, card); break;
  }
  ctx.restore();
}

/** Render a card to a PNG. */
export function renderShareImage(card: ShareCard, size: ShareSize): Promise<Blob> {
  const { width, height } = SHARE_SIZES[size];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas is not available'));
  drawShareCard(ctx, card, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not make the image'))), 'image/png'));
}

// ---- Cards (in the 1080×1300 content box) ----

function drawWorkout(ctx: Ctx, card: WorkoutCard) {
  spacedText(ctx, 'WORKOUT COMPLETE', BOX_W / 2, 170, font(700, 40), 8, 'rgba(255,255,255,0.66)');
  ctx.font = fitFont(ctx, card.title, 900, 124, 960);
  gradientText(ctx, card.title, BOX_W / 2, 320);

  let y = 400;
  if (card.dayKind) {
    pill(ctx, card.dayKind, BOX_W / 2, y, font(700, 44), 'rgba(255,255,255,0.12)', '#fff');
  }
  y = 540;
  tile(ctx, 80, y, 440, 240, formatCardDuration(card.durationMs), 'workout time');
  tile(ctx, 560, y, 440, 240, String(card.exercisesDone), card.exercisesDone === 1 ? 'exercise' : 'exercises');

  y = 900;
  if (card.perfect) {
    pill(ctx, '🏆  Perfect workout', BOX_W / 2, y, font(800, 46), 'rgba(255,204,77,0.14)', GOLD, GOLD);
  }
  if (card.streak > 0) {
    const label = card.streak === 1 ? 'Streak started' : `${card.streak} day streak`;
    emojiAndText(ctx, '🔥', label, BOX_W / 2, 1120, 80, font(800, 66));
  }
}

function drawStreak(ctx: Ctx, card: StreakCard) {
  ctx.font = `230px ${EMOJI_FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('🔥', BOX_W / 2, 270);

  const n = String(card.streak);
  ctx.font = fitFont(ctx, n, 900, 400, 900);
  ctx.fillStyle = '#fff';
  glow(ctx, VIOLET, 60, () => ctx.fillText(n, BOX_W / 2, 650));
  ctx.font = font(800, 84);
  ctx.fillText(card.streak === 1 ? 'day streak' : 'day streak', BOX_W / 2, 770);

  const badge = card.milestone ? `${card.streak} DAY MILESTONE` : card.isBest ? 'BEST STREAK EVER' : null;
  if (badge) pill(ctx, badge, BOX_W / 2, 830, font(800, 40), 'rgba(255,204,77,0.12)', GOLD, GOLD);
  else if (card.best > card.streak) {
    ctx.font = font(600, 46);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`Best ${card.best}`, BOX_W / 2, 880);
  }

  weekStrip(ctx, card.week, 1000);
  ctx.font = font(600, 46);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText(`${card.totalDone} ${card.totalDone === 1 ? 'workout' : 'workouts'} · ${formatCardDuration(card.totalTimeMs)} total`, BOX_W / 2, 1250);
}

function drawWeek(ctx: Ctx, card: WeekCard) {
  const cx = BOX_W / 2;
  const cy = 380;
  const r = 280;
  ctx.lineWidth = 48;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const frac = card.planned > 0 ? Math.min(card.done / card.planned, 1) : 1;
  if (frac > 0) {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, CYAN);
    g.addColorStop(0.5, VIOLET);
    g.addColorStop(1, PINK);
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  const value = card.planned > 0 ? `${card.done}/${card.planned}` : String(card.done);
  ctx.font = fitFont(ctx, value, 900, 210, 420);
  ctx.fillStyle = '#fff';
  ctx.fillText(value, cx, cy + 50);
  spacedText(ctx, 'THIS WEEK', cx, cy + 130, font(700, 40), 8, 'rgba(255,255,255,0.75)');

  weekStrip(ctx, card.week, 820);
  ctx.font = font(700, 56);
  ctx.fillStyle = '#fff';
  ctx.fillText(`${card.done} ${card.done === 1 ? 'workout' : 'workouts'} · ${formatCardDuration(card.timeMs)}`, cx, 1120);
}

function drawMonth(ctx: Ctx, card: MonthCard) {
  const cx = BOX_W / 2;
  spacedText(ctx, card.monthName.toUpperCase(), cx, 110, font(700, 44), 10, 'rgba(255,255,255,0.7)');
  const n = String(card.done);
  ctx.font = fitFont(ctx, n, 900, 280, 700);
  gradientText(ctx, n, cx, 370);
  ctx.font = font(800, 70);
  ctx.fillStyle = '#fff';
  ctx.fillText(card.done === 1 ? 'workout' : 'workouts', cx, 460);

  const cell = 80;
  const gap = 16;
  const gridW = 7 * cell + 6 * gap;
  const x0 = cx - gridW / 2;
  const y0 = 540;
  card.days.forEach((d, i) => {
    const slot = card.firstWeekday + i;
    const x = x0 + (slot % 7) * (cell + gap);
    const y = y0 + Math.floor(slot / 7) * (cell + gap);
    roundRect(ctx, x, y, cell, cell, 18);
    if (d.done) {
      const g = ctx.createLinearGradient(x, y, x + cell, y + cell);
      g.addColorStop(0, CYAN);
      g.addColorStop(1, PINK);
      ctx.fillStyle = g;
      ctx.fill();
    } else if (d.future) {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.09)';
      ctx.fill();
    }
    ctx.font = font(700, 30);
    ctx.fillStyle = d.done ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.fillText(String(d.day), x + cell / 2, y + cell / 2 + 11);
  });

  ctx.font = font(600, 46);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  const parts = [formatCardDuration(card.timeMs)];
  if (card.best > 0) parts.push(`best streak ${card.best}`);
  ctx.fillText(parts.join(' · '), cx, 1255);
}

function drawTotal(ctx: Ctx, card: TotalCard) {
  const cx = BOX_W / 2;
  spacedText(ctx, 'ALL TIME', cx, 180, font(700, 44), 10, 'rgba(255,255,255,0.7)');
  const n = String(card.done);
  ctx.font = fitFont(ctx, n, 900, 320, 800);
  gradientText(ctx, n, cx, 480);
  ctx.font = font(800, 76);
  ctx.fillStyle = '#fff';
  ctx.fillText(card.done === 1 ? 'workout' : 'workouts', cx, 580);

  tile(ctx, 80, 680, 440, 230, formatCardDuration(card.timeMs), 'total time');
  tile(ctx, 560, 680, 440, 230, String(card.best), 'best streak');
  tile(ctx, 80, 950, 440, 230, String(card.perfect), 'perfect workouts');
  if (card.since) tile(ctx, 560, 950, 440, 230, card.since, 'since');
}

// ---- Pieces ----

function drawBackground(ctx: Ctx, W: number, H: number) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  radialGlow(ctx, W * 0.86, H * 0.1, W * 0.85, 'rgba(127,95,255,0.5)');
  radialGlow(ctx, W * 0.08, H * 0.82, W * 0.75, 'rgba(0,234,255,0.22)');
  radialGlow(ctx, W * 0.95, H * 0.98, W * 0.6, 'rgba(255,70,161,0.24)');
  // A fixed scatter of faint stars (seeded, so every image of a card is identical).
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 110; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 1 + rand() * 2.2;
    ctx.fillStyle = `rgba(255,255,255,${0.12 + rand() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function radialGlow(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** The PULSAR wordmark with a small pulsar (a bright core and two jets) before it. */
function drawWordmark(ctx: Ctx, cx: number, y: number) {
  const f = font(800, 52);
  const spacing = 17;
  const width = spacedWidth(ctx, 'PULSAR', f, spacing);
  const ox = cx - width / 2 - 26;
  const oy = y - 18;
  const shift = 22; // keep the mark and word centered as a pair
  const px = ox - 24 + shift;

  ctx.save();
  ctx.translate(px, oy);
  ctx.rotate(-Math.PI / 5);
  const jet = ctx.createLinearGradient(0, -62, 0, 62);
  jet.addColorStop(0, 'rgba(0,234,255,0)');
  jet.addColorStop(0.5, 'rgba(255,255,255,0.95)');
  jet.addColorStop(1, 'rgba(255,70,161,0)');
  ctx.fillStyle = jet;
  ctx.fillRect(-2.5, -62, 5, 124);
  ctx.restore();
  const core = ctx.createRadialGradient(px, oy, 0, px, oy, 28);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.35, 'rgba(0,234,255,0.9)');
  core.addColorStop(1, 'rgba(127,95,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(px, oy, 28, 0, Math.PI * 2);
  ctx.fill();

  spacedText(ctx, 'PULSAR', cx + shift, y, f, spacing, '#ffffff');
}

function weekStrip(ctx: Ctx, week: DayLabel[], y: number) {
  const r = 46;
  const step = 128;
  const x0 = BOX_W / 2 - step * 3;
  week.forEach((label, i) => {
    const x = x0 + i * step;
    ctx.font = font(700, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(DAY_LETTERS[i], x, y);
    const cy = y + 40 + r;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.setLineDash([]);
    if (label === 'done') {
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = VIOLET;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 19, cy + 1);
      ctx.lineTo(x - 5, cy + 15);
      ctx.lineTo(x + 20, cy - 13);
      ctx.stroke();
      ctx.lineCap = 'butt';
    } else if (label === 'rest') {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
    } else if (label === 'missed') {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(x - 13, cy - 13); ctx.lineTo(x + 13, cy + 13);
      ctx.moveTo(x + 13, cy - 13); ctx.lineTo(x - 13, cy + 13);
      ctx.stroke();
    } else {
      // today or planned: still to come
      ctx.strokeStyle = label === 'today' ? '#fff' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 6;
      if (label === 'planned') ctx.setLineDash([12, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function tile(ctx: Ctx, x: number, y: number, w: number, h: number, value: string, label: string) {
  roundRect(ctx, x, y, w, h, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = fitFont(ctx, value, 900, 104, w - 60);
  ctx.fillText(value, x + w / 2, y + h / 2 + 22);
  ctx.font = font(600, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.fillText(label, x + w / 2, y + h / 2 + 82);
}

function pill(ctx: Ctx, text: string, cx: number, y: number, f: string, bg: string, color: string, border?: string) {
  ctx.font = f;
  const size = parseInt(f.split(' ')[1], 10);
  const w = measureWithEmoji(ctx, text) + size * 1.4;
  const h = size * 1.9;
  roundRect(ctx, cx - w / 2, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.fillText(text, cx, y + h / 2 + size * 0.36);
}

function emojiAndText(ctx: Ctx, emoji: string, text: string, cx: number, y: number, emojiPx: number, f: string) {
  ctx.font = f;
  const tw = ctx.measureText(text).width;
  ctx.font = `${emojiPx}px ${EMOJI_FONT}`;
  const ew = ctx.measureText(emoji).width;
  const gap = 20;
  const left = cx - (tw + ew + gap) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.fillText(emoji, left, y);
  ctx.font = f;
  ctx.fillText(text, left + ew + gap, y);
  ctx.textAlign = 'center';
}

function gradientText(ctx: Ctx, text: string, cx: number, y: number) {
  const w = ctx.measureText(text).width;
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, CYAN);
  g.addColorStop(0.5, VIOLET);
  g.addColorStop(1, PINK);
  ctx.fillStyle = g;
  ctx.fillText(text, cx, y);
}

function glow(ctx: Ctx, color: string, blur: number, draw: () => void) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  draw();
  ctx.restore();
}

/** The largest font, up to maxPx, at which the text fits maxWidth. */
function fitFont(ctx: Ctx, text: string, weight: number, maxPx: number, maxWidth: number): string {
  let px = maxPx;
  ctx.font = font(weight, px);
  const w = ctx.measureText(text).width;
  if (w > maxWidth) px = Math.max(40, Math.floor(px * (maxWidth / w)));
  return font(weight, px);
}

function measureWithEmoji(ctx: Ctx, text: string): number {
  return ctx.measureText(text).width;
}

function spacedWidth(ctx: Ctx, text: string, f: string, spacing: number): number {
  ctx.font = f;
  return [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + spacing * (text.length - 1);
}

/** Letter-spaced text, centered on cx (canvas letterSpacing isn't on every Safari yet). */
function spacedText(ctx: Ctx, text: string, cx: number, y: number, f: string, spacing: number, color: string) {
  const width = spacedWidth(ctx, text, f, spacing);
  ctx.font = f;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  let x = cx - width / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = 'center';
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
