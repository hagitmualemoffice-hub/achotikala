// Shared brand styles for the auth emails (pink / soft, Hebrew RTL).
// Values follow the app's design tokens (primary 343 58% 58%, radius 0.75rem).

export const PRIMARY = 'hsl(343, 58%, 58%)'
export const PRIMARY_DARK = 'hsl(343, 55%, 48%)'
export const FOREGROUND = '#2b2226'
export const MUTED = '#6b6169'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Noto Sans Hebrew', Arial, sans-serif",
  direction: 'rtl' as const,
}

export const container = {
  padding: '28px 26px',
  maxWidth: '520px',
  textAlign: 'right' as const,
}

export const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: FOREGROUND,
  margin: '0 0 18px',
}

export const text = {
  fontSize: '15px',
  color: MUTED,
  lineHeight: '1.7',
  margin: '0 0 22px',
}

export const code = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '10px',
  color: PRIMARY_DARK,
  backgroundColor: 'hsl(343, 60%, 97%)',
  border: '1px solid hsl(343, 45%, 90%)',
  borderRadius: '12px',
  padding: '18px 12px',
  textAlign: 'center' as const,
  direction: 'ltr' as const,
  margin: '0 0 24px',
}

export const button = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  fontSize: '15px',
  border: `1px solid ${PRIMARY}`,
  borderRadius: '12px',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const footer = {
  fontSize: '12px',
  color: '#9b939a',
  lineHeight: '1.7',
  margin: '30px 0 0',
}

export const brand = { color: PRIMARY }
