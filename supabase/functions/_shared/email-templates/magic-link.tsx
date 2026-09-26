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

import { brand, code, container, footer, h1, main, text } from './brand.ts'

interface MagicLinkEmailProps {
  siteName: string
  token?: string
}

export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <Html lang="he" dir="rtl">
    <Head />
    <Preview>קוד ההתחברות שלך ל{siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>קוד ההתחברות שלך</Heading>
        <Text style={text}>
          הזיני את הקוד הבא כדי להיכנס. הקוד תקף לזמן קצר.
        </Text>
        <Text style={code}>{token ?? '------'}</Text>
        <Text style={footer}>
          אם לא ביקשת קוד, אפשר להתעלם מהמייל הזה.
          <br />
          {siteName} · <span style={brand}>באהבה</span>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
