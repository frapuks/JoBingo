import { HealthResponse } from '@jobingo/shared';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../api';
import { useCurrentUser } from '../auth/useAuth';

export function HomePage() {
  const { data: user } = useCurrentUser();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => getJson('/health', HealthResponse),
    refetchInterval: 30_000,
  });

  const apiOk = health.data?.status === 'ok';

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        Bonjour !
      </Typography>
      <Typography color="text.secondary">Connecté en tant que {user?.email}</Typography>
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1">État du serveur</Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Chip
                label={health.isPending ? 'API : vérification…' : apiOk ? 'API : en ligne' : 'API : injoignable'}
                color={health.isPending ? 'default' : apiOk ? 'success' : 'error'}
              />
              {health.data?.migrations != null && (
                <Chip label={`Migrations : ${health.data.migrations}`} variant="outlined" />
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
