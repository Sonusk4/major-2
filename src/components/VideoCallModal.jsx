'use client';

import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';

export default function VideoCallModal({ mentorshipId, onClose, currentUserId, otherUserId, isInitiator }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, ringing, waiting, connecting, connected, ended
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [signalData, setSignalData] = useState(null);
  const [remoteSignalData, setRemoteSignalData] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenStreamRef = useRef(null);

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
          console.log('Peer signal generated');
          const signalString = JSON.stringify(data);
          setSignalData(signalString);
          console.log('Signal data set, length:', signalString.length);
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

  // Handle incoming signal data
  const handleSignalInputChange = (e) => {
    setRemoteSignalData(e.target.value);
  };

  const processRemoteSignal = () => {
    if (!remoteSignalData || !peer) {
      alert('Please paste the signal data from the other person');
      return;
    }
    try {
      const signalData = JSON.parse(remoteSignalData);
      console.log('Processing remote signal');
      peer.signal(signalData);
      setRemoteSignalData('');
      setCallStatus('connecting'); // Update status when signal is processed
    } catch (error) {
      console.error('Invalid signal data:', error);
      alert('Invalid signal data. Make sure you copied the complete signal.');
    }
  };

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

        {/* Signal Exchange */}
        <div className="bg-neutral-900 p-4 border-t border-neutral-700">
          {signalData && (
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-2">
                {isInitiator ? 'Send this signal to the other person:' : 'Your signal to send back:'}
              </label>
              <textarea
                readOnly
                value={signalData}
                className="w-full h-20 p-2 bg-neutral-800 text-gray-300 text-xs rounded border border-neutral-600 font-mono overflow-auto"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(signalData);
                  alert('Signal copied to clipboard!');
                }}
                className="mt-2 w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                Copy {isInitiator ? 'My' : 'Your'} Signal
              </button>
            </div>
          )}

          {callStatus !== 'connected' && (
            <div>
              <label className="text-xs text-gray-400 block mb-2">
                {isInitiator ? 'Paste the answer signal from the receiver:' : 'Paste the offer signal from the caller:'}
              </label>
              <textarea
                value={remoteSignalData}
                onChange={handleSignalInputChange}
                placeholder="Paste signal here..."
                className="w-full h-20 p-2 bg-neutral-800 text-gray-300 text-xs rounded border border-neutral-600 font-mono"
              />
              <button
                onClick={processRemoteSignal}
                className="mt-2 w-full px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
              >
                Connect
              </button>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-neutral-800 px-4 py-2 text-center text-sm text-gray-300">
          {callStatus === 'connected' && '✅ Connected'}
          {callStatus === 'connecting' && '⏳ Signals exchanged, connecting...'}
          {callStatus === 'initializing' && '⏳ Initializing...'}
          {(callStatus === 'ringing' || callStatus === 'waiting') && '⏳ Waiting for signal exchange...'}
          {callStatus === 'ended' && '❌ Call Ended'}
        </div>
      </div>
    </div>
  );
}
