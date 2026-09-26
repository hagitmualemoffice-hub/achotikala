/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { button, code, container, footer, h1, main, text } from './brand.ts'

interface EmailChangeEmailProps {
  siteName: string
  newEmail?: string
  confirmationUrl?: string
  token?: string
}

export const EmailChangeEmail = ({
  siteName,
  newEmail,
  confirmationUrl,
  token,
}: EmailChangeEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>אישור כתובת המייל החדשה ב{siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>אישור כתובת מייל חדשה</Heading>
        <Text style={text}>
          ביקשת לעדכן את כתובת המייל{newEmail ? ` ל־${newEmail}` : ''}. אפשר להזין את הקוד
          באפליקציה או ללחוץ על הכפתור.
        </Text>
        {token && <Text style={code}>{token}</Text>}
        {confirmationUrl && (
          <Button style={button} href={confirmationUrl}>
            אישור הכתובת החדשה
          </Button>
        )}
        <Text style={footer}>אם לא ביקשת את השינוי, אפשר להתעלם מהמייל הזה.</Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
