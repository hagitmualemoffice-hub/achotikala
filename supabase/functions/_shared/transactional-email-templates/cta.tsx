import * as React from 'npm:react@18.3.1'
import { Button, Section } from 'npm:@react-email/components@0.0.22'

export const SITE = 'https://achotikala.com'

/** the one "go read it" button every update email ends with */
export const EmailCta = ({ href, label }: { href: string; label: string }) => (
  <Section style={{ textAlign: 'center', padding: '22px 0 6px' }}>
    <Button
      href={href}
      style={{ backgroundColor: '#d25278', color: '#ffffff', fontSize: '14px', padding: '12px 26px', borderRadius: '999px', textDecoration: 'none' }}
    >
      {label}
    </Button>
  </Section>
)
