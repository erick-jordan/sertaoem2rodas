import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BRAND, SITE } from '../lib/brand';
import { currentUser, demoSwitchUser, hasRole, resetDemo, useStore } from '../data/store';

export function Layout() {
  const me = useStore(currentUser);
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link to="/" className="logo" aria-label="Sertão em 2 Rodas — agenda">
            <img src={BRAND.logoDark} alt="Sertão em 2 Rodas" />
          </Link>
          <nav className="site-nav" aria-label="Principal">
            {hasRole(me, 'admin') && <NavLink to="/admin">Painel</NavLink>}
            {hasRole(me, 'organizer') && !hasRole(me, 'admin') && <NavLink to="/organizador">Meus eventos</NavLink>}
            {me ? (
              <NavLink to="/perfil">Perfil</NavLink>
            ) : (
              <NavLink to="/entrar" className="cta">
                Entrar
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="wrap">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <div className="brandline">
            <img src={BRAND.seal} alt="S2R" />
            <span className="url">{SITE}</span>
          </div>
          <span>Agenda sujeita a alterações. Confirme sempre com o organizador antes de viajar.</span>
          <nav aria-label="Rodapé">
            <Link to="/">Agenda</Link>
            <Link to="/arquivo">Eventos realizados</Link>
            <Link to="/organizador">Cadastrar evento</Link>
            <Link to="/termos">Termos de Uso</Link>
            <Link to="/privacidade">Política de Privacidade</Link>
          </nav>
        </div>
      </footer>
      <DemoBar />
    </>
  );
}

/** Barra verde só do protótipo: troca de perfil para o Irineu ver todas as telas. */
function DemoBar() {
  const users = useStore((s) => s.users);
  const sid = useStore((s) => s.sessionUserId);
  const [sure, setSure] = useState(false);
  const options = [
    { id: '', label: 'Visitante (sem cadastro)' },
    { id: 'u-r5', label: 'Motociclista — Ana Paula' },
    { id: 'u-org1', label: 'Organizador — CG Motofest' },
    { id: 'u-admin', label: 'Administrador — Irineu' },
  ];
  const extra = users.filter((u) => !options.some((o) => o.id === u.id) && !u.id.startsWith('u-r') && u.id !== 'u-org2');
  return (
    <div className="demo-bar" role="region" aria-label="Protótipo">
      <strong>Protótipo</strong>
      <label className="sr-only" htmlFor="demo-user">
        Ver como
      </label>
      <select id="demo-user" value={sid ?? ''} onChange={(e) => demoSwitchUser(e.target.value || null)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
        {extra.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          if (!sure) return setSure(true);
          resetDemo();
          setSure(false);
        }}
        onBlur={() => setSure(false)}
      >
        {sure ? 'Confirmar' : 'Restaurar'}
      </button>
    </div>
  );
}
