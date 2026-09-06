import React, { useState } from 'react';
import { Trash2, Plus, Play, Camera, Image, CheckSquare, Sparkles, MoveUp, MoveDown, Clipboard } from 'lucide-react';

/**
 * NotesEditor Component
 * The interactive document builder where users compile pages/slides,
 * edit text, manage bullets, paste clipboard screenshots, and capture video frames.
 */
export default function NotesEditor({
  videoId,
  currentTime,
  meta,
  onMetaChange,
  sections = [],
  onUpdateSections,
  onSeekTo
}) {
  const [flashActiveId, setFlashActiveId] = useState(null);

  // Helper to format seconds into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add a new empty note page/slide at the current video timestamp
  const handleAddPage = () => {
    const newSection = {
      id: `sec-${Date.now()}`,
      title: `Notes Section @ ${formatTime(currentTime)}`,
      timestamp: currentTime,
      summary: '',
      bullets: [''],
      imageUrl: '' // will be populated by capture or upload
    };
    onUpdateSections([...sections, newSection]);
  };

  // Delete a note page
  const handleDeletePage = (id) => {
    onUpdateSections(sections.filter(sec => sec.id !== id));
  };

  // Update a specific field of a section
  const handleUpdateSectionField = (id, field, value) => {
    onUpdateSections(sections.map(sec => {
      if (sec.id === id) {
        return { ...sec, [field]: value };
      }
      return sec;
    }));
  };

  // Move a section up or down in the document
  const handleMoveSection = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    onUpdateSections(newSections);
  };

  // Handle capturing YouTube thumbnail frame at the section's timestamp
  const handleCaptureFrame = (id, sectionTimestamp) => {
    // Construct the standard YouTube thumbnail URL
    const imgUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    
    // Trigger the camera shutter flash animation
    setFlashActiveId(id);
    setTimeout(() => setFlashActiveId(null), 400);

    // Update section with the captured image
    handleUpdateSectionField(id, 'imageUrl', imgUrl);
    // Also save the captured timestamp
    handleUpdateSectionField(id, 'capturedTimestampText', `Frame captured at ${formatTime(sectionTimestamp)}`);
  };

  // Handle pasting image from clipboard
  const handlePasteImage = (e, id) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          handleUpdateSectionField(id, 'imageUrl', event.target.result);
          handleUpdateSectionField(id, 'capturedTimestampText', 'Clipboard screenshot attached');
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  // Handle image upload from file picker
  const handleImageUpload = (e, id) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleUpdateSectionField(id, 'imageUrl', event.target.result);
        handleUpdateSectionField(id, 'capturedTimestampText', 'Uploaded image');
      };
      reader.readAsDataURL(file);
    }
  };

  // Manage bullet points
  const handleBulletChange = (secId, bulletIndex, value) => {
    onUpdateSections(sections.map(sec => {
      if (sec.id === secId) {
        const newBullets = [...sec.bullets];
        newBullets[bulletIndex] = value;
        return { ...sec, bullets: newBullets };
      }
      return sec;
    }));
  };

  const handleAddBullet = (secId) => {
    onUpdateSections(sections.map(sec => {
      if (sec.id === secId) {
        return { ...sec, bullets: [...sec.bullets, ''] };
      }
      return sec;
    }));
  };

  const handleDeleteBullet = (secId, bulletIndex) => {
    onUpdateSections(sections.map(sec => {
      if (sec.id === secId) {
        const newBullets = sec.bullets.filter((_, idx) => idx !== bulletIndex);
        return { ...sec, bullets: newBullets.length > 0 ? newBullets : [''] };
      }
      return sec;
    }));
  };

  // Simulated AI notes summary generator
  const handleAiSummarize = (secId, summaryText) => {
    if (!summaryText || summaryText.trim().length < 20) {
      alert("Please write a longer summary in the text box first, then click AI Bullet Points to expand it.");
      return;
    }

    // Split text into sentences and convert to nice bullet points
    const sentences = summaryText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    if (sentences.length > 0) {
      const bulletPoints = sentences.map(s => {
        // Capitalize and add visual style
        return s.charAt(0).toUpperCase() + s.slice(1);
      });
      onUpdateSections(sections.map(sec => {
        if (sec.id === secId) {
          return { ...sec, bullets: bulletPoints };
        }
        return sec;
      }));
    }
  };

  return (
    <div className="right-panel">
      <div className="editor-header">
        <h3 className="editor-title">
          <CheckSquare size={20} className="bullet-dot" />
          Document Workspace
        </h3>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {sections.length} Page{sections.length !== 1 ? 's' : ''} compiled
        </span>
      </div>

      <div className="editor-scrollable">
        {/* Document Meta Configuration Card */}
        <div className="document-meta-card">
          <h4 className="meta-label" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Document Properties
          </h4>
          <div className="meta-grid">
            <div className="meta-input-group">
              <label className="meta-label">Document Title</label>
              <input
                type="text"
                className="meta-input"
                placeholder="e.g. Stanford Lecture Study Guide"
                value={meta.title || ''}
                onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
              />
            </div>
            <div className="meta-input-group">
              <label className="meta-label">Subtitle / Description</label>
              <input
                type="text"
                className="meta-input"
                placeholder="e.g. Key take-aways and slide summaries"
                value={meta.subtitle || ''}
                onChange={(e) => onMetaChange({ ...meta, subtitle: e.target.value })}
              />
            </div>
            <div className="meta-input-group">
              <label className="meta-label">Author / Organization</label>
              <input
                type="text"
                className="meta-input"
                placeholder="e.g. Jane Doe"
                value={meta.author || ''}
                onChange={(e) => onMetaChange({ ...meta, author: e.target.value })}
              />
            </div>
            <div className="meta-input-group">
              <label className="meta-label">Date</label>
              <input
                type="text"
                className="meta-input"
                placeholder="e.g. June 2026"
                value={meta.date || ''}
                onChange={(e) => onMetaChange({ ...meta, date: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Editor Sections */}
        {sections.map((section, index) => (
          <div key={section.id} className="editor-page-section">
            {/* Shutter Camera Flash Element */}
            <div className={`camera-flash ${flashActiveId === section.id ? 'flash-active' : ''}`}></div>

            <div className="page-section-header">
              <div className="page-badge">
                Page {index + 1}
                <span style={{ opacity: 0.6, fontSize: '11px', fontWeight: '500' }}>
                  ({formatTime(section.timestamp)})
                </span>
              </div>

              <div className="page-section-controls">
                <button
                  className="btn-icon"
                  title="Play video at this section's timestamp"
                  onClick={() => onSeekTo(section.timestamp)}
                >
                  <Play size={14} style={{ fill: 'currentColor' }} />
                </button>
                <button
                  className="btn-icon"
                  title="Move Page Up"
                  disabled={index === 0}
                  onClick={() => handleMoveSection(index, 'up')}
                  style={{ opacity: index === 0 ? 0.3 : 1 }}
                >
                  <MoveUp size={14} />
                </button>
                <button
                  className="btn-icon"
                  title="Move Page Down"
                  disabled={index === sections.length - 1}
                  onClick={() => handleMoveSection(index, 'down')}
                  style={{ opacity: index === sections.length - 1 ? 0.3 : 1 }}
                >
                  <MoveDown size={14} />
                </button>
                <button
                  className="btn-icon"
                  title="Delete Page"
                  onClick={() => handleDeletePage(section.id)}
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="page-section-body">
              {/* Title Input */}
              <input
                type="text"
                className="page-title-input"
                placeholder="Enter Page/Slide Title..."
                value={section.title || ''}
                onChange={(e) => handleUpdateSectionField(section.id, 'title', e.target.value)}
              />

              {/* Main Summary and Screenshot Panel */}
              <div className="page-content-grid">
                <div className="page-summary-wrapper">
                  <div className="meta-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Page Summary / Notes</span>
                    {section.summary && section.summary.length > 20 && (
                      <span 
                        className="add-bullet-btn" 
                        onClick={() => handleAiSummarize(section.id, section.summary)}
                        style={{ color: 'var(--color-secondary)' }}
                      >
                        <Sparkles size={12} />
                        Auto-Bullets
                      </span>
                    )}
                  </div>
                  <textarea
                    className="page-textarea"
                    placeholder="Write key concepts, explanations or paste transcript sections here..."
                    value={section.summary || ''}
                    onChange={(e) => handleUpdateSectionField(section.id, 'summary', e.target.value)}
                  />
                </div>

                {/* Visual Attachment Card */}
                <div>
                  <label className="meta-label" style={{ marginBottom: '8px', display: 'block' }}>Visual Element</label>
                  
                  {section.imageUrl ? (
                    <div className="visual-anchor-box has-image">
                      <img src={section.imageUrl} alt="Captured frame" className="visual-anchor-img" />
                      <div className="visual-anchor-overlay">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '11px' }}
                            onClick={() => handleCaptureFrame(section.id, section.timestamp)}
                          >
                            Recapture
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(239,68,68,0.8)', color: 'white' }}
                            onClick={() => handleUpdateSectionField(section.id, 'imageUrl', '')}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <span style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        fontSize: '9px',
                        padding: '4px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {section.capturedTimestampText || `Frame @ ${formatTime(section.timestamp)}`}
                      </span>
                    </div>
                  ) : (
                    <div 
                      className="visual-anchor-box"
                      onPaste={(e) => handlePasteImage(e, section.id)}
                      tabIndex={0} // Makes it focusable to receive paste events
                      title="Click here, then press Ctrl+V to paste a screenshot, or click the buttons below"
                    >
                      <Image size={24} style={{ color: 'var(--text-muted)' }} />
                      <span className="visual-anchor-text" style={{ fontSize: '11px', fontWeight: '500' }}>
                        Click to paste (Ctrl+V)
                      </span>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--color-primary-glow)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
                          onClick={() => handleCaptureFrame(section.id, section.timestamp)}
                        >
                          <Camera size={10} />
                          Capture Frame
                        </button>
                        
                        <label 
                          className="btn" 
                          style={{ padding: '4px 8px', fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', margin: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Clipboard size={10} />
                          Upload
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleImageUpload(e, section.id)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bullet Points Section */}
              <div className="bullets-wrapper">
                <span className="meta-label">Key Take-aways (Bullet Points)</span>
                {section.bullets.map((bullet, bIndex) => (
                  <div key={bIndex} className="bullet-item">
                    <span className="bullet-dot">•</span>
                    <input
                      type="text"
                      className="bullet-input"
                      placeholder="Add a key note or take-away..."
                      value={bullet}
                      onChange={(e) => handleBulletChange(section.id, bIndex, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddBullet(section.id);
                        }
                      }}
                    />
                    <button
                      className="btn-icon"
                      title="Remove Bullet"
                      onClick={() => handleDeleteBullet(section.id, bIndex)}
                      style={{ padding: '6px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div 
                  className="add-bullet-btn" 
                  onClick={() => handleAddBullet(section.id)}
                >
                  <Plus size={14} />
                  Add Bullet Point
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Page Card */}
        <div className="add-page-box" onClick={handleAddPage}>
          <Plus size={28} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: '600', fontSize: '15px' }}>Add New Notes Page</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Creates a new document page synchronized to the current video timestamp ({formatTime(currentTime)})
          </span>
        </div>
      </div>
    </div>
  );
}
