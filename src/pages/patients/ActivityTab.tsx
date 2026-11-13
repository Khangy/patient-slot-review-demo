import { Box, Divider, Paper, Stack, Typography } from '@mui/material';
import type { ActivityEntry } from '@/domain/types';
import { fmtWhen, TODAY, dayOf } from '@/domain/dates';
import { useStore } from '@/state/store';
import { LogLine, PersonTag, type ToneName } from '@/components/ui';

function toneFor(verb: string): ToneName {
  if (/DISMISSED|STOPPED|REMOVED|RELEASED|UNFOLLOWED|UNDONE/.test(verb)) return 'grey';
  if (/NOT ELIGIBLE|RE-MATCHED/.test(verb)) return 'red';
  if (/STATUS CHANGED|STAGED|CORRECTED/.test(verb)) return 'amber';
  if (/ACCEPTED|STEP DONE|ON STUDY|PRE-SCREENING/.test(verb)) return 'green';
  if (/QUEUED|WATCH|KEPT|REVIEW|RE-CHECKED/.test(verb)) return 'blue';
  return 'teal';
}

export function ActivityTab({ patientId }: { patientId: string }) {
  const { state } = useStore();
  const entries: ActivityEntry[] = state.activity.filter((a) => a.patientId === patientId).sort((a, b) => (a.at < b.at ? 1 : -1));
  if (!entries.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary">No activity recorded yet.</Typography>
      </Paper>
    );
  }
  return (
    <Paper variant="outlined">
      <Stack divider={<Divider flexItem />}>
        {entries.map((a) => (
          <Box
            key={a.id}
            sx={{
              px: 2,
              py: 1.25,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '140px minmax(0, 1fr) auto' },
              gap: { xs: 0.5, sm: 2 },
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: dayOf(a.at) === TODAY ? 600 : 400 }}>
              {dayOf(a.at) === TODAY ? `Today, ${fmtWhen(a.at)}` : fmtWhen(a.at)}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <LogLine verb={a.verb} status={a.text} tone={toneFor(a.verb)} size={13} />
            </Box>
            <Box>{a.by ? <PersonTag userId={a.by} /> : <Typography variant="caption" color="text.secondary">Automatic</Typography>}</Box>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
