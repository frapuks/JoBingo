import type { MatchStatus, MatchSummary } from '@jobingo/shared';
import AddRounded from '@mui/icons-material/AddRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Fab,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { EmptyState } from '../components/EmptyState';
import { SectionHeader } from '../components/SectionHeader';
import { StatusChip } from '../components/StatusChip';
import { useMatches } from '../match/useMatches';

const SECTIONS: { title: string; statuses: MatchStatus[] }[] = [
  { title: 'En cours', statuses: ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'] },
  { title: 'En attente', statuses: ['PENDING'] },
  { title: 'Terminés', statuses: ['FINISHED'] },
];

function MatchRow({ match, onClick }: { match: MatchSummary; onClick: () => void }) {
  return (
    <Card>
      <CardActionArea onClick={onClick} sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600 }}>
              {match.name}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              {/* Sur mes propres matchs, l'adresse du créateur serait la mienne : la mention
                  « Gestionnaire » prend sa place. */}
              {match.isCreator ? (
                <Chip icon={<StarRounded />} label="Gestionnaire" size="small" color="primary" />
              ) : (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {match.creatorName ?? 'Créateur supprimé'}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" noWrap>
                · {match.participants} participant{match.participants > 1 ? 's' : ''}
              </Typography>
            </Stack>
          </Box>
          <StatusChip status={match.status} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export function MatchesPage() {
  const matches = useMatches();
  const navigate = useNavigate();

  const all = matches.data ?? [];
  // Un match terminé va dans « Terminés », même si je l'ai rejoint ou que je le gère :
  // il n'y a plus rien à y faire.
  const live = all.filter((match) => match.status !== 'FINISHED');
  // Dans « Mes matchs », ceux en cours d'abord : c'est là qu'il faut agir tout de suite.
  const rank = (match: MatchSummary) => SECTIONS.findIndex(({ statuses }) => statuses.includes(match.status));
  const mine = live.filter((match) => match.joined).sort((a, b) => rank(a) - rank(b));
  const others = live.filter((match) => !match.joined);

  return (
    <Stack spacing={1.5}>
      <Typography variant="h5" component="h1">
        Matchs
      </Typography>

      {matches.isPending && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}
      {matches.error && <Alert severity="error">{matches.error.message}</Alert>}
      {matches.data?.length === 0 && <EmptyState message="Aucun match pour l'instant." />}

      {mine.length > 0 && (
        <Stack spacing={1.5}>
          <SectionHeader title="Mes matchs" count={mine.length} />
          {mine.map((match) => (
            <MatchRow key={match.id} match={match} onClick={() => navigate(`/matchs/${match.id}`)} />
          ))}
        </Stack>
      )}

      {/* Les matchs rejoints encore en jeu ne réapparaissent pas plus bas : une carte par match. */}
      {matches.data &&
        SECTIONS.map(({ title, statuses }) => {
          const source = statuses.includes('FINISHED') ? all : others;
          const rows = source.filter((match) => statuses.includes(match.status));
          if (rows.length === 0) return null;
          return (
            <Stack key={title} spacing={1.5}>
              <SectionHeader title={title} count={rows.length} />
              {rows.map((match) => (
                <MatchRow key={match.id} match={match} onClick={() => navigate(`/matchs/${match.id}`)} />
              ))}
            </Stack>
          );
        })}

      <Box sx={{ position: 'fixed', right: 16, bottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
        <Fab color="secondary" onClick={() => navigate('/matchs/nouveau')} aria-label="Créer un match">
          <AddRounded />
        </Fab>
      </Box>
    </Stack>
  );
}
