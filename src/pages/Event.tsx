import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Place, S2REvent } from '../domain/types';
import { formatLongRange, todayISO } from '../domain/dates';
import { directionsLinks } from '../domain/geo';
import {
  EVENT_CONSENT_TEXT, chronological, claimEvent, currentUser, hasRole, setEventSubscription, toggleGoing,
  trackDirections, trackView, useStore,
} from '../data/store';
import { eventArt } from '../lib/art';
import { IconBell, IconChat, IconCamera, IconCheck, IconPhone, IconRoute, Modal, useTitle, useToast } from '../components/ui';

const KIND_LABEL: Record<Place['kind'], string> = {
  evento: 'Local do evento', camping: 'Camping', hospedagem: 'Hospedagem', alimentacao: 'Alimentação', apoio: 'Ponto de apoio',
};

export function EventPage() {
  const { slug } = useParams();
  const ev = useStore((s) => s.events.find((e) => e.slug === slug), [slug]);
  const order = useStore(chronological);
  const me = useStore(currentUser);
  const going = useStore((s) => !!ev && !!me && s.going.some((g) => g.eventId === ev.id && g.userId === me.id), [ev, me]);
  const subscribed = useStore((s) => !!ev && !!me && s.subs.some((x) => x.scope === 'event' && x.eventId === ev.id && x.userId === me.id && !x.revokedAt), [ev, me]);
  const nav = useNavigate();
  const toast = useToast();
  const [consent, setConsent] = useState(false);
  const [claim, setClaim] = useState(false);
  useTitle(ev?.name ?? 'Evento');

  useEffect(() => {
    if (ev) trackView(ev.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev?.id]);

  if (!ev || ev.approval !== 'aprovado') {
    return (
      <div className="page">
        <h1>Evento não encontrado</h1>
        <p className="lede">O link pode estar errado ou o evento saiu da agenda.</p>
        <Link className="btn dark" to="/">
          Voltar à agenda
        </Link>
      </div>
    );
  }

  const idx = order.findIndex((e) => e.id === ev.id);
  const prev = order[idx - 1];
  const next = order[idx + 1];
  const past = ev.endDate < todayISO();
  const isOwner = me?.id === ev.ownerId;
  const back = `/evento/${ev.slug}`;
  const needLogin = (acao: string) => nav(`/entrar?volta=${encodeURIComponent(back)}&acao=${acao}`);

  return (
    <article className="ev-page">
      <Banner ev={ev} />

      <header className="ev-head">
        <h1>{ev.name}</h1>
        <div className="ev-meta">
          <strong>{formatLongRange(ev.startDate, ev.endDate)}</strong>
          <span>
            {ev.city} · {ev.uf}
          </span>
          {ev.status !== 'confirmado' && <span className={`status-pill ${ev.status}`}>{ev.status === 'adiado' ? 'ADIADO' : 'CANCELADO'}</span>}
          {past && <span className="status-pill">Realizado</span>}
          {ev.paid && ev.priceText && <span className="price">{ev.priceText}</span>}
        </div>
      </header>

      {!past && (
        <div className="ev-main-cta">
          <Directions place={ev.venue} ev={ev} primary />

          <div className="go-with">
            <button
              className={`btn ${going ? 'on' : ''}`}
              aria-pressed={going}
              onClick={() => {
                if (!me) return needLogin('euvou');
                toggleGoing(ev.id);
                toast(going ? 'Você saiu da lista de presença.' : 'Pronto: o organizador sabe que você vai.');
              }}
            >
              {going ? <IconCheck /> : null}
              {going ? 'Eu vou' : 'Eu vou'}
            </button>
            <button
              className={`btn ${subscribed ? 'on' : ''}`}
              aria-pressed={subscribed}
              onClick={() => {
                if (!me) return needLogin('avisos');
                if (subscribed) {
                  setEventSubscription(ev.id, false);
                  toast('Você não vai mais receber avisos deste evento.');
                } else setConsent(true);
              }}
            >
              <IconBell /> {subscribed ? 'Recebendo atualizações' : 'Receba atualizações'}
            </button>
          </div>
          <p className="hint">
            {ev.counters.going > 0 && `${ev.counters.going} ${ev.counters.going === 1 ? 'pessoa vai' : 'pessoas vão'}. `}
            {going && 'Você está na lista do organizador.'}
          </p>
        </div>
      )}

      {ev.places.length > 0 && !past && (
        <details className="more">
          <summary>Ver mais locais</summary>
          {ev.places.map((p) => (
            <div className="place" key={p.id}>
              <div>
                <div className="k">{KIND_LABEL[p.kind]}</div>
                <div className="nm">{p.name}</div>
              </div>
              <Directions place={p} ev={ev} />
            </div>
          ))}
        </details>
      )}

      {ev.attractions && (
        <section className="ev-section">
          <h2>Atrações</h2>
          <p>{ev.attractions}</p>
        </section>
      )}
      {ev.description && (
        <section className="ev-section">
          <h2>Sobre</h2>
          <p>{ev.description}</p>
        </section>
      )}

      {(ev.organizerWhatsApp || ev.instagram || ev.emergencyPhone) && (
        <section className="ev-section">
          <h2>Contato do organizador</h2>
          <div className="contact-row">
            {ev.organizerWhatsApp && (
              <a className="btn small" href={`https://wa.me/${ev.organizerWhatsApp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                <IconChat /> WhatsApp
              </a>
            )}
            {ev.instagram && (
              <a className="btn small" href={`https://instagram.com/${ev.instagram.replace('@', '')}`} target="_blank" rel="noreferrer">
                <IconCamera /> {ev.instagram}
              </a>
            )}
            {ev.emergencyPhone && (
              <a className="btn small danger" href={`tel:${ev.emergencyPhone.replace(/\D/g, '')}`}>
                <IconPhone /> Emergência {ev.emergencyPhone}
              </a>
            )}
          </div>
        </section>
      )}

      {past && ev.coverageLinks.length > 0 && (
        <section className="ev-section">
          <h2>Fotos e cobertura</h2>
          <CoverageList ev={ev} />
        </section>
      )}

      <nav className="ev-nav" aria-label="Outros eventos">
        {prev ? (
          <Link to={`/evento/${prev.slug}`}>
            <span className="lbl">Evento anterior</span>
            <span className="nm">{prev.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="next" to={`/evento/${next.slug}`}>
            <span className="lbl">Próximo evento</span>
            <span className="nm">{next.name}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <p style={{ marginTop: 14 }}>
        <Link className="btn dark block" to="/">
          Voltar à agenda
        </Link>
      </p>

      {isOwner || hasRole(me, 'admin') ? (
        <p className="claim">
          <Link to={`/organizador/evento/${ev.id}`}>Abrir o painel deste evento</Link>
        </p>
      ) : (
        <p className="claim">
          <button className="link-btn" onClick={() => (me ? setClaim(true) : needLogin('organizador'))}>
            Sou o organizador deste evento
          </button>
        </p>
      )}

      {consent && (
        <Modal title="Receber atualizações" onClose={() => setConsent(false)}>
          <p>
            Você vai receber no WhatsApp <strong>{me?.phone}</strong> as mudanças de data, local e status do <strong>{ev.name}</strong> enviadas pelo organizador.
          </p>
          <p className="notice">{EVENT_CONSENT_TEXT}</p>
          <button
            className="btn primary block"
            onClick={() => {
              setEventSubscription(ev.id, true);
              setConsent(false);
              toast('Inscrição confirmada.');
            }}
          >
            Confirmo, quero receber
          </button>
        </Modal>
      )}
      {claim && <ClaimModal ev={ev} onClose={() => setClaim(false)} />}
    </article>
  );
}

function Banner({ ev }: { ev: S2REvent }) {
  const [art, setArt] = useState<string | null>(null);
  useEffect(() => {
    if (ev.bannerUrl) return;
    let alive = true;
    eventArt(ev, 'feed').then((u) => alive && setArt(u));
    return () => {
      alive = false;
    };
  }, [ev]);
  const src = ev.bannerUrl ?? art;
  return (
    <div className="ev-banner" style={{ aspectRatio: src ? undefined : '4 / 5' }}>
      {src && <img src={src} alt={`Banner do ${ev.name}`} />}
    </div>
  );
}

function Directions({ place, ev, primary }: { place?: Place; ev: S2REvent; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  const l = directionsLinks(place, ev.city, ev.uf);
  const go = () => trackDirections(ev.id);
  if (!primary) {
    return (
      <span style={{ display: 'flex', gap: 6 }}>
        <a className="btn small" href={l.google} target="_blank" rel="noreferrer" onClick={go} aria-label={`Como chegar: ${place?.name} pelo Google Maps`}>
          Maps
        </a>
        <a className="btn small" href={l.waze} target="_blank" rel="noreferrer" onClick={go} aria-label={`Como chegar: ${place?.name} pelo Waze`}>
          Waze
        </a>
      </span>
    );
  }
  return (
    <div>
      {!open ? (
        <button className="btn primary block" onClick={() => setOpen(true)} aria-expanded={open}>
          <IconRoute /> Como chegar
        </button>
      ) : (
        <div className="go-with">
          <a className="btn primary" href={l.google} target="_blank" rel="noreferrer" onClick={go}>
            Google Maps
          </a>
          <a className="btn primary" href={l.waze} target="_blank" rel="noreferrer" onClick={go}>
            Waze
          </a>
        </div>
      )}
      <p className="hint">{l.exact ? `Leva direto a: ${place?.name}.` : 'O organizador ainda não marcou o local exato: o mapa leva ao centro da cidade.'}</p>
    </div>
  );
}

export function CoverageList({ ev }: { ev: S2REvent }) {
  return (
    <div className="links">
      {ev.coverageLinks.map((c, i) => (
        <a key={i} className="cov" href={c.url} target="_blank" rel="noreferrer">
          {c.thumbUrl ? <img className="th" src={c.thumbUrl} alt="" /> : <span className="th">Álbum</span>}
          <span>
            <strong>{c.title}</strong>
            <br />
            <span className="hint">{new URL(c.url).hostname.replace('www.', '')}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

function ClaimModal({ ev, onClose }: { ev: S2REvent; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const toast = useToast();
  return (
    <Modal title="Assumir este evento" onClose={onClose}>
      <p>
        Peça para gerenciar o <strong>{ev.name}</strong>. O administrador confere e, se aprovar, o evento passa para a sua conta.
      </p>
      <div className="field">
        <label htmlFor="cm">Como podemos confirmar que você organiza o evento?</label>
        <textarea id="cm" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: sou da comissão organizadora; o Instagram oficial é @…" />
      </div>
      <p className="hint">Se o mesmo evento foi cadastrado duas vezes, diga aqui: o administrador junta os dois.</p>
      <button
        className="btn primary block"
        onClick={() => {
          claimEvent(ev.id, msg);
          onClose();
          toast('Pedido enviado ao administrador.');
        }}
      >
        Enviar pedido
      </button>
    </Modal>
  );
}
