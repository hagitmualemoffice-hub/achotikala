import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  boyName?: string
  helperName?: string
  connection?: string
  helperEmail?: string
  helperWhatsapp?: string
  cardLink?: string
}

const label = { color: '#677483', fontSize: '12px', margin: '0 0 2px' }
const value = { color: '#35485f', fontSize: '14px', margin: '0 0 14px' }

const InquiryHelpEmail = ({
  boyName = 'הבירור שלך',
  helperName = 'חברה בליבה',
  connection = '',
  helperEmail = '',
  helperWhatsapp = '',
  cardLink = 'https://achotikala.com/liba?birurim=1',
}: Props) => (
  <Html dir="rtl">
    <Head />
    <Preview>{`מישהי יכולה לעזור בבירור על ${boyName}`}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
      <Container style={{ maxWidth: '560px', margin: '32px auto', padding: '32px 28px' }}>
        <Text style={{ color: '#d25278', fontSize: '12px', margin: '0 0 6px' }}>ליבה · בירורים</Text>
        <Heading style={{ color: '#35485f', fontSize: '24px', fontWeight: 400, margin: '0 0 14px' }}>
          מישהי יכולה לעזור
        </Heading>
        <Text style={{ color: '#35485f', fontSize: '15px', lineHeight: '1.8', margin: '0 0 22px' }}>
          {helperName} סימנה שהיא מכירה, בבירור שפתחת על <strong>{boyName}</strong>.
        </Text>

        <Section style={{ backgroundColor: '#fbf0f4', padding: '22px 20px', borderRadius: '12px' }}>
          <Text style={label}>מי הציעה עזרה</Text>
          <Text style={value}>{helperName}</Text>

          {connection ? (
            <>
              <Text style={label}>מה היא מכירה</Text>
              <Text style={value}>{connection}</Text>
            </>
          ) : null}

          {helperEmail ? (
            <>
              <Text style={label}>מייל</Text>
              <Text style={value}>
                <Link href={`mailto:${helperEmail}?subject=${encodeURIComponent(`הצעת העזרה שלך בבירור על ${boyName}`)}`} style={{ color: '#d25278' }}>
                  {helperEmail}
                </Link>
              </Text>
            </>
          ) : null}

          {helperWhatsapp ? (
            <>
              <Text style={label}>וואטסאפ</Text>
              <Text style={value}>{helperWhatsapp}</Text>
            </>
          ) : null}

          {!helperEmail && !helperWhatsapp ? (
            <Text style={{ ...value, marginBottom: 0 }}>
              היא ביקשה שהתקשורת תתנהל דרך ליבה בלבד — אפשר לכתוב לה בצ'אט האישי מתוך כרטיס הבירור.
            </Text>
          ) : null}
        </Section>

        <Section style={{ textAlign: 'center', padding: '26px 0 10px' }}>
          <Button
            href={cardLink}
            style={{
              backgroundColor: '#d25278',
              color: '#ffffff',
              fontSize: '14px',
              padding: '12px 26px',
              borderRadius: '999px',
              textDecoration: 'none',
            }}
          >
            לכרטיס הבירור בליבה
          </Button>
        </Section>

        <Text style={{ color: '#677483', fontSize: '13px', lineHeight: '1.8', margin: '10px 0 0' }}>
          בכרטיס אפשר לראות את כל מי שענו, לכתוב להן בצ'אט האישי ולהגיד תודה.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InquiryHelpEmail,
  subject: (d) => `מישהי יכולה לעזור בבירור על ${d.boyName ?? ''}`,
  displayName: 'הוצעה עזרה לבירור',
  previewData: {
    boyName: 'יאיר ישראלי',
    helperName: 'חברה בליבה',
    connection: 'מכירה אישית',
    helperEmail: 'friend@example.com',
    cardLink: 'https://achotikala.com/liba?birurim=1',
  },
} satisfies TemplateEntry
