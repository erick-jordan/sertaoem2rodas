import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { GeoPoint, Place, PlaceKind, UF } from '../domain/types';
import { UFS_NORDESTE } from '../domain/types';
import { CIDADES_DISPONIVEIS } from '../domain/geo';
import { createEvent, currentUser, hasRole, updateEvent, useStore, type EventDraft } from '../data/store';
import { dataUrlToBlob, eventArt, shareOrDownload, stampBanner } from '../lib/art';
import { useTitle, useToast } from '../components/ui';

/** Extrai coordenadas de um link do Google Maps / Waze ou de "lat, lng" digitado. */
export function parsePin(text: string): GeoPoint | undefined {
  const t = decodeURIComponent(text.trim());
  const pats = [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|ll|destination|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/];
  for (const p of pats) {
    const m = t.match(p);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return undefined;
}

const KINDS: { v: PlaceKind; l: string }[] = [
  { v: 'camping', l: 'Camping' },
  { v: 'hospedagem', l: 'Hospedagem' },
  { v: 'alimentacao', l: 'Alimentação' },
  { v: 'apoio', l: 'Ponto de apoio' },
];

function PinField({ value, onChange, id }: { value?: GeoPoint; onChange: (g?: GeoPoint) => void; id: string }) {
  const [txt, setTxt] = useState(value ? `${value.lat}, ${value.lng}` : '');
  const [err, setErr] = useState('');
  return (
    <div className="field">
      <label htmlFor={id}>
        Pino no mapa <span className="opt">(link do Google Maps ou coordenadas)</span>
      </label>
      <div className="pin-pick">
        <input
          id={id}
          type="text"
          placeholder="Cole aqui o link do local no Google Maps"
          value={txt}
          onChange={(e) => {
            setTxt(e.target.value);
            const g = parsePin(e.target.value);
            setErr(e.target.value && !g ? 'Não achamos as coordenadas nesse link. No Google Maps, toque no local, depois em Compartilhar, e cole o link.' : '');
            onChange(g);
          }}
        />
        <button
          type="button"
          className="btn small"
          onClick={() =>
            navigator.geolocation?.getCurrentPosition(
              (p) => {
                const g = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) };
                setTxt(`${g.lat}, ${g.lng}`);
                setErr('');
                onChange(g);
              },
              () => setErr('Não foi possível ler a localização. Cole o link do Google Maps.')
            )
          }
        >
          Estou no local
        </button>
      </div>
      {value && !err && <span className="pin-ok">Pino marcado: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>}
      {err && <span className="err">{err}</span>}
    </div>
  );
}

export function EventFormPage() {
  const { id } = useParams();
  const me = useStore(currentUser);
  const existing = useStore((s) => (id ? s.events.find((e) => e.id === id) : undefined), [id]);
  const nav = useNavigate();
  const toast = useToast();
  useTitle(id ? 'Editar evento' : 'Cadastrar evento');

  const [f, setF] = useState<EventDraft>(() =>
    existing
      ? structuredClone({
          name: existing.name, startDate: existing.startDate, endDate: existing.endDate, city: existing.city, uf: existing.uf, paid: existing.paid,
          priceText: existing.priceText, attractions: existing.attractions, emergencyPhone: existing.emergencyPhone, description: existing.description,
          organizerWhatsApp: existing.organizerWhatsApp, instagram: existing.instagram, venue: existing.venue, places: existing.places,
          bannerUrl: existing.bannerUrl, crestUrl: existing.crestUrl, status: existing.status,
        })
      : {
          name: '', startDate: '', endDate: '', city: '', uf: 'PB', paid: false, places: [], status: 'confirmado',
          instagram: me?.instagram, organizerWhatsApp: me?.phone,
        }
  );
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<null | { pending: boolean; slug: string; id: string }>(null);
  const [arts, setArts] = useState<{ feed?: string; story?: string }>({});

  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => setF((x) => ({ ...x, [k]: v }));
  const cityKey = f.city ? `${f.city}/${f.uf}` : '';

  const artInput = useMemo(() => ({ name: f.name, startDate: f.startDate, endDate: f.endDate || f.startDate, city: f.city, uf: f.uf, crestUrl: f.crestUrl }), [f.name, f.startDate, f.endDate, f.city, f.uf, f.crestUrl]);
  const artReady = !!(f.name && f.startDate && f.city);
  useEffect(() => {
    if (!artReady) return setArts({});
    let alive = true;
    const t = setTimeout(async () => {
      const [feed, story] = await Promise.all([eventArt(artInput, 'feed'), eventArt(artInput, 'story')]);
      if (alive) setArts({ feed, story });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [artInput, artReady]);

  if (!me) return <Navigate to={`/entrar?volta=${encodeURIComponent(id ? `/organizador/evento/${id}/editar` : '/organizador/novo')}&perfil=organizador`} replace />;
  if (existing && existing.ownerId !== me.id && !hasRole(me, 'admin')) return <Navigate to="/organizador" replace />;

  const readFile = (file: File | undefined, cb: (d: string) => void) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => cb(r.result as string);
    r.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().length < 5) er.name = 'Escreva o nome com a edição. Ex.: 12º Moto Fest de Tal Cidade.';
    if (!f.startDate) er.startDate = 'Informe a data de início.';
    const end = f.endDate || f.startDate;
    if (f.startDate && end < f.startDate) er.endDate = 'O término não pode ser antes do início.';
    if (!f.city.trim()) er.city = 'Informe a cidade.';
    if (f.paid && !f.priceText?.trim()) er.priceText = 'Informe o valor.';
    setErrs(er);
    if (Object.keys(er).length) {
      toast('Confira os campos marcados.');
      return;
    }
    const draft: EventDraft = { ...f, endDate: end, priceText: f.paid ? f.priceText : undefined };
    if (existing) {
      updateEvent(existing.id, draft);
      toast('Alterações salvas.');
      nav(`/organizador/evento/${existing.id}`);
    } else {
      const ev = createEvent(draft);
      setSent({ pending: ev.approval === 'pendente', slug: ev.slug, id: ev.id });
    }
  };

  if (sent) {
    return (
      <div className="page">
        <h1>{sent.pending ? 'Evento enviado para aprovação' : 'Evento publicado'}</h1>
        <p className="lede">
          {sent.pending
            ? 'O administrador revisa e publica na agenda. Você recebe um aviso quando for aprovado. Depois disso, pode editar livremente.'
            : 'O evento já aparece na agenda.'}
        </p>
        <div className="contact-row">
          <Link className="btn primary" to={`/organizador/evento/${sent.id}`}>
            Abrir o painel do evento
          </Link>
          {!sent.pending && (
            <Link className="btn" to={`/evento/${sent.slug}`}>
              Ver na agenda
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{existing ? 'Editar evento' : 'Cadastrar evento'}</h1>
      <p className="lede">{existing ? 'As mudanças entram na hora. O administrador é avisado do que mudou.' : 'Grátis. Só os campos com nome em negrito e sem "opcional" são obrigatórios.'}</p>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="n">Nome do evento com a edição</label>
          <input id="n" type="text" placeholder="12º Moto Fest de Tal Cidade" value={f.name} onChange={(e) => set('name', e.target.value)} />
          {errs.name && <span className="err">{errs.name}</span>}
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="sd">Início</label>
            <input id="sd" type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} />
            {errs.startDate && <span className="err">{errs.startDate}</span>}
          </div>
          <div className="field">
            <label htmlFor="ed">Término</label>
            <input id="ed" type="date" value={f.endDate} min={f.startDate} onChange={(e) => set('endDate', e.target.value)} />
            {errs.endDate && <span className="err">{errs.endDate}</span>}
          </div>
        </div>
        <div className="row2" style={{ gridTemplateColumns: '1fr 90px' }}>
          <div className="field">
            <label htmlFor="ci">Cidade</label>
            <input
              id="ci"
              type="text"
              list="cidades-ev"
              value={cityKey && CIDADES_DISPONIVEIS.includes(cityKey) ? cityKey : f.city}
              onChange={(e) => {
                const v = e.target.value;
                const m = v.match(/^(.+)\/([A-Z]{2})$/);
                if (m) setF((x) => ({ ...x, city: m[1], uf: m[2] as UF }));
                else set('city', v);
              }}
            />
            <datalist id="cidades-ev">
              {CIDADES_DISPONIVEIS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errs.city && <span className="err">{errs.city}</span>}
          </div>
          <div className="field">
            <label htmlFor="uf">UF</label>
            <select id="uf" value={f.uf} onChange={(e) => set('uf', e.target.value as UF)}>
              {UFS_NORDESTE.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend>Local do evento (recomendado)</legend>
          <div className="field">
            <label htmlFor="vn">
              Nome do local <span className="opt">(opcional)</span>
            </label>
            <input id="vn" type="text" placeholder="Parque de Exposições" value={f.venue?.name ?? ''} onChange={(e) => set('venue', { id: f.venue?.id ?? 'v', kind: 'evento', ...f.venue, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="va">
              Endereço <span className="opt">(opcional)</span>
            </label>
            <input id="va" type="text" value={f.venue?.address ?? ''} onChange={(e) => set('venue', { id: 'v', kind: 'evento', name: f.venue?.name ?? '', ...f.venue, address: e.target.value })} />
          </div>
          <PinField id="vp" value={f.venue?.geo} onChange={(g) => set('venue', { id: 'v', kind: 'evento', name: f.venue?.name ?? 'Local do evento', ...f.venue, geo: g })} />
          <span className="help">Sem pino, o botão "Como chegar" leva só ao centro da cidade.</span>
        </fieldset>

        <fieldset>
          <legend>Banner e brasão</legend>
          <div className="field">
            <span className="lbl">
              Banner oficial <span className="opt">(opcional, de preferência vertical 4:5)</span>
            </span>
            <label className="btn small" style={{ cursor: 'pointer', justifySelf: 'start' }}>
              {f.bannerUrl ? 'Trocar banner' : 'Enviar banner'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => readFile(e.target.files?.[0], async (d) => set('bannerUrl', await stampBanner(d)))} />
            </label>
            {f.bannerUrl && (
              <>
                <img src={f.bannerUrl} alt="Banner com o selo aplicado" style={{ maxWidth: 220, border: '1px solid var(--rule)' }} />
                <span className="help">O selo do Sertão em 2 Rodas é aplicado num canto. O arquivo original fica guardado sem selo.</span>
                <button type="button" className="link-btn" style={{ justifySelf: 'start' }} onClick={() => set('bannerUrl', undefined)}>
                  Remover banner
                </button>
              </>
            )}
          </div>
          <div className="field">
            <span className="lbl">
              Brasão ou logo do evento <span className="opt">(opcional, entra na arte automática)</span>
            </span>
            <label className="btn small" style={{ cursor: 'pointer', justifySelf: 'start' }}>
              {f.crestUrl ? 'Trocar brasão' : 'Enviar brasão'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => readFile(e.target.files?.[0], (d) => set('crestUrl', d))} />
            </label>
          </div>
          {!f.bannerUrl && (
            <div>
              <span className="lbl" style={{ fontWeight: 700, fontSize: 15 }}>
                Arte automática
              </span>
              {artReady && arts.feed ? (
                <>
                  <p className="help" style={{ margin: '2px 0 8px' }}>
                    Sem banner, a página do evento mostra esta arte. Use também para divulgar.
                  </p>
                  <div className="art-preview">
                    <figure>
                      <img src={arts.feed} alt="Arte para o feed" />
                      <figcaption>
                        Feed 4:5 ·{' '}
                        <button type="button" className="link-btn" onClick={() => shareOrDownload(dataUrlToBlob(arts.feed!), 'arte-feed.png', f.name)}>
                          baixar
                        </button>
                      </figcaption>
                    </figure>
                    <figure>
                      <img src={arts.story} alt="Arte para o story" />
                      <figcaption>
                        Story 9:16 ·{' '}
                        <button type="button" className="link-btn" onClick={() => shareOrDownload(dataUrlToBlob(arts.story!), 'arte-story.png', f.name)}>
                          baixar
                        </button>
                      </figcaption>
                    </figure>
                  </div>
                </>
              ) : (
                <p className="help">Preencha nome, data e cidade para ver a arte.</p>
              )}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Contato</legend>
          <div className="row2">
            <div className="field">
              <label htmlFor="wa">
                WhatsApp <span className="opt">(opcional)</span>
              </label>
              <input id="wa" type="tel" value={f.organizerWhatsApp ?? ''} onChange={(e) => set('organizerWhatsApp', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ig">
                Instagram <span className="opt">(opcional)</span>
              </label>
              <input id="ig" type="text" placeholder="@seuevento" value={f.instagram ?? ''} onChange={(e) => set('instagram', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="em">
              Telefone de emergência / 0800 <span className="opt">(opcional)</span>
            </label>
            <input id="em" type="tel" value={f.emergencyPhone ?? ''} onChange={(e) => set('emergencyPhone', e.target.value)} />
          </div>
        </fieldset>

        <fieldset>
          <legend>Entrada</legend>
          <label className="check">
            <input type="checkbox" checked={f.paid} onChange={(e) => set('paid', e.target.checked)} />
            <span>Evento pago</span>
          </label>
          {f.paid && (
            <div className="field">
              <label htmlFor="pr">Valor</label>
              <input id="pr" type="text" placeholder="R$ 30" value={f.priceText ?? ''} onChange={(e) => set('priceText', e.target.value)} />
              {errs.priceText && <span className="err">{errs.priceText}</span>}
            </div>
          )}
          {!f.paid && <span className="help">Evento gratuito não mostra preço na agenda.</span>}
        </fieldset>

        <div className="field">
          <label htmlFor="at">
            Atrações <span className="opt">(opcional, texto curto)</span>
          </label>
          <textarea id="at" maxLength={280} value={f.attractions ?? ''} onChange={(e) => set('attractions', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="de">
            Descrição <span className="opt">(opcional)</span>
          </label>
          <textarea id="de" maxLength={500} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </div>

        <fieldset>
          <legend>Outros locais (opcional)</legend>
          {f.places.map((p, i) => (
            <PlaceEditor
              key={p.id}
              place={p}
              onChange={(np) => set('places', f.places.map((x, j) => (j === i ? np : x)))}
              onRemove={() => set('places', f.places.filter((_, j) => j !== i))}
            />
          ))}
          <button type="button" className="btn small" style={{ justifySelf: 'start' }} onClick={() => set('places', [...f.places, { id: `p-${Date.now()}`, kind: 'camping', name: '' }])}>
            Adicionar camping, hospedagem, alimentação ou apoio
          </button>
        </fieldset>

        {existing && (
          <div className="field">
            <label htmlFor="st">Status</label>
            <select id="st" value={f.status} onChange={(e) => set('status', e.target.value as EventDraft['status'])}>
              <option value="confirmado">Confirmado</option>
              <option value="adiado">Adiado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        )}

        <button className="btn primary block" type="submit">
          {existing ? 'Salvar alterações' : hasRole(me, 'admin') ? 'Publicar na agenda' : 'Enviar para aprovação'}
        </button>
      </form>
    </div>
  );
}

function PlaceEditor({ place, onChange, onRemove }: { place: Place; onChange: (p: Place) => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'grid', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
      <div className="row2">
        <div className="field">
          <label htmlFor={`k-${place.id}`}>Tipo</label>
          <select id={`k-${place.id}`} value={place.kind} onChange={(e) => onChange({ ...place, kind: e.target.value as PlaceKind })}>
            {KINDS.map((k) => (
              <option key={k.v} value={k.v}>
                {k.l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`n-${place.id}`}>Nome</label>
          <input id={`n-${place.id}`} type="text" value={place.name} onChange={(e) => onChange({ ...place, name: e.target.value })} />
        </div>
      </div>
      <PinField id={`g-${place.id}`} value={place.geo} onChange={(g) => onChange({ ...place, geo: g })} />
      <button type="button" className="link-btn" style={{ justifySelf: 'start' }} onClick={onRemove}>
        Remover este local
      </button>
    </div>
  );
}
