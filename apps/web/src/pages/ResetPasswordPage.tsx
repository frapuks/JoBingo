import { Alert, Button, Link, TextField } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router';
import { useResetPassword } from '../auth/useAuth';
import { AuthCard } from '../layout/AuthCard';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [params] = useSearchParams();
  const reset = useResetPassword();
  const navigate = useNavigate();

  const submit = () =>
    reset.mutate(
      { token: params.get('jeton') ?? '', password },
      { onSuccess: () => navigate('/', { replace: true }) },
    );

  return (
    <AuthCard title="Nouveau mot de passe" onSubmit={submit}>
      {reset.error && <Alert severity="error">{reset.error.message}</Alert>}
      <TextField
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        helperText="10 caractères minimum. Vos autres appareils seront déconnectés."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="contained" size="large" loading={reset.isPending}>
        Enregistrer
      </Button>
      <Link component={RouterLink} to="/mot-de-passe-oublie" variant="body2" sx={{ textAlign: 'center' }}>
        Demander un nouveau lien
      </Link>
    </AuthCard>
  );
}
