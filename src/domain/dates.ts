import type { ISODate } from './types';

export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function parseISODate(d: ISODate): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function toISODate(d: Date): ISODate {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

function eachDay(start: ISODate, end: ISODate): Date[] {
  const out: Date[] = [];
  const d = parseISODate(start);
  const last = parseISODate(end);
  while (d <= last && out.length < 60) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const dd = (d: Date) => String(d.getDate()).padStart(2, '0');

/**
 * Datas no formato do meio motociclístico:
 * "05" · "06 e 07" · "13, 14 e 15" · "30, 31 e 01" (vira o mês) · "17 a 22" (longo).
 */
export function formatDays(start: ISODate, end: ISODate, compact = false): string {
  const days = eachDay(start, end || start);
  if (days.length <= 1) return dd(days[0] ?? parseISODate(start));
  const sameMonth = days[0].getMonth() === days[days.length - 1].getMonth();
  // compact (tela do celular): 3+ dias no mesmo mês viram "12 a 15" para caber na coluna
  if (days.length > 4 || (compact && sameMonth && days.length >= 3)) {
    const a = days[0];
    const b = days[days.length - 1];
    const crossesMonth = a.getMonth() !== b.getMonth();
    return crossesMonth ? `${dd(a)}/${a.getMonth() + 1} a ${dd(b)}/${b.getMonth() + 1}` : `${dd(a)} a ${dd(b)}`;
  }
  const parts = days.map(dd);
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/** "19 a 22 de novembro de 2026" — usado na página do evento. */
export function formatLongRange(start: ISODate, end: ISODate): string {
  const a = parseISODate(start);
  const b = parseISODate(end || start);
  const mes = (d: Date) => MESES[d.getMonth()];
  if (start === end || !end) return `${a.getDate()} de ${mes(a)} de ${a.getFullYear()}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return `${a.getDate()} a ${b.getDate()} de ${mes(b)} de ${b.getFullYear()}`;
  if (a.getFullYear() === b.getFullYear())
    return `${a.getDate()} de ${mes(a)} a ${b.getDate()} de ${mes(b)} de ${b.getFullYear()}`;
  return `${a.getDate()}/${a.getMonth() + 1}/${a.getFullYear()} a ${b.getDate()}/${b.getMonth() + 1}/${b.getFullYear()}`;
}

export function monthKey(d: ISODate): string {
  return d.slice(0, 7);
}

/** "Novembro/2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const nome = MESES[m - 1];
  return `${nome[0].toUpperCase()}${nome.slice(1)}/${y}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
