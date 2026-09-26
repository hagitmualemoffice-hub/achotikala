import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailCta, SITE } from './cta.tsx'
import type { TemplateEntry } from './registry.ts'

interface Item { spaceName: string; title: string; excerpt: string; masterit?: boolean }
interface Props { periodLabel?: string; items?: Item[] }

const SpaceDigestEmail = ({ periodLabel = 'היום', items = [] }: Props) => (
  <Html dir="rtl">
    <Head />
    <Preview>{`מה חדש בליבה ${periodLabel}`}</Preview>
    <Body style={{ backgroundColor: '#faf8f9', fontFamily: 'Arial,sans-serif', direction: 'rtl' }}>
      <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px' }}>
        <Text style={{ color: '#d25278', fontSize: '12px', margin: 0 }}>ליבה</Text>
        <Heading style={{ color: '#35485f', fontSize: '23px', fontWeight: 400 }}>{`מה חדש ${periodLabel}`}</Heading>
        {items.map((it, i) => (
          <Section key={i} style={{ backgroundColor: '#fbf0f4', padding: '16px', borderRadius: '10px', marginBottom: '10px' }}>
            <Text style={{ color: '#d25278', fontSize: '11px', margin: '0 0 4px' }}>
              {it.spaceName}{it.masterit ? ' · את מאסטרית כאן' : ''}
            </Text>
            <Text style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px', color: '#35485f' }}>{it.title}</Text>
            <Text style={{ color: '#677483', margin: 0, lineHeight: '1.7' }}>{it.excerpt}</Text>
          </Section>
        ))}
        <Text style={{ color: '#677483', lineHeight: '1.7' }}>
          קיבלת את הסיכום הזה כי בחרת לקבל עדכונים מהמרחבים האלה. אפשר לשנות את התדירות בכל רגע בהגדרות בליבה.
        </Text>
      <EmailCta href={`${SITE}/liba`} label="לקריאת כל העדכונים בליבה" /></Container>
    </Body>
  </Html>
)

export const template = {
  component: SpaceDigestEmail,
  subject: (d) => `מה חדש בליבה ${d.periodLabel ?? 'היום'}`,
  displayName: 'סיכום עדכונים מהמרחבים',
  previewData: {
    periodLabel: 'היום',
    items: [{ spaceName: 'רכב', title: 'איזה ביטוח לבחור?', excerpt: 'מחפשת המלצה…', masterit: true }],
  },
} satisfies TemplateEntry
