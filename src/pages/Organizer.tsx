import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import type { Draw, S2REvent } from '../domain/types';
import { formatDateTime, formatLongRange } from '../domain/dates';
import {
  addCoverageLink, becomeOrganizer, currentUser, drawWinner, hasRole, setCheckinOpen, setStatus, useStore,
} from '../data/store';
import { BRAND, SITE } from '../lib/brand';
import { loadImage, shareOrDownload } from '../lib/art';
import { Avatar, IconDice, useTitle, useToast } from '../components/ui';

const APPROVAL_LABEL = { pendente: 'Aguardando aprovação', aprovado: 'Publicado', recusado: 'Recusado' } as const;

export function OrganizerHome() {
  useTitle('Meus eventos');
  const me = useStore(currentUser);
  const events = useStore((s) => s.events.filter((e) => e.ownerId === s.sessionUserId && !e.mergedInto).sort((a, b) => b.startDate.localeCompare(a.startDate)));
  const [insta, setInsta] = useState('');
  if (!me) return <Navigate to="/entrar?volta=/organizador&perfil=organizador" replace />;

  if (!hasRole(me, 'organizer')) {
    return (
      <div className="page">
        <h1>Cadastrar evento</h1>
        <p className="lede">Para cadastrar eventos, informe o Instagram seu ou do evento. Ele aparece como botão na página do evento.</p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^@?[\w.]{2,30}$/.test(insta.trim())) becomeOrganizer('@' + insta.trim().replace(/^@/, ''));
          }}
        >
          <div className="field">
            <label htmlFor="oi">Instagram</label>
            <input id="oi" type="text" placeholder="@seuevento" value={insta} onChange={(e) => setInsta(e.target.value)} />
          </div>
          <button className="btn primary" type="submit">
            Continuar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Meus eventos</h1>
      <p className="lede">Cadastre, acompanhe quem vai, abra o check-in e faça o sorteio.</p>
      <Link className="btn primary block" to="/organizador/novo">
        Cadastrar evento
      </Link>
      <div className="list" style={{ marginTop: 16 }}>
        {events.length === 0 && <p className="hint">Você ainda não tem eventos. Cadastre o primeiro: é grátis.</p>}
        {events.map((e) => (
          <div className="item" key={e.id}>
            <Link className="t" to={`/organizador/evento/${e.id}`}>
              {e.name}
            </Link>
            <span className="s">
              {formatLongRange(e.startDate, e.endDate)} · {e.city}/{e.uf} · {APPROVAL_LABEL[e.approval]}
              {e.status !== 'confirmado' && ` · ${e.status.toUpperCase()}`}
            </span>
            {e.approval === 'recusado' && e.rejectionReason && <span className="err">Motivo: {e.rejectionReason}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

type Tab = 'checkin' | 'presenca' | 'numeros' | 'arquivo';

export function OrganizerEventPanel() {
  const { id } = useParams();
  const me = useStore(currentUser);
  const ev = useStore((s) => s.events.find((e) => e.id === id), [id]);
  const [tab, setTab] = useState<Tab>('checkin');
  const toast = useToast();
  useTitle(ev ? `Painel: ${ev.name}` : 'Painel do evento');
  if (!me) return <Navigate to={`/entrar?volta=/organizador/evento/${id}`} replace />;
  if (!ev) return <Navigate to="/organizador" replace />;
  if (ev.ownerId !== me.id && !hasRole(me, 'admin'))
    return (
      <div className="page">
        <h1>Sem acesso</h1>
        <p className="lede">Este evento é gerenciado por outra conta. Se você é o organizador, use "Sou o organizador deste evento" na página do evento.</p>
      </div>
    );

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <div className="panel-ev-head">
        <h1>{ev.name}</h1>
        <div className="s">
          {formatLongRange(ev.startDate, ev.endDate)} · {ev.city}/{ev.uf} · {APPROVAL_LABEL[ev.approval]}
        </div>
      </div>
      <div className="contact-row" style={{ margin: '12px 0' }}>
        <Link className="btn small" to={`/organizador/evento/${ev.id}/editar`}>
          Editar evento
        </Link>
        {ev.approval === 'aprovado' && (
          <Link className="btn small" to={`/evento/${ev.slug}`}>
            Ver página
          </Link>
        )}
        <select
          aria-label="Status do evento"
          className="btn small"
          value={ev.status}
          onChange={(e) => {
            setStatus(ev.id, e.target.value as S2REvent['status']);
            toast('Status atualizado na agenda.');
          }}
        >
          <option value="confirmado">Confirmado</option>
          <option value="adiado">Adiado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="tabs" role="tablist">
        {(
          [
            ['checkin', 'Check-in e sorteio'],
            ['presenca', 'Quem vai'],
            ['numeros', 'Números'],
            ['arquivo', 'Fotos e cobertura'],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'checkin' && <CheckinTab ev={ev} />}
      {tab === 'presenca' && <GoingTab ev={ev} />}
      {tab === 'numeros' && <NumbersTab ev={ev} />}
      {tab === 'arquivo' && <CoverageTab ev={ev} />}
    </div>
  );
}

export function checkinUrl(ev: S2REvent) {
  const path = `/checkin/${ev.id}/${ev.checkin.token}`;
  if (__DEMO_BUILD__) return `${location.origin}${location.pathname}#${path}`;
  return `https://${SITE}${path}`;
}

function CheckinTab({ ev }: { ev: S2REvent }) {
  const toast = useToast();
  const [qr, setQr] = useState('');
  const [posterImg, setPoster] = useState('');
  const url = checkinUrl(ev);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 600, errorCorrectionLevel: 'M' }).then(setQr);
  }, [url]);

  const poster = async () => {
    const c = document.createElement('canvas');
    c.width = 1240;
    c.height = 1754; // A4 a 150 dpi
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, 260);
    const logo = await loadImage(BRAND.logoDark);
    const lw = 560;
    ctx.drawImage(logo, (c.width - lw) / 2, 40, lw, (logo.height / logo.width) * lw);
    ctx.textAlign = 'center';
    ctx.font = 'italic 800 110px "Barlow Condensed", Arial';
    ctx.fillText('Faça seu check-in', c.width / 2, 420);
    ctx.font = '600 44px "Barlow Semi Condensed", Arial';
    ctx.fillText(ev.name, c.width / 2, 500);
    const q = await loadImage(qr);
    ctx.drawImage(q, (c.width - 820) / 2, 560, 820, 820);
    ctx.font = '500 40px "Barlow Semi Condensed", Arial';
    ctx.fillText('Aponte a câmera do celular para o código.', c.width / 2, 1460);
    ctx.fillText('Sem cadastro? Você faz na hora, em menos de um minuto.', c.width / 2, 1515);
    ctx.fillStyle = '#FF6600';
    ctx.fillRect(0, c.height - 120, c.width, 120);
    ctx.fillStyle = '#000';
    ctx.font = '700 48px "Barlow Semi Condensed", Arial';
    ctx.fillText(SITE, c.width / 2, c.height - 45);
    setPoster(c.toDataURL('image/png'));
    c.toBlob((b) => b && shareOrDownload(b, `checkin-${ev.slug}.png`, ev.name));
  };

  return (
    <>
      <div className={`checkin-state ${ev.checkin.open ? 'open' : ''}`}>
        <div>
          <span className="dot" />
          <strong>{ev.checkin.open ? 'Check-in aberto' : 'Check-in fechado'}</strong>
          <div className="hint">
            {ev.counters.checkins} {ev.counters.checkins === 1 ? 'check-in' : 'check-ins'}
            {ev.checkin.open ? '. O QR Code funciona agora.' : '. O QR Code só funciona com o check-in aberto.'}
          </div>
        </div>
        <button
          className={`btn ${ev.checkin.open ? '' : 'green'}`}
          onClick={() => {
            setCheckinOpen(ev.id, !ev.checkin.open);
            toast(ev.checkin.open ? 'Check-in fechado.' : 'Check-in aberto.');
          }}
        >
          {ev.checkin.open ? 'Fechar check-in' : 'Abrir check-in'}
        </button>
      </div>

      <div className="qr-box">
        {qr && <img src={qr} alt="QR Code de check-in do evento" />}
        <div>
          <p style={{ margin: '0 0 8px' }}>Imprima e exponha no local. Um código por evento: uma leitura por pessoa.</p>
          <div className="contact-row">
            <button className="btn small dark" onClick={poster} disabled={!qr}>
              Baixar cartaz para imprimir
            </button>
            {__DEMO_BUILD__ && (
              <Link className="btn small" to={`/checkin/${ev.id}/${ev.checkin.token}`}>
                Simular leitura do QR
              </Link>
            )}
          </div>
        </div>
      </div>

      {posterImg && (
        <figure style={{ margin: '12px 0 0' }}>
          <img src={posterImg} alt="Cartaz de check-in para imprimir" style={{ maxWidth: 260, border: '1px solid var(--rule)' }} />
          <figcaption className="hint">Cartaz A4 com o QR Code. No site, o arquivo é baixado para imprimir.</figcaption>
        </figure>
      )}

      <h2>Sorteio</h2>
      <DrawBox ev={ev} />

      <h2>Quem veio de mais longe</h2>
      <FarthestTable ev={ev} />
    </>
  );
}

function DrawBox({ ev }: { ev: S2REvent }) {
  const pool = useStore((s) => s.checkins.filter((c) => c.eventId === ev.id && !c.voided), [ev.id]);
  const users = useStore((s) => s.users);
  const draws = useStore((s) => s.draws.filter((d) => d.eventId === ev.id), [ev.id]);
  const [phase, setPhase] = useState<'idle' | 'spin' | 'done'>('idle');
  const [shown, setShown] = useState<string>('');
  const [winner, setWinner] = useState<Draw | null>(null);
  const timer = useRef<number>();

  const names = pool.map((c) => users.find((u) => u.id === c.userId)?.name ?? '');
  const run = () => {
    setPhase('spin');
    setWinner(null);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;
    timer.current = window.setInterval(() => setShown(names[i++ % names.length]), 70);
    window.setTimeout(
      () => {
        clearInterval(timer.current);
        const d = drawWinner(ev.id);
        setWinner(d);
        setPhase('done');
      },
      reduce ? 50 : 2200
    );
  };
  useEffect(() => () => clearInterval(timer.current), []);

  const w = winner && users.find((u) => u.id === winner.winnerUserId);
  return (
    <>
      <div className={`draw-stage ${phase === 'spin' ? 'spinning' : ''} ${phase === 'done' ? 'done' : ''}`} aria-live="polite">
        {phase === 'idle' && (
          <div>
            <div className="big">{pool.length} no sorteio</div>
            <div className="sub">Entram todos que fizeram check-in até agora.</div>
          </div>
        )}
        {phase === 'spin' && <div className="big">{shown}</div>}
        {phase === 'done' && winner && (
          <div style={{ position: 'relative' }}>
            <Avatar name={winner.winnerName} src={winner.winnerPhotoUrl} />
            <div className="big">{winner.winnerName}</div>
            <div className="sub">
              {w?.originCity}/{w?.originUF} · sorteado entre {winner.poolSize}
            </div>
          </div>
        )}
      </div>
      <button className="btn primary block" onClick={run} disabled={!pool.length || phase === 'spin'}>
        <IconDice /> {phase === 'done' ? 'Sortear de novo' : 'Sortear'}
      </button>
      <p className="hint">O site só sorteia o nome. Prêmios e regras são do organizador. Cada resultado fica registrado.</p>
      {draws.length > 0 && (
        <table className="table-simple" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>Sorteado</th>
              <th>Quando</th>
              <th style={{ textAlign: 'right' }}>Entre</th>
            </tr>
          </thead>
          <tbody>
            {draws.map((d) => (
              <tr key={d.id}>
                <td>{d.winnerName}</td>
                <td>{formatDateTime(d.createdAt)}</td>
                <td className="num">{d.poolSize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function FarthestTable({ ev }: { ev: S2REvent }) {
  const rows = useStore((s) =>
    s.checkins
      .filter((c) => c.eventId === ev.id && !c.voided)
      .map((c) => ({ c, u: s.users.find((u) => u.id === c.userId)! }))
      .sort((a, b) => (b.c.distanceKm ?? -1) - (a.c.distanceKm ?? -1)),
    [ev.id]
  );
  if (!rows.length) return <p className="hint">A lista aparece conforme as pessoas fazem check-in.</p>;
  return (
    <table className="table-simple">
      <thead>
        <tr>
          <th>Motociclista</th>
          <th>Veio de</th>
          <th style={{ textAlign: 'right' }}>km</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ c, u }) => (
          <tr key={c.id}>
            <td>
              <span className="who">
                <Avatar name={u.name} src={u.photoUrl} />
                {u.name}
              </span>
            </td>
            <td>
              {c.originCity}/{c.originUF}
            </td>
            <td className="num">{c.distanceKm ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GoingTab({ ev }: { ev: S2REvent }) {
  const rows = useStore((s) => s.going.filter((g) => g.eventId === ev.id).map((g) => s.users.find((u) => u.id === g.userId)!).filter(Boolean), [ev.id]);
  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="v">{ev.counters.going}</div>
          <div className="l">marcaram "Eu vou"</div>
        </div>
        <div className="stat">
          <div className="v">{ev.counters.subscribers}</div>
          <div className="l">pediram atualizações</div>
        </div>
      </div>
      <p className="notice warn" style={{ marginTop: 12 }}>
        Os inscritos ficam registrados. O envio de avisos pelo WhatsApp para eles chega com o pacote de avisos do organizador, numa próxima fase.
      </p>
      <h2>Quem marcou "Eu vou"</h2>
      {rows.length === 0 ? (
        <p className="hint">Ninguém marcou ainda. Divulgue o link do evento nos grupos.</p>
      ) : (
        <div className="list">
          {rows.map((u) => (
            <div className="item" key={u.id}>
              <span className="who">
                <Avatar name={u.name} src={u.photoUrl} />
                <span>
                  <span className="t">{u.name}</span>
                  <br />
                  <span className="s">
                    {u.originCity}/{u.originUF}
                  </span>
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="hint">Por privacidade, o telefone das pessoas não aparece para o organizador.</p>
    </>
  );
}

function NumbersTab({ ev }: { ev: S2REvent }) {
  const c = ev.counters;
  const items: [number, string][] = [
    [c.views, 'visualizações da página'],
    [c.directionsClicks, 'cliques em "Como chegar"'],
    [c.going, 'toques em "Eu vou"'],
    [c.euVouShares ?? 0, 'artes "Eu vou" compartilhadas'],
    [c.subscribers, 'inscritos para atualizações'],
    [c.checkins, 'check-ins'],
  ];
  return (
    <div className="stats">
      {items.map(([v, l]) => (
        <div className="stat" key={l}>
          <div className="v">{v.toLocaleString('pt-BR')}</div>
          <div className="l">{l}</div>
        </div>
      ))}
    </div>
  );
}

function CoverageTab({ ev }: { ev: S2REvent }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const toast = useToast();
  return (
    <>
      <p className="lede">Depois do evento, ele vai para o arquivo. Adicione links para álbuns de fotógrafos e coberturas em outros sites. As fotos não ficam hospedadas aqui.</p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            new URL(url);
          } catch {
            return toast('Cole um link completo, começando com https://');
          }
          addCoverageLink(ev.id, { url, title: title || 'Álbum de fotos' });
          setUrl('');
          setTitle('');
          toast('Link adicionado.');
        }}
      >
        <div className="field">
          <label htmlFor="cu">Link</label>
          <input id="cu" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ct">Título</label>
          <input id="ct" type="text" placeholder="Fotos de Fulano Fotografia" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <button className="btn dark" type="submit">
          Adicionar link
        </button>
      </form>
      {ev.coverageLinks.length > 0 && (
        <div className="list" style={{ marginTop: 14 }}>
          {ev.coverageLinks.map((l, i) => (
            <div className="item" key={i}>
              <a className="t" href={l.url} target="_blank" rel="noreferrer">
                {l.title}
              </a>
              <span className="s">{l.url}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
