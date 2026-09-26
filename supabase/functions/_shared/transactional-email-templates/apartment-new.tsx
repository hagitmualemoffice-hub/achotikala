import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailCta, SITE } from './cta.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props { typeLabel?: string; city?: string; area?: string; price?: string; entryDate?: string }
const NewApartmentEmail = ({ typeLabel = 'מודעה חדשה', city = '', area = '', price = '', entryDate = '' }: Props) => (
  <Html dir="rtl"><Head/><Preview>דירה חדשה עלתה בלוח הדירות של ליבה</Preview><Body style={{backgroundColor:'#faf8f9',fontFamily:'Arial,sans-serif',direction:'rtl'}}><Container style={{maxWidth:'560px',margin:'32px auto',backgroundColor:'#ffffff',padding:'32px',borderRadius:'12px'}}><Text style={{color:'#d25278',fontSize:'12px'}}>ליבה · לוח דירות</Text><Heading style={{color:'#35485f',fontSize:'24px',fontWeight:400}}>מודעה חדשה בלוח הדירות</Heading><Section style={{backgroundColor:'#fbf0f4',padding:'20px',borderRadius:'10px'}}><Text style={{fontSize:'20px',fontWeight:600,margin:'0 0 8px'}}>{typeLabel}</Text><Text style={{color:'#677483',margin:0}}>{[city, area, price ? `₪${price}` : '', entryDate ? `כניסה: ${entryDate}` : ''].filter(Boolean).join(' · ')}</Text></Section><Text style={{color:'#677483',lineHeight:'1.7'}}>עלתה מודעה חדשה בלוח הדירות של ליבה. אפשר להיכנס ולראות אם היא מתאימה לך או למישהי שאת מכירה.</Text><EmailCta href={`${SITE}/liba/dirot`} label="ללוח הדירות בליבה" /></Container></Body></Html>
)
export const template = { component: NewApartmentEmail, subject: (d) => `דירה חדשה בליבה: ${d.typeLabel ?? ''}${d.city ? ` ב${d.city}` : ''}`, displayName: 'מודעת דירה חדשה בליבה', previewData: { typeLabel: 'מחפשות שותפה לדירה קיימת', city: 'ירושלים', area: 'רחביה', price: '2800', entryDate: '01/11/2026' } } satisfies TemplateEntry
