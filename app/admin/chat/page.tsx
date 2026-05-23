'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { fountainFaqs } from '../../components/FaqBot'
import AdminGuard from '../../components/AdminGuard'

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
  assigned_staff: string | null
  assigned_at: string | null
}

type Message = {
  id: string
  conversation_id: string
  sender_type: string
  sender_name: string | null
  message: string
  created_at: string
}

function getCurrentAdmin() {
  if (typeof window === 'undefined') return 'Fountain Ride Support'

  return (
    localStorage.getItem('fountain_admin_name') ||
    'Fountain Ride Support'
  )
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const CURRENT_ADMIN = getCurrentAdmin()

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
        () => {
          fetchConversations()
        }
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
      .update({
        unread_admin_count: 0,
      })
      .eq('id', conversationId)

    fetchConversations()
  }

  async function selectConversation(conv: Conversation) {
    setSelected(conv)
    await markAdminRead(conv.id)
  }

  async function assignToMe() {
    if (!selected) return

    const { error } = await supabase
      .from('chat_conversations')
      .update({
        assigned_staff: CURRENT_ADMIN,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    if (error) {
      alert(error.message)
      return
    }

    const updated = {
      ...selected,
      assigned_staff: CURRENT_ADMIN,
    }

    setSelected(updated)
    fetchConversations()
  }

  async function releaseChat() {
    if (!selected) return

    const { error } = await supabase
      .from('chat_conversations')
      .update({
        assigned_staff: null,
        assigned_at: null,
      })
      .eq('id', selected.id)

    if (error) {
      alert(error.message)
      return
    }

    const updated = {
      ...selected,
      assigned_staff: null,
      assigned_at: null,
    }

    setSelected(updated)
    fetchConversations()
  }

  async function sendReply(customText?: string) {
    if (!selected) return

    const text = customText || reply.trim()

    if (!text) return

    if (!customText) {
      setReply('')
    }

    setSending(true)

    const { error: messageError } = await supabase.from('chat_messages').insert({
      conversation_id: selected.id,
      sender_type: 'admin',
      sender_name: CURRENT_ADMIN,
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
    <AdminGuard>
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
              Manage customer conversations and support operations.
            </p>
          </div>

          <div className="grid lg:grid-cols-[380px_1fr] gap-5">
            <section className="bg-white border rounded-[2rem] shadow-sm overflow-hidden">
              <div className="p-5 border-b">
                <h2 className="font-black text-xl">Conversations</h2>
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                {loading && (
                  <p className="p-5 text-gray-500">Loading...</p>
                )}

                {!loading &&
                  conversations.map((conv) => {
                    const unreadCount = Number(
                      conv.unread_admin_count || 0
                    )

                    return (
                      <button
                        key={conv.id}
                        onClick={() => selectConversation(conv)}
                        className={`w-full text-left p-5 border-b hover:bg-purple-50 transition ${
                          selected?.id === conv.id ? 'bg-purple-50' : ''
                        }`}
                      >
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black truncate">
                              {conv.customer_name || 'Unknown customer'}
                            </p>

                            <p className="text-sm text-gray-500 truncate mt-1">
                              {conv.customer_phone || 'No phone'}
                            </p>
                          </div>

                          {unreadCount > 0 && (
                            <span className="bg-red-600 text-white text-xs font-black rounded-full px-2 py-1 shrink-0">
                              {unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {conv.assigned_staff ? (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                              Assigned: {conv.assigned_staff}
                            </span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">
                              Unassigned
                            </span>
                          )}

                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-full ${
                              conv.status === 'closed'
                                ? 'bg-gray-200 text-gray-600'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {conv.status || 'open'}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                          {conv.last_message || 'No messages yet'}
                        </p>
                      </button>
                    )
                  })}
              </div>
            </section>

            <section className="bg-white border rounded-[2rem] shadow-sm overflow-hidden min-h-[620px]">
              {!selected ? (
                <div className="h-full flex items-center justify-center p-8 text-center">
                  <div>
                    <h2 className="text-2xl font-black">
                      Select a conversation
                    </h2>

                    <p className="text-gray-500 mt-2">
                      Choose a customer chat to view and reply.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-5 border-b">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-2xl font-black">
                          {selected.customer_name || 'Customer'}
                        </h2>

                        <p className="text-gray-500 mt-1">
                          {selected.customer_phone || 'No phone'}
                        </p>

                        <div className="mt-3 flex gap-2 flex-wrap">
                          {selected.assigned_staff ? (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                              Assigned to {selected.assigned_staff}
                            </span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">
                              Unassigned
                            </span>
                          )}

                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                              selected.status === 'closed'
                                ? 'bg-gray-200 text-gray-600'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {selected.status || 'open'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!selected.assigned_staff ? (
                          <button
                            onClick={assignToMe}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold"
                          >
                            Assign to me
                          </button>
                        ) : (
                          <button
                            onClick={releaseChat}
                            className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold"
                          >
                            Release chat
                          </button>
                        )}

                        {selected.customer_phone && (
                          <a
                            href={`https://wa.me/${selected.customer_phone.replace(
                              /\D/g,
                              ''
                            )}`}
                            target="_blank"
                          >
                            <button className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold">
                              WhatsApp
                            </button>
                          </a>
                        )}

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

                    <div className="mt-5">
                      <p className="text-xs font-bold text-gray-500 mb-2">
                        QUICK FAQ REPLIES
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {fountainFaqs.slice(0, 6).map((faq) => (
                          <button
                            key={faq.question}
                            onClick={() => sendReply(faq.answer)}
                            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-full font-bold"
                          >
                            {faq.question}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="h-[430px] overflow-y-auto bg-[#f7f4fb] p-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          msg.sender_type === 'admin'
                            ? 'bg-gray-950 text-white ml-auto'
                            : 'bg-white border'
                        }`}
                      >
                        <p className="font-bold text-xs opacity-70 mb-1">
                          {msg.sender_name || msg.sender_type}
                        </p>

                        <p>{msg.message}</p>

                        <p className="text-[10px] mt-2 opacity-70">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}

                    <div ref={bottomRef} />
                  </div>

                  <div className="p-4 border-t flex gap-2">
                    <input
                      className="flex-1 border rounded-2xl px-4 py-3"
                      placeholder="Reply as Fountain Ride Support..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          sendReply()
                        }
                      }}
                    />

                    <button
                      disabled={sending || selected.status === 'closed'}
                      onClick={() => sendReply()}
                      className="bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white px-6 rounded-2xl font-bold"
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
    </AdminGuard>
  )
}