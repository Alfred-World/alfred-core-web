'use client'

import { useEffect, useRef, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { ActionResultEntry, ChatMessageEntry } from '@/generated/core-api'
import { usePostApiV1AiChat } from '@/generated/core-api'

// ─── Types ─────────────────────────────────────────────────────────────────

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  type: 'text' | 'action'
  actions?: ActionResultEntry[]
  imagePreview?: string
  timestamp: Date
  isError?: boolean
}

const MAX_CONTEXT_MESSAGES = 20

const SUGGESTIONS = [
  { label: 'List all brands', icon: 'tabler-building-store' },
  { label: 'List all categories', icon: 'tabler-category' },
  { label: 'Create a new brand', icon: 'tabler-plus' },
]

// ─── Typing indicator ───────────────────────────────────────────────────────

function TypingDots() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', py: 0.5 }}>
      {[0, 1, 2].map(i => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'text.disabled',
            animation: 'typing-bounce 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
            '@keyframes typing-bounce': {
              '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: 0.5 },
              '40%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        />
      ))}
    </Box>
  )
}

// ─── Action card ────────────────────────────────────────────────────────────

// Convert internal camelCase function name to human-readable label
function formatFunctionName(name: string): string {
  return name.replace(/([A-Z])/g, ' $1').trim()
}

function ActionCard({ action }: { action: ActionResultEntry }) {
  const ok = action.isSuccess

  
return (
    <Box
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: ok ? 'success.light' : 'error.light',
        mb: 0.75,
      }}
    >
      {/* Colored header strip */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.85,
          background: ok
            ? 'linear-gradient(90deg, var(--mui-palette-success-main), var(--mui-palette-success-dark))'
            : 'linear-gradient(90deg, var(--mui-palette-error-main), var(--mui-palette-error-dark))',
        }}
      >
        <i
          className={ok ? 'tabler-circle-check-filled' : 'tabler-circle-x-filled'}
          style={{ fontSize: 16, color: '#fff', flexShrink: 0 }}
        />
        <Typography
          variant='caption'
          fontWeight={700}
          sx={{ color: '#fff', flex: 1, fontSize: '0.78rem', letterSpacing: 0.2 }}
        >
          {formatFunctionName(action.functionName)}
        </Typography>
        <Box
          sx={{
            px: 1,
            py: 0.15,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Typography variant='caption' sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {ok ? 'Success' : 'Failed'}
          </Typography>
        </Box>
      </Box>

      {/* Body */}
      {(action.message || action.error) && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            bgcolor: ok ? 'rgba(86,202,0,0.04)' : 'rgba(255,77,73,0.04)',
          }}
        >
          {action.message && (
            <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.6, fontSize: '0.8rem' }}>
              {action.message}
            </Typography>
          )}
          {action.error && (
            <Typography variant='body2' color='error.main' sx={{ lineHeight: 1.6, fontSize: '0.8rem' }}>
              {action.error}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({ msg, showTime }: { msg: DisplayMessage; showTime: boolean }) {
  const isUser = msg.role === 'user'
  const time = msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          gap: 1.25,
          mb: 0.5,
        }}
      >
        {/* Avatar */}
        <Avatar
          sx={{
            width: 30,
            height: 30,
            flexShrink: 0,
            mb: 0.25,
            bgcolor: isUser ? 'primary.main' : 'background.paper',
            border: '1.5px solid',
            borderColor: isUser ? 'primary.main' : 'divider',
            boxShadow: isUser ? '0 2px 8px rgba(var(--mui-palette-primary-mainChannel) / 0.35)' : 'none',
          }}
        >
          <i
            className={isUser ? 'tabler-user' : 'tabler-robot'}
            style={{ fontSize: 14, color: isUser ? '#fff' : 'inherit' }}
          />
        </Avatar>

        {/* Content */}
        <Box sx={{ maxWidth: '72%' }}>
          {isUser && msg.imagePreview && (
            <Box
              component='img'
              src={msg.imagePreview}
              alt='Attached'
              sx={{
                maxWidth: 220,
                maxHeight: 160,
                borderRadius: 3,
                mb: 0.5,
                display: 'block',
                ml: 'auto',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          )}

          {msg.type === 'action' && msg.actions ? (

            // Action cards already contain the message — skip the redundant summary bubble
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {msg.actions.map((action, idx) => (
                <ActionCard key={idx} action={action} />
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                px: 2,
                py: 1.25,
                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                ...(isUser
                  ? {
                      background: 'linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-primary-dark))',
                      color: 'primary.contrastText',
                      boxShadow: '0 2px 12px rgba(var(--mui-palette-primary-mainChannel) / 0.3)',
                    }
                  : msg.isError
                  ? {
                      bgcolor: 'error.lighter',
                      border: '1px solid',
                      borderColor: 'error.light',
                      color: 'error.dark',
                    }
                  : {
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      color: 'text.primary',
                    }),
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.isError && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                  <i className='tabler-alert-circle' style={{ fontSize: 14, color: 'var(--mui-palette-error-main)' }} />
                  <Typography variant='caption' fontWeight={600} color='error.main'>Failed</Typography>
                </Box>
              )}
              <Typography variant='body2' sx={{ lineHeight: 1.65 }}>
                {msg.content}
              </Typography>
            </Box>
          )}

          {showTime && (
            <Typography
              variant='caption'
              color='text.disabled'
              sx={{
                display: 'block',
                mt: 0.4,
                textAlign: isUser ? 'right' : 'left',
                fontSize: '0.68rem',
              }}
            >
              {isUser ? 'You' : 'Alfred AI'} · {time}
            </Typography>
          )}
        </Box>
      </Box>
    </Fade>
  )
}

// ─── Main panel ─────────────────────────────────────────────────────────────

export default function AiChatPanel() {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [context, setContext] = useState<ChatMessageEntry[]>([])
  const [input, setInput] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState('image/jpeg')
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { mutateAsync: sendChat, isPending } = usePostApiV1AiChat()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return
    const mimeType = file.type || 'image/jpeg'
    const reader = new FileReader()

    reader.onload = ev => {
      const dataUrl = ev.target?.result as string

      setImageBase64(dataUrl.split(',')[1])
      setImagePreview(dataUrl)
      setImageMimeType(mimeType)
    }

    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImageBase64(null)
    setImagePreview(null)
    setImageMimeType('image/jpeg')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sendMessage = async (text?: string) => {
    const trimmed = (text ?? input).trim()

    if (!trimmed || isPending) return
    setError(null)
    const now = new Date()

    setMessages(prev => [...prev, { role: 'user', content: trimmed, type: 'text', imagePreview: imagePreview ?? undefined, timestamp: now }])
    setInput('')
    const contextToSend = context.slice(-MAX_CONTEXT_MESSAGES)
    const currentImageBase64 = imageBase64 ?? undefined
    const currentMimeType = imageMimeType

    clearImage()

    try {
      const res = await sendChat({
        data: {
          message: trimmed,
          context: contextToSend,
          ...(currentImageBase64 ? { imageBase64: currentImageBase64, imageMimeType: currentMimeType } : {}),
        },
      })

      if (!res.success || !res.result) {
        const errMsg = res.errors?.[0]?.message ?? 'Request failed'

        setError(errMsg)
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg, type: 'text', timestamp: new Date() }])
      } else {
        const data = res.result
        const isAiError = data.isSuccess === false
        const content = data.message ?? (isAiError ? (data.error ?? 'An error occurred') : '')
 
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content,
            type: (data.type as 'text' | 'action') ?? 'text',
            actions: data.actions ?? undefined,
            timestamp: new Date(),
            isError: isAiError,
          },
        ])

        if (!isAiError) {
          setContext(prev => [
            ...prev,
            { role: 'user', content: trimmed },
            { role: 'assistant', content },
          ])
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error'

      setError(msg)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}`, type: 'text', timestamp: new Date() }])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Show timestamp only on last message of each role-group
  const shouldShowTime = (idx: number) =>
    idx === messages.length - 1 || messages[idx + 1]?.role !== messages[idx].role

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 130px)',
        maxWidth: 860,
        mx: 'auto',
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar
              sx={{
                width: 42,
                height: 42,
                background: 'linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-primary-dark))',
                boxShadow: '0 4px 14px rgba(var(--mui-palette-primary-mainChannel) / 0.4)',
              }}
            >
              <i className='tabler-robot' style={{ fontSize: 20, color: '#fff' }} />
            </Avatar>
            <Box
              sx={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'success.main',
                border: '2px solid',
                borderColor: 'background.default',
              }}
            />
          </Box>
          <Box>
            <Typography variant='subtitle1' fontWeight={700} lineHeight={1.2}>
              Alfred AI
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box component='span' sx={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
              Online · Powered by Groq
              {context.length > 0 && ` · ${context.length / 2} msg in context`}
            </Typography>
          </Box>
        </Box>

        <Tooltip title='Clear conversation'>
          <span>
            <IconButton
              size='small'
              onClick={() => { setMessages([]); setContext([]); setError(null) }}
              disabled={messages.length === 0}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              <i className='tabler-trash' style={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* ── Messages area ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 3,
          px: 1,
          display: 'flex',
          flexDirection: 'column',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { borderRadius: 2, bgcolor: 'divider' },
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              pb: 4,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-primary-dark))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(var(--mui-palette-primary-mainChannel) / 0.35)',
                mb: 1,
              }}
            >
              <i className='tabler-sparkles' style={{ fontSize: 32, color: '#fff' }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant='h6' fontWeight={600} gutterBottom>
                How can I help you?
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Ask me anything or try one of the suggestions below.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 1 }}>
              {SUGGESTIONS.map(s => (
                <Chip
                  key={s.label}
                  label={s.label}
                  icon={<i className={s.icon} style={{ fontSize: 14 }} />}
                  onClick={() => sendMessage(s.label)}
                  variant='outlined'
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} msg={msg} showTime={shouldShowTime(idx)} />
            ))}
          </>
        )}

        {/* Typing indicator */}
        {isPending && (
          <Fade in timeout={200}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.25, mb: 0.5 }}>
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  bgcolor: 'background.paper',
                  border: '1.5px solid',
                  borderColor: 'divider',
                }}
              >
                <i className='tabler-robot' style={{ fontSize: 14 }} />
              </Avatar>
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: '18px 18px 18px 4px',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <TypingDots />
              </Box>
            </Box>
          </Fade>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* ── Error banner ── */}
      {error && (
        <Fade in>
          <Box
            sx={{
              mx: 1,
              mb: 1,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: 'error.lighter',
              border: '1px solid',
              borderColor: 'error.light',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <i className='tabler-alert-circle' style={{ fontSize: 15, color: 'var(--mui-palette-error-main)' }} />
            <Typography variant='caption' color='error.main' sx={{ flex: 1 }}>{error}</Typography>
            <IconButton size='small' onClick={() => setError(null)} sx={{ color: 'error.main' }}>
              <i className='tabler-x' style={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Fade>
      )}

      {/* ── Image preview ── */}
      {imagePreview && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mx: 1,
            mb: 1,
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            component='img'
            src={imagePreview}
            alt='Preview'
            sx={{ height: 44, width: 44, objectFit: 'cover', borderRadius: 1.5 }}
          />
          <Typography variant='caption' color='text.secondary' sx={{ flex: 1 }}>
            Image ready to send
          </Typography>
          <IconButton size='small' onClick={clearImage}>
            <i className='tabler-x' style={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      )}

      {/* Quick suggestions (after conversation started) */}
      {messages.length > 0 && messages.length <= 6 && (
        <Box sx={{ display: 'flex', gap: 0.75, px: 1, mb: 1, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map(s => (
            <Chip
              key={s.label}
              label={s.label}
              size='small'
              onClick={() => sendMessage(s.label)}
              disabled={isPending}
              variant='outlined'
              sx={{ cursor: 'pointer', fontSize: '0.72rem', '&:hover': { bgcolor: 'action.hover' } }}
            />
          ))}
        </Box>
      )}

      {/* ── Input bar ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          px: 1.5,
          py: 1.25,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'border-color 0.2s',
          '&:focus-within': { borderColor: 'primary.main' },
        }}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />

        <Tooltip title='Attach image'>
          <IconButton
            size='small'
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            sx={{ color: 'text.secondary', flexShrink: 0 }}
          >
            <i className='tabler-paperclip' style={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>

        <InputBase
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={5}
          placeholder='Ask Alfred anything...'
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          sx={{
            fontSize: '0.9rem',
            '& .MuiInputBase-input': { py: 0.5 },
          }}
        />

        {isPending ? (
          <CircularProgress size={20} sx={{ flexShrink: 0, mx: 0.5 }} />
        ) : (
          <Tooltip title='Send (Enter)'>
            <span>
              <IconButton
                size='small'
                onClick={() => sendMessage()}
                disabled={!input.trim() || isPending}
                sx={{
                  flexShrink: 0,
                  background: input.trim()
                    ? 'linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-primary-dark))'
                    : undefined,
                  color: input.trim() ? '#fff' : 'text.disabled',
                  borderRadius: 2,
                  width: 32,
                  height: 32,
                  transition: 'all 0.2s',
                  '&:hover': { opacity: 0.88 },
                  '&.Mui-disabled': { bgcolor: 'transparent' },
                }}
              >
                <i className='tabler-send' style={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Box>
  )
}
