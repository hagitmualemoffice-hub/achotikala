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

interface SignupEmailProps {
  siteName: string
  confirmationUrl?: string
  token?: string
}

export const SignupEmail = ({ siteName, confirmationUrl, token }: SignupEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>אישור כתובת המייל ב{siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>כמה טוב שאת איתנו</Heading>
        <Text style={text}>
          כדי לאשר את כתובת המייל, אפשר להזין את הקוד הבא באפליקציה או ללחוץ על הכפתור.
        </Text>
        {token && <Text style={code}>{token}</Text>}
        {confirmationUrl && (
          <Button style={button} href={confirmationUrl}>
            אישור הכתובת
          </Button>
        )}
        <Text style={footer}>אם לא ביקשת להצטרף, אפשר להתעלם מהמייל הזה.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
