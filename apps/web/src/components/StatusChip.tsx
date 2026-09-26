import type { MatchStatus } from '@jobingo/shared';
import { Chip } from '@mui/material';

const LABELS: Record<MatchStatus, { label: string; color: 'default' | 'primary' | 'secondary' }> = {
  PENDING: { label: 'En attente', color: 'default' },
  FIRST_HALF: { label: '1re mi-temps', color: 'secondary' },
  HALF_TIME: { label: 'Mi-temps', color: 'primary' },
  SECOND_HALF: { label: '2e mi-temps', color: 'secondary' },
  FINISHED: { label: 'Terminé', color: 'default' },
};

export function StatusChip({ status }: { status: MatchStatus }) {
  const { label, color } = LABELS[status];
  return <Chip label={label} size="small" color={color} />;
}
