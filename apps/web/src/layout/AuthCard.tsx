import { Box, Paper, Stack, Typography } from '@mui/material';
import type { FormEvent, ReactNode } from 'react';

interface Props {
  title: string;
  onSubmit: () => void;
  children: ReactNode;
}

export function AuthCard({ title, onSubmit, children }: Props) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        pt: 'calc(env(safe-area-inset-top) + 16px)',
        pb: 'calc(env(safe-area-inset-bottom) + 16px)',
      }}
    >
      <Paper component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', maxWidth: 400, p: 3 }}>
        <Stack spacing={2.5}>
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            <Box component="img" src="/icons/icon-192.png" alt="" sx={{ width: 96, height: 96, borderRadius: '22%' }} />
            <Typography variant="h5" component="h1">
              {title}
            </Typography>
          </Stack>
          {children}
        </Stack>
      </Paper>
    </Box>
  );
}
