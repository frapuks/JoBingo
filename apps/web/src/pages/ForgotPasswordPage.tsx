import { Alert, Button, Link, TextField } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useForgotPassword } from '../auth/useAuth';
import { AuthCard } from '../layout/AuthCard';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const forgot = useForgotPassword();

  return (
    <AuthCard title="Mot de passe oublié" onSubmit={() => forgot.mutate({ email })}>
      {forgot.isSuccess ? (
        <Alert severity="success">
          Si un compte existe pour cette adresse, un lien de réinitialisation vient d'y être envoyé. Il
          est valable une heure.
        </Alert>
      ) : (
        <>
          {forgot.error && <Alert severity="error">{forgot.error.message}</Alert>}
          <TextField
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" size="large" loading={forgot.isPending}>
            Recevoir un lien
          </Button>
        </>
      )}
      <Link component={RouterLink} to="/connexion" variant="body2" sx={{ textAlign: 'center' }}>
        Retour à la connexion
      </Link>
    </AuthCard>
  );
}
