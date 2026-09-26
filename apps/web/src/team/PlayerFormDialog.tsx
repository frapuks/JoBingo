import type { Player } from '@jobingo/shared';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useState, type FormEvent } from 'react';
import { useCreatePlayer, useUpdatePlayer } from './useTeam';

interface Props {
  open: boolean;
  player?: Player;
  onClose: () => void;
}

export function PlayerFormDialog({ open, player, onClose }: Props) {
  const [name, setName] = useState(player?.name ?? '');
  const [number, setNumber] = useState(player ? String(player.number) : '');
  const create = useCreatePlayer();
  const update = useUpdatePlayer(player?.id ?? 0);
  const save = player ? update : create;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Champ vide : NaN déclenche le message « Numéro requis » du schéma partagé.
    save.mutate({ name, number: number.trim() === '' ? NaN : Number(number) }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle>{player ? 'Modifier le joueur' : 'Ajouter un joueur'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {save.error && <Alert severity="error">{save.error.message}</Alert>}
            <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            <TextField
              label="Numéro"
              type="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" loading={save.isPending}>
            Enregistrer
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
