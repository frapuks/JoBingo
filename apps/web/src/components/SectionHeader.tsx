import { Chip, Stack, Typography } from '@mui/material';

interface Props {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: Props) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
        {title}
      </Typography>
      {count !== undefined && <Chip label={count} size="small" />}
    </Stack>
  );
}
