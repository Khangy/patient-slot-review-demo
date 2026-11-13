import { CssBaseline, ThemeProvider } from '@mui/material';
import type { ReactNode } from 'react';
import { HashRouter, MemoryRouter, Navigate, Route, Routes } from 'react-router';
import { DarkTheme, LightTheme } from '@/theme';
import { StoreProvider, useStore } from '@/state/store';
import { ToastProvider } from '@/components/Toast';
import { AppShell } from '@/components/AppShell';
import { PatientsPage } from '@/pages/patients/PatientsPage';
import { PatientPage } from '@/pages/patients/PatientPage';
import { SlotReviewPage } from '@/pages/slot-review/SlotReviewPage';

// Hosted as a claude.ai artifact the page cannot route on `#/path`, so that build keeps the
// route in memory. Every other build uses the hash so the back button and deep links work.
const Router = import.meta.env.MODE === 'artifact' ? MemoryRouter : HashRouter;

function Themed({ children }: { children: ReactNode }) {
  const { state } = useStore();
  return (
    <ThemeProvider theme={state.settings.themeMode === 'dark' ? DarkTheme : LightTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export function App() {
  return (
    <StoreProvider>
      <Themed>
        <ToastProvider>
          <Router>
            <AppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/slot-review" replace />} />
                <Route path="/patients" element={<PatientsPage />} />
                <Route path="/patients/:patientId" element={<PatientPage />} />
                <Route path="/slot-review" element={<SlotReviewPage />} />
                <Route path="*" element={<Navigate to="/slot-review" replace />} />
              </Routes>
            </AppShell>
          </Router>
        </ToastProvider>
      </Themed>
    </StoreProvider>
  );
}
