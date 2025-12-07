'use client';

import { useEffect, useRef, useState } from 'react';
import ZegoExpressEngine from 'zego-express-engine-webrtc';

export default function ZegoVideoCall({ mentorshipId, onClose, currentUserId, otherUserId }) {
  const [token, setToken] = useState(null);
  const [callStatus, setCallStatus] = useState('initializing');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [remoteUserList, setRemoteUserList] = useState([]);
  
  const zegoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef({});

  // Get token from backend
  useEffect(() => {
    const getToken = async () => {
      try {
        const res = await fetch('/api/video-call/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            roomId: mentorshipId,
          }),
        });
        const data = await res.json();
        setToken(data.token);
      } catch (error) {
        console.error('Error getting token:', error);
        alert('Failed to get video call token');
        onClose();
      }
    };

    if (currentUserId && mentorshipId) {
      getToken();
    }
  }, [currentUserId, mentorshipId, onClose]);

  // Initialize ZEGO and join room
  useEffect(() => {
    if (!token) return;

    const initZego = async () => {
      try {
        const zego = new ZegoExpressEngine(
          parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID),
          window.location.hostname
        );
        zegoRef.current = zego;

        // Add event listeners
        zego.on('publisherStateUpdate', (updateInfo) => {
          console.log('Publisher state:', updateInfo);
          if (updateInfo.state === 'PUBLISHING') {
            setCallStatus('connected');
          }
        });

        zego.on('roomStreamUpdate', (roomStreamUpdateInfo) => {
          console.log('Room stream update:', roomStreamUpdateInfo);
          if (roomStreamUpdateInfo.type === 'ADD') {
            // Remote user joined
            setRemoteUserList((prev) => [
              ...prev,
              ...roomStreamUpdateInfo.streamList.map((s) => s.user.userID),
            ]);
          } else if (roomStreamUpdateInfo.type === 'DELETE') {
            // Remote user left
            setRemoteUserList((prev) =>
              prev.filter(
                (id) => !roomStreamUpdateInfo.streamList.some((s) => s.user.userID === id)
              )
            );
          }
        });

        zego.on('remoteStreamAvailable', async (streamList) => {
          console.log('Remote stream available:', streamList);
          for (const stream of streamList) {
            try {
              const remoteStream = await zego.startPlayingStream(stream.streamID);
              remoteStreamRef.current[stream.streamID] = remoteStream;
              // Get remote video element and set stream
              const videoEl = document.getElementById(`remote-${stream.user.userID}`);
              if (videoEl && remoteStream) {
                videoEl.srcObject = remoteStream;
              }
            } catch (error) {
              console.error('Error playing remote stream:', error);
            }
          }
        });

        // Login to room
        await zego.loginRoom(mentorshipId, { userID: currentUserId.toString(), userName: `User-${currentUserId}` }, token);
        console.log('Logged in to room');

        // Get local stream
        const localStream = await zego.getUserMedia({
          audio: true,
          video: true,
        });
        localStreamRef.current = localStream;

        // Set local video element
        const localVideoEl = document.getElementById('local-video');
        if (localVideoEl) {
          localVideoEl.srcObject = localStream;
        }

        // Publish stream
        await zego.startPublishingStream(`stream-${currentUserId}`, localStream);
        console.log('Publishing stream');

      } catch (error) {
        console.error('ZEGO initialization error:', error);
        alert('Failed to initialize video call');
        onClose();
      }
    };

    initZego();

    return () => {
      if (zegoRef.current) {
        try {
          zegoRef.current.logoutRoom();
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
          }
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
    };
  }, [token, currentUserId, mentorshipId, onClose]);

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // End call
  const endCall = () => {
    if (zegoRef.current) {
      zegoRef.current.stopPublishingStream();
      zegoRef.current.logoutRoom();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-xl overflow-hidden shadow-2xl w-full max-w-4xl">
        {/* Video Grid */}
        <div className="grid grid-cols-2 gap-2 p-4 bg-black" style={{ height: '500px' }}>
          {/* Local Video */}
          <div className="relative bg-neutral-800 rounded-lg overflow-hidden">
            <video
              id="local-video"
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
              You
            </div>
          </div>

          {/* Remote Video */}
          <div className="relative bg-neutral-800 rounded-lg overflow-hidden">
            {remoteUserList.length > 0 ? (
              <video
                id={`remote-${remoteUserList[0]}`}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white mb-2">Waiting for other person...</p>
                  <div className="animate-pulse text-gray-400">Connecting...</div>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
              {remoteUserList.length > 0 ? 'Mentor' : 'Connecting...'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-neutral-900 p-4 flex items-center justify-center gap-4">
          {/* Microphone */}
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-all ${
              isAudioEnabled
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a2 2 0 00-2 2v6a2 2 0 104 0V4a2 2 0 00-2-2z" />
              <path d="M3 9a1 1 0 011-1h2v2H4a1 1 0 01-1-1zm13 0a1 1 0 011 1v2h-2V8h2a1 1 0 011-1z" />
            </svg>
          </button>

          {/* Camera */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all ${
              isVideoEnabled
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12-2v8H4V4h10z" />
            </svg>
          </button>

          {/* End Call */}
          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all"
            title="End Call"
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.895 2.553a1 1 0 00-1.79 0l-.894 4.47h4.572l-.894-4.47z" />
            </svg>
          </button>
        </div>

        {/* Status */}
        <div className="bg-neutral-800 px-4 py-2 text-center text-sm text-gray-300">
          {callStatus === 'connected' && remoteUserList.length > 0 && '✅ Connected'}
          {callStatus === 'initializing' && '⏳ Initializing...'}
          {callStatus === 'connected' && remoteUserList.length === 0 && '⏳ Waiting for other person...'}
        </div>
      </div>
    </div>
  );
}
