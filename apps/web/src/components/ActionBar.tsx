import { Box, Paper } from '@mui/material';
import type { ReactNode } from 'react';

const NAV_HEIGHT = 56;

// Barre d'action collée au-dessus de la navigation du bas. Le décalage inclut la
// marge de sécurité de l'iPhone, sinon le bouton passerait sous l'indicateur d'accueil.
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <>
      <Box sx={{ height: 72 }} />
      <Paper
        elevation={8}
        square
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
          p: 1.5,
          pl: 'calc(12px + env(safe-area-inset-left))',
          pr: 'calc(12px + env(safe-area-inset-right))',
        }}
      >
        {children}
      </Paper>
    </>
  );
}
