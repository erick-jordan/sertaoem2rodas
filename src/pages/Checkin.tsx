import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { formatLongRange } from '../domain/dates';
import { currentUser, doCheckin, setEventSubscription, toggleGoing, upcomingEvents, useStore, type CheckinResult } from '../data/store';
import { IconBell, IconCheck, useTitle, useToast } from '../components/ui';

/** Destino do QR Code impresso pelo organizador: /checkin/{evento}/{token} */
export function CheckinPage() {
  useTitle('Check-in');
  const { eventId = '', token = '' } = useParams();
  const { pathname } = useLocation();
  const me = useStore(currentUser);
  const ev = useStore((s) => s.events.find((e) => e.id === eventId), [eventId]);
  const done = useRef<CheckinResult | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);

  useEffect(() => {
    if (!me || done.current) return;
    done.current = doCheckin(eventId, token);
    setResult(done.current);
  }, [me, eventId, token]);

  if (!ev) return <Problem title="QR Code inválido" text="Este código não corresponde a nenhum evento. Peça ao organizador o QR Code atual." />;

  if (!me) {
    return (
      <div className="page">
        <div className="checkin-hero">
          <h1>Check-in no {ev.name}</h1>
          <p>{formatLongRange(ev.startDate, ev.endDate)} · {ev.city}/{ev.uf}</p>
        </div>
        <p className="lede" style={{ marginTop: 16 }}>
          Entre com seu WhatsApp para registrar presença. Quem não tem cadastro faz agora mesmo, em menos de um minuto.
        </p>
        <Link className="btn primary block" to={`/entrar?volta=${encodeURIComponent(pathname)}&acao=checkin`}>
          Entrar e fazer check-in
        </Link>
      </div>
    );
  }

  if (!result) return <p className="page">Registrando check-in…</p>;
  if (result.kind === 'invalido') return <Problem title="QR Code inválido" text="Este QR Code foi substituído pelo organizador. Leia o QR Code exposto no local." />;
  if (result.kind === 'fechado') return <Problem title="Check-in fechado" text={`O check-in do ${result.event.name} não está aberto agora. Ele só funciona durante o evento, quando o organizador abrir.`} />;

  const ok = result.kind === 'ok';
  return (
    <div className="page">
      <div className="checkin-hero">
        <h1>{ok ? 'Check-in feito!' : 'Check-in já registrado'}</h1>
        <p>
          {ok ? 'Você fez check-in no' : 'Você já tinha feito check-in no'} <strong>{result.event.name}</strong>.
        </p>
        {ok && <span className="pts">+{result.checkin.pointsAwarded} pontos · total {me.points}</span>}
        {ok && result.checkin.distanceKm !== undefined && (
          <p style={{ marginTop: 10 }}>
            De {result.checkin.originCity}/{result.checkin.originUF} até aqui: cerca de {result.checkin.distanceKm} km.
          </p>
        )}
      </div>
      <NextEvent excludeId={result.event.id} />
    </div>
  );
}

/** Logo depois do check-in, o próximo evento da agenda: quem vai a um já sai ligado no próximo. */
function NextEvent({ excludeId }: { excludeId: string }) {
  const me = useStore(currentUser)!;
  const toast = useToast();
  const next = useStore((s) => upcomingEvents(s).find((e) => e.id !== excludeId && e.status === 'confirmado' && e.startDate > new Date().toISOString().slice(0, 10)), [excludeId]);
  const going = useStore((s) => !!next && s.going.some((g) => g.eventId === next.id && g.userId === me.id), [next, me]);
  const sub = useStore((s) => !!next && s.subs.some((x) => x.eventId === next.id && x.userId === me.id && !x.revokedAt), [next, me]);
  if (!next) return null;
  return (
    <section style={{ marginTop: 22 }}>
      <h2>Próximo evento da agenda</h2>
      <Link to={`/evento/${next.slug}`} style={{ textDecoration: 'none' }}>
        <strong style={{ fontSize: 22 }}>{next.name}</strong>
        <br />
        {formatLongRange(next.startDate, next.endDate)} · {next.city}/{next.uf}
      </Link>
      <div className="go-with" style={{ marginTop: 12 }}>
        <button
          className={`btn ${going ? 'on' : ''}`}
          aria-pressed={going}
          onClick={() => {
            toggleGoing(next.id);
            toast(going ? 'Você saiu da lista.' : 'Anotado: você vai.');
          }}
        >
          {going && <IconCheck />} Eu vou
        </button>
        <button
          className={`btn ${sub ? 'on' : ''}`}
          aria-pressed={sub}
          onClick={() => {
            if (!sub && !confirm('Receber no WhatsApp as alterações e novidades deste evento? Você pode cancelar quando quiser.')) return;
            setEventSubscription(next.id, !sub);
            toast(sub ? 'Avisos cancelados.' : 'Inscrição confirmada.');
          }}
        >
          <IconBell /> Receba atualizações
        </button>
      </div>
      <p style={{ marginTop: 16 }}>
        <Link className="btn dark block" to="/">
          Ver a agenda completa
        </Link>
      </p>
    </section>
  );
}

function Problem({ title, text }: { title: string; text: string }) {
  return (
    <div className="page">
      <h1>{title}</h1>
      <p className="lede">{text}</p>
      <Link className="btn dark" to="/">
        Voltar à agenda
      </Link>
    </div>
  );
}
