import { useMemo, useSyncExternalStore, type DependencyList } from 'react';
import type {
  AdminNotice, Checkin, Draw, GoingMark, OwnershipClaim, S2REvent, Subscription, UF, User, CoverageLink, EventStatus,
} from '../domain/types';
import { cityGeo, distanceKm } from '../domain/geo';
import { todayISO } from '../domain/dates';
import {
  seedCheckins, seedClaims, seedEvents, seedGoing, seedNotices, seedSubs, seedUsers,
  seedDailyVisits, seedVisitsByCity, seedVisitsByUF,
} from './seed';

/**
 * Camada de dados do PROTÓTIPO: tudo fica no navegador (localStorage).
 * Cada função aqui tem um equivalente planejado no Firebase (ver docs/modelo-de-dados.md):
 * leituras → Firestore; escritas sensíveis (check-in, sorteio, aprovação) → Cloud Functions.
 * As telas só conversam com estas funções, então trocar por Firestore não mexe nas telas.
 */

export const DEMO_OTP = '123456';
export const POINTS_PER_CHECKIN = 10;
const KEY = 's2r-prototipo-v1';

export interface State {
  users: User[];
  events: S2REvent[];
  going: GoingMark[];
  subs: Subscription[];
  checkins: Checkin[];
  draws: Draw[];
  claims: OwnershipClaim[];
  notices: AdminNotice[];
  agendaShares: number;
  sessionUserId: string | null;
  dailyVisits: { date: string; visits: number }[];
  visitsByUF: Record<string, number>;
  visitsByCity: Record<string, number>;
}

function initial(): State {
  const s: State = {
    users: structuredClone(seedUsers),
    events: structuredClone(seedEvents),
    going: structuredClone(seedGoing),
    subs: structuredClone(seedSubs),
    checkins: structuredClone(seedCheckins),
    draws: [],
    claims: structuredClone(seedClaims),
    notices: structuredClone(seedNotices),
    agendaShares: 214,
    sessionUserId: null,
    dailyVisits: seedDailyVisits(),
    visitsByUF: { ...seedVisitsByUF },
    visitsByCity: { ...seedVisitsByCity },
  };
  // contadores e pontos coerentes com os dados de exemplo
  for (const e of s.events) {
    e.counters.going = s.going.filter((g) => g.eventId === e.id).length;
    e.counters.subscribers = s.subs.filter((x) => x.eventId === e.id && !x.revokedAt).length;
    e.counters.checkins = s.checkins.filter((c) => c.eventId === e.id).length;
    e.counters.views = 40 + ((e.id.charCodeAt(e.id.length - 1) * 37) % 400) + e.counters.going * 31;
    e.counters.directionsClicks = Math.round(e.counters.views * 0.18);
  }
  for (const c of s.checkins) {
    const u = s.users.find((x) => x.id === c.userId);
    if (u) u.points += c.pointsAwarded;
  }
  return s;
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* armazenamento indisponível: segue em memória */
  }
  return initial();
}

let state: State = load();
const listeners = new Set<() => void>();

function commit(mut: (draft: State) => void) {
  const draft = structuredClone(state);
  mut(draft);
  state = draft;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignora */
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/**
 * Lê o estado com um seletor. O resultado é memorizado por versão do estado,
 * então listas filtradas não mudam de identidade entre renderizações.
 * `deps`: valores de fora do estado usados pelo seletor (ex.: o slug da URL).
 */
export function useStore<T>(select: (s: State) => T, deps: DependencyList = []): T {
  const st = useSyncExternalStore(subscribe, () => state);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => select(st), [st, ...deps]);
}

export const getState = () => state;
const nowISO = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export function resetDemo() {
  commit((d) => Object.assign(d, initial(), { sessionUserId: d.sessionUserId }));
}

// ------------------------------------------------------------ seletores

export const currentUser = (s: State) => s.users.find((u) => u.id === s.sessionUserId) ?? null;
export const hasRole = (u: User | null, r: User['roles'][number]) => !!u && u.roles.includes(r);

/** Agenda pública: aprovados, ainda não terminados, ordem cronológica. */
export function upcomingEvents(s: State, today = todayISO()) {
  return s.events
    .filter((e) => e.approval === 'aprovado' && !e.mergedInto && e.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name, 'pt-BR'));
}

export function pastEvents(s: State, today = todayISO()) {
  return s.events
    .filter((e) => e.approval === 'aprovado' && !e.mergedInto && e.endDate < today)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/** Ordem cronológica geral (para "Evento anterior" e "Próximo evento"). */
export function chronological(s: State) {
  return s.events
    .filter((e) => e.approval === 'aprovado' && !e.mergedInto)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name, 'pt-BR'));
}

// ------------------------------------------------------------ sessão (login pelo WhatsApp)

/**
 * Fase 1 real: Cloud Function `sendLoginCode` envia o código pelo modelo de
 * autenticação aprovado na Meta; `verifyLoginCode` confere e devolve um
 * custom token do Firebase Auth (uid fixo por telefone = sem perfil duplicado).
 * No protótipo o código é sempre 123456.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length !== 11 || local[2] !== '9') return null;
  return `+55${local}`;
}

export function verifyCode(phone: string, code: string): { ok: false; error: string } | { ok: true; user: User | null } {
  if (code.trim() !== DEMO_OTP) return { ok: false, error: 'Código incorreto. Confira a mensagem no WhatsApp e digite os 6 números.' };
  const user = state.users.find((u) => u.phone === phone && !u.deletedAt) ?? null;
  if (user) commit((d) => void (d.sessionUserId = user.id));
  return { ok: true, user };
}

export function signUp(input: { phone: string; name: string; city: string; uf: UF; photoUrl?: string; asOrganizer?: boolean; instagram?: string; cpf?: string }) {
  const id = uid('u');
  const t = nowISO();
  commit((d) => {
    d.users.push({
      id, name: input.name.trim(), phone: input.phone, phoneVerifiedAt: t,
      originCity: input.city, originUF: input.uf, originGeo: cityGeo(input.city, input.uf),
      photoUrl: input.photoUrl, photoConsentAt: input.photoUrl ? t : undefined,
      instagram: input.instagram, cpf: input.cpf,
      roles: input.asOrganizer ? ['organizer', 'rider'] : ['rider'],
      ageDeclaredAdult: true, termsAcceptedAt: t, termsVersion: '2026-11', points: 0, createdAt: t,
    });
    d.sessionUserId = id;
  });
  return id;
}

export function becomeOrganizer(instagram: string, cpf?: string) {
  commit((d) => {
    const u = d.users.find((x) => x.id === d.sessionUserId);
    if (!u) return;
    if (!u.roles.includes('organizer')) u.roles.push('organizer');
    u.instagram = instagram;
    if (cpf) u.cpf = cpf;
  });
}

export function logout() {
  commit((d) => void (d.sessionUserId = null));
}

/** Só no protótipo: trocar de perfil para ver todas as telas. */
export function demoSwitchUser(id: string | null) {
  commit((d) => void (d.sessionUserId = id));
}

// ------------------------------------------------------------ motociclista

export function toggleGoing(eventId: string) {
  commit((d) => {
    const me = d.sessionUserId;
    if (!me) return;
    const ev = d.events.find((e) => e.id === eventId)!;
    const i = d.going.findIndex((g) => g.eventId === eventId && g.userId === me);
    if (i >= 0) {
      d.going.splice(i, 1);
      ev.counters.going--;
    } else {
      d.going.push({ eventId, userId: me, createdAt: nowISO() });
      ev.counters.going++;
    }
  });
}

export const EVENT_CONSENT_TEXT =
  'Quero receber no WhatsApp as alterações e novidades deste evento. Posso cancelar quando quiser.';
export const AGENDA_CONSENT_TEXT =
  'Quero receber no WhatsApp avisos de novos eventos, adiamentos e cancelamentos. Posso cancelar quando quiser.';

export function setEventSubscription(eventId: string, on: boolean) {
  commit((d) => {
    const me = d.users.find((u) => u.id === d.sessionUserId);
    if (!me) return;
    const ev = d.events.find((e) => e.id === eventId)!;
    const sub = d.subs.find((s) => s.scope === 'event' && s.eventId === eventId && s.userId === me.id && !s.revokedAt);
    if (on && !sub) {
      d.subs.push({ id: uid('s'), scope: 'event', eventId, userId: me.id, phone: me.phone, consentAt: nowISO(), consentText: EVENT_CONSENT_TEXT });
      ev.counters.subscribers++;
    } else if (!on && sub) {
      sub.revokedAt = nowISO();
      ev.counters.subscribers--;
    }
  });
}

export function subscribeAgenda(phone: string, ufs: UF[]) {
  commit((d) => {
    const existing = d.subs.find((s) => s.scope === 'agenda' && s.phone === phone && !s.revokedAt);
    if (existing) {
      existing.ufs = ufs;
      return;
    }
    d.subs.push({ id: uid('s'), scope: 'agenda', phone, userId: d.sessionUserId ?? undefined, ufs, consentAt: nowISO(), consentText: AGENDA_CONSENT_TEXT });
  });
}

export type CheckinResult =
  | { kind: 'ok'; checkin: Checkin; event: S2REvent }
  | { kind: 'repetido'; event: S2REvent }
  | { kind: 'fechado'; event: S2REvent }
  | { kind: 'invalido' };

/** Fase 1 real: Cloud Function `checkin` (valida token, horário e unicidade em transação). */
export function doCheckin(eventId: string, token: string): CheckinResult {
  const ev = state.events.find((e) => e.id === eventId);
  if (!ev || ev.checkin.token !== token) return { kind: 'invalido' };
  if (!ev.checkin.open) return { kind: 'fechado', event: ev };
  const me = currentUser(state);
  if (!me) return { kind: 'invalido' };
  const id = `${ev.id}_${me.id}`;
  if (state.checkins.some((c) => c.id === id)) return { kind: 'repetido', event: ev };
  const c: Checkin = {
    id, eventId: ev.id, userId: me.id, phone: me.phone, eventCity: ev.city, eventUF: ev.uf,
    originCity: me.originCity, originUF: me.originUF,
    distanceKm: me.originGeo && ev.cityGeo ? distanceKm(me.originGeo, ev.cityGeo) : undefined,
    createdAt: nowISO(), pointsAwarded: POINTS_PER_CHECKIN,
  };
  commit((d) => {
    d.checkins.push(c);
    d.events.find((e) => e.id === ev.id)!.counters.checkins++;
    d.users.find((u) => u.id === me.id)!.points += POINTS_PER_CHECKIN;
  });
  return { kind: 'ok', checkin: c, event: state.events.find((e) => e.id === ev.id)! };
}

// ------------------------------------------------------------ organizador

export type EventDraft = Pick<
  S2REvent,
  'name' | 'startDate' | 'endDate' | 'city' | 'uf' | 'paid' | 'priceText' | 'attractions' | 'emergencyPhone' |
  'description' | 'organizerWhatsApp' | 'instagram' | 'venue' | 'places' | 'bannerUrl' | 'crestUrl' | 'status'
>;

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/º|ª/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function createEvent(draft: EventDraft): S2REvent {
  const me = currentUser(state)!;
  const isAdmin = hasRole(me, 'admin');
  const t = nowISO();
  const id = uid('e');
  const ev: S2REvent = {
    ...draft,
    id, slug: `${slugify(draft.name)}-${draft.startDate.slice(0, 4)}-${id.slice(-4)}`,
    cityGeo: cityGeo(draft.city, draft.uf),
    approval: isAdmin ? 'aprovado' : 'pendente',
    ownerId: me.id, createdBy: me.id, createdAt: t, updatedAt: t, featured: false,
    checkin: { open: false, token: uid('qr') }, coverageLinks: [],
    counters: { views: 0, directionsClicks: 0, going: 0, subscribers: 0, checkins: 0 },
  };
  commit((d) => {
    d.events.push(ev);
    if (!isAdmin) d.notices.unshift({ id: uid('n'), kind: 'novo_evento', eventId: id, actorId: me.id, createdAt: t });
  });
  return ev;
}

const TRACKED: (keyof EventDraft)[] = ['name', 'startDate', 'endDate', 'city', 'uf', 'status', 'paid', 'priceText', 'attractions', 'description', 'emergencyPhone', 'organizerWhatsApp', 'instagram'];

/** Edição livre após aprovação; cada edição do organizador gera notificação ao admin com o que mudou. */
export function updateEvent(id: string, patch: Partial<EventDraft>) {
  commit((d) => {
    const me = d.users.find((u) => u.id === d.sessionUserId);
    const ev = d.events.find((e) => e.id === id);
    if (!me || !ev) return;
    const diff: Record<string, [unknown, unknown]> = {};
    for (const k of TRACKED) if (k in patch && JSON.stringify(patch[k]) !== JSON.stringify(ev[k])) diff[k] = [ev[k], patch[k]];
    Object.assign(ev, patch, { updatedAt: nowISO() });
    if (patch.city || patch.uf) ev.cityGeo = cityGeo(ev.city, ev.uf);
    if (Object.keys(diff).length && !me.roles.includes('admin') && ev.approval === 'aprovado')
      d.notices.unshift({ id: uid('n'), kind: 'edicao', eventId: id, actorId: me.id, diff, createdAt: nowISO() });
  });
}

export function setStatus(id: string, status: EventStatus) {
  updateEvent(id, { status });
}

export function setCheckinOpen(id: string, open: boolean) {
  commit((d) => {
    const ev = d.events.find((e) => e.id === id)!;
    ev.checkin.open = open;
    if (open) ev.checkin.openedAt = nowISO();
    else ev.checkin.closedAt = nowISO();
  });
}

/** Fase 1 real: Cloud Function `draw` (sorteio no servidor, resultado gravado e auditável). */
export function drawWinner(eventId: string): Draw | null {
  const pool = state.checkins.filter((c) => c.eventId === eventId && !c.voided);
  if (!pool.length) return null;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const pick = pool[buf[0] % pool.length];
  const u = state.users.find((x) => x.id === pick.userId)!;
  const draw: Draw = {
    id: uid('d'), eventId, winnerUserId: u.id, winnerName: u.name, winnerPhotoUrl: u.photoUrl,
    poolSize: pool.length, drawnBy: state.sessionUserId!, createdAt: nowISO(),
  };
  commit((d) => void d.draws.unshift(draw));
  return draw;
}

export function addCoverageLink(eventId: string, link: CoverageLink) {
  commit((d) => void d.events.find((e) => e.id === eventId)!.coverageLinks.push(link));
}

export function claimEvent(eventId: string, message: string) {
  commit((d) => {
    const me = d.sessionUserId!;
    d.claims.unshift({ id: uid('c'), eventId, claimantId: me, message, state: 'pendente', createdAt: nowISO() });
    d.notices.unshift({ id: uid('n'), kind: 'reivindicacao', eventId, actorId: me, createdAt: nowISO() });
  });
}

// ------------------------------------------------------------ administrador

export function decideApproval(id: string, approve: boolean, reason?: string) {
  commit((d) => {
    const ev = d.events.find((e) => e.id === id)!;
    ev.approval = approve ? 'aprovado' : 'recusado';
    ev.rejectionReason = reason;
    d.notices.forEach((n) => n.eventId === id && n.kind === 'novo_evento' && (n.readAt = nowISO()));
  });
}

export function markNoticeRead(id: string) {
  commit((d) => void (d.notices.find((n) => n.id === id)!.readAt = nowISO()));
}

export function decideClaim(id: string, approve: boolean) {
  commit((d) => {
    const c = d.claims.find((x) => x.id === id)!;
    c.state = approve ? 'aprovado' : 'recusado';
    c.decidedAt = nowISO();
    if (approve) {
      d.events.find((e) => e.id === c.eventId)!.ownerId = c.claimantId;
      const u = d.users.find((x) => x.id === c.claimantId)!;
      if (!u.roles.includes('organizer')) u.roles.push('organizer');
    }
  });
}

/** Junta duplicados: mantém `keepId`, o outro some da agenda e aponta para ele. */
export function mergeEvents(keepId: string, dropId: string) {
  commit((d) => {
    const drop = d.events.find((e) => e.id === dropId)!;
    drop.mergedInto = keepId;
    d.going.forEach((g) => g.eventId === dropId && (g.eventId = keepId));
    d.subs.forEach((s) => s.eventId === dropId && (s.eventId = keepId));
  });
}

export function setFeatured(id: string, featured: boolean) {
  commit((d) => void (d.events.find((e) => e.id === id)!.featured = featured));
}

// ------------------------------------------------------------ métricas

export function trackView(id: string) {
  commit((d) => {
    const ev = d.events.find((e) => e.id === id);
    if (ev) ev.counters.views++;
  });
}
export function trackDirections(id: string) {
  commit((d) => void d.events.find((e) => e.id === id)!.counters.directionsClicks++);
}
export function trackEuVouShare(id: string) {
  commit((d) => {
    const ev = d.events.find((e) => e.id === id);
    if (ev) ev.counters.euVouShares = (ev.counters.euVouShares ?? 0) + 1;
  });
}
export function trackAgendaShare() {
  commit((d) => void d.agendaShares++);
}
