import React, { useEffect, useRef } from 'react';

/**
 * YoutubePlayer Component
 * Wraps the official YouTube Iframe Player API for interactive playback control,
 * time tracking, and synchronization.
 */
export default function YoutubePlayer({ videoId, onTimeUpdate, seekTime }) {
  const playerRef = useRef(null);
  const containerId = 'youtube-iframe-player';
  const timerRef = useRef(null);

  useEffect(() => {
    // 1. Ensure the YouTube Iframe API script tag is injected
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    let player;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }

      player = new window.YT.Player(containerId, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
          },
          onStateChange: (event) => {
            // YT.PlayerState.PLAYING is 1
            if (event.data === window.YT.PlayerState.PLAYING) {
              startTrackingTime();
            } else {
              stopTrackingTime();
            }
          }
        }
      });
    };

    // If API is already ready, initialize player immediately; otherwise hook into global callback
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        initPlayer();
      };
    }

    const startTrackingTime = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (player && typeof player.getCurrentTime === 'function') {
          onTimeUpdate(player.getCurrentTime());
        }
      }, 250);
    };

    const stopTrackingTime = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    return () => {
      stopTrackingTime();
      if (player && typeof player.destroy === 'function') {
        player.destroy();
      }
    };
  }, [videoId]);

  // Respond to seek events triggered by clicking the transcript timeline
  useEffect(() => {
    if (seekTime !== null && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(seekTime, true);
      // Play automatically when clicking a transcript segment
      if (typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    }
  }, [seekTime]);

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden' }}>
      <div id={containerId} style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
}
