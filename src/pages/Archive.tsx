import { Link } from 'react-router-dom';
import { formatDays, monthKey, monthLabel } from '../domain/dates';
import { pastEvents, useStore } from '../data/store';
import { useTitle } from '../components/ui';
import { CoverageList } from './Event';

export function ArchivePage() {
  useTitle('Eventos realizados');
  const events = useStore((s) => pastEvents(s));
  let last = '';
  return (
    <div className="page">
      <h1>Eventos realizados</h1>
      <p className="lede">Os eventos que já aconteceram continuam aqui, com os links de fotos e cobertura enviados pelos organizadores.</p>
      {events.length === 0 && <p className="agenda-empty">Ainda não há eventos realizados.</p>}
      {events.map((e) => {
        const k = monthKey(e.startDate);
        const head = k !== last ? <h2 key={`h-${k}`}>{monthLabel(k)}</h2> : null;
        last = k;
        return (
          <div key={e.id}>
            {head}
            <div className="archive-item">
              <Link className="t" to={`/evento/${e.slug}`}>
                {formatDays(e.startDate, e.endDate)} · {e.name}
              </Link>
              <div className="hint">
                {e.city} · {e.uf}
                {e.counters.checkins > 0 && ` · ${e.counters.checkins} check-ins`}
              </div>
              {e.coverageLinks.length > 0 && <CoverageList ev={e} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
