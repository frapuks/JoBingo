import { PushConfig } from '@jobingo/shared';
import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getJson } from '../api';
import { useCurrentUser, useLogout } from '../auth/useAuth';
import { isIosOutsideHomeScreen, subscribeToPush } from '../push';

function NotificationsCard() {
  const config = useQuery({ queryKey: ['push-config'], queryFn: () => getJson('/push/config', PushConfig) });
  const subscribe = useMutation({ mutationFn: subscribeToPush });

  // Clés VAPID absentes côté serveur : la fonctionnalité reste invisible.
  if (!config.data?.enabled || !config.data.publicKey) return null;
  const publicKey = config.data.publicKey;

  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Notifications</Typography>
          {isIosOutsideHomeScreen() ? (
            <Alert severity="info">
              Sur iPhone, les notifications ne fonctionnent qu'une fois JoBingo ajouté à l'écran d'accueil
              (Partager, puis « Sur l'écran d'accueil »).
            </Alert>
          ) : (
            <>
              {subscribe.error && <Alert severity="error">{subscribe.error.message}</Alert>}
              {subscribe.isSuccess && <Alert severity="success">Notifications activées sur cet appareil.</Alert>}
              <Button variant="outlined" loading={subscribe.isPending} onClick={() => subscribe.mutate(publicKey)}>
                Activer les notifications
              </Button>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function AccountPage() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const logoutAll = useLogout(true);
  const navigate = useNavigate();
  const toLogin = { onSuccess: () => navigate('/connexion', { replace: true }) };

  if (!user) return null;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Mon compte
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="h6">{user.displayName}</Typography>
            <Typography color="text.secondary">{user.email}</Typography>
          </Stack>
        </CardContent>
      </Card>
      <NotificationsCard />
      <Button variant="contained" loading={logout.isPending} onClick={() => logout.mutate(undefined, toLogin)}>
        Se déconnecter
      </Button>
      <Button color="secondary" loading={logoutAll.isPending} onClick={() => logoutAll.mutate(undefined, toLogin)}>
        Déconnecter tous mes appareils
      </Button>
    </Stack>
  );
}
