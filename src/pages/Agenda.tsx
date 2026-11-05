import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { S2REvent, UF } from '../domain/types';
import { UF_NOME, UFS_NORDESTE } from '../domain/types';
import { MESES, formatDays, monthKey, monthLabel, todayISO } from '../domain/dates';
import { AGENDA_CONSENT_TEXT, currentUser, normalizePhone, subscribeAgenda, trackAgendaShare, upcomingEvents, useStore } from '../data/store';
import { agendaImage, shareOrDownload } from '../lib/art';
import { IconBell, IconShare, Modal, useTitle, useToast } from '../components/ui';
import { SITE } from '../lib/brand';

export function AgendaPage() {
  useTitle('');
  const [params, setParams] = useSearchParams();
  const uf = (params.get('uf') as UF | null) ?? '';
  const all = useStore((s) => upcomingEvents(s));
  const events = useMemo(() => (uf ? all.filter((e) => e.uf === uf) : all), [all, uf]);
  const groups = useMemo(() => groupByMonth(events), [events]);
  const [share, setShare] = useState(false);
  const [follow, setFollow] = useState(false);

  return (
    <>
      <div className="agenda-top">
        <h1 className="agenda-title">{uf ? `Próximos eventos · ${UF_NOME[uf] ?? uf}` : 'Próximos eventos'}</h1>
        <label className="uf-filter">
          Estado
          <select
            value={uf}
            onChange={(e) => {
              const v = e.target.value;
              setParams(v ? { uf: v } : {}, { replace: true });
            }}
          >
            <option value="">Todos</option>
            {UFS_NORDESTE.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      <FeaturedStrip events={all} />

      <div className="agenda-actions">
        <button className="btn primary" onClick={() => setShare(true)}>
          <IconShare /> Compartilhar agenda no WhatsApp
        </button>
        <button className="btn dark" onClick={() => setFollow(true)}>
          <IconBell /> Fique por dentro da agenda
        </button>
      </div>

      {events.length === 0 ? (
        <p className="agenda-empty">
          Nenhum evento cadastrado {uf ? `em ${UF_NOME[uf]}` : ''} por enquanto.{' '}
          {uf && (
            <button className="link-btn" onClick={() => setParams({})}>
              Ver todos os estados
            </button>
          )}
        </p>
      ) : (
        <AgendaTable groups={groups} />
      )}

      <div className="agenda-foot">
        <Link to="/arquivo">Ver eventos realizados</Link>
        <Link to="/organizador">Organiza um evento? Cadastre grátis</Link>
      </div>

      {share && <ShareAgendaModal events={events} all={all} uf={uf} onClose={() => setShare(false)} />}
      {follow && <FollowAgendaModal uf={uf} onClose={() => setFollow(false)} />}
    </>
  );
}

export function groupByMonth(events: S2REvent[]) {
  const map = new Map<string, S2REvent[]>();
  for (const e of events) {
    const k = monthKey(e.startDate);
    map.set(k, [...(map.get(k) ?? []), e]);
  }
  return [...map.entries()];
}

export function AgendaTable({ groups }: { groups: [string, S2REvent[]][] }) {
  const nav = useNavigate();
  return (
    <table className="agenda">
      <colgroup>
        <col className="c-data" />
        <col />
        <col className="c-cidade" />
        <col className="c-uf" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Data</th>
          <th scope="col">Nome do evento</th>
          <th scope="col">Cidade</th>
          <th scope="col">UF</th>
        </tr>
      </thead>
      {groups.map(([k, list]) => (
        <tbody key={k}>
          <tr className="month-row">
            <th colSpan={4} scope="rowgroup">
              <span>{monthLabel(k)}</span>
            </th>
          </tr>
          {list.map((e) => (
            <tr key={e.id} className={`ev-row is-${e.status}`} onClick={() => nav(`/evento/${e.slug}`)}>
              <td className="d">{formatDays(e.startDate, e.endDate, true)}</td>
              <td className="n">
                <Link to={`/evento/${e.slug}`} onClick={(ev) => ev.stopPropagation()}>
                  {e.name}
                </Link>
                {e.status !== 'confirmado' && <span className="tag-status">{e.status === 'adiado' ? 'ADIADO' : 'CANCELADO'}</span>}
                {e.paid && e.priceText && <span className="tag-price">{e.priceText}</span>}
              </td>
              <td className="c">{e.city}</td>
              <td className="u">{e.uf}</td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

/** Espaço de destaque: patrocinadores no futuro; hoje, eventos escolhidos pelo admin em rodízio. */
function FeaturedStrip({ events }: { events: S2REvent[] }) {
  const featured = events.filter((e) => e.featured && e.status !== 'cancelado');
  const pool = featured.length ? featured : events.filter((e) => e.status === 'confirmado').slice(0, 5);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (pool.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % pool.length), 5000);
    return () => clearInterval(t);
  }, [pool.length]);
  if (!pool.length) return null;
  const e = pool[i % pool.length];
  return (
    <>
      <Link to={`/evento/${e.slug}`} className="featured" aria-live="polite">
        <span className="bar" />
        <span className="body">
          <span className="kicker">Em destaque</span>
          <span className="name">{e.name}</span>
        </span>
        <span className="when">
          {formatDays(e.startDate, e.endDate, true)} {MESES[Number(e.startDate.slice(5, 7)) - 1].slice(0, 3)} · {e.uf}
        </span>
      </Link>
      {pool.length > 1 && (
        <div className="featured-dots">
          {pool.map((p, j) => (
            <button key={p.id} aria-label={`Destaque ${j + 1}: ${p.name}`} aria-current={j === i % pool.length} onClick={() => setI(j)} />
          ))}
        </div>
      )}
    </>
  );
}

type Scope = 'proximos' | 'mes' | 'estado';

function ShareAgendaModal({ events, all, uf, onClose }: { events: S2REvent[]; all: S2REvent[]; uf: UF | ''; onClose: () => void }) {
  const toast = useToast();
  const months = useMemo(() => [...new Set(events.map((e) => monthKey(e.startDate)))], [events]);
  const [scope, setScope] = useState<Scope>('proximos');
  const [month, setMonth] = useState(months[0] ?? '');
  const [stateUF, setStateUF] = useState<UF>(uf || 'PB');
  const allEvents = useStore((s) => s.events);
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  const selection = useMemo(() => {
    if (scope === 'mes') return { list: events.filter((e) => monthKey(e.startDate) === month), sub: `${monthLabel(month)}${uf ? ` · ${uf}` : ''}` };
    if (scope === 'estado') {
      const year = todayISO().slice(0, 4);
      const list = allEvents
        .filter((e) => e.approval === 'aprovado' && !e.mergedInto && e.uf === stateUF && e.startDate.startsWith(year))
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      return { list, sub: `${UF_NOME[stateUF]} · ${year}` };
    }
    // próximos: mês atual e o seguinte, como a agenda do @motoeventosne
    const keys = months.slice(0, 2);
    return { list: events.filter((e) => keys.includes(monthKey(e.startDate))).slice(0, 45), sub: uf ? `Próximos eventos · ${UF_NOME[uf]}` : 'Próximos eventos' };
  }, [scope, month, stateUF, events, allEvents, months, uf]);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    agendaImage({ events: selection.list, subtitle: selection.sub }).then((b) => {
      if (!alive) return;
      setBlob(b);
      setUrl(URL.createObjectURL(b));
    });
    return () => {
      alive = false;
    };
  }, [selection]);

  const send = async () => {
    if (!blob) return;
    trackAgendaShare();
    const r = await shareOrDownload(blob, 'agenda-sertaoem2rodas.png', `Agenda de eventos de motociclismo · ${SITE}`);
    toast(r === 'shared' ? 'Agenda enviada.' : r === 'demo' ? 'No site, abre o WhatsApp. Aqui: toque e segure a imagem para salvar.' : 'Imagem baixada. Agora é só mandar no grupo.');
  };

  return (
    <Modal title="Compartilhar agenda" onClose={onClose}>
      <div className="form">
        <div className="field">
          <span className="lbl">O que vai na imagem</span>
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
            <option value="proximos">Próximos eventos{uf ? ` (${uf})` : ' (todos os estados)'}</option>
            <option value="mes">Um mês</option>
            <option value="estado">Um estado, ano inteiro</option>
          </select>
        </div>
        {scope === 'mes' && (
          <div className="field">
            <span className="lbl">Mês</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        )}
        {scope === 'estado' && (
          <div className="field">
            <span className="lbl">Estado</span>
            <select value={stateUF} onChange={(e) => setStateUF(e.target.value as UF)}>
              {UFS_NORDESTE.map((u) => (
                <option key={u} value={u}>
                  {UF_NOME[u]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {url ? <img className="modal-img" src={url} alt={`Imagem da agenda: ${selection.sub}`} /> : <p className="hint">Gerando imagem…</p>}
      <button className="btn primary block" onClick={send} disabled={!blob}>
        <IconShare /> Enviar imagem
      </button>
      <p className="hint">{all.length} eventos na agenda. A imagem leva o endereço {SITE} no rodapé.</p>
    </Modal>
  );
}

function FollowAgendaModal({ uf, onClose }: { uf: UF | ''; onClose: () => void }) {
  const me = useStore(currentUser);
  const toast = useToast();
  const [phone, setPhone] = useState(me ? me.phone.slice(3) : '');
  const [ufs, setUfs] = useState<UF[]>(uf ? [uf] : []);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = normalizePhone(phone);
    if (!p) return setErr('Digite o WhatsApp com DDD, por exemplo (83) 99999-0000.');
    if (!ok) return setErr('Marque a confirmação para receber os avisos.');
    subscribeAgenda(p, ufs);
    setDone(true);
    toast('Inscrição registrada.');
  };

  return (
    <Modal title="Fique por dentro da agenda" onClose={onClose}>
      {done ? (
        <>
          <p>Seu número está na lista. Você vai receber os avisos de novos eventos, adiamentos e cancelamentos {ufs.length ? `de ${ufs.join(', ')}` : 'de todos os estados'}.</p>
          <p className="notice">Enquanto os avisos individuais não começam, a agenda da semana sai no Canal do Sertão em 2 Rodas no WhatsApp. É grátis.</p>
          <a className="btn green block" href="https://whatsapp.com/channel/" target="_blank" rel="noreferrer">
            Seguir o Canal no WhatsApp
          </a>
        </>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <p className="lede" style={{ margin: 0 }}>
            Informe seu WhatsApp para saber de novos eventos, adiamentos e cancelamentos.
          </p>
          <div className="field">
            <label htmlFor="fp">WhatsApp com DDD</label>
            <input id="fp" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(83) 99999-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <fieldset>
            <legend>Estados que você acompanha</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
              {UFS_NORDESTE.map((u) => (
                <label key={u} className="check">
                  <input type="checkbox" checked={ufs.includes(u)} onChange={(e) => setUfs(e.target.checked ? [...ufs, u] : ufs.filter((x) => x !== u))} />
                  {u}
                </label>
              ))}
            </div>
            <span className="help">Nenhum marcado = todos os estados.</span>
          </fieldset>
          <label className="check">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            <span>{AGENDA_CONSENT_TEXT}</span>
          </label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn primary block" type="submit">
            Receber avisos
          </button>
          <p className="hint">
            Veja a <Link to="/privacidade">Política de Privacidade</Link>.
          </p>
        </form>
      )}
    </Modal>
  );
}
