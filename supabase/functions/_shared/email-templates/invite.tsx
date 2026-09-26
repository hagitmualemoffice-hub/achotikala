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

import { button, container, footer, h1, main, text } from './brand.ts'

interface InviteEmailProps {
  siteName: string
  confirmationUrl?: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>הוזמנת להצטרף ל{siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>הוזמנת להצטרף</Heading>
        <Text style={text}>מחכות לך במרחב המיוחד הזה. אפשר להיכנס בלחיצה אחת.</Text>
        {confirmationUrl && (
          <Button style={button} href={confirmationUrl}>
            כניסה למרחב
          </Button>
        )}
        <Text style={footer}>{siteName}</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
