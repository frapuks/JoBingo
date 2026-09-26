import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useState, type FormEvent } from 'react';

interface Props {
  open: boolean;
  title: string;
  initialText?: string;
  confirmLabel: string;
  loading?: boolean;
  error?: Error | null;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

// Sert à proposer un pattern, à le corriger, et à le corriger avant validation.
export function PatternFormDialog({
  open,
  title,
  initialText = '',
  confirmLabel,
  loading,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [text, setText] = useState(initialText);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(text);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error.message}</Alert>}
            <TextField
              label="Pattern"
              value={text}
              onChange={(e) => setText(e.target.value)}
              multiline
              minRows={2}
              required
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" loading={loading}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
