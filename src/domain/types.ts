// Modelo de dados do Sertão em 2 Rodas.
// A Fase 1 usa só parte destes tipos; os campos marcados "Fase 2/3/4" já existem
// para que o banco (Firestore) nasça pronto e nada precise ser refeito depois.
// Cada interface corresponde a uma coleção descrita em docs/modelo-de-dados.md.

export type UF =
  | 'AL' | 'BA' | 'CE' | 'MA' | 'PB' | 'PE' | 'PI' | 'RN' | 'SE'
  // Fase 3: a agenda pode sair do Nordeste
  | 'AC' | 'AP' | 'AM' | 'PA' | 'RO' | 'RR' | 'TO' | 'DF' | 'GO' | 'MT' | 'MS'
  | 'ES' | 'MG' | 'RJ' | 'SP' | 'PR' | 'RS' | 'SC';

export const UFS_NORDESTE: UF[] = ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'];

export const UF_NOME: Record<string, string> = {
  AL: 'Alagoas', BA: 'Bahia', CE: 'Ceará', MA: 'Maranhão', PB: 'Paraíba',
  PE: 'Pernambuco', PI: 'Piauí', RN: 'Rio Grande do Norte', SE: 'Sergipe',
};

/** ISO yyyy-mm-dd, sem fuso: datas de evento são datas de calendário. */
export type ISODate = string;
/** ISO completo com fuso, para registros com hora (check-in, logs). */
export type ISODateTime = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------- usuários

/**
 * Papéis globais. Fase 1: admin, organizer, rider.
 * Fase 3: moderator (aprova eventos de UFs específicas sem acesso total).
 * Gestor e membro de motoclube não são papéis globais: ficam em ClubMembership.
 */
export type Role = 'admin' | 'moderator' | 'organizer' | 'rider';

export interface User {
  id: string; // = uid do Firebase Auth
  name: string;
  /** Telefone validado por código no WhatsApp, formato E.164 (+5583999990000). Único. */
  phone: string;
  phoneVerifiedAt: ISODateTime;
  originCity: string;
  originUF: UF;
  originGeo?: GeoPoint; // preenchido a partir da cidade; base do "quem veio de mais longe"
  photoUrl?: string; // opcional, com consentimento (LGPD art. 7º, I)
  instagram?: string; // organizadores
  cpf?: string; // opcional, organizadores
  roles: Role[];
  /** Fase 3: moderador por estado. */
  moderatorUFs?: UF[];
  ageDeclaredAdult: true; // "Declaro ter 18 anos ou mais"
  termsAcceptedAt: ISODateTime;
  termsVersion: string;
  photoConsentAt?: ISODateTime;
  /** Pontos de check-in: base da gamificação (Fase 2). */
  points: number;
  /** Fase 2: condecorações exibidas no perfil compartilhável. */
  badges?: BadgeAward[];
  /** Fase 4: conta premium individual. */
  premium?: PremiumSubscriptionRef;
  /** Fase 3: autorização para o app parceiro de quilometragem ler check-ins. */
  partnerAppConsentAt?: ISODateTime;
  createdAt: ISODateTime;
  deletedAt?: ISODateTime; // exclusão/anonimização (LGPD), em até 30 dias
}

// ---------------------------------------------------------------- eventos

export type EventStatus = 'confirmado' | 'adiado' | 'cancelado';
export type ApprovalState = 'pendente' | 'aprovado' | 'recusado';

export type PlaceKind = 'evento' | 'camping' | 'hospedagem' | 'alimentacao' | 'apoio';

export interface Place {
  id: string;
  kind: PlaceKind;
  name: string;
  address?: string;
  geo?: GeoPoint; // pino no mapa; sem pino, "Como chegar" leva ao centro da cidade
}

export interface S2REvent {
  id: string;
  slug: string; // usado na URL: /evento/12-moto-fest-de-tal-cidade-2026
  name: string; // com edição: "12º Moto Fest de Tal Cidade"
  startDate: ISODate;
  endDate: ISODate;
  city: string;
  uf: UF;
  cityGeo?: GeoPoint;
  venue?: Place; // local principal
  places: Place[]; // camping, hospedagem, alimentação, pontos de apoio
  bannerUrl?: string; // banner com selo aplicado
  bannerOriginalUrl?: string; // original sem selo, para reprocessar se o selo mudar
  crestUrl?: string; // brasão/logo do evento ou organizador
  organizerWhatsApp?: string;
  instagram?: string;
  paid: boolean;
  priceText?: string; // "R$ 30" — só aparece se pago
  attractions?: string;
  emergencyPhone?: string;
  description?: string;
  status: EventStatus;
  approval: ApprovalState;
  rejectionReason?: string;
  /** Dono atual (organizador). Pode mudar pelo fluxo "Sou o organizador deste evento". */
  ownerId: string;
  createdBy: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  featured: boolean; // escolhido pelo admin para o espaço de destaque
  /** Fase 2/4: patrocínio e destaque pago. */
  sponsorship?: { sponsorName: string; until: ISODate; paid: boolean };
  checkin: {
    open: boolean;
    /** Segredo do QR Code; trocar invalida QR antigos. */
    token: string;
    openedAt?: ISODateTime;
    closedAt?: ISODateTime;
  };
  /** Links com miniatura para álbuns e coberturas (arquivo de eventos). */
  coverageLinks: CoverageLink[];
  /** Fase 2: arte "Eu vou" enviada pelo organizador, com o círculo marcado. */
  euVouArt?: { url: string; circle: { x: number; y: number; r: number } };
  /** Contadores desnormalizados (atualizados por Cloud Functions). */
  counters: EventCounters;
  /** Em duplicidade: aponta para o evento mantido após a junção. */
  mergedInto?: string;
}

export interface CoverageLink {
  url: string;
  title: string;
  thumbUrl?: string;
}

export interface EventCounters {
  views: number;
  directionsClicks: number;
  going: number;
  subscribers: number;
  checkins: number;
}

// ---------------------------------------------------------------- interações

/** "Eu vou" — subcoleção events/{id}/going/{userId}. */
export interface GoingMark {
  userId: string;
  eventId: string;
  createdAt: ISODateTime;
}

/**
 * Inscrição para avisos no WhatsApp. Uma por pessoa por alvo.
 * scope 'event' = "Receba atualizações deste evento" (pago pelo organizador, Fase 4)
 * scope 'agenda' = "Fique por dentro da agenda" (Canal grátis na Fase 1; premium na Fase 4)
 */
export interface Subscription {
  id: string;
  scope: 'event' | 'agenda';
  eventId?: string;
  userId?: string; // agenda pode ser só telefone
  phone: string;
  ufs?: UF[]; // premium: estados acompanhados
  consentAt: ISODateTime; // aceite explícito
  consentText: string; // texto exato aceito, para prova de consentimento
  revokedAt?: ISODateTime;
}

/**
 * Check-in: registro confiável e imutável, base da gamificação e do app parceiro.
 * ID determinístico `${eventId}_${userId}` garante um check-in por perfil por evento.
 */
export interface Checkin {
  id: string;
  eventId: string;
  userId: string;
  phone: string; // telefone validado (identidade do perfil)
  eventCity: string;
  eventUF: UF;
  originCity: string;
  originUF: UF;
  distanceKm?: number;
  createdAt: ISODateTime;
  pointsAwarded: number;
  voided?: { at: ISODateTime; reason: string }; // fraude
}

export interface Draw {
  id: string;
  eventId: string;
  winnerUserId: string;
  winnerName: string;
  winnerPhotoUrl?: string;
  poolSize: number; // quantos check-ins havia no momento
  drawnBy: string;
  createdAt: ISODateTime;
}

/** "Sou o organizador deste evento" — também usado para juntar duplicados. */
export interface OwnershipClaim {
  id: string;
  eventId: string;
  claimantId: string;
  message?: string;
  state: 'pendente' | 'aprovado' | 'recusado';
  createdAt: ISODateTime;
  decidedAt?: ISODateTime;
}

/** Notificações do painel do administrador. */
export interface AdminNotice {
  id: string;
  kind: 'novo_evento' | 'edicao' | 'reivindicacao';
  eventId: string;
  actorId: string;
  /** Para edições: campo → [antes, depois]. */
  diff?: Record<string, [unknown, unknown]>;
  createdAt: ISODateTime;
  readAt?: ISODateTime;
}

// ---------------------------------------------------------------- Fase 2

export interface BadgeAward {
  badgeId: string; // ex.: 'fominha-2027'
  title: string; // "Fominha de Eventos 2027"
  awardedAt: ISODateTime;
}

// ---------------------------------------------------------------- Fase 3

export interface MotoClub {
  id: string;
  name: string;
  crestUrl: string;
  city: string;
  uf: UF;
  verified: boolean; // aprovado pelo administrador do site
  createdAt: ISODateTime;
}

export interface ClubMembership {
  clubId: string;
  userId: string;
  role: 'gestor' | 'membro';
  state: 'pendente' | 'aprovado' | 'recusado';
  decidedBy?: string;
  createdAt: ISODateTime;
}

export interface ClubConfirmation {
  eventId: string;
  clubId: string;
  confirmedBy: string;
  motos: number;
  garupas: number; // total previsto de pessoas = motos + garupas
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------- Fase 4

export interface PremiumSubscriptionRef {
  planId: string;
  status: 'ativa' | 'inadimplente' | 'cancelada';
  monthlyMessageLimit: number;
  renewsAt: ISODate;
}

export interface MessagePackage {
  id: string;
  eventId: string;
  organizerId: string;
  priceCents: number;
  messageLimit: number;
  messagesUsed: number;
  paymentId: string;
  createdAt: ISODateTime;
}

export interface MessageLog {
  id: string;
  template: string; // modelo aprovado pela Meta
  category: 'utility' | 'authentication' | 'marketing';
  phone: string;
  eventId?: string;
  costCents: number; // custo estimado da Meta
  paidBy: { kind: 'package' | 'premium' | 'club' | 'auth'; refId: string };
  createdAt: ISODateTime;
}

export interface Payment {
  id: string;
  provider: 'mercadopago' | 'asaas';
  kind: 'pacote_evento' | 'premium_individual' | 'premium_motoclube' | 'destaque';
  amountCents: number;
  status: 'pendente' | 'pago' | 'estornado';
  userId: string;
  refId: string;
  createdAt: ISODateTime;
}

// ---------------------------------------------------------------- métricas

/** Agregado diário (Cloud Function agrega eventos brutos de analytics). */
export interface DailyMetrics {
  date: ISODate;
  visits: number;
  byUF: Record<string, number>;
  byCity: Record<string, number>;
  agendaShares: number;
}
