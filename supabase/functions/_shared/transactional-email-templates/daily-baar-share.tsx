import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import { EmailCta, SITE } from './cta.tsx'
import type { TemplateEntry } from './registry.ts'

/**
 * ההשתדלות היומית — a friend thought of you.
 * The email never contains any detail about the boy, not even his name.
 * The sender stays anonymous.
 */
interface Props { message?: string; cardLink?: string }
const DailyBaarShareEmail = ({ message = '', cardLink = `${SITE}/liba/baar` }: Props) => (
  <Html dir="rtl"><Head/><Preview>מישהי חשבה עלייך 💗</Preview><Body style={{backgroundColor:'#faf8f9',fontFamily:'Arial,sans-serif',direction:'rtl'}}><Container style={{maxWidth:'560px',margin:'32px auto',backgroundColor:'#ffffff',padding:'32px',borderRadius:'12px'}}><Text style={{color:'#d25278',fontSize:'12px'}}>ליבה · ההשתדלות היומית</Text><Heading style={{color:'#35485f',fontSize:'24px',fontWeight:400}}>מישהי חשבה עלייך 💗</Heading><Section style={{backgroundColor:'#fbf0f4',padding:'20px',borderRadius:'10px'}}><Text style={{color:'#677483',lineHeight:'1.8',margin:0,fontSize:'15px'}}>{message ? message : 'ראיתי כרטיס בבאר וחשבתי שאולי הוא רלוונטי בשבילך.'}</Text></Section><Text style={{color:'#677483',lineHeight:'1.7'}}>אפשר להיכנס לליבה ולצפות בכרטיס המלא של הבחור בבאר.</Text><EmailCta href={cardLink} label="לצפייה בכרטיס בליבה" /><Text style={{color:'#9aa5b1',fontSize:'11px',lineHeight:'1.6'}}>אם אין לך עדיין גישה לליבה, הכפתור יוביל אותך להתחברות או לבקשת גישה — ומשם תחזורי ישר לכרטיס.</Text></Container></Body></Html>
)
export const template = { component: DailyBaarShareEmail, subject: 'מישהי חשבה עלייך 💗', displayName: 'ההשתדלות היומית — שיתוף כרטיס', previewData: { message: 'ראיתי אותו וחשבתי עלייך 💗' } } satisfies TemplateEntry
