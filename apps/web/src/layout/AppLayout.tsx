import HomeRounded from '@mui/icons-material/HomeRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import { BottomNavigation, BottomNavigationAction, Box, Paper } from '@mui/material';
import { Outlet, useLocation, useNavigate } from 'react-router';

const TABS = [
  { path: '/', label: 'Accueil', icon: <HomeRounded /> },
  { path: '/compte', label: 'Compte', icon: <PersonRounded /> },
];

const NAV_HEIGHT = 56;

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = TABS.find((tab) => tab.path === location.pathname)?.path ?? false;

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        pt: 'env(safe-area-inset-top)',
        pl: 'env(safe-area-inset-left)',
        pr: 'env(safe-area-inset-right)',
      }}
    >
      {/* Réserve la place de la barre du bas, marge de sécurité comprise, pour ne rien masquer. */}
      <Box component="main" sx={{ p: 2, pb: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom) + 16px)` }}>
        <Outlet />
      </Box>
      <Paper component="nav" elevation={8} square sx={{ position: 'fixed', left: 0, right: 0, bottom: 0 }}>
        {/* La marge de sécurité est incluse dans la barre : sa couleur descend jusqu'au bord,
            sous l'indicateur d'accueil iOS, au lieu de laisser une bande vide. */}
        <BottomNavigation
          value={current}
          onChange={(_event, path: string) => navigate(path)}
          showLabels
          sx={{
            height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
            pb: 'env(safe-area-inset-bottom)',
            pl: 'env(safe-area-inset-left)',
            pr: 'env(safe-area-inset-right)',
          }}
        >
          {TABS.map((tab) => (
            <BottomNavigationAction key={tab.path} value={tab.path} label={tab.label} icon={tab.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
