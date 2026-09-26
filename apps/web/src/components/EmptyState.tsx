import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  message: string;
  action?: ReactNode;
  // Dans une section, le bloc doit rester discret au lieu d'occuper tout l'écran.
  compact?: boolean;
}

export function EmptyState({ message, action, compact }: Props) {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', py: compact ? 2 : 6 }}>
      <Typography color="text.secondary" variant={compact ? 'body2' : 'body1'}>
        {message}
      </Typography>
      {action}
    </Stack>
  );
}
