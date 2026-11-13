import { Avatar, Box, Chip, Tooltip, Typography, useTheme, type ChipProps, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import type { UserId } from '@/domain/types';
import { member, labelFor, findOpening } from '@/domain/names';
import { useStore } from '@/state/store';

// ── Tones: one set of status colors that holds in light and dark ────────

export type ToneName = 'teal' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'indigo' | 'grey';
export interface Tone {
  fg: string;
  bg: string;
  border: string;
  solid: string;
}

const LIGHT: Record<ToneName, Tone> = {
  teal: { fg: '#0F766E', bg: '#E6F4F2', border: '#5EB8AE', solid: '#0D9488' },
  green: { fg: '#047857', bg: '#E3F6EE', border: '#6CC9A1', solid: '#059669' },
  amber: { fg: '#9A4A06', bg: '#FEF3C7', border: '#F0B54A', solid: '#D97706' },
  red: { fg: '#B91C1C', bg: '#FEE2E2', border: '#F19A9A', solid: '#DC2626' },
  blue: { fg: '#035C8C', bg: '#E0F2FE', border: '#7CC4EC', solid: '#0284C7' },
  purple: { fg: '#6D28D9', bg: '#F1EAFE', border: '#BFA3F5', solid: '#7C3AED' },
  indigo: { fg: '#4338CA', bg: '#EAEAFD', border: '#A5A8F4', solid: '#4F46E5' },
  grey: { fg: '#475569', bg: '#F1F5F9', border: '#CBD5E1', solid: '#64748B' },
};

const DARK: Record<ToneName, Tone> = {
  teal: { fg: '#5EEAD4', bg: 'rgba(20,184,166,0.18)', border: 'rgba(94,234,212,0.45)', solid: '#14B8A6' },
  green: { fg: '#6EE7B7', bg: 'rgba(52,211,153,0.18)', border: 'rgba(110,231,183,0.45)', solid: '#34D399' },
  amber: { fg: '#FCD34D', bg: 'rgba(245,158,11,0.18)', border: 'rgba(252,211,77,0.45)', solid: '#F59E0B' },
  red: { fg: '#FCA5A5', bg: 'rgba(239,68,68,0.18)', border: 'rgba(252,165,165,0.45)', solid: '#EF4444' },
  blue: { fg: '#7DD3FC', bg: 'rgba(56,189,248,0.18)', border: 'rgba(125,211,252,0.45)', solid: '#38BDF8' },
  purple: { fg: '#C4B5FD', bg: 'rgba(139,92,246,0.2)', border: 'rgba(196,181,253,0.45)', solid: '#A78BFA' },
  indigo: { fg: '#A5B4FC', bg: 'rgba(99,102,241,0.2)', border: 'rgba(165,180,252,0.45)', solid: '#818CF8' },
  grey: { fg: '#CBD5E1', bg: 'rgba(148,163,184,0.16)', border: 'rgba(203,213,225,0.35)', solid: '#94A3B8' },
};

export function useTones(): Record<ToneName, Tone> {
  return useTheme().palette.mode === 'dark' ? DARK : LIGHT;
}
export function useTone(name: ToneName): Tone {
  return useTones()[name];
}

/** Non-interactive status chip. */
export function ToneChip({
  tone,
  label,
  size = 'small',
  variant = 'soft',
  icon,
  title,
  sx,
}: {
  tone: ToneName;
  label: ReactNode;
  size?: 'small' | 'medium' | 'tiny';
  variant?: 'soft' | 'solid' | 'outline';
  icon?: ChipProps['icon'];
  title?: string;
  sx?: SxProps<Theme>;
}) {
  const t = useTone(tone);
  const chip = (
    <Chip
      size={size === 'tiny' ? 'small' : size}
      icon={icon}
      label={label}
      sx={[
        {
          fontWeight: 600,
          borderRadius: 999,
          border: `1px solid ${variant === 'solid' ? t.solid : t.border}`,
          bgcolor: variant === 'solid' ? t.solid : variant === 'outline' ? 'transparent' : t.bg,
          color: variant === 'solid' ? '#fff' : t.fg,
          '& .MuiChip-icon': { color: variant === 'solid' ? '#fff' : t.fg, ml: '6px' },
          ...(size === 'tiny' ? { height: 20, fontSize: 11, '& .MuiChip-label': { px: 0.75 } } : {}),
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
  return title ? (
    <Tooltip title={title}>
      <span>{chip}</span>
    </Tooltip>
  ) : (
    chip
  );
}

// ── People ──────────────────────────────────────────────────────────────

export function PersonAvatar({ userId, size = 22 }: { userId: UserId; size?: number }) {
  const m = member(userId);
  return (
    <Tooltip title={`${m.name} · ${m.roleLabel}`}>
      <Avatar sx={{ width: size, height: size, fontSize: size * 0.42, fontWeight: 700, bgcolor: m.color, color: '#fff' }}>{m.initials}</Avatar>
    </Tooltip>
  );
}

/** Avatar + "Maya R." + optional suffix ("· consent call") */
export function PersonTag({ userId, suffix, size = 20, bold }: { userId: UserId; suffix?: ReactNode; size?: number; bold?: boolean }) {
  const m = member(userId);
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <PersonAvatar userId={userId} size={size} />
      <Typography component="span" variant="caption" sx={{ fontWeight: bold ? 600 : 500, fontSize: 12.5, color: 'text.primary', whiteSpace: 'nowrap' }}>
        {m.short}
        {suffix ? (
          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
            {' '}
            {suffix}
          </Box>
        ) : null}
      </Typography>
    </Box>
  );
}

// ── Text bits ───────────────────────────────────────────────────────────

/**
 * Statuses read like the logs: the verb highlighted, then the status, then the date.
 * <LogLine verb="Status changed" status="Stage IIA → IV" date="Nov 6" tone="amber" />
 */
export function LogLine({
  verb,
  status,
  date,
  tone = 'grey',
  size = 12.5,
}: {
  verb: string;
  status?: ReactNode;
  date?: ReactNode;
  tone?: ToneName;
  size?: number;
}) {
  const t = useTone(tone);
  return (
    <Box component="span" sx={{ fontSize: size, lineHeight: 1.5 }}>
      <Box component="span" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: size - 1.5, color: t.fg }}>
        {verb}
      </Box>
      {status ? <Box component="span" sx={{ color: 'text.primary' }}>{' '}{status}</Box> : null}
      {date ? <Box component="span" sx={{ color: 'text.secondary' }}>{' '}{date}</Box> : null}
    </Box>
  );
}

export function Mono({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box component="span" sx={[{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: '0.92em' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      {children}
    </Box>
  );
}

export function Overline({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Typography
      variant="overline"
      sx={[{ display: 'block', color: 'text.secondary', fontWeight: 600, fontSize: 11, lineHeight: 1.6 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      {children}
    </Typography>
  );
}

/** "SPX-201 › Arm A2" with the NCT number after it in mono when asked (A2: name first). */
export function OpeningName({ openingId, full, nct, bold = true }: { openingId: string; full?: boolean; nct?: boolean; bold?: boolean }) {
  const { state } = useStore();
  const f = findOpening(state.trials, openingId);
  return (
    <Box component="span" sx={{ fontWeight: bold ? 600 : 400 }}>
      {labelFor(state.trials, openingId, full)}
      {nct && f ? (
        <Mono sx={{ ml: 0.75, fontWeight: 400, color: 'text.secondary' }}>{f.trial.nct}</Mono>
      ) : null}
    </Box>
  );
}
