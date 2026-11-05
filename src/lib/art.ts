import type { S2REvent } from '../domain/types';
import { formatDays, monthKey, monthLabel, formatLongRange } from '../domain/dates';
import { BRAND, COLORS, SITE } from './brand';

// Imagens geradas no navegador com <canvas>:
//  - agendaImage: a imagem da agenda para mandar nos grupos (3.2), nos dois formatos do @motoeventosne
//  - eventArt: a arte automática do evento, em feed (4:5) e story (9:16) (3.10)
// Em produção as mesmas funções rodam no navegador; a arte do evento também pode ser
// gerada por uma Cloud Function para virar a imagem de prévia do link (og:image).

const imgCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  if (!imgCache.has(src)) {
    imgCache.set(
      src,
      new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = src;
      })
    );
  }
  return imgCache.get(src)!;
}

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('700 40px "Barlow Semi Condensed"'),
      document.fonts.load('500 40px "Barlow Semi Condensed"'),
      document.fonts.load('italic 800 40px "Barlow Condensed"'),
      document.fonts.load('700 40px "Barlow Condensed"'),
    ]);
  } catch {
    /* segue com fonte reserva */
  }
}

const SANS = '"Barlow Semi Condensed", "Arial Narrow", Arial, sans-serif';
const COND = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fitText(ctx, lines.slice(maxLines - 1).join(' '), maxW);
    return kept;
  }
  return lines;
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.min(w / img.width, h / img.height);
  const dw = img.width * r;
  const dh = img.height * r;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Faixa inclinada no ângulo da agulha da bússola do logo (~18° da vertical). */
const SLANT = Math.tan((18 * Math.PI) / 180);

// ------------------------------------------------------------------ agenda

export interface AgendaImageOpts {
  events: S2REvent[];
  /** "Próximos eventos" ou "Paraíba · 2026" */
  subtitle: string;
}

const W = 1080;
const PAD = 40;

export async function agendaImage({ events, subtitle }: AgendaImageOpts): Promise<Blob> {
  await fontsReady();
  const logo = await loadImage(BRAND.logoDark);
  const seal = await loadImage(BRAND.seal);

  const groups = new Map<string, S2REvent[]>();
  for (const e of events) {
    const k = monthKey(e.startDate);
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const HEADER = 230;
  const COLHEAD = 46;
  const BAND = 50;
  const ROW = 46;
  const FOOTER = 120;
  const height = HEADER + COLHEAD + groups.size * BAND + events.length * ROW + FOOTER + (events.length ? 0 : 120);

  const c = document.createElement('canvas');
  c.width = W;
  c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, W, height);

  // cabeçalho preto
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, W, HEADER);
  drawContain(ctx, logo, PAD, 26, 420, 170);
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.paper;
  ctx.font = `italic 800 64px ${COND}`;
  ctx.fillText('Agenda de eventos', W - PAD, 112);
  ctx.fillStyle = COLORS.orange;
  ctx.font = `700 38px ${SANS}`;
  ctx.fillText(subtitle, W - PAD, 160);
  ctx.textAlign = 'left';
  // filete laranja inclinado
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(0, HEADER - 10);
  ctx.lineTo(W, HEADER - 10);
  ctx.lineTo(W, HEADER);
  ctx.lineTo(0, HEADER);
  ctx.fill();

  // colunas
  const colData = PAD;
  const colNome = 250;
  const colCidade = 730;
  const colUF = W - PAD - 44;
  let y = HEADER;
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, y, W, COLHEAD);
  ctx.fillStyle = COLORS.paper;
  ctx.font = `700 26px ${SANS}`;
  const baseline = (top: number, h: number) => top + h / 2 + 9;
  ctx.fillText('Data', colData, baseline(y, COLHEAD));
  ctx.fillText('Nome do evento', colNome, baseline(y, COLHEAD));
  ctx.fillText('Cidade', colCidade, baseline(y, COLHEAD));
  ctx.fillText('UF', colUF, baseline(y, COLHEAD));
  y += COLHEAD;

  if (!events.length) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `500 30px ${SANS}`;
    ctx.fillText('Nenhum evento cadastrado neste período.', PAD, y + 70);
    y += 120;
  }

  for (const [k, list] of groups) {
    ctx.fillStyle = COLORS.band;
    ctx.fillRect(0, y, W, BAND);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(0, y, 10, BAND);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `italic 800 34px ${COND}`;
    ctx.fillText(monthLabel(k), colData, baseline(y, BAND) + 1);
    y += BAND;
    for (const e of list) {
      const by = baseline(y, ROW);
      ctx.fillStyle = COLORS.ink;
      ctx.font = `700 27px ${SANS}`;
      ctx.fillText(fitText(ctx, formatDays(e.startDate, e.endDate), colNome - colData - 14), colData, by);
      ctx.font = `500 27px ${SANS}`;
      const status = e.status === 'adiado' ? 'ADIADO' : e.status === 'cancelado' ? 'CANCELADO' : '';
      let nameMax = colCidade - colNome - 20;
      if (status) {
        ctx.font = `700 22px ${SANS}`;
        const sw = ctx.measureText(status).width;
        nameMax -= sw + 14;
        ctx.fillStyle = COLORS.alert;
        ctx.fillText(status, colCidade - 20 - sw, by);
        ctx.font = `500 27px ${SANS}`;
        ctx.fillStyle = COLORS.ink;
      }
      const name = e.paid && e.priceText ? `${e.name} · ${e.priceText}` : e.name;
      ctx.fillText(fitText(ctx, name, nameMax), colNome, by);
      ctx.fillText(fitText(ctx, e.city, colUF - colCidade - 16), colCidade, by);
      ctx.font = `700 27px ${SANS}`;
      ctx.fillText(e.uf, colUF, by);
      y += ROW;
      ctx.fillStyle = COLORS.rule;
      ctx.fillRect(PAD, y - 1, W - PAD * 2, 1);
    }
  }

  // rodapé preto
  const fy = height - FOOTER;
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, fy, W, FOOTER);
  drawContain(ctx, seal, PAD, fy + 28, 150, 64);
  ctx.fillStyle = COLORS.paper;
  ctx.font = `700 40px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(SITE, W - PAD, fy + 62);
  ctx.fillStyle = '#BDBDBD';
  ctx.font = `500 24px ${SANS}`;
  ctx.fillText('Agenda sujeita a alterações. Confirme com o organizador antes de viajar.', W - PAD, fy + 96);
  ctx.textAlign = 'left';

  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

// ------------------------------------------------------------------ arte do evento

export type ArtFormat = 'feed' | 'story';

export async function eventArt(e: Pick<S2REvent, 'name' | 'startDate' | 'endDate' | 'city' | 'uf' | 'crestUrl'>, format: ArtFormat): Promise<string> {
  await fontsReady();
  const logo = await loadImage(BRAND.logoDark);
  const symbol = await loadImage(BRAND.symbol);
  const H = format === 'feed' ? 1350 : 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, W, H);

  // grande símbolo em marca d'água, cortado pela borda direita
  ctx.globalAlpha = 0.14;
  const sh = H * 0.78;
  const sw = (symbol.width / symbol.height) * sh;
  ctx.drawImage(symbol, W - sw * 0.62, H * 0.1, sw, sh);
  ctx.globalAlpha = 1;

  // faixa laranja inclinada (agulha), à direita, sem cruzar o texto
  const bandX = W * (format === 'feed' ? 0.7 : 0.65);
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(bandX, H);
  ctx.lineTo(bandX + 26, H);
  ctx.lineTo(bandX + 26 + H * SLANT, 0);
  ctx.lineTo(bandX + H * SLANT, 0);
  ctx.fill();
  ctx.fillStyle = COLORS.green;
  ctx.beginPath();
  ctx.moveTo(bandX + 40, H);
  ctx.lineTo(bandX + 48, H);
  ctx.lineTo(bandX + 48 + H * SLANT, 0);
  ctx.lineTo(bandX + 40 + H * SLANT, 0);
  ctx.fill();

  const left = 150;
  const top = format === 'feed' ? 160 : 330;

  // brasão do evento, se houver
  let nameTop = top;
  if (e.crestUrl) {
    try {
      const crest = await loadImage(e.crestUrl);
      const r = 110;
      ctx.save();
      ctx.beginPath();
      ctx.arc(left + r, top + r, r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.paper;
      ctx.fill();
      ctx.clip();
      drawContain(ctx, crest, left + 14, top + 14, r * 2 - 28, r * 2 - 28);
      ctx.restore();
      nameTop = top + r * 2 + 60;
    } catch {
      /* sem brasão */
    }
  }

  // nome do evento: o elemento principal
  const maxW = W - left - 270; // a faixa fica à direita
  let size = 150;
  let lines: string[] = [];
  do {
    ctx.font = `italic 800 ${size}px ${COND}`;
    lines = wrap(ctx, e.name.toUpperCase(), maxW, 5);
    size -= 6;
  } while ((lines.length > 4 || lines.some((l) => ctx.measureText(l).width > maxW)) && size > 60);
  size += 6;
  ctx.fillStyle = COLORS.paper;
  const lh = size * 0.94;
  lines.forEach((l, i) => ctx.fillText(l, left, nameTop + size + i * lh));
  let y = nameTop + size + (lines.length - 1) * lh + 90;

  ctx.fillStyle = COLORS.orange;
  ctx.font = `700 64px ${SANS}`;
  for (const l of wrap(ctx, formatLongRange(e.startDate, e.endDate), maxW, 2)) {
    ctx.fillText(l, left, y);
    y += 74;
  }
  ctx.fillStyle = COLORS.paper;
  ctx.font = `500 56px ${SANS}`;
  ctx.fillText(fitText(ctx, `${e.city} · ${e.uf}`, maxW), left, y + 6);

  // assinatura da marca
  const lw = 380;
  const lhh = (logo.height / logo.width) * lw;
  ctx.drawImage(logo, left - 10, H - lhh - (format === 'feed' ? 80 : 170), lw, lhh);
  ctx.fillStyle = '#BDBDBD';
  ctx.font = `600 32px ${SANS}`;
  ctx.fillText(SITE, left, H - (format === 'feed' ? 40 : 130));

  return c.toDataURL('image/png');
}

/**
 * Aplica o selo do Sertão em 2 Rodas num canto do banner enviado (3.10 / Anexo B).
 * Em produção roda numa Cloud Function no upload; o original sem selo fica guardado.
 */
export async function stampBanner(srcDataUrl: string): Promise<string> {
  const img = await loadImage(srcDataUrl);
  const seal = await loadImage(BRAND.seal);
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const w = Math.round(img.width * 0.14);
  const h = (seal.height / seal.width) * w;
  const m = Math.round(img.width * 0.025);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const pad = w * 0.12;
  ctx.fillRect(img.width - w - m - pad, m, w + pad * 2, h + pad * 2);
  ctx.drawImage(seal, img.width - w - m, m + pad, w, h);
  return c.toDataURL('image/jpeg', 0.9);
}

export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'demo'> {
  // Na prévia do protótipo, downloads e compartilhamento são bloqueados: a imagem fica na tela.
  if (__DEMO_BUILD__) return 'demo';
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch {
      /* cancelado: cai no download */
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'downloaded';
}

export function dataUrlToBlob(d: string): Blob {
  const [head, body] = d.split(',');
  const mime = head.match(/:(.*?);/)![1];
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
