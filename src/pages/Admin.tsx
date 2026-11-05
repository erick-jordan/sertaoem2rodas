import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { S2REvent } from '../domain/types';
import { formatDateTime, formatDays, formatLongRange, parseISODate, todayISO, toISODate } from '../domain/dates';
import {
  currentUser, decideApproval, decideClaim, hasRole, markNoticeRead, mergeEvents, setFeatured, upcomingEvents, useStore,
} from '../data/store';
import { agendaImage, shareOrDownload } from '../lib/art';
import { SITE } from '../lib/brand';
import { useTitle, useToast } from '../components/ui';

type Tab = 'pendentes' | 'avisos' | 'pedidos' | 'destaque' | 'eventos' | 'canal' | 'metricas';

const FIELD_LABEL: Record<string, string> = {
  name: 'Nome', startDate: 'Início', endDate: 'Término', city: 'Cidade', uf: 'UF', status: 'Status', paid: 'Pago',
  priceText: 'Valor', attractions: 'Atrações', description: 'Descrição', emergencyPhone: 'Emergência', organizerWhatsApp: 'WhatsApp', instagram: 'Instagram',
};

export function AdminPage() {
  useTitle('Painel do administrador');
  const me = useStore(currentUser);
  const pending = useStore((s) => s.events.filter((e) => e.approval === 'pendente'));
  const unread = useStore((s) => s.notices.filter((n) => !n.readAt).length);
  const claims = useStore((s) => s.claims.filter((c) => c.state === 'pendente').length);
  const [tab, setTab] = useState<Tab>('pendentes');

  if (!me) return <Navigate to="/entrar?volta=/admin" replace />;
  if (!hasRole(me, 'admin'))
    return (
      <div className="page">
        <h1>Área do administrador</h1>
        <p className="lede">Sua conta não tem acesso a esta área.</p>
      </div>
    );

  const tabs: [Tab, string, number?][] = [
    ['pendentes', 'Aprovar', pending.length],
    ['avisos', 'Notificações', unread],
    ['pedidos', 'Pedidos', claims],
    ['destaque', 'Destaque'],
    ['eventos', 'Eventos'],
    ['canal', 'Canal do WhatsApp'],
    ['metricas', 'Métricas'],
  ];

  return (
    <div className="page">
      <h1>Painel do administrador</h1>
      <div className="tabs" role="tablist">
        {tabs.map(([k, l, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}
            {!!n && <span className="count">{n}</span>}
          </button>
        ))}
      </div>
      {tab === 'pendentes' && <Pending events={pending} />}
      {tab === 'avisos' && <Notices />}
      {tab === 'pedidos' && <Claims />}
      {tab === 'destaque' && <Featured />}
      {tab === 'eventos' && <AllEvents />}
      {tab === 'canal' && <Channel />}
      {tab === 'metricas' && <Metrics />}
    </div>
  );
}

function useUserName() {
  const users = useStore((s) => s.users);
  return (id: string) => users.find((u) => u.id === id)?.name ?? 'Conta removida';
}

function Pending({ events }: { events: S2REvent[] }) {
  const name = useUserName();
  const toast = useToast();
  const [refusing, setRefusing] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  if (!events.length) return <p className="hint">Nenhum evento aguardando aprovação.</p>;
  return (
    <div className="list">
      {events.map((e) => (
        <div className="item" key={e.id}>
          <span className="t">{e.name}</span>
          <span className="s">
            {formatLongRange(e.startDate, e.endDate)} · {e.city}/{e.uf} · enviado por {name(e.createdBy)}
            {e.instagram && ` · ${e.instagram}`}
          </span>
          <div className="acts">
            <button
              className="btn small green"
              onClick={() => {
                decideApproval(e.id, true);
                toast('Evento publicado na agenda.');
              }}
            >
              Aprovar
            </button>
            <button className="btn small danger" onClick={() => setRefusing(refusing === e.id ? null : e.id)}>
              Recusar
            </button>
            <Link className="btn small" to={`/organizador/evento/${e.id}/editar`}>
              Revisar dados
            </Link>
          </div>
          {refusing === e.id && (
            <form
              className="form"
              onSubmit={(x) => {
                x.preventDefault();
                decideApproval(e.id, false, reason.trim() || 'Dados incompletos.');
                setRefusing(null);
                setReason('');
                toast('Evento recusado.');
              }}
            >
              <div className="field">
                <label htmlFor={`rr-${e.id}`}>Motivo da recusa (o organizador vai ver)</label>
                <input id={`rr-${e.id}`} type="text" value={reason} onChange={(x) => setReason(x.target.value)} placeholder="Ex.: falta a data de término" />
              </div>
              <button className="btn small danger" type="submit">
                Confirmar recusa
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

function Notices() {
  const notices = useStore((s) => s.notices);
  const events = useStore((s) => s.events);
  const name = useUserName();
  const label = { novo_evento: 'Novo evento', edicao: 'Edição', reivindicacao: 'Pedido de organizador' };
  if (!notices.length) return <p className="hint">Nenhuma notificação.</p>;
  return (
    <div className="list">
      {notices.map((n) => {
        const ev = events.find((e) => e.id === n.eventId);
        return (
          <div className="item" key={n.id} style={{ opacity: n.readAt ? 0.6 : 1 }}>
            <span className="t">
              {label[n.kind]}: {ev?.name}
            </span>
            <span className="s">
              {name(n.actorId)} · {formatDateTime(n.createdAt)}
            </span>
            {n.diff && (
              <div className="diff">
                {Object.entries(n.diff).map(([k, [a, b]]) => (
                  <div key={k}>
                    <strong>{FIELD_LABEL[k] ?? k}:</strong> <del>{String(a ?? '—')}</del> → <ins>{String(b ?? '—')}</ins>
                  </div>
                ))}
              </div>
            )}
            {!n.readAt && (
              <div className="acts">
                <button className="btn small" onClick={() => markNoticeRead(n.id)}>
                  Marcar como vista
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Claims() {
  const claims = useStore((s) => s.claims);
  const events = useStore((s) => s.events.filter((e) => e.approval === 'aprovado' && !e.mergedInto));
  const name = useUserName();
  const toast = useToast();
  const [keep, setKeep] = useState('');
  const [drop, setDrop] = useState('');
  return (
    <>
      {claims.length === 0 ? (
        <p className="hint">Nenhum pedido.</p>
      ) : (
        <div className="list">
          {claims.map((c) => {
            const ev = events.find((e) => e.id === c.eventId);
            return (
              <div className="item" key={c.id}>
                <span className="t">
                  {name(c.claimantId)} quer assumir {ev?.name}
                </span>
                {c.message && <span className="s">“{c.message}”</span>}
                <span className="s">
                  {formatDateTime(c.createdAt)} · {c.state}
                </span>
                {c.state === 'pendente' && (
                  <div className="acts">
                    <button
                      className="btn small green"
                      onClick={() => {
                        decideClaim(c.id, true);
                        toast('O evento passou para o organizador.');
                      }}
                    >
                      Aprovar
                    </button>
                    <button className="btn small danger" onClick={() => decideClaim(c.id, false)}>
                      Recusar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <h2>Juntar eventos duplicados</h2>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!keep || !drop || keep === drop) return toast('Escolha dois eventos diferentes.');
          mergeEvents(keep, drop);
          toast('Eventos juntados. "Eu vou" e inscritos foram somados.');
          setDrop('');
        }}
      >
        <div className="field">
          <label htmlFor="mk">Manter</label>
          <select id="mk" value={keep} onChange={(e) => setKeep(e.target.value)}>
            <option value="">Escolha…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.city}/{e.uf})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="md">Remover (duplicado)</label>
          <select id="md" value={drop} onChange={(e) => setDrop(e.target.value)}>
            <option value="">Escolha…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.city}/{e.uf})
              </option>
            ))}
          </select>
        </div>
        <button className="btn dark" type="submit">
          Juntar
        </button>
      </form>
    </>
  );
}

function Featured() {
  const events = useStore((s) => upcomingEvents(s));
  return (
    <>
      <p className="lede">A faixa no topo da agenda mostra estes eventos em rodízio. Quando houver patrocinadores, eles ocupam esse espaço.</p>
      <div className="list">
        {events.map((e) => (
          <label className="item check" key={e.id} style={{ display: 'flex' }}>
            <input type="checkbox" checked={e.featured} onChange={(x) => setFeatured(e.id, x.target.checked)} />
            <span>
              <strong>{e.name}</strong>
              <br />
              <span className="hint">
                {formatDays(e.startDate, e.endDate)}/{e.startDate.slice(5, 7)} · {e.city}/{e.uf}
              </span>
            </span>
          </label>
        ))}
      </div>
    </>
  );
}

function AllEvents() {
  const all = useStore((s) => s.events.filter((e) => !e.mergedInto).sort((a, b) => a.startDate.localeCompare(b.startDate)));
  const [q, setQ] = useState('');
  const list = all.filter((e) => `${e.name} ${e.city} ${e.uf}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <p className="lede">Para a carga inicial: eventos cadastrados por aqui entram direto na agenda, sem aprovação.</p>
      <Link className="btn primary block" to="/organizador/novo">
        Cadastrar evento
      </Link>
      <div className="field" style={{ margin: '14px 0' }}>
        <label htmlFor="aq">Buscar</label>
        <input id="aq" type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, cidade ou UF" />
      </div>
      <table className="table-simple">
        <thead>
          <tr>
            <th>Data</th>
            <th>Evento</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{e.startDate.split('-').reverse().join('/')}</td>
              <td>
                <Link to={`/organizador/evento/${e.id}`}>{e.name}</Link>
                <div className="hint">
                  {e.city}/{e.uf}
                </div>
              </td>
              <td>
                {e.approval}
                {e.status !== 'confirmado' && ` · ${e.status}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Agenda geral grátis: o site gera o texto e a imagem da semana; o admin posta no Canal. */
function Channel() {
  const events = useStore((s) => upcomingEvents(s));
  const toast = useToast();
  const [days, setDays] = useState(14);
  const today = todayISO();
  const limit = useMemo(() => {
    const d = parseISODate(today);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }, [today, days]);
  const list = events.filter((e) => e.startDate <= limit);
  const text = useMemo(() => {
    const lines = [`🏍️ *Agenda Sertão em 2 Rodas* — próximos ${days} dias`, ''];
    for (const e of list) {
      const st = e.status === 'adiado' ? ' — *ADIADO*' : e.status === 'cancelado' ? ' — *CANCELADO*' : '';
      lines.push(`📅 ${formatDays(e.startDate, e.endDate)}/${e.startDate.slice(5, 7)} · ${e.name} · ${e.city}/${e.uf}${st}`);
    }
    lines.push('', `Agenda completa, "Como chegar" e "Eu vou": ${SITE}`, 'Agenda sujeita a alterações.');
    return lines.join('\n');
  }, [list, days]);
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  useEffect(() => {
    let alive = true;
    agendaImage({ events: list, subtitle: `Próximos ${days} dias` }).then((b) => alive && setImg({ blob: b, url: URL.createObjectURL(b) }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <>
      <p className="lede">Copie o texto e baixe a imagem para postar no Canal do WhatsApp. Na Fase 1, a divulgação gratuita sai por aqui.</p>
      <div className="field" style={{ maxWidth: 240 }}>
        <label htmlFor="cd">Período</label>
        <select id="cd" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Próximos 7 dias</option>
          <option value={14}>Próximos 14 dias</option>
          <option value={30}>Próximos 30 dias</option>
        </select>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="ctx">Texto</label>
        <textarea id="ctx" readOnly value={text} style={{ minHeight: 220, fontSize: 14 }} />
      </div>
      <div className="contact-row" style={{ margin: '10px 0' }}>
        <button
          className="btn dark"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => toast('Texto copiado.'), () => toast('Selecione o texto e copie.'));
          }}
        >
          Copiar texto
        </button>
        <button
          className="btn"
          disabled={!img}
          onClick={async () => img && (await shareOrDownload(img.blob, 'agenda-semana.png', text)) === 'demo' && toast('Na prévia, toque e segure a imagem para salvar.')}
        >
          Baixar imagem
        </button>
      </div>
      {img && <img src={img.url} alt="Imagem da agenda da semana" style={{ maxWidth: 360, border: '1px solid var(--rule)' }} />}
    </>
  );
}

function Metrics() {
  const s = useStore((x) => x);
  const riders = s.users.filter((u) => u.roles.includes('rider') && !u.deletedAt).length;
  const orgs = s.users.filter((u) => u.roles.includes('organizer')).length;
  const month = s.dailyVisits.reduce((a, b) => a + b.visits, 0);
  const today = s.dailyVisits[s.dailyVisits.length - 1]?.visits ?? 0;
  const top = [...s.events].filter((e) => e.approval === 'aprovado').sort((a, b) => b.counters.views - a.counters.views).slice(0, 8);
  const max = Math.max(...s.dailyVisits.map((d) => d.visits));
  const pts = s.dailyVisits.map((d, i) => `${(i / (s.dailyVisits.length - 1)) * 100},${100 - (d.visits / max) * 92}`).join(' ');

  return (
    <>
      <p className="lede">Números para apresentar a patrocinadores. No protótipo, os acessos são simulados.</p>
      <div className="stats">
        <div className="stat">
          <div className="v">{today.toLocaleString('pt-BR')}</div>
          <div className="l">acessos hoje</div>
        </div>
        <div className="stat">
          <div className="v">{month.toLocaleString('pt-BR')}</div>
          <div className="l">acessos em 30 dias</div>
        </div>
        <div className="stat">
          <div className="v">{s.agendaShares}</div>
          <div className="l">compartilhamentos da agenda</div>
        </div>
        <div className="stat">
          <div className="v">{riders}</div>
          <div className="l">motociclistas</div>
        </div>
        <div className="stat">
          <div className="v">{orgs}</div>
          <div className="l">organizadores</div>
        </div>
      </div>

      <h2>Acessos por dia</h2>
      <svg className="spark" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Acessos diários nos últimos 30 dias, até ${max} por dia`}>
        <polyline points={`0,100 ${pts} 100,100`} fill="var(--band)" stroke="none" />
        <polyline points={pts} fill="none" stroke="var(--orange)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>

      <h2>Por estado</h2>
      <Bars data={s.visitsByUF} />
      <h2>Por cidade</h2>
      <Bars data={s.visitsByCity} />

      <h2>Eventos mais vistos</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-simple">
          <thead>
            <tr>
              <th>Evento</th>
              <th style={{ textAlign: 'right' }}>Visitas</th>
              <th style={{ textAlign: 'right' }}>Como chegar</th>
              <th style={{ textAlign: 'right' }}>Eu vou</th>
              <th style={{ textAlign: 'right' }}>Inscritos</th>
              <th style={{ textAlign: 'right' }}>Check-ins</th>
            </tr>
          </thead>
          <tbody>
            {top.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td className="num">{e.counters.views}</td>
                <td className="num">{e.counters.directionsClicks}</td>
                <td className="num">{e.counters.going}</td>
                <td className="num">{e.counters.subscribers}</td>
                <td className="num">{e.counters.checkins}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Bars({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="bars">
      {rows.map(([k, v]) => (
        <div className="barrow" key={k}>
          <span>{k}</span>
          <span className="track">
            <span className="fill" style={{ width: `${(v / max) * 100}%`, display: 'block' }} />
          </span>
          <span className="num">{v.toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  );
}
