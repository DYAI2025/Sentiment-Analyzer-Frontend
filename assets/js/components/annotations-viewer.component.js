/**
 * Annotations Viewer Component
 * Real-time visualization of text annotations with sentiment highlighting
 */

class AnnotationsViewerComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      showSentiment: options.showSentiment !== false,
      showEmotion: options.showEmotion !== false,
      highlightMode: options.highlightMode || 'sentiment', // 'sentiment' | 'emotion' | 'none'
      onAnnotationClick: options.onAnnotationClick || null,
      onAnnotationHover: options.onAnnotationHover || null,
    };

    this.annotations = [];
    this.selectedAnnotation = null;
    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    if (!this.container) {
      console.error('Annotations viewer container not found');
      return;
    }

    this.render();
  }

  /**
   * Render viewer UI
   */
  render() {
    this.container.innerHTML = `
      <div class="annotations-viewer">
        <div class="viewer-header">
          <h5>Text Annotations</h5>
          <div class="viewer-controls">
            <div class="highlight-mode-selector">
              <button class="mode-btn ${this.options.highlightMode === 'sentiment' ? 'active' : ''}"
                      data-mode="sentiment">
                <i class="material-icons">sentiment_satisfied</i>
                Sentiment
              </button>
              <button class="mode-btn ${this.options.highlightMode === 'emotion' ? 'active' : ''}"
                      data-mode="emotion">
                <i class="material-icons">psychology</i>
                Emotion
              </button>
              <button class="mode-btn ${this.options.highlightMode === 'none' ? 'active' : ''}"
                      data-mode="none">
                <i class="material-icons">format_clear</i>
                Aus
              </button>
            </div>
          </div>
        </div>

        <div class="viewer-legend" id="viewer-legend">
          <!-- Legend will be inserted here -->
        </div>

        <div class="annotations-content" id="annotations-content">
          <div class="empty-state">
            <i class="material-icons">description</i>
            <p>Keine Annotations verfügbar</p>
            <small>Laden Sie ein Dokument hoch, um zu beginnen</small>
          </div>
        </div>

        <div class="annotation-details" id="annotation-details" style="display: none;">
          <h6>Annotation Details</h6>
          <div id="annotation-details-content"></div>
        </div>
      </div>

      <style>
        .annotations-viewer {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
        }

        .viewer-header h5 {
          margin: 0;
          color: #2d3748;
          font-weight: 600;
        }

        .viewer-controls {
          display: flex;
          gap: 15px;
          align-items: center;
        }

        .highlight-mode-selector {
          display: flex;
          gap: 8px;
          background: #f7fafc;
          padding: 4px;
          border-radius: 8px;
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #718096;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn:hover {
          background: #e2e8f0;
          color: #2d3748;
        }

        .mode-btn.active {
          background: #1a73e8;
          color: white;
        }

        .mode-btn i {
          font-size: 18px;
        }

        .viewer-legend {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
          padding: 12px;
          background: #f7fafc;
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
        }

        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid #cbd5e0;
        }

        .annotations-content {
          min-height: 300px;
          max-height: 600px;
          overflow-y: auto;
          padding: 15px;
          background: #fafafa;
          border-radius: 8px;
          line-height: 1.8;
          font-size: 1rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #a0aec0;
        }

        .empty-state i {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .empty-state p {
          margin: 8px 0 4px;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .empty-state small {
          font-size: 0.875rem;
        }

        .annotated-text {
          display: inline;
          padding: 2px 4px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .annotated-text:hover {
          opacity: 0.8;
          transform: translateY(-1px);
        }

        .annotated-text.selected {
          box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.3);
        }

        /* Sentiment highlighting */
        .sentiment-positive {
          background: #c6f6d5;
          border-bottom: 2px solid #48bb78;
        }

        .sentiment-neutral {
          background: #e2e8f0;
          border-bottom: 2px solid #a0aec0;
        }

        .sentiment-negative {
          background: #fed7d7;
          border-bottom: 2px solid #f56565;
        }

        /* Emotion highlighting */
        .emotion-joy {
          background: #fef5e7;
          border-bottom: 2px solid #f7dc6f;
        }

        .emotion-sadness {
          background: #ebf5fb;
          border-bottom: 2px solid #5dade2;
        }

        .emotion-anger {
          background: #fadbd8;
          border-bottom: 2px solid #ec7063;
        }

        .emotion-fear {
          background: #f4ecf7;
          border-bottom: 2px solid #af7ac5;
        }

        .emotion-surprise {
          background: #fdebd0;
          border-bottom: 2px solid #f8b739;
        }

        .emotion-neutral {
          background: #f0f0f0;
          border-bottom: 2px solid #bdc3c7;
        }

        .annotation-details {
          margin-top: 20px;
          padding: 20px;
          background: #f7fafc;
          border-radius: 8px;
          border-left: 4px solid #1a73e8;
        }

        .annotation-details h6 {
          margin: 0 0 15px 0;
          color: #2d3748;
          font-weight: 600;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .detail-item {
          background: white;
          padding: 12px;
          border-radius: 6px;
        }

        .detail-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #718096;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .detail-value {
          font-size: 1rem;
          color: #2d3748;
          font-weight: 500;
        }

        .sentiment-score {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .sentiment-bar {
          width: 100px;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .sentiment-bar-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .annotation-text-preview {
          grid-column: 1 / -1;
          background: white;
          padding: 15px;
          border-radius: 6px;
          border-left: 3px solid #1a73e8;
          font-style: italic;
        }
      </style>
    `;

    this.attachEventListeners();
    this.updateLegend();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const modeBtns = this.container.querySelectorAll('.mode-btn');

    modeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.dataset.mode;
        this.setHighlightMode(mode);
      });
    });
  }

  /**
   * Set highlight mode
   */
  setHighlightMode(mode) {
    this.options.highlightMode = mode;

    // Update button states
    const modeBtns = this.container.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    this.updateLegend();
    this.renderAnnotations();
  }

  /**
   * Update legend
   */
  updateLegend() {
    const legend = document.getElementById('viewer-legend');

    if (this.options.highlightMode === 'sentiment') {
      legend.innerHTML = `
        <div class="legend-item">
          <div class="legend-color sentiment-positive"></div>
          <span>Positiv</span>
        </div>
        <div class="legend-item">
          <div class="legend-color sentiment-neutral"></div>
          <span>Neutral</span>
        </div>
        <div class="legend-item">
          <div class="legend-color sentiment-negative"></div>
          <span>Negativ</span>
        </div>
      `;
      legend.style.display = 'flex';
    } else if (this.options.highlightMode === 'emotion') {
      legend.innerHTML = `
        <div class="legend-item">
          <div class="legend-color emotion-joy"></div>
          <span>Freude</span>
        </div>
        <div class="legend-item">
          <div class="legend-color emotion-sadness"></div>
          <span>Trauer</span>
        </div>
        <div class="legend-item">
          <div class="legend-color emotion-anger"></div>
          <span>Ärger</span>
        </div>
        <div class="legend-item">
          <div class="legend-color emotion-fear"></div>
          <span>Angst</span>
        </div>
        <div class="legend-item">
          <div class="legend-color emotion-surprise"></div>
          <span>Überraschung</span>
        </div>
      `;
      legend.style.display = 'flex';
    } else {
      legend.style.display = 'none';
    }
  }

  /**
   * Load annotations
   */
  loadAnnotations(annotations) {
    this.annotations = annotations || [];
    this.renderAnnotations();
  }

  /**
   * Add annotation in real-time
   */
  addAnnotation(annotation) {
    this.annotations.push(annotation);
    this.renderAnnotations();
  }

  /**
   * Update annotation
   */
  updateAnnotation(annotationId, updates) {
    const index = this.annotations.findIndex(a => a.id === annotationId);
    if (index !== -1) {
      this.annotations[index] = { ...this.annotations[index], ...updates };
      this.renderAnnotations();
    }
  }

  /**
   * Render annotations
   */
  renderAnnotations() {
    const content = document.getElementById('annotations-content');

    if (!this.annotations || this.annotations.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <i class="material-icons">description</i>
          <p>Keine Annotations verfügbar</p>
          <small>Laden Sie ein Dokument hoch, um zu beginnen</small>
        </div>
      `;
      return;
    }

    // Sort annotations by position
    const sortedAnnotations = [...this.annotations].sort((a, b) => a.position - b.position);

    // Render annotated text
    let html = '';
    sortedAnnotations.forEach((annotation, index) => {
      const highlightClass = this.getHighlightClass(annotation);

      html += `<span
        class="annotated-text ${highlightClass}"
        data-annotation-id="${annotation.id}"
        data-index="${index}"
        onclick="annotationsViewer.selectAnnotation(${index})"
      >${annotation.text}</span> `;
    });

    content.innerHTML = html;
  }

  /**
   * Get highlight class based on mode
   */
  getHighlightClass(annotation) {
    if (this.options.highlightMode === 'sentiment') {
      const score = annotation.sentiment_score || 0;
      if (score > 0.3) return 'sentiment-positive';
      if (score < -0.3) return 'sentiment-negative';
      return 'sentiment-neutral';
    } else if (this.options.highlightMode === 'emotion') {
      const emotion = annotation.emotion || 'neutral';
      return `emotion-${emotion.toLowerCase()}`;
    }
    return '';
  }

  /**
   * Select annotation
   */
  selectAnnotation(index) {
    const annotation = this.annotations[index];
    this.selectedAnnotation = annotation;

    // Update visual selection
    const annotatedTexts = this.container.querySelectorAll('.annotated-text');
    annotatedTexts.forEach((el, i) => {
      el.classList.toggle('selected', i === index);
    });

    this.showAnnotationDetails(annotation);

    if (this.options.onAnnotationClick) {
      this.options.onAnnotationClick(annotation);
    }
  }

  /**
   * Show annotation details
   */
  showAnnotationDetails(annotation) {
    const detailsSection = document.getElementById('annotation-details');
    const detailsContent = document.getElementById('annotation-details-content');

    const sentimentScore = annotation.sentiment_score || 0;
    const sentimentColor = sentimentScore > 0 ? '#48bb78' : sentimentScore < 0 ? '#f56565' : '#a0aec0';

    detailsContent.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item annotation-text-preview">
          <div class="detail-label">Text</div>
          <div class="detail-value">"${annotation.text}"</div>
        </div>

        <div class="detail-item">
          <div class="detail-label">Sentiment Score</div>
          <div class="detail-value">
            <div class="sentiment-score">
              <span>${sentimentScore.toFixed(2)}</span>
              <div class="sentiment-bar">
                <div class="sentiment-bar-fill"
                     style="width: ${Math.abs(sentimentScore) * 100}%; background: ${sentimentColor};">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-item">
          <div class="detail-label">Emotion</div>
          <div class="detail-value">${annotation.emotion || 'N/A'}</div>
        </div>

        <div class="detail-item">
          <div class="detail-label">Position</div>
          <div class="detail-value">${annotation.position}</div>
        </div>

        <div class="detail-item">
          <div class="detail-label">Länge</div>
          <div class="detail-value">${annotation.text.length} Zeichen</div>
        </div>
      </div>
    `;

    detailsSection.style.display = 'block';
  }

  /**
   * Clear annotations
   */
  clear() {
    this.annotations = [];
    this.selectedAnnotation = null;
    this.renderAnnotations();
    document.getElementById('annotation-details').style.display = 'none';
  }

  /**
   * Get annotations
   */
  getAnnotations() {
    return this.annotations;
  }

  /**
   * Get selected annotation
   */
  getSelectedAnnotation() {
    return this.selectedAnnotation;
  }
}

// Export for global use
window.AnnotationsViewerComponent = AnnotationsViewerComponent;
