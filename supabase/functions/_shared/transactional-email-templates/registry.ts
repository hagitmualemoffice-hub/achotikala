import type { ComponentType } from 'npm:react@18.3.1'
import { template as inquiryNewTemplate } from './inquiry-new.tsx'
import { template as inquiryHelpTemplate } from './inquiry-help.tsx'
import { template as inquiryThankYouTemplate } from './inquiry-thank-you.tsx'
import { template as spacePostNewTemplate } from './space-post-new.tsx'
import { template as spaceDigestTemplate } from './space-digest.tsx'
import { template as apartmentNewTemplate } from './apartment-new.tsx'
import { template as dailyBaarShareTemplate } from './daily-baar-share.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome.tsx'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'inquiry-new': inquiryNewTemplate,
  'inquiry-help': inquiryHelpTemplate,
  'inquiry-thank-you': inquiryThankYouTemplate,
  'space-post-new': spacePostNewTemplate,
  'space-digest': spaceDigestTemplate,
  'apartment-new': apartmentNewTemplate,
  'daily-baar-share': dailyBaarShareTemplate,
}
