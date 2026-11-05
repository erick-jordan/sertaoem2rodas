import type { Checkin, S2REvent, Subscription, User, GoingMark, AdminNotice, OwnershipClaim, UF, Place } from '../domain/types';
import { cityGeo, distanceKm } from '../domain/geo';

// Dados de exemplo do protótipo, inspirados na agenda do Anexo B.
// Servem para o Irineu validar o visual; somem quando o Firestore entrar.

const now = '2026-11-05T09:00:00-03:00';

function user(id: string, name: string, city: string, uf: UF, roles: User['roles'], phone: string, extra: Partial<User> = {}): User {
  return {
    id, name, phone, phoneVerifiedAt: now, originCity: city, originUF: uf, originGeo: cityGeo(city, uf),
    roles, ageDeclaredAdult: true, termsAcceptedAt: now, termsVersion: '2026-11', points: 0, createdAt: now, ...extra,
  };
}

export const seedUsers: User[] = [
  user('u-admin', 'Irineu Neto', 'João Pessoa', 'PB', ['admin', 'organizer', 'rider'], '+5583900000001', { instagram: '@sertaoem2rodas' }),
  user('u-org1', 'Moto Clube Asas do Sertão', 'Campina Grande', 'PB', ['organizer', 'rider'], '+5583900000002', { instagram: '@cgmotofest' }),
  user('u-org2', 'Associação Motociclística do Seridó', 'Caicó', 'RN', ['organizer', 'rider'], '+5584900000003', { instagram: '@encontroserido' }),
  user('u-r1', 'Josivan Alves', 'Juazeiro do Norte', 'CE', ['rider'], '+5588900000010'),
  user('u-r2', 'Marta Rocha', 'Salvador', 'BA', ['rider'], '+5571900000011'),
  user('u-r3', 'Diego Farias', 'Recife', 'PE', ['rider'], '+5581900000012'),
  user('u-r4', 'Cláudio Bezerra', 'Mossoró', 'RN', ['rider'], '+5584900000013'),
  user('u-r5', 'Ana Paula Lins', 'João Pessoa', 'PB', ['rider'], '+5583900000014'),
  user('u-r6', 'Tiago Nunes', 'Teresina', 'PI', ['rider'], '+5586900000015'),
  user('u-r7', 'Raimundo Sá', 'Patos', 'PB', ['rider'], '+5583900000016'),
  user('u-r8', 'Fernanda Melo', 'Maceió', 'AL', ['rider'], '+5582900000017'),
  user('u-r9', 'Edvaldo Lima', 'Fortaleza', 'CE', ['rider'], '+5585900000018'),
  user('u-r10', 'Gilson Cardoso', 'Aracaju', 'SE', ['rider'], '+5579900000019'),
  user('u-r11', 'Luana Torres', 'Caruaru', 'PE', ['rider'], '+5581900000020'),
  user('u-r12', 'Severino Brito', 'São Luís', 'MA', ['rider'], '+5598900000021'),
];

type EvIn = {
  id: string; name: string; start: string; end?: string; city: string; uf: UF;
  status?: S2REvent['status']; approval?: S2REvent['approval']; owner?: string; paid?: string;
  featured?: boolean; venue?: { name: string; address: string; d?: [number, number] };
  places?: Omit<Place, 'id'>[]; attractions?: string; instagram?: string; whatsapp?: string;
  description?: string; emergency?: string; checkinOpen?: boolean;
};

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/º|ª/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function ev(e: EvIn): S2REvent {
  const geo = cityGeo(e.city, e.uf);
  const offset = (d?: [number, number]) => (geo && d ? { lat: geo.lat + d[0], lng: geo.lng + d[1] } : undefined);
  return {
    id: e.id,
    slug: `${slugify(e.name)}-${e.start.slice(0, 4)}`,
    name: e.name, startDate: e.start, endDate: e.end ?? e.start, city: e.city, uf: e.uf, cityGeo: geo,
    venue: e.venue ? { id: `${e.id}-v`, kind: 'evento', name: e.venue.name, address: e.venue.address, geo: offset(e.venue.d ?? [0.004, -0.006]) } : undefined,
    places: (e.places ?? []).map((p, i) => ({ ...p, id: `${e.id}-p${i}`, geo: p.geo ?? offset([0.002 * (i + 2), 0.003 * (i + 1)]) })),
    organizerWhatsApp: e.whatsapp, instagram: e.instagram, paid: !!e.paid, priceText: e.paid,
    attractions: e.attractions, emergencyPhone: e.emergency, description: e.description,
    status: e.status ?? 'confirmado', approval: e.approval ?? 'aprovado',
    ownerId: e.owner ?? 'u-admin', createdBy: e.owner ?? 'u-admin', createdAt: now, updatedAt: now,
    featured: !!e.featured,
    checkin: { open: !!e.checkinOpen, token: `qr-${e.id}-7f3a` },
    coverageLinks: [],
    counters: { views: 0, directionsClicks: 0, going: 0, subscribers: 0, checkins: 0 },
  };
}

export const seedEvents: S2REvent[] = [
  // Outubro/2026 — já realizados, vão para o arquivo
  ev({ id: 'e-out1', name: '20º Aniversário Brothers do Asfalto MC', start: '2026-10-31', city: 'Santa Cruz', uf: 'RN' }),
  ev({ id: 'e-out2', name: '1º Encontro de Motociclistas do Seridó', start: '2026-10-24', city: 'Caicó', uf: 'RN', owner: 'u-org2' }),
  ev({ id: 'e-out3', name: '9º Capibaribe Moto Fest', start: '2026-10-30', end: '2026-10-31', city: 'Santa Cruz do Capibaribe', uf: 'PE' }),
  // Novembro/2026
  ev({ id: 'e-n1', name: 'Aracaju Moto Fest', start: '2026-11-05', end: '2026-11-07', city: 'Aracaju', uf: 'SE', status: 'adiado' }),
  ev({ id: 'e-n2', name: '1º Lençóis Moto Fest', start: '2026-11-06', end: '2026-11-08', city: 'Barreirinhas', uf: 'MA' }),
  ev({ id: 'e-n3', name: '20º EMOCAP', start: '2026-11-06', end: '2026-11-08', city: 'Monteiro', uf: 'PB', featured: true,
    venue: { name: 'Parque de Exposições', address: 'Av. Ver. José Bezerra, Monteiro - PB' },
    places: [{ kind: 'camping', name: 'Camping do Parque' }, { kind: 'alimentacao', name: 'Praça de alimentação' }] }),
  ev({ id: 'e-n4', name: 'Aniversário do Matutos MC', start: '2026-11-07', end: '2026-11-08', city: 'Currais Novos', uf: 'RN' }),
  ev({ id: 'e-n5', name: '11º Ubajara Moto Show', start: '2026-11-12', end: '2026-11-15', city: 'Ubajara', uf: 'CE', paid: 'R$ 40' }),
  ev({ id: 'e-n6', name: '2ª Princesa Moto Fest', start: '2026-11-13', end: '2026-11-15', city: 'Princesa Isabel', uf: 'PB' }),
  ev({ id: 'e-n7', name: '21º Campina Grande Motofest', start: '2026-11-19', end: '2026-11-22', city: 'Campina Grande', uf: 'PB',
    owner: 'u-org1', featured: true, checkinOpen: true, instagram: '@campinagrandemotofest', whatsapp: '+5583900000002',
    emergency: '0800 083 0193',
    attractions: 'Shows ao vivo nas quatro noites, exposição de motos, praça de alimentação e área de camping.',
    description: 'O maior encontro de motociclistas do Nordeste chega à 21ª edição no Parque do Povo.',
    venue: { name: 'Parque do Povo', address: 'R. Dr. Severino Cruz, Centro, Campina Grande - PB', d: [0.009, 0.0] },
    places: [
      { kind: 'camping', name: 'Camping oficial — Açude Velho', address: 'Açude Velho, Campina Grande' },
      { kind: 'hospedagem', name: 'Rede hoteleira conveniada' },
      { kind: 'alimentacao', name: 'Praça de alimentação do Parque do Povo' },
      { kind: 'apoio', name: 'Borracharia 24h BR-230' },
    ] }),
  ev({ id: 'e-n8', name: '12º Passa e Fique Tropeiros do Asfalto MC', start: '2026-11-20', end: '2026-11-22', city: 'Campina Grande', uf: 'PB' }),
  ev({ id: 'e-n9', name: '15º Moto Confraria Natal', start: '2026-11-20', end: '2026-11-22', city: 'Natal', uf: 'RN', status: 'cancelado' }),
  ev({ id: 'e-n10', name: 'Paracuru Moto Fest', start: '2026-11-20', end: '2026-11-22', city: 'Paracuru', uf: 'CE' }),
  ev({ id: 'e-n11', name: '21º Garanhuns Moto Fest', start: '2026-11-28', city: 'Garanhuns', uf: 'PE' }),
  ev({ id: 'e-n12', name: 'Pesqueira Moto Rock', start: '2026-11-28', end: '2026-11-29', city: 'Pesqueira', uf: 'PE' }),
  // Dezembro/2026
  ev({ id: 'e-d1', name: '3º Palmeiras de Aço', start: '2026-12-04', end: '2026-12-06', city: 'Jequié', uf: 'BA' }),
  ev({ id: 'e-d2', name: '1º Ipojuca Moto Fest', start: '2026-12-19', end: '2026-12-20', city: 'Ipojuca', uf: 'PE', featured: true }),
  ev({ id: 'e-d3', name: '5º Moto Fest de Teresina', start: '2026-12-11', end: '2026-12-13', city: 'Teresina', uf: 'PI', paid: 'R$ 25' }),
  ev({ id: 'e-d4', name: 'Encontro de Fim de Ano Penedo', start: '2026-12-30', end: '2027-01-01', city: 'Penedo', uf: 'AL' }),
  // 2027
  ev({ id: 'e-27a', name: '11º Moto Fest de São Paulo do Potengi', start: '2027-02-25', end: '2027-02-28', city: 'São Paulo do Potengi', uf: 'RN' }),
  ev({ id: 'e-27b', name: 'XI Bate e Fica Caveiras 100 Limites', start: '2027-03-06', end: '2027-03-07', city: 'Mossoró', uf: 'RN' }),
  ev({ id: 'e-27c', name: 'Moto Festival Cícero Dantas', start: '2027-04-09', end: '2027-04-10', city: 'Juazeiro', uf: 'BA' }),
  ev({ id: 'e-27d', name: '3º Encontro de Motociclistas de Brejo Santo', start: '2027-06-05', end: '2027-06-06', city: 'Brejo Santo', uf: 'CE' }),
  // Pendentes (aguardando aprovação do administrador)
  ev({ id: 'e-p1', name: '1º Encontro de Motociclistas do Seridó Potiguar', start: '2026-12-12', end: '2026-12-13', city: 'Caicó', uf: 'RN',
    approval: 'pendente', owner: 'u-org2', instagram: '@encontroserido', whatsapp: '+5584900000003' }),
  ev({ id: 'e-p2', name: '4º Irecê Moto Fest', start: '2027-01-15', end: '2027-01-17', city: 'Irecê', uf: 'BA', approval: 'pendente', owner: 'u-org2' }),
];

// Interações de exemplo no 21º Campina Grande Motofest (evento do organizador u-org1)
const cg = seedEvents.find((e) => e.id === 'e-n7')!;
const riders = seedUsers.filter((u) => u.id.startsWith('u-r'));

export const seedGoing: GoingMark[] = riders.slice(0, 10).map((u) => ({ userId: u.id, eventId: cg.id, createdAt: now }));

export const seedSubs: Subscription[] = riders.slice(2, 9).map((u, i) => ({
  id: `s-${i}`, scope: 'event', eventId: cg.id, userId: u.id, phone: u.phone, consentAt: now,
  consentText: 'Quero receber no WhatsApp as alterações e novidades deste evento.',
}));

export const seedCheckins: Checkin[] = riders.slice(0, 8).map((u, i) => ({
  id: `${cg.id}_${u.id}`, eventId: cg.id, userId: u.id, phone: u.phone, eventCity: cg.city, eventUF: cg.uf,
  originCity: u.originCity, originUF: u.originUF,
  distanceKm: u.originGeo && cg.cityGeo ? distanceKm(u.originGeo, cg.cityGeo) : undefined,
  createdAt: `2026-11-05T0${(i % 8) + 1}:1${i}:00-03:00`, pointsAwarded: 10,
}));

export const seedNotices: AdminNotice[] = [
  { id: 'n1', kind: 'novo_evento', eventId: 'e-p1', actorId: 'u-org2', createdAt: '2026-11-04T18:20:00-03:00' },
  { id: 'n2', kind: 'novo_evento', eventId: 'e-p2', actorId: 'u-org2', createdAt: '2026-11-04T21:05:00-03:00' },
  { id: 'n3', kind: 'edicao', eventId: 'e-n7', actorId: 'u-org1', createdAt: '2026-11-05T07:40:00-03:00',
    diff: { attractions: ['Shows ao vivo.', 'Shows ao vivo nas quatro noites, exposição de motos, praça de alimentação e área de camping.'] } },
];

export const seedClaims: OwnershipClaim[] = [
  { id: 'c1', eventId: 'e-n10', claimantId: 'u-org2', message: 'Sou da comissão organizadora do Paracuru Moto Fest.', state: 'pendente', createdAt: '2026-11-03T10:00:00-03:00' },
];

/** Série de acessos diários dos últimos 30 dias, para o painel de métricas. */
export function seedDailyVisits(): { date: string; visits: number }[] {
  const out = [];
  const base = new Date(2026, 10, 5);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 5 || d.getDay() === 6 ? 1.6 : 1;
    const visits = Math.round((180 + (29 - i) * 9 + Math.sin(i * 1.7) * 40) * weekend);
    out.push({ date: d.toISOString().slice(0, 10), visits });
  }
  return out;
}

export const seedVisitsByUF: Record<string, number> = { PB: 3120, PE: 2210, RN: 1640, CE: 1480, BA: 990, AL: 520, SE: 410, PI: 380, MA: 260 };
export const seedVisitsByCity: Record<string, number> = {
  'João Pessoa/PB': 1420, 'Campina Grande/PB': 1180, 'Recife/PE': 1090, 'Natal/RN': 860, 'Fortaleza/CE': 790,
  'Caruaru/PE': 410, 'Patos/PB': 380, 'Mossoró/RN': 350, 'Salvador/BA': 330, 'Juazeiro do Norte/CE': 300,
};
