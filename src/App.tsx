import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AgendaPage } from './pages/Agenda';
import { EventPage } from './pages/Event';
import { ArchivePage } from './pages/Archive';
import { LoginPage } from './pages/Login';
import { CheckinPage } from './pages/Checkin';
import { ProfilePage } from './pages/Profile';
import { OrganizerHome, OrganizerEventPanel } from './pages/Organizer';
import { EventFormPage } from './pages/EventForm';
import { AdminPage } from './pages/Admin';
import { TermsPage, PrivacyPage } from './pages/Legal';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<AgendaPage />} />
        <Route path="evento/:slug" element={<EventPage />} />
        <Route path="arquivo" element={<ArchivePage />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="checkin/:eventId/:token" element={<CheckinPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="organizador" element={<OrganizerHome />} />
        <Route path="organizador/novo" element={<EventFormPage />} />
        <Route path="organizador/evento/:id" element={<OrganizerEventPanel />} />
        <Route path="organizador/evento/:id/editar" element={<EventFormPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="termos" element={<TermsPage />} />
        <Route path="privacidade" element={<PrivacyPage />} />
        <Route path="*" element={<AgendaPage />} />
      </Route>
    </Routes>
  );
}
