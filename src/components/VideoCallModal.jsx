'use client';

import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { io } from 'socket.io-client';

export default function VideoCallModal({ mentorshipId, onClose, currentUserId, otherUserId, isInitiator, socket }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, ringing, connected, ended
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(socket);
  const screenStreamRef = useRef(null);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!socket) {
      // Fallback: create Socket.io connection if not provided
      const token = localStorage.getItem('token');
      socketRef.current = io(process.env.NEXT_PUBLIC_API_URL || window.location.origin, {
        auth: { token },
        reconnection: true,
      });

      // Authenticate socket connection
      socketRef.current.on('connect', () => {
        socketRef.current.emit('auth', {
          userId: currentUserId,
          mentorshipId: mentorshipId,
        });
      });
    } else {
      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current && !socket) {
        socketRef.current.disconnect();
      }
    };
  }, [socket, currentUserId, mentorshipId]);

  // Initialize local stream and WebRTC peer
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create WebRTC peer
        const peerInstance = new SimplePeer({
          initiator: isInitiator,
          trickle: false,
          stream: stream,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        });

        // Handle peer signals
        peerInstance.on('signal', (data) => {
          console.log('Peer signal generated, emitting to', otherUserId);
          if (socketRef.current) {
            socketRef.current.emit('call:signal', {
              mentorshipId,
              to: otherUserId,
              signal: data,
            });
            console.log('call:signal emitted');
          } else {
            console.log('Socket not connected');
          }
        });

        peerInstance.on('stream', (remoteStreamData) => {
          setRemoteStream(remoteStreamData);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamData;
          }
          setCallStatus('connected');
        });

        peerInstance.on('error', (err) => {
          console.error('Peer error:', err);
        });

        peerInstance.on('close', () => {
          setCallStatus('ended');
        });

        setPeer(peerInstance);
        setCallStatus(isInitiator ? 'ringing' : 'waiting');

      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Unable to access camera/microphone. Please check permissions.');
        onClose();
      }
    };

    initializeCall();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isInitiator, mentorshipId, otherUserId, onClose]);

  // Listen for incoming signals
  useEffect(() => {
    if (!socketRef.current || !peer) return;

    socketRef.current.on('call:signal', (data) => {
      try {
        peer.signal(data.signal);
      } catch (error) {
        console.error('Error signaling peer:', error);
      }
    });

    return () => {
      socketRef.current?.off('call:signal');
    };
  }, [peer]);

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        // Switch back to camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (peer) {
          const videoTrack = stream.getVideoTracks()[0];
          const sender = peer._pc
            .getSenders()
            .find(s => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });
        screenStreamRef.current = screenStream;
        setLocalStream(screenStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        if (peer) {
          const screenTrack = screenStream.getVideoTracks()[0];
          const sender = peer._pc
            .getSenders()
            .find(s => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }
        setIsScreenSharing(true);

        // Handle when user stops screen sharing from browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  // End call
  const endCall = () => {
    if (peer) {
      peer.destroy();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
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
              ref={localVideoRef}
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
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white mb-2">
                    {callStatus === 'ringing' ? 'Ringing...' : 'Waiting for connection...'}
                  </p>
                  <div className="animate-pulse text-gray-400">Connecting...</div>
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
              {callStatus === 'connected' ? 'Mentor' : 'Connecting...'}
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

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-all ${
              isScreenSharing
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 11-2 0V5H5v7a1 1 0 11-2 0V4z" />
              <path d="M14 14a1 1 0 00-1 1v1H7v-1a1 1 0 10-2 0v1a2 2 0 002 2h8a2 2 0 002-2v-1a1 1 0 00-1-1z" />
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
          {callStatus === 'connected' && '📞 Connected'}
          {callStatus === 'ringing' && '📞 Calling...'}
          {callStatus === 'ended' && '📞 Call Ended'}
        </div>
      </div>
    </div>
  );
}
