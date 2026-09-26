import type { Pattern } from '@jobingo/shared';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import DeleteRounded from '@mui/icons-material/DeleteRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import {
  Alert,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useCurrentUser } from '../auth/useAuth';
import { ActionBar } from '../components/ActionBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { NumberBadge } from '../components/NumberBadge';
import { SectionHeader } from '../components/SectionHeader';
import { PatternFormDialog } from '../team/PatternFormDialog';
import { PlayerFormDialog } from '../team/PlayerFormDialog';
import {
  useDeletePattern,
  useDeletePlayer,
  useProposePattern,
  useUpdatePattern,
  usePlayer,
} from '../team/useTeam';

function PatternCard({ pattern, actions }: { pattern: Pattern; actions?: React.ReactNode }) {
  return (
    <Card sx={{ p: 1.5, opacity: pattern.status === 'PENDING' ? 0.7 : 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography sx={{ flex: 1 }}>{pattern.text}</Typography>
        {pattern.status === 'PENDING' && <Chip label="En attente" size="small" color="secondary" />}
        {actions}
      </Stack>
    </Card>
  );
}

export function PlayerPage() {
  const playerId = Number(useParams().id);
  const { data: user } = useCurrentUser();
  const player = usePlayer(playerId);
  const navigate = useNavigate();

  const propose = useProposePattern(playerId);
  const updatePattern = useUpdatePattern();
  const deletePattern = useDeletePattern();
  const deletePlayer = useDeletePlayer();

  const [proposeOpen, setProposeOpen] = useState(false);
  const [editPlayerOpen, setEditPlayerOpen] = useState(false);
  const [editedPattern, setEditedPattern] = useState<Pattern | null>(null);
  const [removedPattern, setRemovedPattern] = useState<Pattern | null>(null);
  const [removePlayerOpen, setRemovePlayerOpen] = useState(false);

  if (player.isPending) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
  if (player.error) return <Alert severity="error">{player.error.message}</Alert>;
  if (!player.data) return null;

  const approved = player.data.patterns.filter((pattern) => pattern.status === 'APPROVED');
  const pending = player.data.patterns.filter((pattern) => pattern.status === 'PENDING');

  const adminActions = (pattern: Pattern) =>
    user?.isAdmin ? (
      <>
        <IconButton size="small" aria-label="Modifier" onClick={() => setEditedPattern(pattern)}>
          <EditRounded fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="Supprimer" onClick={() => setRemovedPattern(pattern)}>
          <DeleteRounded fontSize="small" />
        </IconButton>
      </>
    ) : null;

  return (
    <Stack spacing={1.5}>
      <Button
        startIcon={<ArrowBackRounded />}
        onClick={() => navigate('/joueurs')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Joueurs
      </Button>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <NumberBadge number={player.data.number} size="large" />
        <Typography variant="h5" component="h1" sx={{ flex: 1 }}>
          {player.data.name}
        </Typography>
        {user?.isAdmin && (
          <>
            <IconButton aria-label="Modifier le joueur" onClick={() => setEditPlayerOpen(true)}>
              <EditRounded />
            </IconButton>
            <IconButton aria-label="Supprimer le joueur" onClick={() => setRemovePlayerOpen(true)}>
              <DeleteRounded />
            </IconButton>
          </>
        )}
      </Stack>

      <SectionHeader title="Patterns" count={approved.length} />
      {approved.length === 0 && <EmptyState compact message="Aucun pattern." />}
      {approved.map((pattern) => (
        <PatternCard key={pattern.id} pattern={pattern} actions={adminActions(pattern)} />
      ))}

      {pending.length > 0 && (
        <>
          <SectionHeader title="En attente" count={pending.length} />
          {pending.map((pattern) => (
            <PatternCard key={pattern.id} pattern={pattern} actions={adminActions(pattern)} />
          ))}
        </>
      )}

      <ActionBar>
        <Button fullWidth variant="contained" startIcon={<AddRounded />} onClick={() => setProposeOpen(true)}>
          Proposer un pattern
        </Button>
      </ActionBar>

      {proposeOpen && (
        <PatternFormDialog
          open
          title="Proposer un pattern"
          confirmLabel={user?.isAdmin ? 'Ajouter' : 'Proposer'}
          loading={propose.isPending}
          error={propose.error}
          onClose={() => setProposeOpen(false)}
          onSubmit={(text) => propose.mutate({ text }, { onSuccess: () => setProposeOpen(false) })}
        />
      )}
      {editedPattern && (
        <PatternFormDialog
          open
          title="Modifier le pattern"
          initialText={editedPattern.text}
          confirmLabel="Enregistrer"
          loading={updatePattern.isPending}
          error={updatePattern.error}
          onClose={() => setEditedPattern(null)}
          onSubmit={(text) =>
            updatePattern.mutate({ id: editedPattern.id, text }, { onSuccess: () => setEditedPattern(null) })
          }
        />
      )}
      {editPlayerOpen && (
        <PlayerFormDialog open player={player.data} onClose={() => setEditPlayerOpen(false)} />
      )}
      <ConfirmDialog
        open={Boolean(removedPattern)}
        title="Supprimer ce pattern ?"
        message={removedPattern?.text ?? ''}
        loading={deletePattern.isPending}
        onCancel={() => setRemovedPattern(null)}
        onConfirm={() =>
          removedPattern &&
          deletePattern.mutate(removedPattern.id, { onSuccess: () => setRemovedPattern(null) })
        }
      />
      <ConfirmDialog
        open={removePlayerOpen}
        title="Supprimer ce joueur ?"
        message="Ses patterns seront supprimés. Les matchs déjà joués ne changent pas."
        loading={deletePlayer.isPending}
        onCancel={() => setRemovePlayerOpen(false)}
        onConfirm={() => deletePlayer.mutate(playerId, { onSuccess: () => navigate('/joueurs') })}
      />
    </Stack>
  );
}
