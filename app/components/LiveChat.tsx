'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Message = {
  id?: string
  sender_type: string
  sender_name: string | null
  message: string
  created_at: string
}

export default function LiveChat() {
  const [open, setOpen] = useState(false)

  const [conversationId, setConversationId] =
    useState<string | null>(null)

  const [customerName, setCustomerName] =
    useState('')

  const [customerPhone, setCustomerPhone] =
    useState('')

  const [message, setMessage] = useState('')

  const [messages, setMessages] =
    useState<Message[]>([])

  const [starting, setStarting] =
    useState(false)

  const [sending, setSending] =
    useState(false)

  const bottomRef =
    useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedConversationId =
      localStorage.getItem(
        'fountain_chat_conversation'
      )

    const savedName =
      localStorage.getItem(
        'fountain_chat_name'
      )

    const savedPhone =
      localStorage.getItem(
        'fountain_chat_phone'
      )

    if (savedConversationId) {
      setConversationId(
        savedConversationId
      )
    }

    if (savedName) {
      setCustomerName(savedName)
    }

    if (savedPhone) {
      setCustomerPhone(savedPhone)
    }
  }, [])

  useEffect(() => {
    if (!conversationId) return

    fetchMessages()

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter:
            `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage =
            payload.new as Message

          setMessages((prev) => {
            const exists = prev.some(
              (msg) =>
                msg.message ===
                  newMessage.message &&
                msg.created_at ===
                  newMessage.created_at
            )

            if (exists) return prev

            return [
              ...prev,
              newMessage,
            ]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages])

  async function fetchMessages() {
    if (!conversationId) return

    const { data, error } =
      await supabase
        .from('chat_messages')
        .select('*')
        .eq(
          'conversation_id',
          conversationId
        )
        .order('created_at', {
          ascending: true,
        })

    if (error) {
      console.error(error)
      return
    }

    setMessages(data || [])
  }

  async function startConversation() {
    if (
      !customerName.trim() ||
      !customerPhone.trim()
    ) {
      alert(
        'Please enter your name and phone number.'
      )
      return
    }

    setStarting(true)

    const { data, error } =
      await supabase
        .from('chat_conversations')
        .insert({
          customer_name:
            customerName.trim(),

          customer_phone:
            customerPhone.trim(),

          last_message:
            'Conversation started',

          last_sender_type:
            'customer',

          unread_admin_count: 0,

          unread_customer_count: 0,
        })
        .select()
        .single()

    setStarting(false)

    if (error) {
      alert(error.message)
      return
    }

    setConversationId(data.id)

    localStorage.setItem(
      'fountain_chat_conversation',
      data.id
    )

    localStorage.setItem(
      'fountain_chat_name',
      customerName.trim()
    )

    localStorage.setItem(
      'fountain_chat_phone',
      customerPhone.trim()
    )
  }

  async function sendMessage() {
    if (!message.trim()) return
    if (!conversationId) return

    const text = message.trim()

    const optimisticMessage: Message = {
      sender_type: 'customer',
      sender_name: customerName,
      message: text,
      created_at:
        new Date().toISOString(),
    }

    setMessages((prev) => [
      ...prev,
      optimisticMessage,
    ])

    setMessage('')
    setSending(true)

    const { error: messageError } =
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id:
            conversationId,

          sender_type: 'customer',

          sender_name:
            customerName,

          message: text,
        })

    if (messageError) {
      alert(messageError.message)
      setSending(false)
      return
    }

    const {
      error: conversationError,
    } = await supabase
      .from('chat_conversations')
      .update({
        last_message: text,

        last_sender_type:
          'customer',

        unread_admin_count: 1,

        updated_at:
          new Date().toISOString(),
      })
      .eq('id', conversationId)

    if (conversationError) {
      alert(
        conversationError.message
      )

      setSending(false)
      return
    }

    setSending(false)
  }

  return (
    <>
      {/* SUPPORT LAUNCHER */}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={
          open
            ? 'Close customer support'
            : 'Open customer support'
        }
        className="
          fixed
          right-4
          bottom-[6.75rem]
          z-50
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-full
          bg-purple-700
          text-white
          shadow-2xl
          transition
          hover:bg-purple-800

          sm:right-5
          sm:bottom-5
          sm:h-auto
          sm:w-auto
          sm:px-5
          sm:py-4
          sm:font-bold
        "
      >
        <span
          className="text-2xl sm:hidden"
          aria-hidden="true"
        >
          {open ? '×' : '💬'}
        </span>

        <span className="hidden sm:inline">
          {open
            ? 'Close Support'
            : 'Customer Support'}
        </span>
      </button>

      {/* SUPPORT WINDOW */}

      {open && (
        <div
          className="
            fixed
            inset-x-3
            bottom-[11rem]
            z-50
            max-h-[calc(100dvh-13rem)]
            overflow-hidden
            rounded-3xl
            border
            bg-white
            shadow-2xl

            sm:inset-x-auto
            sm:bottom-24
            sm:right-5
            sm:w-[360px]
            sm:max-w-[95vw]
          "
        >
          {/* HEADER */}

          <div className="bg-purple-700 px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">
                  Fountain Ride Support
                </h2>

                <p className="mt-1 text-sm text-purple-100">
                  Booking help, payments and
                  complaints — separate from your
                  driver chat.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Close support"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-bold hover:bg-white/20"
              >
                ×
              </button>
            </div>
          </div>

          {!conversationId ? (
            /* START CHAT */

            <div className="space-y-4 p-5">
              <input
                className="w-full rounded-2xl border p-4"
                placeholder="Your name"
                value={customerName}
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
              />

              <input
                className="w-full rounded-2xl border p-4"
                placeholder="Phone or WhatsApp number"
                value={customerPhone}
                onChange={(e) =>
                  setCustomerPhone(
                    e.target.value
                  )
                }
              />

              <button
                type="button"
                disabled={starting}
                onClick={
                  startConversation
                }
                className="w-full rounded-2xl bg-purple-700 py-4 font-bold text-white hover:bg-purple-800 disabled:bg-purple-300"
              >
                {starting
                  ? 'Starting...'
                  : 'Start chat'}
              </button>
            </div>
          ) : (
            <>
              {/* MESSAGES */}

              <div
                className="
                  h-[min(400px,45dvh)]
                  space-y-3
                  overflow-y-auto
                  bg-[#f7f4fb]
                  p-4
                "
              >
                {messages.length ===
                  0 && (
                  <div className="text-sm text-gray-500">
                    Conversation started.
                    Send a message.
                  </div>
                )}

                {messages.map(
                  (msg, index) => (
                    <div
                      key={`${msg.created_at}-${index}`}
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        msg.sender_type ===
                        'customer'
                          ? 'ml-auto bg-purple-700 text-white'
                          : 'border bg-white'
                      }`}
                    >
                      <p className="break-words">
                        {msg.message}
                      </p>

                      <p className="mt-2 text-[10px] opacity-70">
                        {new Date(
                          msg.created_at
                        ).toLocaleTimeString()}
                      </p>
                    </div>
                  )
                )}

                <div ref={bottomRef} />
              </div>

              {/* MESSAGE BOX */}

              <div className="flex gap-2 border-t p-3">
                <input
                  className="min-w-0 flex-1 rounded-2xl border px-4 py-3"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) =>
                    setMessage(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      'Enter'
                    ) {
                      sendMessage()
                    }
                  }}
                />

                <button
                  type="button"
                  disabled={sending}
                  onClick={sendMessage}
                  className="rounded-2xl bg-purple-700 px-4 font-bold text-white hover:bg-purple-800 disabled:bg-purple-300"
                >
                  {sending
                    ? '...'
                    : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
