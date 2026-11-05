import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { formatDateTime } from '../domain/dates';
import { becomeOrganizer, currentUser, hasRole, logout, setEventSubscription, useStore } from '../data/store';
import { Avatar, useTitle, useToast } from '../components/ui';

export function ProfilePage() {
  useTitle('Perfil');
  const me = useStore(currentUser);
  const s = useStore((x) => x);
  const nav = useNavigate();
  const toast = useToast();
  const [insta, setInsta] = useState('');
  if (!me) return <Navigate to="/entrar?volta=/perfil" replace />;

  const checkins = s.checkins.filter((c) => c.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const going = s.going.filter((g) => g.userId === me.id).map((g) => s.events.find((e) => e.id === g.eventId)!).filter(Boolean);
  const subs = s.subs.filter((x) => x.userId === me.id && x.scope === 'event' && !x.revokedAt);
  const evName = (id?: string) => s.events.find((e) => e.id === id)?.name ?? '';
  const evSlug = (id?: string) => s.events.find((e) => e.id === id)?.slug ?? '';

  return (
    <div className="page">
      <div className="who" style={{ marginBottom: 6 }}>
        <Avatar name={me.name} src={me.photoUrl} />
        <div>
          <h1 style={{ margin: 0 }}>{me.name}</h1>
          <span className="hint">
            {me.originCity}/{me.originUF} · {me.phone}
          </span>
        </div>
      </div>

      <div className="stats" style={{ marginTop: 14 }}>
        <div className="stat">
          <div className="v">{me.points}</div>
          <div className="l">pontos</div>
        </div>
        <div className="stat">
          <div className="v">{checkins.length}</div>
          <div className="l">check-ins</div>
        </div>
        <div className="stat">
          <div className="v">{going.length}</div>
          <div className="l">eventos em "Eu vou"</div>
        </div>
      </div>
      <p className="hint">Na próxima fase os pontos viram condecorações no seu perfil, como "Fominha de Eventos".</p>

      <h2>Check-ins</h2>
      {checkins.length === 0 ? (
        <p className="hint">Leia o QR Code exposto no próximo evento para registrar presença.</p>
      ) : (
        <div className="list">
          {checkins.map((c) => (
            <div className="item" key={c.id}>
              <Link className="t" to={`/evento/${evSlug(c.eventId)}`}>
                {evName(c.eventId)}
              </Link>
              <span className="s">
                {formatDateTime(c.createdAt)} · {c.eventCity}/{c.eventUF} · +{c.pointsAwarded} pontos
              </span>
            </div>
          ))}
        </div>
      )}

      <h2>Eu vou</h2>
      {going.length === 0 ? (
        <p className="hint">Nenhum evento marcado.</p>
      ) : (
        <div className="list">
          {going.map((e) => (
            <div className="item" key={e.id}>
              <Link className="t" to={`/evento/${e.slug}`}>
                {e.name}
              </Link>
            </div>
          ))}
        </div>
      )}

      <h2>Avisos no WhatsApp</h2>
      {subs.length === 0 ? (
        <p className="hint">Você não recebe avisos de nenhum evento.</p>
      ) : (
        <div className="list">
          {subs.map((x) => (
            <div className="item" key={x.id} style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
              <span className="t">{evName(x.eventId)}</span>
              <button
                className="btn small"
                onClick={() => {
                  setEventSubscription(x.eventId!, false);
                  toast('Avisos cancelados.');
                }}
              >
                Parar avisos
              </button>
            </div>
          ))}
        </div>
      )}

      {!hasRole(me, 'organizer') ? (
        <>
          <h2>Organiza eventos?</h2>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^@?[\w.]{2,30}$/.test(insta.trim())) return toast('Informe o @ do Instagram.');
              becomeOrganizer('@' + insta.trim().replace(/^@/, ''));
              nav('/organizador');
            }}
          >
            <div className="field">
              <label htmlFor="pi">Instagram seu ou do evento</label>
              <input id="pi" type="text" placeholder="@seuevento" value={insta} onChange={(e) => setInsta(e.target.value)} />
            </div>
            <button className="btn dark" type="submit">
              Quero cadastrar eventos
            </button>
          </form>
        </>
      ) : (
        <p style={{ marginTop: 20 }}>
          <Link className="btn dark block" to={hasRole(me, 'admin') ? '/admin' : '/organizador'}>
            {hasRole(me, 'admin') ? 'Abrir o painel do administrador' : 'Meus eventos'}
          </Link>
        </p>
      )}

      <h2>Conta</h2>
      <div className="contact-row">
        <button
          className="btn"
          onClick={() => {
            logout();
            nav('/');
          }}
        >
          Sair
        </button>
        <button className="btn danger" onClick={() => toast('Na versão final: pedido de exclusão registrado; dados apagados em até 30 dias.')}>
          Excluir minha conta
        </button>
      </div>
    </div>
  );
}
