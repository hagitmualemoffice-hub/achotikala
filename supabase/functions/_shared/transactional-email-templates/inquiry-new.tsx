import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailCta, SITE } from './cta.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { boyName?: string; background?: string; city?: string }
const NewInquiryEmail = ({ boyName = 'בירור חדש', background = '', city = '' }: Props) => (
  <Html dir="rtl"><Head/><Preview>נפתח בירור חדש בליבה</Preview><Body style={{backgroundColor:'#faf8f9',fontFamily:'Arial,sans-serif',direction:'rtl'}}><Container style={{maxWidth:'560px',margin:'32px auto',backgroundColor:'#ffffff',padding:'32px',borderRadius:'12px'}}><Text style={{color:'#d25278',fontSize:'12px'}}>ליבה · בירורים</Text><Heading style={{color:'#35485f',fontSize:'24px',fontWeight:400}}>אולי את מכירה?</Heading><Section style={{backgroundColor:'#fbf0f4',padding:'20px',borderRadius:'10px'}}><Text style={{fontSize:'20px',fontWeight:600,margin:'0 0 8px'}}>{boyName}</Text><Text style={{color:'#677483',margin:0}}>{[background, city].filter(Boolean).join(' · ')}</Text></Section><Text style={{color:'#677483',lineHeight:'1.7'}}>נפתח בירור חדש שמתאים להעדפות שבחרת. אפשר להיכנס לליבה ולראות אם יש לך דרך לעזור.</Text><EmailCta href={`${SITE}/liba?birurim=1`} label="לכרטיס הבירור בליבה" /></Container></Body></Html>
)
export const template = { component: NewInquiryEmail, subject: (d) => `בירור חדש בליבה: ${d.boyName ?? ''}`, displayName: 'בירור חדש בליבה', previewData: { boyName: 'יאיר ישראלי', background: 'אשכנזי', city: 'ירושלים' } } satisfies TemplateEntry
