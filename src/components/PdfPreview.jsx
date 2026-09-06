import React from 'react';

/**
 * PdfPreview Component
 * Renders the off-screen A4 document structure that is used by the PDF engine
 * to generate pixel-perfect, high-fidelity PDF pages.
 */
export default function PdfPreview({
  meta = {},
  sections = [],
  theme = 'academic', // 'academic' | 'dark' | 'minimalist' | 'creative'
  options = { showCoverPage: true, showPageNumbers: true, showHeader: true }
}) {
  // Helper to format seconds into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const themeClass = `pdf-theme-${theme}`;
  const totalPages = sections.length + (options.showCoverPage ? 1 : 0);

  return (
    <div id="pdf-preview-root" className="pdf-print-workspace">
      {/* 1. Cover Page */}
      {options.showCoverPage && (
        <div id="pdf-page-cover" className={`pdf-page-container ${themeClass}`}>
          <div className="pdf-inner-wrapper pdf-cover-layout">
            <div className="pdf-cover-accent-bar"></div>
            
            <div className="pdf-cover-middle">
              <h1 className="pdf-cover-title">
                {meta.title || 'YouTube Video Notes'}
              </h1>
              {meta.subtitle && (
                <p className="pdf-cover-subtitle">
                  {meta.subtitle}
                </p>
              )}
            </div>

            <div className="pdf-cover-metadata">
              {meta.author && (
                <div className="pdf-meta-item">
                  <span className="pdf-meta-label">Prepared By</span>
                  <span className="pdf-meta-val">{meta.author}</span>
                </div>
              )}
              <div className="pdf-meta-item">
                <span className="pdf-meta-label">Source Video</span>
                <span className="pdf-meta-val" style={{ color: 'var(--color-primary)' }}>
                  youtube.com/watch?v={meta.videoId || 'Video'}
                </span>
              </div>
              <div className="pdf-meta-item">
                <span className="pdf-meta-label">Date</span>
                <span className="pdf-meta-val">{meta.date || new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Content Pages */}
      {sections.map((section, idx) => {
        const pageNum = idx + (options.showCoverPage ? 2 : 1);
        
        return (
          <div 
            key={section.id} 
            id={`pdf-page-${idx}`} 
            className={`pdf-page-container ${themeClass}`}
          >
            <div className="pdf-inner-wrapper">
              {/* Page Header */}
              {options.showHeader && (
                <div className="pdf-page-header">
                  <span>{meta.title || 'YouTube Video Notes'}</span>
                  <span>Section {idx + 1}</span>
                </div>
              )}

              {/* Page Body */}
              <div className="pdf-page-body">
                {/* Title & Timestamp */}
                <div className="pdf-section-title-wrapper">
                  <h2 className="pdf-section-title">
                    {section.title || `Notes Section ${idx + 1}`}
                  </h2>
                  <span className="pdf-section-time">
                    {formatTime(section.timestamp)}
                  </span>
                </div>

                {/* Grid Container for Notes + Image */}
                <div className="pdf-grid-layout" style={{ gridTemplateColumns: section.imageUrl ? '1fr 240px' : '1fr' }}>
                  <div className="pdf-summary-block">
                    <h4 className="pdf-summary-headline">Summary & Explanations</h4>
                    <p className="pdf-summary-text">
                      {section.summary || 'No summary notes written for this section yet. Write notes, explanations or paste transcripts in the workspace.'}
                    </p>
                  </div>

                  {section.imageUrl && (
                    <div className="pdf-visual-container">
                      <img 
                        src={section.imageUrl} 
                        alt="Video slide frame" 
                        className="pdf-visual-image" 
                        crossOrigin="anonymous" // avoids canvas taint
                      />
                    </div>
                  )}
                </div>

                {/* Key Take-aways Block */}
                {section.bullets && section.bullets.length > 0 && section.bullets.some(b => b.trim()) && (
                  <div className="pdf-bullets-block">
                    <h4 className="pdf-bullets-headline">Key Takeaways</h4>
                    <ul className="pdf-bullets-list">
                      {section.bullets.filter(b => b.trim()).map((bullet, bIdx) => (
                        <li key={bIdx} className="pdf-bullet-item">
                          <span className="pdf-bullet-marker">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Page Footer */}
              <div className="pdf-page-footer">
                <span>TubeNotes PDF Compiler</span>
                {options.showPageNumbers && (
                  <span>Page {pageNum} of {totalPages}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
