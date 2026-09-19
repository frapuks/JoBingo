import { createTheme } from '@mui/material/styles';

// Palette du club. Le marine et le brique d'origine sont trop sombres pour du texte
// sur fond sombre : leurs versions éclaircies (ciel, corail) servent aux accents.
export const palette = {
  marine: '#253d6b',
  brique: '#53180d',
  nuit: '#0d1526',
  ardoise: '#16233f',
  ciel: '#8fb0e8',
  corail: '#e0826a',
  craie: '#eef2f8',
  brume: '#a9b8d4',
} as const;

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: palette.ciel, contrastText: palette.nuit },
    secondary: { main: palette.corail, contrastText: palette.nuit },
    background: { default: palette.nuit, paper: palette.ardoise },
    text: { primary: palette.craie, secondary: palette.brume },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      // Désactive le voile clair que MUI ajoute aux surfaces en mode sombre.
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { backgroundColor: palette.marine } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: { color: palette.brume, '&.Mui-selected': { color: palette.craie } },
      },
    },
  },
});
