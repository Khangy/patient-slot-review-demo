import { Box, ButtonBase, Popover, Stack, Typography } from '@mui/material';
import { useState, type MouseEvent } from 'react';
import { useStore } from '@/state/store';
import { DESIGN_NOTES, type NoteTag } from './designNotes';
import { ToneChip, useTone, type ToneName } from '@/components/ui';

export const TAG_TONE: Record<NoteTag, ToneName> = {
  'Small PR': 'green',
  Decision: 'purple',
  Migration: 'grey',
  Later: 'grey',
  'Keep as is': 'grey',
};

/**
 * A small badge naming the canvas board that changed this part of the screen. Renders nothing
 * unless "Design notes" is on. Place it right after the element it explains:
 *   <Typography>Why this match</Typography><DesignNote id="03" />
 */
export function DesignNote({ id }: { id: string }) {
  const { state } = useStore();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const t = useTone('teal');
  const note = DESIGN_NOTES[id];
  if (!state.settings.showDesignNotes || !note) return null;
  const open = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchor(e.currentTarget);
  };
  return (
    <>
      <ButtonBase
        onClick={open}
        aria-label={`Design note ${id}: ${note.title}`}
        sx={{
          ml: 0.75,
          px: 0.75,
          height: 20,
          minWidth: 28,
          borderRadius: 1,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
          bgcolor: t.solid,
          verticalAlign: 'middle',
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${t.bg}`,
          '&:hover': { filter: 'brightness(1.1)' },
        }}
      >
        {id}
      </ButtonBase>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 380, maxWidth: 'calc(100vw - 32px)', p: 2 } } }}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, color: t.fg }}>{id}</Typography>
            <Typography sx={{ fontWeight: 700, flex: 1 }}>{note.title}</Typography>
            {note.tags.map((tag) => (
              <ToneChip key={tag} tone={TAG_TONE[tag]} label={tag} size="tiny" />
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {note.area} · board {id} on the "Patient Pages Before and After" canvas
          </Typography>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'warning.dark' }}>BEFORE</Typography>
            <Typography variant="body2">{note.before}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: t.fg }}>NOW IN THIS DEMO</Typography>
            <Typography variant="body2">{note.after}</Typography>
          </Box>
        </Stack>
      </Popover>
    </>
  );
}
