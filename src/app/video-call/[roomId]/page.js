'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { FaArrowLeft } from 'react-icons/fa';
import { jitsiConfig } from '@/config/jitsi';

export default function VideoCallPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;
  const apiRef = useRef();

  const handleApiReady = (api) => {
    apiRef.current = api;
    api.addListener('readyToClose', () => {
      router.push('/');
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-4 bg-gray-800 flex items-center">
        <button
          onClick={() => router.back()}
          className="text-white p-2 rounded-full hover:bg-gray-700 mr-4"
          title="Back to chat"
        >
          <FaArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-white">Video Call</h1>
      </div>
      
      <div className="h-[calc(100vh-64px)] w-full">
        <JitsiMeeting
          roomName={roomId}
          configOverwrite={{
            ...jitsiConfig,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableModeratorIndicator: true,
            startScreenSharing: false,
            enableEmailInStats: false,
            enableWelcomePage: false,
            enableClosePage: false,
            prejoinPageEnabled: false,
            disableSelfView: false,
            toolbarButtons: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
              'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videobackgroundblur', 'download', 'mute-everyone', 'security'
            ],
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#f0f0f0',
            INITIAL_TOOLBAR_TIMEOUT: 5000,
            TOOLBAR_ALWAYS_VISIBLE: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            VIDEO_QUALITY_LABEL_DISABLED: true,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
            DISPLAY_WELCOME_PAGE_CONTENT: false,
            DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
            APP_NAME: 'CareerHub',
            NATIVE_APP_NAME: 'CareerHub',
          }}
          getIFrameRef={(iframeRef) => {
            if (iframeRef) {
              iframeRef.style.height = '100%';
              iframeRef.style.width = '100%';
            }
          }}
          onApiReady={(api) => handleApiReady(api)}
          onReadyToClose={() => router.push('/')}
        />
      </div>
    </div>
  );
}