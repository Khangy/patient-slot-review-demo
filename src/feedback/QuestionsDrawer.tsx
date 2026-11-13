import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate } from 'react-router';
import { useStore } from '@/state/store';
import { useToast } from '@/components/Toast';
import { QUESTIONS } from './questions';
import { Mono } from '@/components/ui';

export function answeredCount(feedback: Record<string, { choice?: string; note?: string }>) {
  return QUESTIONS.filter((q) => feedback[q.id]?.choice || feedback[q.id]?.note?.trim()).length;
}

export function QuestionsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions, me } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const fb = state.feedback;

  const copy = async () => {
    const lines = [`Patient Slot Review demo: answers (${me.name} viewing)`, ''];
    QUESTIONS.forEach((q, i) => {
      const a = fb[q.id];
      lines.push(`${i + 1}. ${q.prompt}${q.boards.length ? ` [${q.boards.join(', ')}]` : ''}`);
      lines.push(`   Answer: ${a?.choice ?? '(no choice)'}`);
      if (a?.note?.trim()) lines.push(`   Note: ${a.note.trim()}`);
      lines.push('');
    });
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('Answers copied. Paste them into an email or message.');
    } catch {
      toast('Copy was blocked by the browser. Select the answers and copy them by hand.');
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 460, maxWidth: '100vw' } }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2.5, py: 2, gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">Questions for you</Typography>
          <Typography variant="body2" color="text.secondary">
            {answeredCount(fb)} of {QUESTIONS.length} answered · saved in this browser
          </Typography>
        </Box>
        <Button startIcon={<ContentCopyIcon />} variant="contained" size="small" onClick={copy}>
          Copy answers
        </Button>
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />
      <Box sx={{ overflowY: 'auto', px: 2.5, py: 2 }}>
        <Stack spacing={3} divider={<Divider flexItem />}>
          {QUESTIONS.map((q, i) => (
            <Box key={q.id}>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 20 }}>{i + 1}</Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{q.prompt}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {q.context}
                    {q.boards.length ? (
                      <>
                        {' '}
                        <Mono sx={{ color: 'text.secondary' }}>[{q.boards.join(', ')}]</Mono>
                      </>
                    ) : null}
                  </Typography>
                  {q.lookAt ? (
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => {
                        navigate(q.lookAt!.to);
                        onClose();
                      }}
                      sx={{ mt: 0.5 }}
                    >
                      Look at {q.lookAt.label}
                    </Link>
                  ) : null}
                  {q.options.length ? (
                    <RadioGroup
                      value={fb[q.id]?.choice ?? ''}
                      onChange={(e) => actions.setFeedback(q.id, { choice: e.target.value })}
                      sx={{ mt: 1 }}
                    >
                      {q.options.map((o) => (
                        <FormControlLabel key={o} value={o} control={<Radio size="small" />} label={<Typography variant="body2">{o}</Typography>} />
                      ))}
                    </RadioGroup>
                  ) : null}
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={q.options.length ? 1 : 3}
                    placeholder={q.options.length ? 'Note (optional)' : 'Your thoughts'}
                    value={fb[q.id]?.note ?? ''}
                    onChange={(e) => actions.setFeedback(q.id, { note: e.target.value })}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Drawer>
  );
}
