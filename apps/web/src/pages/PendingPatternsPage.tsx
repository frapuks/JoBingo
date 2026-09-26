import type { PendingPattern } from '@jobingo/shared';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import { Alert, Button, Card, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { NumberBadge } from '../components/NumberBadge';
import { PatternFormDialog } from '../team/PatternFormDialog';
import { useApprovePattern, useDeletePattern, usePendingPatterns } from '../team/useTeam';

export function PendingPatternsPage() {
  const pending = usePendingPatterns();
  const approve = useApprovePattern();
  const refuse = useDeletePattern();
  const navigate = useNavigate();
  const [corrected, setCorrected] = useState<PendingPattern | null>(null);
  const [refused, setRefused] = useState<PendingPattern | null>(null);

  return (
    <Stack spacing={1.5}>
      <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/compte')} sx={{ alignSelf: 'flex-start' }}>
        Compte
      </Button>
      <Typography variant="h5" component="h1">
        Patterns à valider
      </Typography>

      {pending.isPending && <CircularProgress sx={{ alignSelf: 'center', my: 4 }} />}
      {pending.error && <Alert severity="error">{pending.error.message}</Alert>}
      {approve.error && <Alert severity="error">{approve.error.message}</Alert>}
      {pending.data?.length === 0 && <EmptyState message="Aucune proposition en attente." />}

      {pending.data?.map((pattern) => (
        <Card key={pattern.id} sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <NumberBadge number={pattern.player.number} />
              <Typography sx={{ flex: 1, fontWeight: 600 }} noWrap>
                {pattern.player.name}
              </Typography>
            </Stack>
            <Typography color="text.secondary">{pattern.text}</Typography>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <IconButton aria-label="Refuser" onClick={() => setRefused(pattern)}>
                <CloseRounded />
              </IconButton>
              <IconButton aria-label="Corriger puis valider" onClick={() => setCorrected(pattern)}>
                <EditRounded />
              </IconButton>
              <IconButton
                aria-label="Valider"
                color="primary"
                onClick={() => approve.mutate({ id: pattern.id })}
              >
                <CheckRounded />
              </IconButton>
            </Stack>
          </Stack>
        </Card>
      ))}

      {corrected && (
        <PatternFormDialog
          open
          title="Corriger puis valider"
          initialText={corrected.text}
          confirmLabel="Valider"
          loading={approve.isPending}
          error={approve.error}
          onClose={() => setCorrected(null)}
          onSubmit={(text) => approve.mutate({ id: corrected.id, text }, { onSuccess: () => setCorrected(null) })}
        />
      )}
      <ConfirmDialog
        open={Boolean(refused)}
        title="Refuser cette proposition ?"
        message={refused?.text ?? ''}
        confirmLabel="Refuser"
        loading={refuse.isPending}
        onCancel={() => setRefused(null)}
        onConfirm={() => refused && refuse.mutate(refused.id, { onSuccess: () => setRefused(null) })}
      />
    </Stack>
  );
}
