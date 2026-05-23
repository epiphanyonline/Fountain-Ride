'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Conversation = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  status: string | null
  conversation_type: string | null
  created_at: string
  updated_at: string | null
  last_message: string | null
  last_sender_type: string | null
  unread_admin_count: number | null
  unread_customer_count: number | null
}

type Message = {
  id: string
  conversation_id: string
  sender_type: string
  sender_name: string | null
  message: string
  created_at: string
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchConversations()

    const channel = supabase
      .channel('admin-conversation-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
        },
        () => fetchConversations()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!selected) return

    fetchMessages(selected.id)
    markAdminRead(selected.id)

    const channel = supabase
      .channel(`admin-chat-${selected.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selected.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message

          if (newMessage.sender_type === 'customer') {
            const audio = new Audio('/notification.mp3')
            audio.play().catch(() => {})
          }

          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === newMessage.id)
            if (exists) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selected?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchConversations() {
    setLoading(true)

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false })

    if (error) {
      alert(error.message)
      setConversations([])
    } else {
      setConversations(data || [])
    }

    setLoading(false)
  }

  async function fetchMessages(conversationId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      alert(error.message)
      setMessages([])
      return
    }

    setMessages(data || [])
  }

  async function markAdminRead(conversationId: string) {
    await supabase
      .from('chat_conversations')
      .update({ unread_admin_count: 0 })
      .eq('id', conversationId)

    fetchConversations()
  }

  async function selectConversation(conv: Conversation) {
    setSelected(conv)
    await markAdminRead(conv.id)
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return

    const text = reply.trim()
    setReply('')
    setSending(true)

    const { error: messageError } = await supabase.from('chat_messages').insert({
      conversation_id: selected.id,
      sender_type: 'admin',
      sender_name: 'Fountain Ride Support',
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
        last_sender_type: 'admin',
        unread_customer_count: 1,
        unread_admin_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    if (conversationError) {
      alert(conversationError.message)
      setSending(false)
      return
    }

    setSending(false)
    fetchConversations()
  }

  async function closeConversation() {
    if (!selected) return

    const { error } = await supabase
      .from('chat_conversations')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    if (error) {
      alert(error.message)
      return
    }

    fetchConversations()
    setSelected({ ...selected, status: 'closed' })
  }

  async function reopenConversation() {
    if (!selected) return

    const { error } = await supabase
      .from('chat_conversations')
      .update({
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    if (error) {
      alert(error.message)
      return
    }

    fetchConversations()
    setSelected({ ...selected, status: 'open' })
  }

  return (
    <main className="min-h-screen bg-[#f7f4fb] px-4 py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <p className="text-sm font-bold text-purple-700">
            Fountain Ride Admin
          </p>

          <h1 className="text-3xl md:text-5xl font-black mt-2">
            Live Chat Inbox
          </h1>

          <p className="text-gray-600 mt-2">
            View enquiries, track unread messages, and reply to customers in real time.
          </p>
        </div>

        <div className="grid lg:grid-cols-[380px_1fr] gap-5">
          <section className="bg-white border rounded-[2rem] shadow-sm overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h2 className="font-black text-xl">Conversations</h2>
                <p className="text-xs text-gray-500">Latest customer chats</p>
              </div>

              <button
                onClick={fetchConversations}
                className="text-sm bg-purple-100 text-purple-700 px-3 py-2 rounded-xl font-bold"
              >
                Refresh
              </button>
            </div>

            <div className="max-h-[70vh] lg:max-h-[650px] overflow-y-auto">
              {loading && <p className="p-5 text-gray-500">Loading...</p>}

              {!loading && conversations.length === 0 && (
                <p className="p-5 text-gray-500">No chats yet.</p>
              )}

              {conversations.map((conv) => {
                const unreadCount = Number(conv.unread_admin_count || 0)

                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left p-5 border-b hover:bg-purple-50 transition ${
                      selected?.id === conv.id ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black truncate">
                          {conv.customer_name || 'Unknown customer'}
                        </p>

                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {conv.customer_phone || 'No phone'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-xs font-black rounded-full px-2 py-1">
                            {unreadCount}
                          </span>
                        )}

                        <span
                          className={`text-xs font-bold rounded-full px-2 py-1 ${
                            conv.status === 'closed'
                              ? 'bg-gray-200 text-gray-600'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {conv.status || 'open'}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mt-3 line-clamp-2">
                      {conv.last_message || 'No message yet'}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-3">
                      <p className="text-xs text-gray-400">
                        {conv.last_sender_type
                          ? `Last: ${conv.last_sender_type}`
                          : 'No sender yet'}
                      </p>

                      <p className="text-xs text-gray-400">
                        {new Date(conv.updated_at || conv.created_at).toLocaleString()}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="bg-white border rounded-[2rem] shadow-sm overflow-hidden min-h-[620px]">
            {!selected ? (
              <div className="h-full min-h-[620px] flex items-center justify-center text-center p-8">
                <div>
                  <h2 className="text-2xl font-black">Select a conversation</h2>
                  <p className="text-gray-500 mt-2">
                    Choose a customer chat from the list to view and reply.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-black">
                        {selected.customer_name || 'Customer'}
                      </h2>

                      <span
                        className={`text-xs font-bold rounded-full px-2 py-1 ${
                          selected.status === 'closed'
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {selected.status || 'open'}
                      </span>
                    </div>

                    <p className="text-gray-500 mt-1">
                      {selected.customer_phone || 'No phone provided'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {selected.status === 'closed' ? (
                      <button
                        onClick={reopenConversation}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold"
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        onClick={closeConversation}
                        className="bg-gray-950 text-white px-4 py-2 rounded-xl font-bold"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-[430px] md:h-[470px] overflow-y-auto bg-[#f7f4fb] p-4 md:p-5 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-gray-500">No messages yet.</p>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[88%] md:max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        msg.sender_type === 'admin'
                          ? 'bg-gray-950 text-white ml-auto'
                          : 'bg-white border'
                      }`}
                    >
                      <p className="font-bold text-xs opacity-70 mb-1">
                        {msg.sender_name || msg.sender_type}
                      </p>

                      <p className="leading-relaxed">{msg.message}</p>

                      <p className="text-[10px] mt-2 opacity-70">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}

                  <div ref={bottomRef} />
                </div>

                <div className="p-3 md:p-4 border-t flex gap-2">
                  <input
                    className="flex-1 border rounded-2xl px-4 py-3"
                    placeholder="Reply as Fountain Ride Support..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendReply()
                    }}
                  />

                  <button
                    disabled={sending || selected.status === 'closed'}
                    onClick={sendReply}
                    className="bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white px-5 md:px-6 rounded-2xl font-bold"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}