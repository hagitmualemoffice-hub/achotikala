import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailCta, SITE } from './cta.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  spaceName?: string
  postTitle?: string
  excerpt?: string
  authorName?: string
  postId?: string
  masterit?: boolean
}

const SpacePostEmail = ({ spaceName = 'ליבה', postTitle = '', excerpt = '', authorName = '', masterit = false, postId = '' }: Props) => (
  <Html dir="rtl">
    <Head />
    <Preview>{`פרסום חדש ב${spaceName}`}</Preview>
    <Body style={{ backgroundColor: '#faf8f9', fontFamily: 'Arial,sans-serif', direction: 'rtl' }}>
      <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px' }}>
        <Text style={{ color: '#d25278', fontSize: '12px', margin: 0 }}>{`ליבה · ${spaceName}`}</Text>
        <Heading style={{ color: '#35485f', fontSize: '23px', fontWeight: 400 }}>
          {masterit ? 'מישהי שאלה כאן משהו' : 'יש משהו חדש במרחב שלך'}
        </Heading>
        <Section style={{ backgroundColor: '#fbf0f4', padding: '20px', borderRadius: '10px' }}>
          <Text style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px', color: '#35485f' }}>{postTitle}</Text>
          <Text style={{ color: '#677483', margin: 0, lineHeight: '1.7' }}>{excerpt}</Text>
          {authorName ? <Text style={{ color: '#9aa4b0', fontSize: '12px', margin: '10px 0 0' }}>{authorName}</Text> : null}
        </Section>
        <Text style={{ color: '#677483', lineHeight: '1.7' }}>
          {masterit
            ? 'בחרת להיות מאסטרית במרחב הזה, ולכן שלחנו לך את השאלה. אין שום חובה לענות — רק אם יש לך מה לתרום.'
            : 'קיבלת את המייל הזה כי בחרת לקבל עדכונים מהמרחב הזה. אפשר לשנות את זה בכל רגע בהגדרות בליבה.'}
        </Text>
      <EmailCta href={postId ? `${SITE}/liba?post=${postId}` : `${SITE}/liba`} label="לקריאת ההודעה בליבה" /></Container>
    </Body>
  </Html>
)

export const template = {
  component: SpacePostEmail,
  subject: (d) => `${d.masterit ? 'שאלה חדשה' : 'פרסום חדש'} ב${d.spaceName ?? 'ליבה'}`,
  displayName: 'פרסום חדש במרחב',
  previewData: { spaceName: 'רכב', postTitle: 'איזה ביטוח לבחור?', excerpt: 'מחפשת המלצה על ביטוח לרכב ראשון…', authorName: 'רות', masterit: true },
} satisfies TemplateEntry
