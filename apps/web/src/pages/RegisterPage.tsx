import { Alert, Button, Link, TextField } from '@mui/material';
import { useState, type ChangeEvent } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router';
import { useCurrentUser, useRegister } from '../auth/useAuth';
import { AuthCard } from '../layout/AuthCard';

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', passwordConfirmation: '' });
  const { data: user } = useCurrentUser();
  const register = useRegister();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [name]: e.target.value }),
  });
  const submit = () => register.mutate(form, { onSuccess: () => navigate('/', { replace: true }) });

  return (
    <AuthCard title="Créer un compte" onSubmit={submit}>
      {register.error && <Alert severity="error">{register.error.message}</Alert>}
      <TextField label="Adresse e-mail" type="email" autoComplete="email" required {...field('email')} />
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        helperText="10 caractères minimum"
        required
        {...field('password')}
      />
      <TextField
        label="Confirmation du mot de passe"
        type="password"
        autoComplete="new-password"
        required
        {...field('passwordConfirmation')}
      />
      <Button type="submit" variant="contained" size="large" loading={register.isPending}>
        Créer mon compte
      </Button>
      <Link component={RouterLink} to="/connexion" variant="body2" sx={{ textAlign: 'center' }}>
        J'ai déjà un compte
      </Link>
    </AuthCard>
  );
}
