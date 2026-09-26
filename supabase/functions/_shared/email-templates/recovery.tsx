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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl?: string
  token?: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl, token }: RecoveryEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>איפוס סיסמה ב{siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>איפוס סיסמה</Heading>
        <Text style={text}>
          אפשר להזין את הקוד הבא באפליקציה, או ללחוץ על הכפתור כדי לבחור סיסמה חדשה.
        </Text>
        {token && <Text style={code}>{token}</Text>}
        {confirmationUrl && (
          <Button style={button} href={confirmationUrl}>
            בחירת סיסמה חדשה
          </Button>
        )}
        <Text style={footer}>אם לא ביקשת לאפס סיסמה, אפשר להתעלם מהמייל הזה.</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
