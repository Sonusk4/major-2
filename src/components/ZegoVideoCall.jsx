'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ZegoExpressEngine from 'zego-express-engine-webrtc';

// Client-only component wrapper
function ZegoVideoCallContent({ mentorshipId, onClose, currentUserId, otherUserId }) {
  const [token, setToken] = useState(null);
  const [callStatus, setCallStatus] = useState('initializing');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [remoteUserList, setRemoteUserList] = useState([]);
  const [mounted, setMounted] = useState(false);
  
  const zegoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef({});

  // Ensure component only runs on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get token from backend
  useEffect(() => {
    if (!mounted) return;

    const getToken = async () => {
      try {
        console.log('Requesting token for userId:', currentUserId, 'roomId:', mentorshipId);
        
        const res = await fetch('/api/video-call/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            roomId: mentorshipId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`Token generation failed: ${errorData.error}`);
        }

        const data = await res.json();
        console.log('Token received successfully');
        setToken(data.token);
      } catch (error) {
        console.error('Error getting token:', error);
        alert(`Failed to get video call token: ${error.message}`);
        onClose();
      }
    };

    if (currentUserId && mentorshipId) {
      getToken();
    }
  }, [currentUserId, mentorshipId, onClose, mounted]);

  // Initialize ZEGO and join room (client-only)
  useEffect(() => {
    if (!token || !mounted) return;

    const initZego = async () => {
      try {
        const appID = parseInt(process.env.NEXT_PUBLIC_ZEGO_APP_ID);
        const server = window.location.hostname;
        
        console.log('Initializing ZEGO with AppID:', appID, 'Server:', server);

        // Create ZEGO instance
        const zego = new ZegoExpressEngine(appID, server);
        zegoRef.current = zego;

        // Set up event listeners BEFORE logging in
        zego.on('publisherStateUpdate', (updateInfo) => {
          console.log('Publisher state:', updateInfo);
          if (updateInfo.state === 'PUBLISHING') {
            setCallStatus('connected');
          }
        });

        zego.on('roomStreamUpdate', (roomStreamUpdateInfo) => {
          console.log('Room stream update:', roomStreamUpdateInfo);
          if (roomStreamUpdateInfo.type === 'ADD') {
            setRemoteUserList((prev) => {
              const newList = new Set([...prev]);
              roomStreamUpdateInfo.streamList.forEach((s) => {
                newList.add(s.user.userID);
              });
              return Array.from(newList);
            });
          } else if (roomStreamUpdateInfo.type === 'DELETE') {
            setRemoteUserList((prev) =>
              prev.filter(
                (id) =>
                  !roomStreamUpdateInfo.streamList.some(
                    (s) => s.user.userID === id
                  )
              )
            );
          }
        });

        zego.on('remoteStreamAvailable', async (streamList) => {
          console.log('Remote streams available:', streamList);
          for (const stream of streamList) {
            try {
              console.log('Starting to play stream:', stream.streamID);
              const remoteStream = await zego.startPlayingStream(stream.streamID);
              console.log('Remote stream playing:', stream.streamID);
              
              // Set to video element
              const videoEl = document.getElementById(
                `remote-${stream.user.userID}`
              );
              if (videoEl) {
                videoEl.srcObject = remoteStream;
                console.log('Remote stream attached to video element');
              }
            } catch (err) {
              console.error('Error playing remote stream:', err);
            }
          }
        });

        zego.on('remoteStreamUpdated', async (streamList) => {
          console.log('Remote streams updated:', streamList);
        });

        zego.on('error', (error) => {
          console.error('ZEGO Error:', error);
        });

        // Get local media before joining room
        console.log('Requesting local media...');
        const localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        localStreamRef.current = localStream;
        console.log('Local media obtained');

        // Set local video
        const localVideoEl = document.getElementById('local-video');
        if (localVideoEl) {
          localVideoEl.srcObject = localStream;
          console.log('Local video set');
        }

        // Login to room
        console.log('Logging into room:', mentorshipId);
        const roomUserInfo = {
          userID: currentUserId.toString(),
          userName: `User-${currentUserId}`,
        };
        
        await zego.loginRoom(mentorshipId, roomUserInfo, token);
        console.log('Logged into room successfully');

        // Publish stream
        console.log('Starting to publish stream...');
        await zego.startPublishingStream(`stream-${currentUserId}`, localStream);
        console.log('Stream published successfully');

      } catch (error) {
        console.error('ZEGO initialization error:', error);
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        alert(`Failed to initialize video call: ${error.message}`);
        onClose();
      }
    };

    initZego();

    return () => {
      if (zegoRef.current) {
        try {
          zegoRef.current.stopPublishingStream();
          zegoRef.current.logoutRoom();
        } catch (error) {
          console.error('Cleanup error:', error);
        }
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [token, currentUserId, mentorshipId, onClose, mounted]);

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

// Export as dynamic client component (no SSR)
export default function ZegoVideoCall(props) {
  return <ZegoVideoCallContent {...props} />;
}
