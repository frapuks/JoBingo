import { Alert, Button, Link, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router';
import { useCurrentUser, useLogin } from '../auth/useAuth';
import { AuthCard } from '../layout/AuthCard';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { data: user } = useCurrentUser();
  const login = useLogin();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  if (user) return <Navigate to={from} replace />;

  const submit = () => login.mutate({ email, password }, { onSuccess: () => navigate(from, { replace: true }) });

  return (
    <AuthCard title="Connexion" onSubmit={submit}>
      {login.error && <Alert severity="error">{login.error.message}</Alert>}
      <TextField
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="contained" size="large" loading={login.isPending}>
        Se connecter
      </Button>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Link component={RouterLink} to="/mot-de-passe-oublie" variant="body2">
          Mot de passe oublié ?
        </Link>
        <Link component={RouterLink} to="/inscription" variant="body2">
          Créer un compte
        </Link>
      </Stack>
    </AuthCard>
  );
}
