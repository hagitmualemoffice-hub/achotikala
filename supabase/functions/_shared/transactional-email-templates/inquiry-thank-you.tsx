import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import { EmailCta, SITE } from './cta.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { boyName?: string }

const InquiryThankYouEmail = ({ boyName = 'הבירור' }: Props) => (
  <Html dir="rtl">
    <Head />
    <Preview>תודה שעזרת בבירור בליבה</Preview>
    <Body style={{ backgroundColor: '#faf8f9', fontFamily: 'Arial,sans-serif', direction: 'rtl' }}>
      <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: '#ffffff', padding: '32px', borderRadius: '12px' }}>
        <Text style={{ color: '#d25278', fontSize: '12px' }}>ליבה · בירורים</Text>
        <Heading style={{ color: '#35485f', fontSize: '24px', fontWeight: 400 }}>תודה שעזרת</Heading>
        <Text style={{ color: '#35485f', lineHeight: '1.7' }}>הבירור על <strong>{boyName}</strong> הסתיים, ובעלת הבקשה רצתה לומר לך תודה על הנכונות לעזור.</Text>
        <Text style={{ color: '#677483', lineHeight: '1.7' }}>העזרה הקטנה שלך יכולה להיות משמעותית מאוד למישהי אחרת.</Text>
      <EmailCta href={`${SITE}/liba?birurim=1`} label="לבירורים בליבה" /></Container>
    </Body>
  </Html>
)

export const template = {
  component: InquiryThankYouEmail,
  subject: 'תודה שעזרת בבירור בליבה',
  displayName: 'תודה על עזרה בבירור',
  previewData: { boyName: 'יאיר ישראלי' },
} satisfies TemplateEntry