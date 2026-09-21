import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useChangePassword } from '../auth/useAuth';

const EMPTY = { currentPassword: '', password: '', passwordConfirmation: '' };

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ChangePasswordDialog({ open, onClose, onChanged }: Props) {
  const [form, setForm] = useState(EMPTY);
  const change = useChangePassword();

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [name]: e.target.value }),
  });

  // Aucun mot de passe ne doit rester en mémoire une fois la fenêtre fermée.
  const close = () => {
    setForm(EMPTY);
    change.reset();
    onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    change.mutate(form, {
      onSuccess: () => {
        close();
        onChanged();
      },
    });
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle>Changer son mot de passe</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {change.error && <Alert severity="error">{change.error.message}</Alert>}
            <TextField
              label="Mot de passe actuel"
              type="password"
              autoComplete="current-password"
              required
              {...field('currentPassword')}
            />
            <TextField
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              helperText="10 caractères minimum. Vos autres appareils seront déconnectés."
              required
              {...field('password')}
            />
            <TextField
              label="Confirmation du nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              required
              {...field('passwordConfirmation')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close}>Annuler</Button>
          <Button type="submit" variant="contained" loading={change.isPending}>
            Enregistrer
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
