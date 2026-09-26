import { Box, LinearProgress, Typography } from '@mui/material';

interface Props {
  checked: number;
  total: number;
}

export function ScoreBar({ checked, total }: Props) {
  return (
    <Box>
      <Typography variant="h5" component="p" sx={{ textAlign: 'right' }}>
        {checked}{' '}
        <Typography component="span" color="text.secondary">
          / {total}
        </Typography>
      </Typography>
      <LinearProgress
        variant="determinate"
        value={total ? (checked / total) * 100 : 0}
        sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
      />
    </Box>
  );
}
