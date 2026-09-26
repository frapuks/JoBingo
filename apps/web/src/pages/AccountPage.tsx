import { PushConfig } from '@jobingo/shared';
import EditRounded from '@mui/icons-material/EditRounded';
import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import LockReset from '@mui/icons-material/LockReset';
import {
  Alert,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getJson } from '../api';
import { useCurrentUser, useLogout } from '../auth/useAuth';
import { isIosOutsideHomeScreen, isSubscribed, subscribeToPush, unsubscribeFromPush } from '../push';
import { usePendingPatterns } from '../team/useTeam';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { DisplayNameDialog } from './DisplayNameDialog';

function NotificationsCard() {
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ['push-config'], queryFn: () => getJson('/push/config', PushConfig) });
  const subscribed = useQuery({ queryKey: ['push-subscribed'], queryFn: isSubscribed });

  const toggle = useMutation({
    mutationFn: async (active: boolean) => {
      if (active) await subscribeToPush(config.data?.publicKey ?? '');
      else await unsubscribeFromPush();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['push-subscribed'] }),
  });

  // Clés VAPID absentes côté serveur : la fonctionnalité reste invisible.
  if (!config.data?.enabled || !config.data.publicKey) return null;

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
              {toggle.error && <Alert severity="error">{toggle.error.message}</Alert>}
              <FormControlLabel
                // labelPlacement start : le libellé à gauche, l'interrupteur au bout de la ligne.
                labelPlacement="start"
                sx={{ m: 0, justifyContent: 'space-between' }}
                control={
                  <Switch
                    checked={subscribed.data ?? false}
                    disabled={subscribed.isPending || toggle.isPending}
                    onChange={(event) => toggle.mutate(event.target.checked)}
                  />
                }
                label="Sur cet appareil"
              />
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
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const pending = usePendingPatterns();

  if (!user) return null;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Mon compte
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            Nom
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h6" sx={{ flex: 1, minWidth: 0 }} noWrap>
              {user.displayName ?? 'Non renseigné'}
            </Typography>
            <IconButton aria-label="Modifier mon nom" onClick={() => setNameOpen(true)}>
              <EditRounded />
            </IconButton>
          </Stack>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Adresse e-mail
          </Typography>
          <Typography sx={{ wordBreak: 'break-all' }}>{user.email}</Typography>
          <Button
            variant="outlined"
            startIcon={<LockReset />}
            onClick={() => {
              setPasswordChanged(false);
              setDialogOpen(true);
            }}
            sx={{ mt: 2 }}
          >
            Changer son mot de passe
          </Button>
          {passwordChanged && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Mot de passe modifié. Vos autres appareils ont été déconnectés.
            </Alert>
          )}
        </CardContent>
      </Card>
      {nameOpen && <DisplayNameDialog open currentName={user.displayName} onClose={() => setNameOpen(false)} />}
      <ChangePasswordDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onChanged={() => setPasswordChanged(true)}
      />
      {user.isAdmin && (
        <Button
          variant="outlined"
          startIcon={<FactCheckRounded />}
          onClick={() => navigate('/patterns-en-attente')}
        >
          Patterns à valider{pending.data?.length ? ` (${pending.data.length})` : ''}
        </Button>
      )}
      <NotificationsCard />
      <Button
        variant="contained"
        loading={logout.isPending}
        onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/connexion', { replace: true }) })}
      >
        Se déconnecter
      </Button>
    </Stack>
  );
}
