import { Box } from '@mui/material';

interface Props {
  number: number;
  highlighted?: boolean;
  size?: 'small' | 'large';
}

// Pastille du numéro de maillot, reprise sur toutes les listes de joueurs.
export function NumberBadge({ number, highlighted = false, size = 'small' }: Props) {
  const side = size === 'large' ? 64 : 40;
  return (
    <Box
      sx={{
        width: side,
        height: side,
        borderRadius: size === 'large' ? '18px' : '12px',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        fontSize: size === 'large' ? 28 : 18,
        fontWeight: 700,
        bgcolor: highlighted ? 'primary.main' : 'rgba(255, 255, 255, 0.07)',
        color: highlighted ? 'primary.contrastText' : 'text.secondary',
      }}
    >
      {number}
    </Box>
  );
}
