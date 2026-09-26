import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { NumberBadge } from './NumberBadge';

interface Props {
  number: number;
  title: string;
  subtitle?: ReactNode;
  highlighted?: boolean;
  disabled?: boolean;
  // Grisée sans être désactivée : la carte reste lisible, mais on voit qu'il n'y a plus rien à faire.
  dimmed?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
}

// Carte de base des listes de joueurs : sélection à la création d'un match, case à
// cocher pendant le match, ligne d'équipe dans l'onglet Joueurs.
export function PlayerCard({
  number,
  title,
  subtitle,
  highlighted,
  disabled,
  dimmed,
  onClick,
  trailing,
}: Props) {
  const content = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5 }}>
      <NumberBadge number={number} highlighted={highlighted} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 600, color: highlighted ? 'primary.main' : 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </Box>
      {trailing}
    </Stack>
  );

  return (
    <Card
      sx={{
        opacity: disabled ? 0.45 : dimmed ? 0.6 : 1,
        bgcolor: highlighted ? 'rgba(143, 176, 232, 0.12)' : undefined,
      }}
    >
      {onClick ? (
        <CardActionArea disabled={disabled} onClick={onClick}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  );
}
