'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VideoCallModal from '@/components/VideoCallModal';

export default function ChatPage() {
  const routeParams = useParams();
  const mentorshipId = routeParams?.mentorshipId;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [menuMsgId, setMenuMsgId] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [mentorId, setMentorId] = useState(null);
  const [menteeId, setMenteeId] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [otherUserId, setOtherUserId] = useState(null);
  const [callInitiator, setCallInitiator] = useState(null);
  const [callSDP, setCallSDP] = useState(null);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const res = await fetch(`/api/chat/${mentorshipId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data.messages) ? data.messages : [];
      setMessages(list.map(m => ({ ...m, sender: String(m.sender) })));
    }
  };
  
  // Initialize Socket.io immediately on page load
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || !mentorshipId) return;

    console.log('Chat opened for mentorshipId:', mentorshipId);  useEffect(() => {
    (async () => {
      await loadMessages();
      setLoading(false);
      scrollToBottom();
    })();
    
    let es;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      // fetch mentorship participants for accurate roles
      fetch(`/api/mentorship/${mentorshipId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setMentorId(d?.mentorship?.mentor || null); setMenteeId(d?.mentorship?.mentee || null); })
        .catch(() => {});
      const url = `/api/chat/${mentorshipId}/stream?token=${encodeURIComponent(token)}`;
      es = new EventSource(url, { withCredentials: false });
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.type === 'message') {
            setMessages(prev => [...prev, { ...payload.item, sender: String(payload.item.sender) }]);
            scrollToBottom();
          } else if (payload?.type === 'message:update') {
            setMessages(prev => prev.map(m => m._id === payload.item._id ? { ...m, text: payload.item.text, editedAt: payload.item.editedAt } : m));
          } else if (payload?.type === 'message:delete') {
            setMessages(prev => prev.map(m => m._id === payload.item._id ? { ...m, text: 'Message deleted', deletedAt: payload.item.deletedAt } : m));
          }
        } catch (_) {}
      };
      es.onerror = () => {
        // ignore transient errors
      };
    }
    return () => { 
      try { es && es.close(); } catch (_) {} 
    };
  }, [mentorshipId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`/api/chat/${mentorshipId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (res.ok) {
      setInput('');
      await loadMessages();
      scrollToBottom();
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditingText(msg.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = async () => {
    const text = editingText.trim();
    if (!text || !editingId) return;
    const token = localStorage.getItem('token');
    const res = await fetch('/api/chat/message', { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: editingId, text }) });
    if (res.ok) {
      setEditingId(null);
      setEditingText('');
    }
  };

  const deleteMsg = async (id) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/chat/message?messageId=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      // SSE will update the list
    }
  };

  const initiateVideoCall = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Send a special video call request message
    const res = await fetch(`/api/chat/${mentorshipId}`, { 
      method: 'POST', 
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      }, 
      body: JSON.stringify({ 
        text: '📞 VIDEO_CALL_REQUEST',
        type: 'video_call'
      }) 
    });
    
    if (res.ok) {
      setShowVideoCall(true);
      setCallInitiator(currentUserId);
      console.log('Video call initiated, waiting for acceptance...');
    }
  };

  const acceptVideoCall = (initiatorId) => {
    setShowVideoCall(true);
    setCallInitiator(initiatorId);
    setCallSDP(null);
  };

  // decode JWT to get current user id for sender checks
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload && payload.id) setCurrentUserId(String(payload.id));
      }
    } catch (_) {}
  }, []);

  // determine other user for video call
  useEffect(() => {
    if (currentUserId && mentorId && menteeId) {
      const other = String(currentUserId) === String(mentorId) ? String(menteeId) : String(mentorId);
      setOtherUserId(other);
    }
  }, [currentUserId, mentorId, menteeId]);

  // close context menu on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setMenuMsgId(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-4">Mentorship Chat</h1>
        <div ref={containerRef} className="relative h-[60vh] overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900/70 p-4">
          {loading ? (
            <div className="text-slate-300">Loading...</div>
          ) : (
            messages.map((m) => {
              const isMine = currentUserId && String(m.sender) === String(currentUserId);
              // If not mine: show on opposite side; no change needed as we already align based on isMine.
              return (
                <div
                  key={m._id}
                  className={`mb-2 flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  onClick={(e) => {
                    if (m.deletedAt) return;
                    if (isMine) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPos({ x: isMine ? rect.width - 10 : 10, y: e.clientY - rect.top });
                      setMenuMsgId(m._id);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (!isMine || m.deletedAt) return;
                    e.preventDefault();
                    const parent = containerRef.current?.getBoundingClientRect();
                    if (parent) {
                      setMenuPos({ x: Math.min(e.clientX - parent.left, parent.width - 10), y: e.clientY - parent.top });
                    } else {
                      setMenuPos({ x: e.clientX, y: e.clientY });
                    }
                    setMenuMsgId(m._id);
                  }}
                >
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow ${isMine ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-neutral-800 text-slate-100 rounded-bl-sm'} ${isMine ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                    {editingId === m._id ? (
                      <div className="flex gap-2 items-end">
                        <input value={editingText} onChange={(e) => setEditingText(e.target.value)} className={`flex-1 px-3 py-2 rounded border ${isMine ? 'bg-emerald-700/40 border-emerald-400/30 text-white' : 'bg-neutral-900/70 border-neutral-700 text-white'}`} />
                        <button onClick={saveEdit} className="px-2 py-1 rounded bg-emerald-700 text-white text-xs">Save</button>
                        <button onClick={cancelEdit} className="px-2 py-1 rounded bg-neutral-700 text-white text-xs">Cancel</button>
                      </div>
                    ) : (
                      <div>
                        {m.text === '📞 VIDEO_CALL_REQUEST' ? (
                          <div className="flex items-center gap-3">
                            <span>Incoming video call...</span>
                            {!isMine && (
                              <button
                                onClick={() => acceptVideoCall(m.sender)}
                                className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                              >
                                Accept
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{m.text}</div>
                        )}
                        <div className={`mt-1 text-[10px] opacity-80 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {m.editedAt && <span className="italic">edited</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {menuMsgId && (
            <div
              className="absolute z-10 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg"
              style={{ left: menuPos.x, top: menuPos.y }}
            >
              <button
                onClick={() => {
                  const msg = messages.find(x => x._id === menuMsgId);
                  if (msg) startEdit(msg);
                  setMenuMsgId(null);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-neutral-700"
              >
                Edit
              </button>
              <button
                onClick={() => { deleteMsg(menuMsgId); setMenuMsgId(null); }}
                className="block w-full text-left px-4 py-2 text-sm text-rose-300 hover:bg-neutral-700"
              >
                Delete for everyone
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
            className="flex-1 px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900/80 text-white placeholder-slate-400"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-indigo-600 to-fuchsia-600"
          >
            Send
          </button>
          <button
            onClick={initiateVideoCall}
            className="px-4 py-2 rounded-lg font-semibold text-slate-100 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 transition-all"
            title="Start Video Call"
          >
            📞 Video Call
          </button>
        </div>
      </div>
      
      {showVideoCall && currentUserId && otherUserId && callInitiator && (
        <VideoCallModal
          mentorshipId={mentorshipId}
          currentUserId={currentUserId}
          otherUserId={otherUserId}
          isInitiator={callInitiator === currentUserId}
          onClose={() => setShowVideoCall(false)}
        />
      )}
    </div>
);
}


