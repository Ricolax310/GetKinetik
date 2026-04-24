/**
 * GETKINETIK — Sovereign Node palette.
 * Obsidian = vault shell. Ruby = core. Sapphire = telemetry.
 */
export const palette = {
  obsidian: '#0A0A0A',
  obsidianSoft: '#111113',
  obsidianEdge: '#1A1A1D',

  ruby: {
    core: '#FF1430',
    mid: '#B00820',
    deep: '#3A0209',
    ember: '#FFB199',
    shadow: '#120000',
  },

  sapphire: {
    core: '#007BFF',
    glow: '#3A9BFF',
    deep: '#002A66',
  },

  platinum: '#E6E8EC',
  graphite: '#6A6C72',
  hairline: 'rgba(230, 232, 236, 0.08)',
} as const;

export const typography = {
  mono: 'Courier',
  label: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase' as const,
  },
  value: {
    fontSize: 28,
    letterSpacing: 1,
    fontWeight: '300' as const,
  },
};
