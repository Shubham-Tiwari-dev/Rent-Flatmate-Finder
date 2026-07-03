import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.js';
import { Chat, Message } from '../types.js';
import { MessageSquare, Send, Clock, Sparkles, Building2, User } from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll messages to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherUserTyping]);

  // Load chat threads
  const loadChats = async (selectFirst = false) => {
    try {
      const res = await axios.get('/api/chat');
      const chatData = Array.isArray(res.data) ? res.data : [];
      setChats(chatData);
      if (selectFirst && chatData.length > 0 && !activeChat) {
        handleSelectChat(chatData[0]);
      }
    } catch (err) {
      console.error('Error fetching chat threads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats(true);
  }, []);

  // Initialize WebSockets
  useEffect(() => {
    const socketUrl = window.location.origin;
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Real-time chat socket connected:', socket.id);
      if (user?.id) {
        socket.emit('register-user', user.id);
      }
    });

    // Handle online users lists
    socket.on('online-users', (userIds: string[]) => {
      setOnlineUserIds(userIds);
    });

    // Handle incoming messages dynamically
    socket.on('receive-message', (msg: Message) => {
      if (activeChat && msg.chatId === activeChat.id) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark message read immediately
        axios.get(`/api/chat/${activeChat.id}/messages`).catch(() => {});
      } else {
        // Refresh chats in background to update unread badge counts
        loadChats();
      }
    });

    // Handle typing indicators
    socket.on('typing', (data: { chatId: string; userId: string; isTyping: boolean }) => {
      if (activeChat && data.chatId === activeChat.id && data.userId !== user?.id) {
        setOtherUserTyping(data.isTyping);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeChat, user]);

  // Join the selected Chat room
  const handleSelectChat = async (chat: Chat) => {
    setActiveChat(chat);
    setOtherUserTyping(false);
    
    // Join room on backend via sockets
    if (socketRef.current) {
      socketRef.current.emit('join-room', chat.id);
    }

    try {
      // Get chat history and mark as read
      const res = await axios.get(`/api/chat/${chat.id}/messages`);
      setMessages(res.data);
      
      // Update sidebar chats reading unread indicator
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to retrieve chat history:', err);
    }
  };

  // Broadcast typing indicator with a 2-second debounce
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (!socketRef.current || !activeChat || !user) return;

    if (!typing) {
      setTyping(true);
      socketRef.current.emit('typing', {
        chatId: activeChat.id,
        userId: user.id,
        isTyping: true,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socketRef.current?.emit('typing', {
        chatId: activeChat.id,
        userId: user.id,
        isTyping: false,
      });
    }, 2000);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChat || !user) return;

    const messageText = text.trim();
    setText('');

    // Stop typing indicator on submit
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping(false);
    socketRef.current?.emit('typing', {
      chatId: activeChat.id,
      userId: user.id,
      isTyping: false,
    });

    // 1. Emit via WS for instant real-time delivery
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send-message', {
        chatId: activeChat.id,
        senderId: user.id,
        text: messageText,
      });
    } else {
      // 2. Fallback to API route if WS disconnects
      try {
        const res = await axios.post(`/api/chat/${activeChat.id}/message`, { text: messageText });
        setMessages((prev) => [...prev, res.data]);
      } catch (err) {
        console.error('Failed to send message via HTTP fallback:', err);
      }
    }
  };

  const getRecipientName = (chat: Chat) => {
    return user?.role === 'Owner' ? chat.tenant?.name : chat.owner?.name;
  };

  const getRecipientId = (chat: Chat) => {
    return user?.role === 'Owner' ? chat.tenantId : chat.ownerId;
  };

  return (
    <div id="chat-workspace" className="max-w-7xl mx-auto px-6 py-8 h-[80vh] flex gap-6">
      
      {/* Sidebar Threads list */}
      <div className="w-full md:w-80 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden h-full shrink-0">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between">
          <h2 className="font-black text-slate-800 text-base flex items-center space-x-2">
            <MessageSquare className="w-4.5 h-4.5 text-indigo-600" />
            <span>Secure Chats</span>
          </h2>
        </div>

        <div className="overflow-y-auto divide-y divide-slate-50 flex-grow">
          {chats.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Your chat threads will unlock automatically once interest requests are accepted by owners.
            </div>
          ) : (
            chats.map((chat) => {
              const active = activeChat?.id === chat.id;
              const rName = getRecipientName(chat);

              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`p-4 flex items-start space-x-3 cursor-pointer transition ${
                    active ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="relative">
                    <div className="bg-slate-100 p-2.5 rounded-xl text-slate-500">
                      <User className="w-4.5 h-4.5" />
                    </div>
                    {onlineUserIds.includes(getRecipientId(chat)) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold truncate ${active ? 'text-indigo-600' : 'text-slate-800'}`}>
                        {rName}
                      </p>
                      {chat.unreadCount && chat.unreadCount > 0 ? (
                        <span className="bg-indigo-600 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                          {chat.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                      Listing: {chat.listing?.title}
                    </p>
                    {chat.lastMessage && (
                      <p className="text-[11px] text-slate-500 truncate mt-1">
                        {chat.lastMessage.senderId === user?.id ? 'You: ' : ''}
                        {chat.lastMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Conversation space */}
      <div className="flex-grow bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-2xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-snug">{getRecipientName(activeChat)}</h3>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <div className="flex items-center text-[10px] text-slate-400 font-semibold space-x-1 uppercase tracking-wider">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{activeChat.listing?.title}</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center space-x-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${onlineUserIds.includes(getRecipientId(activeChat)) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                      <span className={`text-[10px] font-bold ${onlineUserIds.includes(getRecipientId(activeChat)) ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {onlineUserIds.includes(getRecipientId(activeChat)) ? 'Active Now' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gemini AI Score preview banner */}
              {user?.role === 'Tenant' && activeChat.listing?.compatibility && (
                <div className="flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-bold">Match score: {activeChat.listing.compatibility.score}%</span>
                </div>
              )}
            </div>

            {/* Messages Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 opacity-40 text-slate-500" />
                  <p className="text-xs font-semibold">Start the conversation</p>
                  <p className="text-[10px] text-slate-400 text-center max-w-xs">Type a message below to connect regarding the rental listing.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md p-4 rounded-2xl border ${
                        mine 
                          ? 'bg-indigo-600 text-white border-indigo-600 rounded-br-none' 
                          : 'bg-slate-50 text-slate-800 border-slate-100 rounded-bl-none'
                      }`}>
                        <p className="text-xs leading-relaxed">{m.text}</p>
                        <div className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 text-[10px] px-3 py-2 rounded-2xl animate-pulse">
                    Typing message...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send Message Form bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-50 bg-slate-50/20 flex space-x-3 items-center">
              <input
                type="text"
                value={text}
                onChange={handleTextChange}
                placeholder="Type your secure message here..."
                className="flex-grow text-sm bg-slate-100/75 border border-slate-100 focus:bg-white rounded-2xl p-3 px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-slate-400 space-y-4">
            <div className="bg-indigo-50 p-4 rounded-full text-indigo-500">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-700 text-sm">No Active Chat selected</h3>
            <p className="text-slate-400 text-xs text-center max-w-xs">Select any secure conversation thread from the left menu to view, reply, and exchange contact information.</p>
          </div>
        )}
      </div>
    </div>
  );
};
