import type { RankingRow } from '@jobingo/shared';
import { Card, CardActionArea, Stack, Typography } from '@mui/material';

interface Props {
  rows: RankingRow[];
  total: number;
  selectedUserId: number | null;
  onSelect: (userId: number) => void;
}

// Le classement provisoire de la mi-temps et le classement final partagent cet affichage.
// Toucher une ligne affiche la grille de ce participant.
export function Ranking({ rows, total, selectedUserId, onSelect }: Props) {
  return (
    <Stack spacing={1}>
      {rows.map((row) => {
        const selected = row.userId === selectedUserId;
        return (
          <Card
            key={row.userId}
            sx={{
              borderLeft: 3,
              borderColor: selected ? 'secondary.main' : 'transparent',
              bgcolor: selected ? 'rgba(224, 130, 106, 0.12)' : undefined,
            }}
          >
            <CardActionArea onClick={() => onSelect(row.userId)} sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ width: 24, fontWeight: 700, color: 'text.secondary' }}>
                  {row.rank}
                </Typography>
                <Typography noWrap sx={{ flex: 1, fontWeight: row.isMe ? 700 : 400 }}>
                  {row.name}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {row.score}{' '}
                  <Typography component="span" color="text.secondary">
                    / {total}
                  </Typography>
                </Typography>
              </Stack>
            </CardActionArea>
          </Card>
        );
      })}
    </Stack>
  );
}
