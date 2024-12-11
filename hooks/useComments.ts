import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const commentSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  entity_type: z.enum(['product', 'post', 'order', 'ticket']),
  entity_id: z.string().uuid(),
  user_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  attachments: z.array(z.object({
    type: z.enum(['image', 'video', 'file']),
    url: z.string().url(),
    name: z.string(),
    size: z.number()
  })).optional(),
  is_edited: z.boolean().default(false),
  is_pinned: z.boolean().default(false),
  is_hidden: z.boolean().default(false),
  likes_count: z.number().default(0),
  replies_count: z.number().default(0),
  status: z.enum(['active', 'pending', 'spam', 'deleted']).default('active'),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

const commentReactionSchema = z.object({
  id: z.string().uuid(),
  comment_id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['like', 'dislike', 'laugh', 'sad', 'angry']),
  created_at: z.string().datetime()
})

export type Comment = z.infer<typeof commentSchema>
export type CommentReaction = z.infer<typeof commentReactionSchema>

export interface CommentError extends BaseError {
  code: 'COMMENT_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'SPAM' | 'SERVER_ERROR'
    comment_id?: string
    entity_id?: string
    originalError?: unknown
  }
}

export interface CommentFilters {
  entity_type?: Comment['entity_type']
  entity_id?: string
  parent_id?: string | null
  user_id?: string
  status?: Comment['status']
  is_pinned?: boolean
  search?: string
  sort_by?: 'recent' | 'likes' | 'replies'
  sort_order?: 'asc' | 'desc'
}

export interface CommentsHookReturn {
  comments: Comment[]
  commentReactions: Record<string, CommentReaction[]>
  isLoading: boolean
  currentPage: number
  totalPages: number
  filters: CommentFilters
  getComments: (filters?: CommentFilters) => Promise<Comment[]>
  getComment: (commentId: string) => Promise<Comment>
  getReplies: (commentId: string) => Promise<Comment[]>
  addComment: (entityType: Comment['entity_type'], entityId: string, content: string, parentId?: string) => Promise<Comment>
  updateComment: (commentId: string, content: string) => Promise<Comment>
  deleteComment: (commentId: string) => Promise<void>
  togglePin: (commentId: string) => Promise<void>
  hideComment: (commentId: string) => Promise<void>
  addReaction: (commentId: string, type: CommentReaction['type']) => Promise<void>
  removeReaction: (commentId: string, type: CommentReaction['type']) => Promise<void>
  reportComment: (commentId: string, reason: string) => Promise<void>
  setFilters: (filters: CommentFilters) => void
  nextPage: () => void
  previousPage: () => void
  refreshComments: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos
const ITEMS_PER_PAGE = 20

export function useComments(): CommentsHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()
  const {
    currentPage,
    totalPages,
    setTotalItems,
    nextPage,
    previousPage
  } = usePagination({
    itemsPerPage: ITEMS_PER_PAGE
  })

  // Cache para comentarios
  const {
    data: commentsState,
    setData: setCommentsState
  } = useCache<{
    comments: Comment[]
    reactions: Record<string, CommentReaction[]>
    filters: CommentFilters
  }>({
    key: 'comments-state',
    ttl: CACHE_TTL,
    initialData: {
      comments: [],
      reactions: {},
      filters: {}
    }
  })

  const handleCommentError = (
    error: unknown,
    type: CommentError['details']['type'],
    comment_id?: string,
    entity_id?: string
  ): never => {
    throw new BaseError('Error en comentarios', {
      code: 'COMMENT_ERROR',
      details: {
        type,
        comment_id,
        entity_id,
        originalError: error
      }
    })
  }

  // Obtener comentarios
  const getComments = useCallback(async (
    filters: CommentFilters = {}
  ): Promise<Comment[]> => {
    try {
      startLoading()

      let query = supabase
        .from('comments')
        .select('*', { count: 'exact' })

      // Aplicar filtros
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type)
      }
      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id)
      }
      if (filters.parent_id !== undefined) {
        query = filters.parent_id === null
          ? query.is('parent_id', null)
          : query.eq('parent_id', filters.parent_id)
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.is_pinned !== undefined) {
        query = query.eq('is_pinned', filters.is_pinned)
      }
      if (filters.search) {
        query = query.ilike('content', `%${filters.search}%`)
      }

      // Ordenamiento
      switch (filters.sort_by) {
        case 'likes':
          query = query.order('likes_count', { ascending: filters.sort_order === 'asc' })
          break
        case 'replies':
          query = query.order('replies_count', { ascending: filters.sort_order === 'asc' })
          break
        default:
          query = query.order('created_at', { ascending: filters.sort_order === 'asc' })
      }

      // Paginación
      query = query.range(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE - 1
      )

      const { data: comments, error, count } = await executeWithRetry(() =>
        query.returns<Comment[]>()
      )

      if (error) {
        handleCommentError(error, 'SERVER_ERROR')
      }

      // Cargar reacciones para los comentarios
      const commentIds = comments?.map(c => c.id) || []
      if (commentIds.length > 0) {
        const { data: reactions, error: reactionsError } = await executeWithRetry(() =>
          supabase
            .from('comment_reactions')
            .select('*')
            .in('comment_id', commentIds)
        )

        if (reactionsError) {
          handleCommentError(reactionsError, 'SERVER_ERROR')
        }

        // Agrupar reacciones por comentario
        const groupedReactions = reactions?.reduce((acc, reaction) => ({
          ...acc,
          [reaction.comment_id]: [...(acc[reaction.comment_id] || []), reaction]
        }), {} as Record<string, CommentReaction[]>)

        setCommentsState(prev => ({
          ...prev,
          reactions: {
            ...prev.reactions,
            ...groupedReactions
          }
        }))
      }

      setTotalItems(count || 0)
      setCommentsState(prev => ({
        ...prev,
        comments: comments || [],
        filters
      }))

      return comments || []
    } catch (err) {
      throw new BaseError('Error al obtener comentarios', { cause: err })
    } finally {
      stopLoading()
    }
  }, [currentPage, executeWithRetry, startLoading, stopLoading])

  // Obtener un comentario específico
  const getComment = useCallback(async (commentId: string): Promise<Comment> => {
    try {
      startLoading()

      const { data: comment, error } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .select('*')
          .eq('id', commentId)
          .single()
      )

      if (error) {
        handleCommentError(error, 'NOT_FOUND', commentId)
      }

      return comment
    } catch (err) {
      throw new BaseError('Error al obtener comentario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Obtener respuestas de un comentario
  const getReplies = useCallback(async (commentId: string): Promise<Comment[]> => {
    try {
      startLoading()

      const { data: replies, error } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .select('*')
          .eq('parent_id', commentId)
          .order('created_at', { ascending: true })
      )

      if (error) {
        handleCommentError(error, 'SERVER_ERROR', commentId)
      }

      return replies || []
    } catch (err) {
      throw new BaseError('Error al obtener respuestas', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Agregar comentario
  const addComment = useCallback(async (
    entityType: Comment['entity_type'],
    entityId: string,
    content: string,
    parentId?: string
  ): Promise<Comment> => {
    if (!user) {
      handleCommentError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      // Validar contenido para spam
      if (await isSpam(content)) {
        handleCommentError(
          new Error('Contenido detectado como spam'),
          'SPAM',
          undefined,
          entityId
        )
      }

      const newComment = {
        entity_type: entityType,
        entity_id: entityId,
        parent_id: parentId || null,
        user_id: user.id,
        content,
        status: 'active'
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .insert([newComment])
          .select()
          .single()
      )

      if (error) {
        handleCommentError(error, 'SERVER_ERROR', undefined, entityId)
      }

      // Actualizar contador de respuestas del padre
      if (parentId) {
        await executeWithRetry(() =>
          supabase
            .from('comments')
            .update({ replies_count: supabase.sql`replies_count + 1` })
            .eq('id', parentId)
        )
      }

      setCommentsState(prev => ({
        ...prev,
        comments: [...prev.comments, data]
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al agregar comentario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Actualizar comentario
  const updateComment = useCallback(async (
    commentId: string,
    content: string
  ): Promise<Comment> => {
    if (!user) {
      handleCommentError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: existingComment } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .select('*')
          .eq('id', commentId)
          .single()
      )

      if (existingComment.user_id !== user.id) {
        handleCommentError(
          new Error('No autorizado para editar este comentario'),
          'PERMISSION',
          commentId
        )
      }

      // Validar contenido para spam
      if (await isSpam(content)) {
        handleCommentError(
          new Error('Contenido detectado como spam'),
          'SPAM',
          commentId
        )
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .update({
            content,
            is_edited: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', commentId)
          .select()
          .single()
      )

      if (error) {
        handleCommentError(error, 'SERVER_ERROR', commentId)
      }

      setCommentsState(prev => ({
        ...prev,
        comments: prev.comments.map(c =>
          c.id === commentId ? data : c
        )
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al actualizar comentario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar comentario
  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    if (!user) {
      handleCommentError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: existingComment } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .select('*')
          .eq('id', commentId)
          .single()
      )

      if (existingComment.user_id !== user.id) {
        handleCommentError(
          new Error('No autorizado para eliminar este comentario'),
          'PERMISSION',
          commentId
        )
      }

      const { error } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .update({ status: 'deleted' })
          .eq('id', commentId)
      )

      if (error) {
        handleCommentError(error, 'SERVER_ERROR', commentId)
      }

      // Actualizar contador de respuestas del padre
      if (existingComment.parent_id) {
        await executeWithRetry(() =>
          supabase
            .from('comments')
            .update({ replies_count: supabase.sql`replies_count - 1` })
            .eq('id', existingComment.parent_id)
        )
      }

      setCommentsState(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId)
      }))
    } catch (err) {
      throw new BaseError('Error al eliminar comentario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Fijar/Desfijar comentario
  const togglePin = useCallback(async (commentId: string): Promise<void> => {
    if (!user) {
      handleCommentError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: comment } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .select('*')
          .eq('id', commentId)
          .single()
      )

      const { error } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .update({ is_pinned: !comment.is_pinned })
          .eq('id', commentId)
      )

      if (error) {
        handleCommentError(error, 'SERVER_ERROR', commentId)
      }

      setCommentsState(prev => ({
        ...prev,
        comments: prev.comments.map(c =>
          c.id === commentId ? { ...c, is_pinned: !c.is_pinned } : c
        )
      }))
    } catch (err) {
      throw new BaseError('Error al fijar/desfijar comentario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Ocultar comentario
  const hideComment = useCallback(async (commentId: string): Promise<void> => {
    if (!user) {
      handleCommentError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { error } = await executeWithRetry(() =>
        supabase
          .from('comments')
          .update({ is_hidden: true })
          .eq('id', commentId)
      )

      if (error) {
        handleCommentError(error, 'SERVER_ERROR', commentId)
      }

      setCommentsState(prev => ({
        ...prev,
        comments: prev.comments.map(c =>
          c.id === commentId ? { ...c, is_hidden: true } : c
        )
      }))
    } catch (err) {
      throw new BaseError('Error al ocultar comentario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Agregar reacción
  const addReaction = useCallback(async (
    commentId: string,
    type: CommentReaction['type']
  ): Promise<void> => {
    if (!user) {
      handleCommentError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      // Verificar reacción existente
      const { data: existingReaction } = await executeWithRetry(() =>
        supabase
          .from('comment_reactions')
          .select('*')
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('type', type)
          .single()
      )

      if (existingReaction) {
        return // Ya existe la reacción
      }

      // Agregar reacción
      const { error: reactionError } = await executeWithRetry(() =>
        supabase
          .from('comment_reactions')
          .insert([{
            comment_id: commentId,
            user_id: user.id,
            type
          }])
      )

      if (reactionError) {
        handleCommentError(reactionError, 'SERVER_ERROR', commentId)
      }

      // Actualizar contador si es 'like'
      if (type === 'like') {
        const { error: updateError } = await executeWithRetry(() =>
          supabase
            .from('comments')
            .update({ likes_count: supabase.sql`likes_count + 1` })
            .eq('id', commentId)
        )

        if (updateError) {
          handleCommentError(updateError, 'SERVER_ERROR', commentId)
        }

        setCommentsState(prev => ({
          ...prev,
          comments: prev.comments.map(c =>
            c.id === commentId
              ? { ...c, likes_count: c.likes_count + 1 }
              : c
          )
        }))
      }
    } catch (err) {
      throw new BaseError('Error al agregar reacción', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar reacción
  const removeReaction = useCallback(async (
    commentId: string,
    type: CommentReaction['type']
  ): Promise<void> => {
    if (!user) {
      handleCommentError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { error: reactionError } = await executeWithRetry(() =>
        supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('type', type)
      )

      if (reactionError) {
        handleCommentError(reactionError, 'SERVER_ERROR', commentId)
      }

      // Actualizar contador si es 'like'
      if (type === 'like') {
        const { error: updateError } = await executeWithRetry(() =>
          supabase
            .from('comments')
            .update({ likes_count: supabase.sql`likes_count - 1` })
            .eq('id', commentId)
        )

        if (updateError) {
          handleCommentError(updateError, 'SERVER_ERROR', commentId)
        }

        setCommentsState(prev => ({
          ...prev,
          comments: prev.comments.map(c =>
            c.id === commentId
              ? { ...c, likes_count: Math.max(0, c.likes_count - 1) }
              : c
          )
        }))
      }
    } catch (err) {
      throw new BaseError('Error al eliminar reacción', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Reportar comentario
  const reportComment = useCallback(async (
    commentId: string,
    reason: string
  ): Promise<void> => {
    if (!user) {
      handleCommentError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { error } = await executeWithRetry(() =>
        supabase
          .from('comment_reports')
          .insert([{
            comment_id: commentId,
            user_id: user.id,
            reason
          }])
      )

      if (error) {
        handleCommentError(error, 'SERVER_ERROR', commentId)
      }
    } catch (err) {
      throw new BaseError('Error al reportar comentario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Validar spam
  const isSpam = async (content: string): Promise<boolean> => {
    // TODO: Implementar validación de spam
    // Aquí se podría integrar con servicios como Akismet o implementar
    // validaciones propias basadas en patrones, frecuencia, etc.
    return false
  }

  // Actualizar filtros
  const setFilters = useCallback((filters: CommentFilters): void => {
    setCommentsState(prev => ({
      ...prev,
      filters
    }))
  }, [])

  // Refrescar comentarios
  const refreshComments = useCallback(async (): Promise<void> => {
    if (commentsState?.filters) {
      await getComments(commentsState.filters)
    }
  }, [commentsState?.filters, getComments])

  return {
    comments: commentsState?.comments || [],
    commentReactions: commentsState?.reactions || {},
    isLoading,
    currentPage,
    totalPages,
    filters: commentsState?.filters || {},
    getComments,
    getComment,
    getReplies,
    addComment,
    updateComment,
    deleteComment,
    togglePin,
    hideComment,
    addReaction,
    removeReaction,
    reportComment,
    setFilters,
    nextPage,
    previousPage,
    refreshComments
  }
} 