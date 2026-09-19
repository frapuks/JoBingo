import { Alert, Box, Button, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useCurrentUser } from './useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress />
      </Box>
    );
  }
  // API injoignable : renvoyer vers la connexion ferait croire à une session perdue.
  if (isError) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', p: 3 }}>
        <Alert severity="error" action={<Button onClick={() => refetch()}>Réessayer</Button>}>
          Impossible de joindre le serveur.
        </Alert>
      </Box>
    );
  }
  if (!user) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  return children;
}
