import AddRounded from '@mui/icons-material/AddRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import { Alert, Box, CircularProgress, Fab, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '../auth/useAuth';
import { EmptyState } from '../components/EmptyState';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerFormDialog } from '../team/PlayerFormDialog';
import { usePlayers } from '../team/useTeam';

function patternsLabel(approved: number, pending: number): string {
  const validated = approved === 0 ? 'Aucun pattern' : `${approved} pattern${approved > 1 ? 's' : ''}`;
  return pending ? `${validated} · ${pending} en attente` : validated;
}

export function PlayersPage() {
  const { data: user } = useCurrentUser();
  const players = usePlayers();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <Stack spacing={1.5}>
      <Typography variant="h5" component="h1">
        Joueurs
      </Typography>

      {players.isPending && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}
      {players.error && <Alert severity="error">{players.error.message}</Alert>}
      {players.data?.length === 0 && <EmptyState message="Aucun joueur pour l'instant." />}

      {players.data?.map((player) => (
        <PlayerCard
          key={player.id}
          number={player.number}
          title={player.name}
          subtitle={patternsLabel(player.approvedPatterns, player.pendingPatterns)}
          onClick={() => navigate(`/joueurs/${player.id}`)}
          trailing={<ChevronRightRounded sx={{ color: 'text.secondary' }} />}
        />
      ))}

      {user?.isAdmin && (
        <Box sx={{ position: 'fixed', right: 16, bottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
          <Fab color="secondary" onClick={() => setFormOpen(true)} aria-label="Ajouter un joueur">
            <AddRounded />
          </Fab>
        </Box>
      )}
      {formOpen && <PlayerFormDialog open onClose={() => setFormOpen(false)} />}
    </Stack>
  );
}
