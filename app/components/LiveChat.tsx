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
  const [conversationId, setConversationId] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])

  const [starting, setStarting] = useState(false)
  const [sending, setSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedConversationId = localStorage.getItem('fountain_chat_conversation')
    const savedName = localStorage.getItem('fountain_chat_name')
    const savedPhone = localStorage.getItem('fountain_chat_phone')

    if (savedConversationId) setConversationId(savedConversationId)
    if (savedName) setCustomerName(savedName)
    if (savedPhone) setCustomerPhone(savedPhone)
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
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message

          setMessages((prev) => {
            const exists = prev.some(
              (msg) =>
                msg.message === newMessage.message &&
                msg.created_at === newMessage.created_at
            )

            if (exists) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    if (!conversationId) return

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setMessages(data || [])
  }

  async function startConversation() {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter your name and phone number.')
      return
    }

    setStarting(true)

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        last_message: 'Conversation started',
        last_sender_type: 'customer',
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
    localStorage.setItem('fountain_chat_conversation', data.id)
    localStorage.setItem('fountain_chat_name', customerName.trim())
    localStorage.setItem('fountain_chat_phone', customerPhone.trim())
  }

  async function sendMessage() {
    if (!message.trim()) return
    if (!conversationId) return

    const text = message.trim()

    const optimisticMessage: Message = {
      sender_type: 'customer',
      sender_name: customerName,
      message: text,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setMessage('')
    setSending(true)

    const { error: messageError } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_type: 'customer',
      sender_name: customerName,
      message: text,
    })

    if (messageError) {
      alert(messageError.message)
      setSending(false)
      return
    }

    const { error: conversationError } = await supabase
      .from('chat_conversations')
      .update({
        last_message: text,
        last_sender_type: 'customer',
        unread_admin_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    if (conversationError) {
      alert(conversationError.message)
      setSending(false)
      return
    }

    setSending(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 bg-purple-700 hover:bg-purple-800 text-white px-5 py-4 rounded-full shadow-2xl font-bold"
      >
        Chat with us
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[360px] max-w-[95vw] bg-white rounded-3xl shadow-2xl border overflow-hidden">
          <div className="bg-purple-700 text-white px-5 py-4">
            <h2 className="font-black text-lg">Fountain Ride Support</h2>
            <p className="text-sm text-purple-100">
              We typically reply within minutes.
            </p>
          </div>

          {!conversationId ? (
            <div className="p-5 space-y-4">
              <input
                className="w-full border rounded-2xl p-4"
                placeholder="Your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <input
                className="w-full border rounded-2xl p-4"
                placeholder="Phone or WhatsApp number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />

              <button
                disabled={starting}
                onClick={startConversation}
                className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white py-4 rounded-2xl font-bold"
              >
                {starting ? 'Starting...' : 'Start chat'}
              </button>
            </div>
          ) : (
            <>
              <div className="h-[400px] overflow-y-auto p-4 bg-[#f7f4fb] space-y-3">
                {messages.length === 0 && (
                  <div className="text-sm text-gray-500">
                    Conversation started. Send a message.
                  </div>
                )}

                {messages.map((msg, index) => (
                  <div
                    key={`${msg.created_at}-${index}`}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.sender_type === 'customer'
                        ? 'bg-purple-700 text-white ml-auto'
                        : 'bg-white border'
                    }`}
                  >
                    <p>{msg.message}</p>

                    <p className="text-[10px] mt-2 opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))}

                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t flex gap-2">
                <input
                  className="flex-1 border rounded-2xl px-4"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendMessage()
                  }}
                />

                <button
                  disabled={sending}
                  onClick={sendMessage}
                  className="bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white px-5 rounded-2xl font-bold"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}