// Design tokens for consistent styling
export const tokens = {
  // Typography
  font: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.8125rem',  // 13px
    base: '0.875rem', // 14px
    md: '0.9375rem',  // 15px
    lg: '1rem',       // 16px
    xl: '1.125rem',   // 18px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
  },
  // Colors
  colors: {
    panelBg: '#F8F9FA',
    cardBg: '#FFFFFF',
    borderSubtle: '#E5E7EB',
    borderMuted: '#DADDE1',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    accentAmber: '#F59E0B',
    accentAmberSoft: '#FEF3C7',
    accentGreen: '#10B981',
    accentGreenSoft: '#D1FAE5',
  },
  // Spacing
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  // Radii
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  // Shadows
  shadow: {
    card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    cardHover: '0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)',
    popover: '0 10px 25px rgba(0, 0, 0, 0.1), 0 6px 10px rgba(0, 0, 0, 0.08)',
  },
} as const;
