'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: string;
  read: boolean;
  createdAt: string;
  sender: { id: string; name: string | null; role: string };
  receiver: { id: string; name: string | null; role: string };
}

interface ChatPanelProps {
  currentUserId: string;
  trainerId: string | null;
  trainerName: string | null;
}

export default function ChatPanel({ currentUserId, trainerId, trainerName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!trainerId) return;
    try {
      const response = await fetch(`/api/messages?with=${trainerId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [trainerId]);

  // Use SSE for realtime updates, fall back to polling
  useEffect(() => {
    if (!trainerId) return;

    // Initial fetch
    fetchMessages();

    // Try SSE connection for realtime
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    try {
      eventSource = new EventSource(`/api/messages/stream?with=${trainerId}`);

      eventSource.onmessage = (event) => {
        try {
          const newMessages = JSON.parse(event.data);
          if (newMessages.length > 0) {
            setMessages(prev => {
              // Merge new messages, deduplicate by id
              const merged = [...prev];
              for (const msg of newMessages) {
                if (!merged.find(m => m.id === msg.id)) {
                  merged.push(msg);
                }
              }
              return merged.sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });
            setLoading(false);
          } else if (loading) {
            setLoading(false);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        // SSE failed — fall back to polling
        eventSource?.close();
        eventSource = null;
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fetchMessages, 5000);
        }
      };
    } catch {
      // SSE not supported — use polling
      fallbackInterval = setInterval(fetchMessages, 5000);
    }

    return () => {
      eventSource?.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [trainerId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!newMessage.trim() || !trainerId || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: trainerId,
          content: newMessage.trim(),
          type: 'TEXT',
        }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!trainerId) {
    return (
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl p-8 text-center shadow-sm border border-gray-200 dark:border-[#2a3042]">
        <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No trainer assigned yet.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Once you&apos;re assigned a trainer, you can message them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-xl shadow-sm border border-gray-200 dark:border-[#2a3042] flex flex-col h-[calc(100dvh-12rem)] sm:h-[600px] lg:h-[640px]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-[#2a3042]">
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-semibold">
            {trainerName?.charAt(0) || 'T'}
          </span>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{trainerName || 'Your Trainer'}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Trainer</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender.id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isOwn
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-[#242938] text-gray-900 dark:text-gray-100 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1 ${isOwn ? 'text-right' : 'text-left'} px-1`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-[#2a3042]">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none px-3.5 py-2.5 border border-gray-200 dark:border-[#2a3042] rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-24"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
