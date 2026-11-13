import { Box, ButtonBase, ToggleButton, ToggleButtonGroup, Typography, useTheme, type SxProps, type Theme } from '@mui/material';
import { forwardRef, type ReactNode } from 'react';
import { useTone } from '@/components/ui';

// Building blocks shared by the three columns.

/** A board column: sticky header (title, sub, actions, tabs), its own scroll on desktop. */
export const Column = forwardRef<HTMLElement, {
  title: ReactNode;
  sub: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
  label: string;
  children: ReactNode;
}>(function Column({ title, sub, actions, tabs, label, children }, ref) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return (
    <Box
      ref={ref}
      component="section"
      aria-label={label}
      sx={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: dark ? 'rgba(255,255,255,0.02)' : '#F1F5F9',
        maxHeight: { md: 'calc(100vh - 92px)' },
        overflowY: { md: 'auto' },
      }}
    >
      <Box
        sx={{
          position: { md: 'sticky' },
          top: 0,
          zIndex: 2,
          px: 2,
          pt: 1.5,
          pb: 1.25,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography component="h2" variant="h6" sx={{ fontSize: 17 }}>
                {title}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5, lineHeight: 1.4 }}>
              {sub}
            </Typography>
          </Box>
          {actions}
        </Box>
        {tabs}
      </Box>
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</Box>
    </Box>
  );
});

/** Two-way segmented control used for the column tabs. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      fullWidth
      value={value}
      aria-label={label}
      onChange={(_, v: T | null) => v && onChange(v)}
      sx={{ '& .MuiToggleButton-root': { py: 0.5, fontSize: 13, fontWeight: 600, textTransform: 'none' } }}
    >
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

const cardSx = (selected: boolean, dim: boolean, solid: string, highlight: boolean) => ({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: selected || highlight ? solid : 'divider',
  boxShadow: selected ? `0 0 0 1px ${solid}` : 'none',
  bgcolor: 'background.paper',
  p: 1.25,
  opacity: dim ? 0.45 : 1,
  transition: 'opacity .15s, border-color .15s',
  fontFamily: 'inherit',
  color: 'text.primary',
});

/** A whole-card button (patients, openings). Never put another button inside it. */
export function CardButton({
  selected = false,
  dim = false,
  highlight = false,
  onClick,
  children,
  data,
}: {
  selected?: boolean;
  dim?: boolean;
  highlight?: boolean;
  onClick: () => void;
  children: ReactNode;
  data?: Record<string, string>;
}) {
  const t = useTone('teal');
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      {...data}
      sx={[
        cardSx(selected, dim, t.solid, highlight),
        {
          '&:hover': { borderColor: selected ? t.solid : 'text.secondary' },
          '&.Mui-focusVisible': { outline: `2px solid ${t.solid}`, outlineOffset: 2 },
        },
      ]}
    >
      {children}
    </ButtonBase>
  );
}

/** A card that holds its own buttons (decisions, blocked, near future). */
export function CardBox({
  selected = false,
  dim = false,
  children,
  data,
}: {
  selected?: boolean;
  dim?: boolean;
  children: ReactNode;
  data?: Record<string, string>;
}) {
  const t = useTone('teal');
  return (
    <Box {...data} sx={cardSx(selected, dim, t.solid, false)}>
      {children}
    </Box>
  );
}

export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="h3"
      sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', mt: 0.75, px: 0.25 }}
    >
      {children}
    </Typography>
  );
}

export function Row({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box sx={[{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', minWidth: 0 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      {children}
    </Box>
  );
}

export function Muted({ children, size = 12.5, sx }: { children: ReactNode; size?: number; sx?: SxProps<Theme> }) {
  return (
    <Box component="span" sx={[{ fontSize: size, color: 'text.secondary', lineHeight: 1.45 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      {children}
    </Box>
  );
}
