import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import { Alert, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ActionBar } from '../components/ActionBar';
import { PlayerCard } from '../components/PlayerCard';
import { SectionHeader } from '../components/SectionHeader';
import { useCreateMatch, useMatch, useUpdateMatch } from '../match/useMatches';
import { usePlayers } from '../team/useTeam';

// Le même écran crée un match et modifie un match pas encore lancé.
export function MatchFormPage() {
  const matchId = Number(useParams().id) || null;
  const existing = useMatch(matchId ?? 0, { enabled: matchId !== null });
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const players = usePlayers();
  const create = useCreateMatch();
  const update = useUpdateMatch(matchId ?? 0);
  const save = matchId ? update : create;
  const navigate = useNavigate();

  // Les valeurs du match ne remplissent le formulaire qu'une fois, sans écraser la saisie.
  if (matchId && !loaded && existing.data) {
    setName(existing.data.name);
    setSelected(existing.data.playerIds);
    setLoaded(true);
  }

  const toggle = (id: number) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const submit = () =>
    save.mutate(
      { name, playerIds: selected },
      { onSuccess: (match) => navigate(`/matchs/${match.id}`, { replace: true }) },
    );

  return (
    <Stack spacing={1.5}>
      <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/matchs')} sx={{ alignSelf: 'flex-start' }}>
        {matchId ? 'Retour' : 'Matchs'}
      </Button>
      <Typography variant="h5" component="h1">
        {matchId ? 'Modifier le match' : 'Créer un match'}
      </Typography>

      {save.error && <Alert severity="error">{save.error.message}</Alert>}
      <TextField label="Nom du match" value={name} onChange={(e) => setName(e.target.value)} required />

      <SectionHeader title="Joueurs présents" count={selected.length} />
      {players.isPending && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}

      {players.data?.map((player) => {
        // Sans pattern validé, un joueur ne peut pas entrer dans la grille.
        const unavailable = player.approvedPatterns === 0;
        return (
          <PlayerCard
            key={player.id}
            number={player.number}
            title={player.name}
            subtitle={
              unavailable
                ? 'Aucun pattern'
                : `${player.approvedPatterns} pattern${player.approvedPatterns > 1 ? 's' : ''}`
            }
            disabled={unavailable}
            highlighted={selected.includes(player.id)}
            onClick={() => toggle(player.id)}
            trailing={
              unavailable ? (
                <LockRounded sx={{ color: 'text.secondary' }} />
              ) : selected.includes(player.id) ? (
                <CheckCircleRounded color="primary" />
              ) : (
                <RadioButtonUncheckedRounded sx={{ color: 'text.secondary' }} />
              )
            }
          />
        );
      })}

      <ActionBar>
        <Button
          fullWidth
          variant="contained"
          disabled={selected.length === 0}
          loading={save.isPending}
          onClick={submit}
        >
          {matchId ? 'Enregistrer' : 'Créer le match'} ({selected.length})
        </Button>
      </ActionBar>
    </Stack>
  );
}
