import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useState, type FormEvent } from 'react';
import { useUpdateDisplayName } from '../auth/useAuth';

interface Props {
  open: boolean;
  currentName: string | null;
  onClose: () => void;
}

export function DisplayNameDialog({ open, currentName, onClose }: Props) {
  const [name, setName] = useState(currentName ?? '');
  const update = useUpdateDisplayName();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({ displayName: name }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle>Mon nom</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {update.error && <Alert severity="error">{update.error.message}</Alert>}
            <TextField
              label="Nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="Laissez vide pour afficher votre adresse e-mail."
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" loading={update.isPending}>
            Enregistrer
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
