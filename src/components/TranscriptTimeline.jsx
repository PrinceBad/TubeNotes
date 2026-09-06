import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Play, ScrollText } from 'lucide-react';

/**
 * TranscriptTimeline Component
 * Displays the timestamped subtitles in an interactive, auto-scrolling timeline.
 * Users can search terms, seek the video, and send snippets directly to their notes.
 */
export default function TranscriptTimeline({ 
  transcript = [], 
  currentTime = 0, 
  onSeek, 
  onAddSegmentToNotes 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const activeSegmentRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Find the currently active transcript segment based on video playback time
  useEffect(() => {
    if (!transcript || transcript.length === 0) return;

    const index = transcript.findIndex((seg, i) => {
      const nextSeg = transcript[i + 1];
      // If there is a next segment, active range is [start, next.start]
      // Otherwise, it is [start, start + duration]
      const end = nextSeg ? nextSeg.start : seg.start + (seg.duration || 5);
      return currentTime >= seg.start && currentTime < end;
    });

    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [currentTime, transcript, activeIndex]);

  // Smoothly auto-scroll the active segment into the center of the viewport
  useEffect(() => {
    if (activeSegmentRef.current && timelineContainerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeIndex]);

  // Filter transcript segments based on search query
  const filteredTranscript = transcript.map((seg, originalIndex) => ({
    ...seg,
    originalIndex
  })).filter(seg => 
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to format seconds into MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="transcript-container">
      <div className="transcript-header">
        <h3 className="transcript-title">
          <ScrollText size={18} className="bullet-dot" />
          Transcript Timeline
        </h3>
        <div className="transcript-search-wrapper">
          <Search className="transcript-search-icon" />
          <input
            type="text"
            className="transcript-search"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="transcript-timeline" ref={timelineContainerRef}>
        {filteredTranscript.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            {transcript.length === 0 ? 'No transcript available.' : 'No matching transcript lines found.'}
          </div>
        ) : (
          filteredTranscript.map((seg) => {
            const isActive = seg.originalIndex === activeIndex;
            return (
              <div
                key={seg.originalIndex}
                className={`transcript-segment ${isActive ? 'active' : ''}`}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => onSeek(seg.start)}
              >
                <div className="timestamp-badge">
                  {formatTime(seg.start)}
                </div>
                <div className="transcript-text-content">
                  {seg.text}
                </div>
                <div className="segment-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-icon"
                    title="Add to current notes page"
                    onClick={() => onAddSegmentToNotes(seg)}
                    style={{ padding: '4px', borderRadius: '4px', color: 'var(--color-primary)' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
