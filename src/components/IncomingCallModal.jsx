'use client';

import { useEffect, useRef, useState } from 'react';

export default function IncomingCallModal({ mentorshipId, from, onAccept, onReject, socket }) {
  const [ringing, setRinging] = useState(true);
  const audioRef = useRef(null);

  // Play ringing sound
  useEffect(() => {
    if (ringing && audioRef.current) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      let isPlaying = true;

      const playRing = () => {
        if (!isPlaying) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // Frequency for ringtone
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // Ring again after 1 second
        setTimeout(playRing, 2000);
      };

      playRing();

      return () => {
        isPlaying = false;
      };
    }
  }, [ringing]);

  const handleAccept = () => {
    setRinging(false);
    onAccept();
  };

  const handleReject = () => {
    setRinging(false);
    if (socket) {
      socket.emit('call:reject', { mentorshipId, to: from });
    }
    onReject();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg border border-neutral-700 p-8 max-w-sm mx-auto shadow-2xl">
        <div className="text-center">
          <div className="mb-6">
            <div className="text-lg font-semibold text-slate-100 mb-2">
              Incoming Video Call
            </div>
            <div className="text-sm text-slate-400">
              {ringing ? (
                <div className="flex items-center justify-center gap-1">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Ringing...
                </div>
              ) : (
                'Connecting...'
              )}
            </div>
          </div>

          {ringing && (
            <div className="mb-8">
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleAccept}
                  className="px-8 py-3 rounded-full font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <span>✓</span> Accept
                </button>
                <button
                  onClick={handleReject}
                  className="px-8 py-3 rounded-full font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <span>✕</span> Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
