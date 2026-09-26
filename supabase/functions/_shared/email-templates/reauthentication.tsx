/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { code, container, footer, h1, main, text } from './brand.ts'

interface ReauthenticationEmailProps {
  token?: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>קוד האימות שלך</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>קוד האימות שלך</Heading>
        <Text style={text}>הזיני את הקוד הבא כדי להמשיך. הקוד תקף לזמן קצר.</Text>
        <Text style={code}>{token ?? '------'}</Text>
        <Text style={footer}>אם לא ביקשת קוד, אפשר להתעלם מהמייל הזה.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
