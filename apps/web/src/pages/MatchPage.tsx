import type { MatchDetail, MatchStatus } from '@jobingo/shared';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import { Alert, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useCurrentUser } from '../auth/useAuth';
import { ActionBar } from '../components/ActionBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PlayerCard } from '../components/PlayerCard';
import { Ranking } from '../components/Ranking';
import { ScoreBar } from '../components/ScoreBar';
import { SectionHeader } from '../components/SectionHeader';
import { StatusChip } from '../components/StatusChip';
import {
  useAdvanceMatch,
  useDeleteMatch,
  useJoinMatch,
  useLeaveMatch,
  useMatch,
  useParticipantGrid,
  useToggleCard,
} from '../match/useMatches';

const PLAYING: MatchStatus[] = ['FIRST_HALF', 'SECOND_HALF'];

// Le créateur fait avancer le match : un seul bouton, dont le rôle dépend de l'état.
type Step = 'start' | 'half-time' | 'second-half' | 'finish';

const NEXT_STEP: Partial<Record<MatchStatus, { label: string; step: Step }>> = {
  PENDING: { label: 'Lancer le match', step: 'start' },
  FIRST_HALF: { label: 'Mi-temps', step: 'half-time' },
  HALF_TIME: { label: 'Deuxième mi-temps', step: 'second-half' },
  SECOND_HALF: { label: 'Fin du match', step: 'finish' },
};

// Chaque changement d'état est irréversible pour les autres : on confirme avant.
const CONFIRMATIONS: Record<Step, { title: string; message: string; confirmLabel: string }> = {
  start: {
    title: 'Lancer le match ?',
    message: 'Les patterns vont être tirés au sort. La grille ne changera plus.',
    confirmLabel: 'Lancer',
  },
  'half-time': {
    title: 'Siffler la mi-temps ?',
    message: 'Les cases seront bloquées et le classement affiché.',
    confirmLabel: 'Mi-temps',
  },
  'second-half': {
    title: 'Reprendre le match ?',
    message: 'Les cases redeviennent cochables.',
    confirmLabel: 'Reprendre',
  },
  finish: {
    title: 'Terminer le match ?',
    message: 'Le classement sera figé et le match ne pourra plus être modifié.',
    confirmLabel: 'Terminer',
  },
};

export function MatchPage() {
  const matchId = Number(useParams().id);
  const match = useMatch(matchId);
  const navigate = useNavigate();

  const advance = useAdvanceMatch(matchId);
  const join = useJoinMatch(matchId);
  const leave = useLeaveMatch(matchId);
  const remove = useDeleteMatch();
  const toggle = useToggleCard(matchId);
  const { data: me } = useCurrentUser();

  // Grille affichée : la mienne par défaut, celle d'un autre si on le choisit au classement.
  const [viewedUserId, setViewedUserId] = useState<number | null>(null);
  const otherGrid = useParticipantGrid(matchId, viewedUserId && viewedUserId !== me?.id ? viewedUserId : null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmedStep, setConfirmedStep] = useState<Step | null>(null);

  if (match.isPending) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
  if (match.error) return <Alert severity="error">{match.error.message}</Alert>;
  if (!match.data) return null;

  const data: MatchDetail = match.data;
  const playing = PLAYING.includes(data.status);
  // Grille figée : à la mi-temps comme après le coup de sifflet final, plus rien ne se coche.
  const locked = data.status === 'HALF_TIME' || data.status === 'FINISHED';
  // Hors classement, il n'y a rien à choisir : chacun ne voit que sa propre grille.
  const selectedUserId = data.ranking ? (viewedUserId ?? me?.id ?? null) : (me?.id ?? null);
  const viewedRow = data.ranking?.find((row) => row.userId === selectedUserId);
  const mine = selectedUserId === me?.id;
  const cards = mine ? data.cards : (otherGrid.data ?? []);
  const checked = cards.filter((card) => card.checked).length;
  const next = data.isCreator ? NEXT_STEP[data.status] : undefined;
  // Un match terminé n'offre plus aucune action : la barre du bas disparaît.
  const hasActions = Boolean(next) || data.status !== 'FINISHED';

  return (
    <Stack spacing={1.5}>
      <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/matchs')} sx={{ alignSelf: 'flex-start' }}>
        Matchs
      </Button>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="h5" component="h1" sx={{ flex: 1 }}>
          {data.name}
        </Typography>
        <Chip icon={<GroupsRounded />} label={data.participants} size="small" />
        <StatusChip status={data.status} />
      </Stack>

      {(toggle.error || advance.error || join.error) && (
        <Alert severity="error">{(toggle.error ?? advance.error ?? join.error)?.message}</Alert>
      )}

      {data.status !== 'PENDING' && data.joined && <ScoreBar checked={checked} total={data.cards.length} />}

      {data.ranking && (
        <>
          <SectionHeader title="Classement" count={data.participants} />
          <Ranking
            rows={data.ranking}
            total={data.cards.length}
            selectedUserId={selectedUserId}
            onSelect={setViewedUserId}
          />
        </>
      )}

      {/* Avant le coup d'envoi, on veut savoir qui est déjà de la partie. */}
      {data.status === 'PENDING' && (
        <>
          <SectionHeader title="Participants" count={data.participantNames.length} />
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {data.participantNames.map((name) => (
              <Chip key={name} label={name} size="small" />
            ))}
          </Stack>
        </>
      )}

      <SectionHeader
        title={
          data.status === 'PENDING' ? 'Joueurs retenus' : mine ? 'Ma grille' : `Grille de ${viewedRow?.name ?? ''}`
        }
        count={data.cards.length}
      />
      {cards.map((card) => (
        <PlayerCard
          key={card.id}
          number={card.number}
          title={card.name}
          subtitle={card.pattern ?? undefined}
          highlighted={card.checked}
          dimmed={locked}
          onClick={
            playing && data.joined && mine
              ? () => toggle.mutate({ id: card.id, checked: card.checked })
              : undefined
          }
          trailing={
            data.status === 'PENDING' ? undefined : card.checked ? (
              <CheckCircleRounded color="primary" />
            ) : (
              <RadioButtonUncheckedRounded sx={{ color: 'text.secondary' }} />
            )
          }
        />
      ))}

      {hasActions && (
        <ActionBar>
          <Stack spacing={1}>
            {/* L'action principale occupe sa propre ligne : elle est la plus utilisée, et
                souvent pressée dans l'urgence du coup de sifflet. */}
            {next && (
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                loading={advance.isPending}
                onClick={() => setConfirmedStep(next.step)}
              >
                {next.label}
              </Button>
            )}
            {!data.joined && data.status !== 'FINISHED' && (
              <Button fullWidth variant="contained" loading={join.isPending} onClick={() => join.mutate()}>
                Rejoindre
              </Button>
            )}
            <Stack direction="row" spacing={1}>
              {data.joined && !data.isCreator && data.status !== 'FINISHED' && (
                <Button fullWidth size="small" color="secondary" onClick={() => setLeaveOpen(true)}>
                  Abandonner
                </Button>
              )}
              {data.isCreator && data.status === 'PENDING' && (
                <>
                  <Button fullWidth size="small" onClick={() => navigate(`/matchs/${matchId}/modifier`)}>
                    Modifier
                  </Button>
                  <Button fullWidth size="small" onClick={() => setDeleteOpen(true)}>
                    Supprimer
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </ActionBar>
      )}

      {confirmedStep && (
        <ConfirmDialog
          open
          {...CONFIRMATIONS[confirmedStep]}
          loading={advance.isPending}
          onCancel={() => setConfirmedStep(null)}
          onConfirm={() => advance.mutate(confirmedStep, { onSuccess: () => setConfirmedStep(null) })}
        />
      )}
      <ConfirmDialog
        open={leaveOpen}
        title="Abandonner ce match ?"
        message="Vos coches seront perdues et vous disparaîtrez du classement."
        confirmLabel="Abandonner"
        loading={leave.isPending}
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => leave.mutate(undefined, { onSuccess: () => setLeaveOpen(false) })}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer ce match ?"
        message={data.name}
        loading={remove.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => remove.mutate(matchId, { onSuccess: () => navigate('/matchs', { replace: true }) })}
      />
    </Stack>
  );
}
