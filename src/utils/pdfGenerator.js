import { jsPDF } from 'jspdf';

/**
 * Native Vector PDF Generator for YouTube Notes
 * Generates crystal-clear, selectable, searchable vector PDFs
 * with cover page, structured sections, timestamps, bullet points, and dynamic page numbering.
 */

// Helper to format seconds into MM:SS
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds === null) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Convert image URL to Data URL via Image element
const getImageDataUrl = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        console.warn('Could not convert image to data URL for PDF:', err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Generate native vector PDF
 * @param {Object} docMeta - title, subtitle, author, date, videoId, thumbnailUrl
 * @param {Array} sections - array of section objects { id, title, timestamp, summary, bullets, imageUrl }
 * @param {Object} options - { showCoverPage, showPageNumbers, showHeader, theme }
 * @param {Function} onProgress - callback (progressPercent)
 */
export async function generateVectorPdf(docMeta, sections, options = {}, onProgress = () => {}) {
  const {
    showCoverPage = true,
    showPageNumbers = true,
    showHeader = true,
    theme = 'academic'
  } = options;

  // Setup A4 dimensions in mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2; // 170mm
  const marginY = 22;

  // Theme palettes
  const palettes = {
    academic: {
      primary: [26, 75, 140],       // Deep Academic Navy
      secondary: [70, 95, 130],
      dark: [20, 25, 35],
      light: [246, 248, 252],
      border: [215, 222, 235],
      chipBg: [235, 242, 252],
      accent: [225, 112, 85]
    },
    modern: {
      primary: [99, 102, 241],      // Modern Indigo
      secondary: [139, 92, 246],
      dark: [15, 23, 42],
      light: [248, 250, 252],
      border: [226, 232, 240],
      chipBg: [238, 242, 255],
      accent: [244, 63, 94]
    },
    minimalist: {
      primary: [33, 37, 41],        // Pure Charcoal
      secondary: [108, 117, 125],
      dark: [17, 17, 17],
      light: [250, 250, 250],
      border: [222, 226, 230],
      chipBg: [241, 243, 245],
      accent: [0, 0, 0]
    }
  };

  const colors = palettes[theme] || palettes.academic;
  const totalSteps = sections.length + (showCoverPage ? 1 : 0);
  let step = 0;

  // Pre-load thumbnail if available
  let thumbnailData = null;
  if (docMeta.thumbnailUrl) {
    thumbnailData = await getImageDataUrl(docMeta.thumbnailUrl);
  }

  // Helper: Draw Header & Footer on content pages
  const drawHeaderFooter = (pageNo, totalPagesCount) => {
    if (showHeader) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      pdf.text(docMeta.title ? docMeta.title.substring(0, 65) : 'YouTube Video Study Notes', marginX, 14);
      pdf.text(`youtube.com/watch?v=${docMeta.videoId || ''}`, pageWidth - marginX, 14, { align: 'right' });
      
      pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      pdf.setLineWidth(0.25);
      pdf.line(marginX, 17, pageWidth - marginX, 17);
    }

    // Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    pdf.text('TubeNotes Vector Compiler', marginX, pageHeight - 12);

    if (showPageNumbers) {
      pdf.text(`Page ${pageNo} of ${totalPagesCount}`, pageWidth - marginX, pageHeight - 12, { align: 'right' });
    }

    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.setLineWidth(0.25);
    pdf.line(marginX, pageHeight - 16, pageWidth - marginX, pageHeight - 16);
  };

  // ─────────────────────────────────────────────
  // 1. COVER PAGE
  // ─────────────────────────────────────────────
  if (showCoverPage) {
    step++;
    onProgress(Math.round((step / totalSteps) * 100));

    // Top Header Banner
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.rect(0, 0, pageWidth, 12, 'F');

    // Accent strip
    pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    pdf.rect(0, 12, pageWidth, 2.5, 'F');

    // Super-title Badge
    pdf.setFillColor(colors.chipBg[0], colors.chipBg[1], colors.chipBg[2]);
    pdf.roundedRect(marginX, 32, 60, 8, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.text('✦ COMPREHENSIVE STUDY GUIDE', marginX + 4, 37.5);

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    const titleLines = pdf.splitTextToSize(docMeta.title || 'YouTube Lecture & Video Notes', contentWidth);
    let curY = 50;
    pdf.text(titleLines, marginX, curY);
    curY += titleLines.length * 9 + 4;

    // Subtitle
    if (docMeta.subtitle) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
      const subLines = pdf.splitTextToSize(docMeta.subtitle, contentWidth);
      pdf.text(subLines, marginX, curY);
      curY += subLines.length * 6 + 10;
    } else {
      curY += 6;
    }

    // Optional Embedded Video Thumbnail Card
    if (thumbnailData) {
      const thumbWidth = 140;
      const thumbHeight = (thumbWidth * 9) / 16; // 16:9 ratio
      const thumbX = (pageWidth - thumbWidth) / 2;

      // Card shadow/background
      pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
      pdf.roundedRect(thumbX - 2, curY - 2, thumbWidth + 4, thumbHeight + 4, 3, 3, 'F');

      try {
        pdf.addImage(thumbnailData, 'JPEG', thumbX, curY, thumbWidth, thumbHeight);
      } catch (err) {
        console.warn('Failed to embed cover thumbnail:', err);
      }
      curY += thumbHeight + 16;
    } else {
      curY += 20;
    }

    // Metadata Card Grid
    pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(marginX, curY, contentWidth, 36, 3, 3, 'FD');

    // 3 Meta columns
    const colWidth = contentWidth / 3;
    const metaY = curY + 12;

    // Col 1: Prepared By
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    pdf.text('PREPARED BY', marginX + 8, metaY);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    pdf.text((docMeta.author || 'TubeNotes User').substring(0, 24), marginX + 8, metaY + 8);

    // Col 2: Date
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    pdf.text('DATE GENERATED', marginX + colWidth + 8, metaY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    pdf.text(docMeta.date || new Date().toLocaleDateString(), marginX + colWidth + 8, metaY + 8);

    // Col 3: Video Reference
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    pdf.text('SOURCE VIDEO', marginX + colWidth * 2 + 8, metaY);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.text(docMeta.videoId ? `ID: ${docMeta.videoId}` : 'YouTube Video', marginX + colWidth * 2 + 8, metaY + 8);

    // Bottom Decorative Bar
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.rect(0, pageHeight - 6, pageWidth, 6, 'F');
  }

  // ─────────────────────────────────────────────
  // 2. CONTENT PAGES
  // ─────────────────────────────────────────────
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    step++;
    onProgress(Math.round((step / totalSteps) * 100));

    // If cover page exists, first section needs a new page. If no cover page, first section is on page 1.
    if (showCoverPage || i > 0) {
      pdf.addPage();
    }

    let y = marginY + 4;

    // Section Header Chip with Timestamp
    const timeText = formatTime(sec.timestamp);
    const secBadgeText = `SECTION ${i + 1}  •  ${timeText}`;
    pdf.setFillColor(colors.chipBg[0], colors.chipBg[1], colors.chipBg[2]);
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.roundedRect(marginX, y, 46, 7, 2, 2, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.text(secBadgeText, marginX + 4, y + 5);

    y += 12;

    // Section Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    const secTitleLines = pdf.splitTextToSize(sec.title || `Section ${i + 1}`, contentWidth);
    pdf.text(secTitleLines, marginX, y);
    y += secTitleLines.length * 7 + 4;

    // Horizontal Accent Line under title
    pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.setLineWidth(0.8);
    pdf.line(marginX, y, marginX + 35, y);
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.setLineWidth(0.2);
    pdf.line(marginX + 35, y, pageWidth - marginX, y);
    y += 10;

    // Check if section has an embedded screenshot image
    let secImageData = null;
    if (sec.imageUrl) {
      secImageData = await getImageDataUrl(sec.imageUrl);
    }

    // Split Layout or Full Width Layout
    let summaryWidth = contentWidth;
    let imgWidth = 0;
    let imgHeight = 0;

    if (secImageData) {
      imgWidth = 65; // mm
      imgHeight = (imgWidth * 9) / 16;
      summaryWidth = contentWidth - imgWidth - 8; // leave 8mm gap
    }

    // Summary Box Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.text('Summary & Key Explanations', marginX, y);
    y += 6;

    // Summary Text
    const summaryStartY = y;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    const summaryLines = pdf.splitTextToSize(
      sec.summary || 'No detailed notes recorded for this section. Review the video timestamp for details.',
      summaryWidth
    );
    pdf.text(summaryLines, marginX, y);
    const summaryBottom = y + summaryLines.length * 5.2;

    // If image exists, draw it to the right of summary
    if (secImageData) {
      const imgX = pageWidth - marginX - imgWidth;
      pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
      pdf.roundedRect(imgX - 1.5, summaryStartY - 1.5, imgWidth + 3, imgHeight + 3, 2, 2, 'F');
      try {
        pdf.addImage(secImageData, 'JPEG', imgX, summaryStartY, imgWidth, imgHeight);
      } catch (err) {
        console.warn('Failed to embed section slide image:', err);
      }
    }

    // Advance y past both summary and image
    y = Math.max(summaryBottom, secImageData ? summaryStartY + imgHeight : summaryBottom) + 12;

    // 3. Key Takeaways / Bullets Block
    const validBullets = (sec.bullets || []).filter((b) => b && b.trim().length > 0);
    if (validBullets.length > 0) {
      // Bullets container card
      const bulletsStartY = y;
      pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
      pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      pdf.setLineWidth(0.3);

      // We calculate required height first
      let bulletContentHeight = 14; // padding & header
      validBullets.forEach((bullet) => {
        const bLines = pdf.splitTextToSize(bullet, contentWidth - 22);
        bulletContentHeight += bLines.length * 4.8 + 2.5;
      });

      // Avoid overflowing off the page
      if (bulletsStartY + bulletContentHeight > pageHeight - 20) {
        bulletContentHeight = pageHeight - 20 - bulletsStartY;
      }

      pdf.roundedRect(marginX, bulletsStartY, contentWidth, bulletContentHeight, 3, 3, 'FD');

      // Card Header
      let curCardY = bulletsStartY + 8;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.text('KEY TAKEAWAYS & HIGHLIGHTS', marginX + 8, curCardY);

      curCardY += 6;

      // Draw each bullet point with vector circle marker
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);

      validBullets.forEach((bullet) => {
        if (curCardY > pageHeight - 25) return;

        // Vector circle bullet
        pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        pdf.circle(marginX + 10, curCardY - 1, 1.2, 'F');

        const bLines = pdf.splitTextToSize(bullet, contentWidth - 24);
        pdf.text(bLines, marginX + 16, curCardY);
        curCardY += bLines.length * 4.8 + 2.5;
      });
    }
  }

  // ─────────────────────────────────────────────
  // 3. APPLY HEADERS & FOOTERS TO ALL PAGES
  // ─────────────────────────────────────────────
  const totalPagesCount = pdf.getNumberOfPages();
  const startPage = showCoverPage ? 2 : 1;

  for (let p = startPage; p <= totalPagesCount; p++) {
    pdf.setPage(p);
    drawHeaderFooter(p, totalPagesCount);
  }

  // Sanitize filename
  const cleanTitle = (docMeta.title || 'tubenotes')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .substring(0, 40);

  pdf.save(`${cleanTitle}_notes.pdf`);
  return true;
}
