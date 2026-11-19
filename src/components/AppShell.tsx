import {
  AppBar,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import TuneIcon from '@mui/icons-material/Tune';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useStore } from '@/state/store';
import { TEAM, SITE_NAME } from '@/domain/seed';
import { fmtTime, fmtWeekday, TODAY } from '@/domain/dates';
import { PersonAvatar } from './ui';
import { QuestionsDrawer, answeredCount } from '@/feedback/QuestionsDrawer';
import { QUESTIONS } from '@/feedback/questions';
import { useToast } from './Toast';

const ABOUT_KEY = 'psr-demo-about-seen';

function NavButton({ to, children }: { to: string; children: ReactNode }) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(`${to}/`);
  return (
    <Button
      component={NavLink}
      to={to}
      sx={{
        color: active ? '#fff' : 'rgba(255,255,255,0.72)',
        fontWeight: active ? 700 : 500,
        borderRadius: 1.5,
        px: 1.5,
        bgcolor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Button>
  );
}

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>About this demo</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography>
            A clickable prototype of the proposed <b>Patient pages</b> and the <b>Patient Slot Review</b> board for the Thursday New Patient Meeting. It is
            not connected to SphinxMatch.
          </Typography>
          <Typography>
            <b>All data is invented test data.</b> No real patients, trials or staff. The demo day is <b>Thursday, Nov 12, 2026</b>, so every date reads relative to
            that meeting.
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
            <li>
              <b>Viewing as</b> (top right) switches between the PI, a physician, the CRC and the research nurse, so "Assigned to: Me" shows each person's steps.
            </li>
            <li>
              On <b>Patient Slot Review</b>, drag a patient card onto a slot to accept or place them, and use <b>View</b> to switch between Cards, Compact, List
              and Matrix.
            </li>
            <li>
              <b>Design notes</b> puts a small board number (07, A4, SR2…) next to each change, with what it looked like before.
            </li>
            <li>
              <b>Questions for you</b> lists the open decisions. Answers stay in this browser; Copy answers sends them back.
            </li>
            <li>Everything you click (accept, dismiss, queue, restage) changes the data. <b>Reset demo</b> in the settings menu restores the starting point.</li>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          Start
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, actions, me, now } = useStore();
  const toast = useToast();
  const [userMenu, setUserMenu] = useState<HTMLElement | null>(null);
  const [settingsMenu, setSettingsMenu] = useState<HTMLElement | null>(null);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const s = state.settings;

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ABOUT_KEY)) setAboutOpen(true);
    } catch {
      setAboutOpen(true);
    }
  }, []);
  const closeAbout = () => {
    setAboutOpen(false);
    try {
      window.localStorage.setItem(ABOUT_KEY, '1');
    } catch {
      // ignore
    }
  };

  const unanswered = QUESTIONS.length - answeredCount(state.feedback);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0} sx={{ top: 'env(safe-area-inset-top, 0px)', bgcolor: '#1E293B', color: '#fff', backgroundImage: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap', py: { xs: 1, md: 0 }, minHeight: { xs: 56, md: 60 } }}>
          <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mr: 1 }}>
            <Typography sx={{ fontWeight: 700, letterSpacing: '-0.01em', color: '#5EEAD4', fontSize: 18 }}>SphinxMatch</Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: { xs: 'none', sm: 'block' } }}>{SITE_NAME} · demo</Typography>
          </Stack>
          <NavButton to="/patients">Patients</NavButton>
          <NavButton to="/slot-review">Patient Slot Review</NavButton>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Every date in the demo is relative to this Thursday meeting">
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', display: { xs: 'none', lg: 'block' }, mr: 1 }}>
              {fmtWeekday(TODAY)}, 2026 · {fmtTime(now())}
            </Typography>
          </Tooltip>
          <FormControlLabel
            sx={{ mr: 0.5, '& .MuiFormControlLabel-label': { fontSize: 13, color: 'rgba(255,255,255,0.85)' } }}
            control={<Switch size="small" color="primary" checked={s.showDesignNotes} onChange={(e) => actions.setSettings({ showDesignNotes: e.target.checked })} />}
            label="Design notes"
          />
          <Button
            onClick={() => setQuestionsOpen(true)}
            startIcon={
              <Badge color="warning" badgeContent={unanswered} max={99}>
                <QuestionAnswerOutlinedIcon fontSize="small" />
              </Badge>
            }
            sx={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
          >
            Questions for you
          </Button>
          <Tooltip title={`Viewing as ${me.name} (${me.roleLabel}). Click to switch.`}>
            <Button
              onClick={(e) => setUserMenu(e.currentTarget)}
              sx={{ color: '#fff', textTransform: 'none', gap: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}
              aria-label="Viewing as"
            >
              <PersonAvatar userId={me.id} size={28} />
              <Box sx={{ textAlign: 'left', display: { xs: 'none', md: 'block' } }}>
                <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.1 }}>Viewing as</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{me.short}</Typography>
              </Box>
            </Button>
          </Tooltip>
          <IconButton aria-label="Demo settings" onClick={(e) => setSettingsMenu(e.currentTarget)} sx={{ color: '#fff' }}>
            <TuneIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={userMenu} open={!!userMenu} onClose={() => setUserMenu(null)}>
        <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
          View the demo as
        </Typography>
        {TEAM.map((m) => (
          <MenuItem
            key={m.id}
            selected={m.id === me.id}
            onClick={() => {
              actions.setSettings({ viewingAs: m.id });
              setUserMenu(null);
              toast(`Now viewing as ${m.name}`);
            }}
          >
            <ListItemIcon>
              <PersonAvatar userId={m.id} size={26} />
            </ListItemIcon>
            <ListItemText primary={m.name} secondary={m.roleLabel} />
            {m.id === me.id ? <CheckIcon fontSize="small" sx={{ ml: 2 }} /> : null}
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={settingsMenu} open={!!settingsMenu} onClose={() => setSettingsMenu(null)}>
        <MenuItem onClick={() => actions.setSettings({ showPii: !s.showPii })}>
          <ListItemText primary="Always show patient PII" secondary="Profile › Privacy switch (board 02: keep as is)" />
          <Switch size="small" checked={s.showPii} />
        </MenuItem>
        <MenuItem onClick={() => actions.setSettings({ themeMode: s.themeMode === 'dark' ? 'light' : 'dark' })}>
          <ListItemText primary="Dark mode" />
          <Switch size="small" checked={s.themeMode === 'dark'} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setSettingsMenu(null);
            setAboutOpen(true);
          }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="About this demo" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setSettingsMenu(null);
            setConfirmReset(true);
          }}
        >
          <ListItemIcon>
            <RestartAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Reset demo…" secondary="Back to the 8:14 AM meeting snapshot" />
        </MenuItem>
      </Menu>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
        <DialogTitle>Reset the demo?</DialogTitle>
        <DialogContent>
          <Typography>Every accept, dismiss, queue, status and staging change goes back to the start of the meeting. Your answers to the questions are kept.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              actions.resetDemo();
              setConfirmReset(false);
              toast('Demo reset to the 8:14 AM meeting snapshot.');
            }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      <AboutDialog open={aboutOpen} onClose={closeAbout} />
      <QuestionsDrawer open={questionsOpen} onClose={() => setQuestionsOpen(false)} />

      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
