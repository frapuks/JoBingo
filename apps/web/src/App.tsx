import { Navigate, Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './layout/AppLayout';
import { AccountPage } from './pages/AccountPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { MatchFormPage } from './pages/MatchFormPage';
import { LoginPage } from './pages/LoginPage';
import { MatchPage } from './pages/MatchPage';
import { MatchesPage } from './pages/MatchesPage';
import { PendingPatternsPage } from './pages/PendingPatternsPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="/reinitialisation" element={<ResetPasswordPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/matchs" replace />} />
        <Route path="matchs" element={<MatchesPage />} />
        <Route path="matchs/nouveau" element={<MatchFormPage />} />
        <Route path="matchs/:id" element={<MatchPage />} />
        <Route path="matchs/:id/modifier" element={<MatchFormPage />} />
        <Route path="joueurs" element={<PlayersPage />} />
        <Route path="joueurs/:id" element={<PlayerPage />} />
        <Route path="compte" element={<AccountPage />} />
        <Route path="patterns-en-attente" element={<PendingPatternsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
