import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Youtube, FileText, Settings, Download, X, Plus, AlertCircle, Sparkles, Clipboard, RefreshCw } from 'lucide-react';

import YoutubePlayer from './components/YoutubePlayer';
import TranscriptTimeline from './components/TranscriptTimeline';
import NotesEditor from './components/NotesEditor';
import PdfPreview from './components/PdfPreview';
import { DEMO_VIDEOS } from './utils/demoData';
import { generateVectorPdf } from './utils/pdfGenerator';

export default function App() {
  // Navigation & Core States
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Active Video States
  const [activeVideo, setActiveVideo] = useState(null); // { videoId, metadata, transcript }
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState(null);
  
  // Document Compilation States
  const [docMeta, setDocMeta] = useState({ title: '', subtitle: '', author: '', date: '', videoId: '' });
  const [sections, setSections] = useState([]);
  
  // Manual Paste Form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualTranscriptText, setManualTranscriptText] = useState('');

  // PDF Modal & Exporter States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfEngine, setPdfEngine] = useState('vector'); // 'vector' | 'canvas'
  const [pdfTheme, setPdfTheme] = useState('academic'); // 'academic' | 'modern' | 'minimalist'
  const [pdfOptions, setPdfOptions] = useState({ showCoverPage: true, showPageNumbers: true, showHeader: true });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Helper to extract video ID from YouTube URL (supports watch, shorts, live, youtu.be, and raw ID)
  const extractVideoId = (url) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/;
    const match = trimmed.match(regExp);
    return match ? match[1] : null;
  };

  // Convert seconds to readable MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Smart Parser for Manual Transcripts
  const parseManualTranscript = (rawText) => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsed = [];
    
    // Regex for time format: "0:05", "12:34", "1:23:45"
    const timestampRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;

    const timeToSeconds = (timeStr) => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return 0;
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Format 1: Timestamp on its own line, text on the next line (very common from YT copy-paste)
      if (timestampRegex.test(line)) {
        const timestamp = timeToSeconds(line);
        const text = (i + 1 < lines.length) ? lines[i + 1] : '[Subtitles]';
        parsed.push({ start: timestamp, duration: 4, text });
        i += 2;
      } else {
        // Format 2: Timestamp at the start of the line, e.g., "1:15 Steve Jobs begins..."
        const firstWord = line.split(/\s+/)[0];
        if (timestampRegex.test(firstWord)) {
          const start = timeToSeconds(firstWord);
          const text = line.substring(firstWord.length).trim();
          parsed.push({ start, duration: 4, text });
        }
        i++;
      }
    }

    // Fallback: If no timestamps found, split by lines and assign 8-second intervals
    if (parsed.length === 0 && lines.length > 0) {
      lines.forEach((line, index) => {
        parsed.push({
          start: index * 8,
          duration: 8,
          text: line
        });
      });
    }

    return parsed;
  };

  // Safe fetch helper that handles CORS, proxies, and non-JSON HTML error pages gracefully
  const fetchVideoData = async (url) => {
    const isLocal = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const endpoints = isLocal
      ? [
          `http://localhost:3001/api/video-info?url=${encodeURIComponent(url)}`,
          `/api/video-info?url=${encodeURIComponent(url)}`
        ]
      : [
          `/api/video-info?url=${encodeURIComponent(url)}`
        ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 'Accept': 'application/json' }
        });

        const contentType = response.headers.get('content-type') || '';
        
        // Guard against HTML error pages (like "The page cannot be found") causing JSON syntax crashes
        if (!contentType.includes('application/json')) {
          const previewText = await response.text();
          console.warn(`Endpoint ${endpoint} returned non-JSON (${response.status}):`, previewText.slice(0, 100));
          lastError = new Error(`Server returned non-JSON response (${response.status})`);
          continue; // Try next endpoint
        }

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Server returned error code ${response.status}`);
        }

        if (!data.metadata) {
          throw new Error('Server returned invalid data format.');
        }

        return data; // Success!
      } catch (err) {
        lastError = err;
        console.warn(`Failed fetching from ${endpoint}:`, err.message);
      }
    }

    throw lastError || new Error('Could not connect to TubeNotes backend service.');
  };

  // Fetch from Express API
  const handleFetchVideo = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setError('Please enter a valid YouTube video URL or ID.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchVideoData(videoUrl);
      
      // Successfully fetched metadata and transcript
      setActiveVideo({
        videoId: data.metadata.videoId,
        metadata: data.metadata,
        transcript: data.transcript || []
      });

      // Initialize Document State
      setDocMeta({
        title: `${data.metadata.title} - Study Guide`,
        subtitle: `Structured notes and summaries compiled from ${data.metadata.channel}'s video.`,
        author: 'TubeNotes Compiler',
        date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        videoId: data.metadata.videoId
      });

      // Initialize sections with 3 default empty cards at logical positions
      const dur = data.metadata.duration || 300;
      const initialSections = [
        { id: 'sec-1', title: 'Introduction', timestamp: 0, summary: '', bullets: [''], imageUrl: '' },
        { id: 'sec-2', title: 'Key Concepts', timestamp: Math.floor(dur / 3), summary: '', bullets: [''], imageUrl: '' },
        { id: 'sec-3', title: 'Conclusion', timestamp: Math.floor((dur / 3) * 2), summary: '', bullets: [''], imageUrl: '' }
      ];
      setSections(initialSections);

      if (data.warning) {
        setError(data.warning);
      }

    } catch (err) {
      console.warn('Backend fetch failed:', err.message);
      const isNetworkError = err.name === 'TypeError' || err.message.toLowerCase().includes('failed to fetch') || err.message.toLowerCase().includes('network') || err.message.toLowerCase().includes('could not connect');
      
      if (isNetworkError) {
        setError(
          'Could not connect to the local backend server (http://localhost:3001). Please ensure "npm run dev" is running in your terminal. You can still use the app by selecting a pre-loaded Demo Video below, or manually pasting subtitles.'
        );
      } else {
        setError(err.message || 'An error occurred while fetching video details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load a Pre-Configured Demo Video
  const handleLoadDemo = (demo) => {
    setError(null);
    setActiveVideo({
      videoId: demo.videoId,
      metadata: {
        title: demo.title,
        channel: demo.channel,
        duration: demo.duration,
        videoId: demo.videoId,
        thumbnailUrl: demo.thumbnailUrl
      },
      transcript: demo.transcript
    });

    // Load rich pre-populated metadata
    setDocMeta({
      title: `${demo.title} - Lecture Guide`,
      subtitle: `Key take-aways and summaries of ${demo.channel}'s address.`,
      author: 'Stanford Academic Services',
      date: 'June 2005',
      videoId: demo.videoId
    });

    // Pre-populate beautifully structured pages
    setSections(demo.notes);
  };

  // Submit Manually Pasted Transcript
  const handleLoadManual = (e) => {
    e.preventDefault();
    setError(null);

    const videoId = extractVideoId(manualUrl);
    if (!videoId) {
      alert('Please provide a valid YouTube URL for the player.');
      return;
    }

    if (!manualTranscriptText.trim()) {
      alert('Please paste some transcript text.');
      return;
    }

    const title = manualTitle.trim() || 'Custom YouTube Study Guide';
    const parsedTranscript = parseManualTranscript(manualTranscriptText);

    setActiveVideo({
      videoId,
      metadata: {
        title,
        channel: 'Manual Upload',
        duration: parsedTranscript[parsedTranscript.length - 1]?.start || 600,
        videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      },
      transcript: parsedTranscript
    });

    setDocMeta({
      title,
      subtitle: 'Study guide compiled from manual transcript import.',
      author: 'Self Compiler',
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      videoId
    });

    // Initialize with standard cards
    setSections([
      { id: 'sec-1', title: 'Opening Highlights', timestamp: 0, summary: '', bullets: [''], imageUrl: '' },
      { id: 'sec-2', title: 'Main Discussion Notes', timestamp: Math.floor((parsedTranscript[parsedTranscript.length - 1]?.start || 100) / 2), summary: '', bullets: [''], imageUrl: '' }
    ]);

    // Clean up forms
    setShowManualForm(false);
    setManualTranscriptText('');
    setManualTitle('');
    setManualUrl('');
  };

  // seek utility for timeline
  const handleSeekTimeline = (time) => {
    setSeekTime(time);
    // Reset seek state shortly so the prop change registers again in player
    setTimeout(() => setSeekTime(null), 100);
  };

  // Append clicked transcript segment to the active notes card
  const handleAddSegmentToNotes = (segment) => {
    if (sections.length === 0) {
      alert("Please add a note page first in the Document Workspace.");
      return;
    }
    
    // Find the section that is closest in time to the segment, or the last section
    let activeSec = sections[sections.length - 1];
    
    // Update its summary text by appending the subtitle segment
    const updatedSections = sections.map(sec => {
      if (sec.id === activeSec.id) {
        const textToAppend = sec.summary ? ` ${segment.text}` : segment.text;
        return {
          ...sec,
          summary: sec.summary + textToAppend,
          // Set timestamp to the segment's start time if it was empty/default
          timestamp: sec.timestamp === 0 && index !== 0 ? segment.start : sec.timestamp
        };
      }
      return sec;
    });

    setSections(updatedSections);
  };

  // HIGH-FIDELITY PDF GENERATOR ENGINE
  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportProgress(10);

    try {
      if (pdfEngine === 'vector') {
        // Native Vector PDF: Crisp, searchable, selectable, tiny file size
        await generateVectorPdf(
          {
            ...docMeta,
            thumbnailUrl: activeVideo?.metadata?.thumbnailUrl
          },
          sections,
          {
            showCoverPage: pdfOptions.showCoverPage,
            showPageNumbers: pdfOptions.showPageNumbers,
            showHeader: pdfOptions.showHeader,
            theme: pdfTheme === 'dark' ? 'modern' : pdfTheme === 'creative' ? 'academic' : pdfTheme
          },
          setExportProgress
        );
        setIsModalOpen(false);
      } else {
        // Fallback: Visual Canvas Snapshot Mode via html2canvas
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageIds = [];
        if (pdfOptions.showCoverPage) {
          pageIds.push('pdf-page-cover');
        }
        sections.forEach((_, idx) => {
          pageIds.push(`pdf-page-${idx}`);
        });

        const totalPages = pageIds.length;

        for (let i = 0; i < totalPages; i++) {
          const elementId = pageIds[i];
          const element = document.getElementById(elementId);

          if (!element) {
            console.warn(`PDF Page DOM node not found: #${elementId}`);
            continue;
          }

          // Render page to canvas with high definition (scale: 2)
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);

          if (i > 0) {
            pdf.addPage();
          }

          // Fit image exactly on the A4 page (210 x 297 mm)
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

          // Update progress bar
          const progress = Math.round(((i + 1) / totalPages) * 100);
          setExportProgress(progress);
        }

        // Save PDF with sanitized title filename
        const titleClean = docMeta.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        pdf.save(`${titleClean || 'tubenotes'}_study_guide.pdf`);

        // Close modal and reset exporting
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('PDF compiling error:', err);
      alert('Failed to compile PDF. Ensure images are fully loaded and try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="app-container">
      {/* HEADER BAR */}
      <header className="main-header">
        <a href="/" className="logo" onClick={(e) => { e.preventDefault(); setActiveVideo(null); setError(null); }}>
          <div className="logo-icon">T</div>
          <span className="logo-text">TubeNotes</span>
          <span className="logo-badge">PRO</span>
        </a>

        {activeVideo && (
          <div className="editor-actions">
            <button 
              className="btn btn-secondary" 
              onClick={() => { setActiveVideo(null); setError(null); }}
              style={{ padding: '8px 14px' }}
            >
              Exit Workspace
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => setIsModalOpen(true)}
              style={{ padding: '8px 16px' }}
            >
              <Download size={16} />
              Export to PDF
            </button>
          </div>
        )}
      </header>

      {/* LANDING & INPUT SCREEN */}
      {!activeVideo ? (
        <div className="landing-hero">
          <div className="badge-glow">
            <Sparkles size={14} />
            Convert YouTube Videos to Premium PDF Notes
          </div>
          
          <h1 className="hero-title">
            Transform Lectures & Tutorials <br />
            into <span>Beautiful Study Guides</span>
          </h1>
          
          <p className="hero-subtitle">
            Enter a YouTube URL to extract timestamped transcripts. Sync playback, capture video slides, write structured summaries, and export professional PDF handouts instantly.
          </p>

          {/* URL Fetch Card */}
          <div className="input-card">
            <form onSubmit={handleFetchVideo} className="url-input-container">
              <div className="url-input-wrapper">
                <Youtube className="url-input-icon" />
                <input
                  type="text"
                  className="url-input"
                  placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=...)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ padding: '0 24px' }}>
                {isLoading ? <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span> : 'Fetch Video'}
              </button>
            </form>

            {/* Error & Backend Fallback Alert */}
            {error && (
              <div className="error-message" style={{ display: 'block', padding: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-danger)' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>Automatic Fetch Unavailable</strong>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{error}</span>
                  </div>
                </div>
                
                <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                    onClick={() => {
                      setShowManualForm(!showManualForm);
                      setError(null);
                    }}
                  >
                    Paste Transcript Manually
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Manual Import Form */}
          {showManualForm && (
            <div className="input-card" style={{ textAlign: 'left', animation: 'fadeIn 0.2s ease-out' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clipboard size={18} className="bullet-dot" />
                Manual Transcript Import
              </h3>
              <form onSubmit={handleLoadManual} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="meta-grid">
                  <div className="meta-input-group">
                    <label className="meta-label">Document Title</label>
                    <input
                      type="text"
                      className="meta-input"
                      placeholder="e.g. Stanford Lecture Notes"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="meta-input-group">
                    <label className="meta-label">YouTube Video URL</label>
                    <input
                      type="text"
                      className="meta-input"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="meta-input-group">
                  <label className="meta-label">Paste Transcript Text</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Copy subtitles directly from YouTube's transcript panel. We will automatically parse timestamps (e.g., "0:05 Text") and line splits!
                  </p>
                  <textarea
                    className="page-textarea"
                    placeholder="0:00 I am honored to be with you today&#10;0:03 Truth be told, I never graduated from college..."
                    style={{ minHeight: '150px' }}
                    value={manualTranscriptText}
                    onChange={(e) => setManualTranscriptText(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowManualForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-accent">Import & Start</button>
                </div>
              </form>
            </div>
          )}

          {/* Quick Demos Section */}
          <div className="demo-section">
            <h4 className="demo-title">
              <Sparkles size={14} className="bullet-dot" />
              Try an Interactive Demo Speech
            </h4>
            <div className="demo-grid">
              {DEMO_VIDEOS.map((demo) => (
                <div key={demo.id} className="demo-card" onClick={() => handleLoadDemo(demo)}>
                  <div className="demo-thumbnail" style={{ backgroundImage: `url(${demo.thumbnailUrl})` }}>
                    <div className="demo-play-btn">
                      <Sparkles size={24} style={{ color: 'var(--color-primary)' }} />
                    </div>
                  </div>
                  <div className="demo-info">
                    <h5 className="demo-video-title">{demo.title}</h5>
                    <div className="demo-video-meta">
                      <span>Channel: {demo.channel}</span>
                      <span>•</span>
                      <span>Duration: {formatTime(demo.duration)}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={12} /> Pre-compiled notes
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE WORKSPACE VIEW (SPLIT-SCREEN) */
        <div className="workspace-container">
          {/* Left Panel: Video & Transcript */}
          <div className="left-panel">
            <div className="video-wrapper">
              <YoutubePlayer 
                videoId={activeVideo.videoId} 
                onTimeUpdate={setCurrentTime} 
                seekTime={seekTime} 
              />
            </div>
            
            <TranscriptTimeline 
              transcript={activeVideo.transcript} 
              currentTime={currentTime} 
              onSeek={handleSeekTimeline}
              onAddSegmentToNotes={handleAddSegmentToNotes}
            />
          </div>

          {/* Right Panel: Workspace Notes Editor */}
          <NotesEditor 
            videoId={activeVideo.videoId}
            currentTime={currentTime}
            meta={docMeta}
            onMetaChange={setDocMeta}
            sections={sections}
            onUpdateSections={setSections}
            onSeekTo={handleSeekTimeline}
          />

          {/* High Fidelity Offscreen PDF Page Compilers */}
          <PdfPreview 
            meta={docMeta} 
            sections={sections} 
            theme={pdfTheme} 
            options={pdfOptions} 
          />
        </div>
      )}

      {/* EXPORT CONFIGURATION MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">PDF Export Configuration</h3>
              <button className="btn-icon" onClick={() => !isExporting && setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Engine Selector */}
              <div className="modal-section">
                <label className="meta-label">1. PDF Output Engine</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => !isExporting && setPdfEngine('vector')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: pdfEngine === 'vector' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                      background: pdfEngine === 'vector' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: pdfEngine === 'vector' ? '#6366f1' : 'var(--text-main)' }}>
                        Native Vector PDF
                      </span>
                      <span style={{ fontSize: '9px', background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        RECOMMENDED
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      100% selectable text, searchable, crystal-clear typography at 1000% zoom, lightweight (~90KB).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => !isExporting && setPdfEngine('canvas')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: pdfEngine === 'canvas' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                      background: pdfEngine === 'canvas' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: pdfEngine === 'canvas' ? '#6366f1' : 'var(--text-main)' }}>
                        Canvas Snapshot
                      </span>
                      <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        LEGACY
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      HTML DOM rasterized to image. Matches exact CSS layout styles.
                    </p>
                  </button>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="modal-section">
                <label className="meta-label">2. Document Color & Design Theme</label>
                <div className="theme-selector-grid">
                  {[
                    { id: 'academic', name: 'Academic', desc: 'Classic Serif text' },
                    { id: 'dark', name: 'Digital Dark', desc: 'Futuristic slate' },
                    { id: 'minimalist', name: 'Minimalist', desc: 'Clean business' },
                    { id: 'creative', name: 'Editorial', desc: 'Warm cream style' }
                  ].map((themeOpt) => (
                    <div 
                      key={themeOpt.id} 
                      className={`theme-option ${pdfTheme === themeOpt.id ? 'selected' : ''}`}
                      onClick={() => !isExporting && setPdfTheme(themeOpt.id)}
                    >
                      {/* Decorative small color visual box */}
                      <div 
                        className="theme-preview-box" 
                        style={{ 
                          background: themeOpt.id === 'dark' ? '#0b0f19' : themeOpt.id === 'creative' ? '#fdfaf4' : '#ffffff',
                          flexDirection: 'column',
                          padding: '6px',
                          gap: '4px'
                        }}
                      >
                        <div style={{ width: '60%', height: '4px', background: themeOpt.id === 'dark' ? '#ffffff' : '#111827', borderRadius: '1px' }}></div>
                        <div style={{ width: '40%', height: '3px', background: themeOpt.id === 'dark' ? '#8b5cf6' : '#6b7280', borderRadius: '1px' }}></div>
                      </div>
                      <span className="theme-name">{themeOpt.name}</span>
                      <span className="theme-desc">{themeOpt.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Toggles */}
              <div className="modal-section">
                <label className="meta-label">3. Page Formatting Options</label>
                <div className="options-check-grid">
                  <label className="check-label-card">
                    <input 
                      type="checkbox" 
                      checked={pdfOptions.showCoverPage} 
                      onChange={(e) => !isExporting && setPdfOptions({ ...pdfOptions, showCoverPage: e.target.checked })} 
                    />
                    <div>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: '600' }}>Include Cover Page</span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Generate editorial title cover</span>
                    </div>
                  </label>
                  <label className="check-label-card">
                    <input 
                      type="checkbox" 
                      checked={pdfOptions.showHeader} 
                      onChange={(e) => !isExporting && setPdfOptions({ ...pdfOptions, showHeader: e.target.checked })} 
                    />
                    <div>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: '600' }}>Running Header</span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Show document title on top</span>
                    </div>
                  </label>
                  <label className="check-label-card" style={{ gridColumn: 'span 2' }}>
                    <input 
                      type="checkbox" 
                      checked={pdfOptions.showPageNumbers} 
                      onChange={(e) => !isExporting && setPdfOptions({ ...pdfOptions, showPageNumbers: e.target.checked })} 
                    />
                    <div>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: '600' }}>Page Numbering (Footer)</span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Include running footer with dynamic 'Page X of Y' markers</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Rendering Progress Bar */}
              {isExporting && (
                <div className="export-progress-container">
                  <div className="progress-status">
                    <span>Compiling PDF Elements...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${exportProgress}%` }}></div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Capturing high-resolution DOM structures. This takes a moment depending on the number of pages...
                  </span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setIsModalOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleExportPDF}
                disabled={isExporting || sections.length === 0}
              >
                {isExporting ? 'Compiling PDF...' : 'Download PDF Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
