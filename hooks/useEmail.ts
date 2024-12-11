import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/hooks/useSession'
import { PostgrestError } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import { useAudit, type AuditAction, type AuditResource } from './useAudit'

// Tipos base
export type EmailType =
  | 'order_confirmation'
  | 'shipping_confirmation'
  | 'delivery_confirmation'
  | 'order_cancelled'
  | 'password_reset'
  | 'welcome'
  | 'abandoned_cart'
  | 'review_request'
  | 'newsletter'
  | 'promotion'
  | 'custom'

export type EmailStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'

// Interfaces base
export interface EmailTemplate {
  id: string
  type: EmailType
  name: string
  subject: string
  content: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailCampaign {
  id: string
  name: string
  subject: string
  content: string
  template_id?: string
  segment_id?: string
  scheduled_for?: string
  sent_at?: string
  total_recipients: number
  opened_count: number
  clicked_count: number
  bounced_count: number
  status: EmailStatus
  created_at: string
  updated_at: string
}

export interface EmailSubscription {
  id: string
  user_id: string
  email: string
  subscribed_to: string[]
  unsubscribed_from: string[]
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  email: string
  type: EmailType
  template_id?: string
  campaign_id?: string
  subject: string
  sent_at: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  bounced_at?: string
  error?: string
}

export interface CustomerSegment {
  id: string
  name: string
  description: string
  criteria: Record<string, unknown>
  customer_count: number
  created_at: string
  updated_at: string
}

export interface EmailAttachment {
  filename: string
  content: string | Buffer
  contentType: string
}

export interface SendEmailParams {
  to: string | string[]
  type: EmailType
  templateId?: string
  variables?: Record<string, unknown>
  attachments?: EmailAttachment[]
}

export interface EmailFilters {
  email?: string
  type?: EmailType
  startDate?: string
  endDate?: string
}

// Tipos de auditoría específicos para emails
export type EmailAuditAction = Extract<
  AuditAction,
  'send_email' | 'create_template' | 'update_template'
>

export type EmailAuditResource = Extract<AuditResource, 'email'>

export interface EmailAuditPayload extends Record<string, unknown> {
  email_id?: string
  template_id?: string
  type: EmailType
  recipient?: string
}

// Interfaces para el hook
interface EmailHookState {
  loading: boolean
  error: PostgrestError | Error | null
}

interface EmailHookActions {
  sendEmail: (params: SendEmailParams) => Promise<boolean>
  getEmailLogs: (filters?: EmailFilters) => Promise<EmailLog[]>
}

export type EmailHookReturn = EmailHookState & EmailHookActions

export function useEmail(): EmailHookReturn {
  const { session } = useSession()
  const { logAction } = useAudit()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | Error | null>(null)

  const validateEmailParams = (params: SendEmailParams): boolean => {
    if (!params.to || (Array.isArray(params.to) && params.to.length === 0)) {
      throw new Error('El destinatario del email es requerido')
    }

    if (!params.type) {
      throw new Error('El tipo de email es requerido')
    }

    if (params.templateId && typeof params.templateId !== 'string') {
      throw new Error('El ID de la plantilla debe ser un string')
    }

    return true
  }

  const sendEmail = useCallback(
    async (params: SendEmailParams): Promise<boolean> => {
      try {
        setLoading(true)
        setError(null)

        if (!session?.user?.id) {
          throw new Error('Usuario no autenticado')
        }

        validateEmailParams(params)

        const {
          to,
          type,
          templateId,
          variables = {},
          attachments = [],
        } = params

        const recipientEmail = Array.isArray(to) ? to[0] : to

        const log: Partial<EmailLog> = {
          email: recipientEmail,
          type,
          template_id: templateId,
          subject: '', // Se completará con la plantilla
          sent_at: new Date().toISOString(),
        }

        if (templateId) {
          const { data: template, error: templateError } = await createClient()
            .from('email_templates')
            .select('*')
            .eq('id', templateId)
            .single()

          if (templateError) throw templateError

          if (!template.is_active) {
            throw new Error('La plantilla de email no está activa')
          }

          log.subject = template.subject
        }

        const { error: logError } = await createClient()
          .from('email_logs')
          .insert([log])

        if (logError) throw logError

        await logAction(
          'send_email' as EmailAuditAction,
          'email' as EmailAuditResource,
          {
            type,
            template_id: templateId,
            recipient: recipientEmail
          } as EmailAuditPayload
        )

        return true
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error al enviar el email')
        setError(error)
        return false
      } finally {
        setLoading(false)
      }
    },
    [session?.user?.id, logAction]
  )

  const getEmailLogs = useCallback(
    async (filters: EmailFilters = {}): Promise<EmailLog[]> => {
      try {
        setLoading(true)
        setError(null)

        let query = createClient().from('email_logs').select('*')

        if (filters.email) {
          query = query.eq('email', filters.email)
        }
        if (filters.type) {
          query = query.eq('type', filters.type)
        }
        if (filters.startDate) {
          query = query.gte('sent_at', filters.startDate)
        }
        if (filters.endDate) {
          query = query.lte('sent_at', filters.endDate)
        }

        const { data, error: logsError } = await query

        if (logsError) throw logsError

        return data || []
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Error al obtener los logs de email')
        setError(error)
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    sendEmail,
    getEmailLogs,
  }
}
