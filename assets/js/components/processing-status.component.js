/**
 * Processing Status Component
 * Displays real-time processing status with progress tracking
 */

class ProcessingStatusComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      showDetails: options.showDetails !== false,
      autoClose: options.autoClose || false,
      autoCloseDelay: options.autoCloseDelay || 3000,
      onStatusChange: options.onStatusChange || null,
      onComplete: options.onComplete || null,
      onError: options.onError || null,
    };

    this.currentJob = null;
    this.statusInterval = null;
    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    if (!this.container) {
      console.error('Processing status container not found');
      return;
    }

    this.render();
  }

  /**
   * Render status UI
   */
  render() {
    this.container.innerHTML = `
      <div class="processing-status-wrapper" id="processing-status-wrapper" style="display: none;">
        <div class="card processing-status-card">
          <div class="card-body">
            <div class="status-header">
              <div class="status-icon-wrapper" id="status-icon">
                <i class="material-icons rotating">hourglass_empty</i>
              </div>
              <div class="status-info">
                <h5 id="status-title">Dokument wird verarbeitet...</h5>
                <p id="status-description">Bitte warten Sie, während Marker den Text extrahiert</p>
              </div>
            </div>

            <div class="progress-section" id="progress-section">
              <div class="progress-bar-container">
                <div class="progress-bar-track">
                  <div class="progress-bar-value" id="progress-bar" style="width: 0%"></div>
                </div>
                <span class="progress-percentage" id="progress-percentage">0%</span>
              </div>
            </div>

            <div class="status-details" id="status-details" style="display: none;">
              <div class="detail-row">
                <span class="detail-label">Job ID:</span>
                <span class="detail-value" id="job-id">-</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Dateiname:</span>
                <span class="detail-value" id="file-name">-</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value" id="job-status">pending</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Startzeit:</span>
                <span class="detail-value" id="start-time">-</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Verstrichene Zeit:</span>
                <span class="detail-value" id="elapsed-time">0s</span>
              </div>
            </div>

            <div class="status-actions" id="status-actions">
              <button class="btn btn-sm btn-outline-secondary" id="toggle-details">
                Details anzeigen
              </button>
              <button class="btn btn-sm btn-danger" id="cancel-button" style="display: none;">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>
        .processing-status-wrapper {
          margin: 20px 0;
        }

        .processing-status-card {
          border-left: 4px solid #1a73e8;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .status-header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }

        .status-icon-wrapper {
          margin-right: 20px;
        }

        .status-icon-wrapper i {
          font-size: 48px;
          color: #1a73e8;
        }

        .status-icon-wrapper i.rotating {
          animation: rotate 2s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .status-info h5 {
          margin: 0 0 8px 0;
          color: #2d3748;
          font-weight: 600;
        }

        .status-info p {
          margin: 0;
          color: #718096;
          font-size: 0.875rem;
        }

        .progress-section {
          margin: 20px 0;
        }

        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .progress-bar-track {
          flex: 1;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-value {
          height: 100%;
          background: linear-gradient(90deg, #1a73e8, #4fc3f7);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-percentage {
          font-weight: 600;
          color: #2d3748;
          min-width: 45px;
          text-align: right;
        }

        .status-details {
          margin: 20px 0;
          padding: 15px;
          background: #f7fafc;
          border-radius: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: 600;
          color: #4a5568;
          font-size: 0.875rem;
        }

        .detail-value {
          color: #2d3748;
          font-size: 0.875rem;
          font-family: 'Courier New', monospace;
        }

        .status-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .status-success .status-icon-wrapper i {
          color: #48bb78;
        }

        .status-error .status-icon-wrapper i {
          color: #f56565;
        }

        .status-success .processing-status-card {
          border-left-color: #48bb78;
        }

        .status-error .processing-status-card {
          border-left-color: #f56565;
        }
      </style>
    `;

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const toggleDetailsBtn = document.getElementById('toggle-details');
    const cancelBtn = document.getElementById('cancel-button');

    if (toggleDetailsBtn) {
      toggleDetailsBtn.addEventListener('click', () => this.toggleDetails());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelJob());
    }
  }

  /**
   * Start tracking job
   */
  startTracking(jobData) {
    this.currentJob = jobData;
    this.show();
    this.updateStatus(jobData);
    this.startTimer();

    // Show cancel button if job is pending or processing
    if (jobData.status === 'pending' || jobData.status === 'processing') {
      document.getElementById('cancel-button').style.display = 'block';
    }
  }

  /**
   * Update status
   */
  updateStatus(data) {
    const statusTitle = document.getElementById('status-title');
    const statusDescription = document.getElementById('status-description');
    const statusIcon = document.getElementById('status-icon');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const jobStatus = document.getElementById('job-status');
    const jobId = document.getElementById('job-id');
    const fileName = document.getElementById('file-name');

    // Update job details
    if (jobId) jobId.textContent = data.id || '-';
    if (fileName) fileName.textContent = data.file_name || '-';
    if (jobStatus) jobStatus.textContent = data.status || 'unknown';

    // Update progress
    const progress = data.progress || 0;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressPercentage) progressPercentage.textContent = `${progress}%`;

    // Update status based on job status
    const wrapper = document.getElementById('processing-status-wrapper');

    switch (data.status) {
      case 'pending':
        statusTitle.textContent = 'Warte in der Warteschlange...';
        statusDescription.textContent = 'Ihr Dokument wird gleich verarbeitet';
        statusIcon.innerHTML = '<i class="material-icons rotating">hourglass_empty</i>';
        wrapper.className = 'processing-status-wrapper';
        break;

      case 'processing':
        statusTitle.textContent = 'Dokument wird verarbeitet...';
        statusDescription.textContent = 'Marker extrahiert Text und erstellt Annotations';
        statusIcon.innerHTML = '<i class="material-icons rotating">auto_fix_high</i>';
        wrapper.className = 'processing-status-wrapper';
        break;

      case 'completed':
        statusTitle.textContent = 'Verarbeitung abgeschlossen!';
        statusDescription.textContent = 'Text wurde erfolgreich extrahiert';
        statusIcon.innerHTML = '<i class="material-icons">check_circle</i>';
        wrapper.className = 'processing-status-wrapper status-success';
        document.getElementById('cancel-button').style.display = 'none';
        this.stopTimer();

        if (this.options.onComplete) {
          this.options.onComplete(data);
        }

        if (this.options.autoClose) {
          setTimeout(() => this.hide(), this.options.autoCloseDelay);
        }
        break;

      case 'failed':
      case 'error':
        statusTitle.textContent = 'Verarbeitung fehlgeschlagen';
        statusDescription.textContent = data.error_message || 'Ein Fehler ist aufgetreten';
        statusIcon.innerHTML = '<i class="material-icons">error</i>';
        wrapper.className = 'processing-status-wrapper status-error';
        document.getElementById('cancel-button').style.display = 'none';
        this.stopTimer();

        if (this.options.onError) {
          this.options.onError(data);
        }
        break;

      case 'cancelled':
        statusTitle.textContent = 'Verarbeitung abgebrochen';
        statusDescription.textContent = 'Der Vorgang wurde vom Benutzer abgebrochen';
        statusIcon.innerHTML = '<i class="material-icons">cancel</i>';
        wrapper.className = 'processing-status-wrapper status-error';
        document.getElementById('cancel-button').style.display = 'none';
        this.stopTimer();
        break;
    }

    if (this.options.onStatusChange) {
      this.options.onStatusChange(data);
    }
  }

  /**
   * Start elapsed time timer
   */
  startTimer() {
    const startTime = Date.now();

    this.statusInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const elapsedTimeEl = document.getElementById('elapsed-time');

      if (elapsedTimeEl) {
        elapsedTimeEl.textContent = this.formatElapsedTime(elapsed);
      }

      const startTimeEl = document.getElementById('start-time');
      if (startTimeEl && startTimeEl.textContent === '-') {
        startTimeEl.textContent = new Date(startTime).toLocaleTimeString();
      }
    }, 1000);
  }

  /**
   * Stop timer
   */
  stopTimer() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  /**
   * Format elapsed time
   */
  formatElapsedTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  /**
   * Toggle details visibility
   */
  toggleDetails() {
    const detailsSection = document.getElementById('status-details');
    const toggleBtn = document.getElementById('toggle-details');

    if (detailsSection.style.display === 'none') {
      detailsSection.style.display = 'block';
      toggleBtn.textContent = 'Details verbergen';
    } else {
      detailsSection.style.display = 'none';
      toggleBtn.textContent = 'Details anzeigen';
    }
  }

  /**
   * Cancel job
   */
  async cancelJob() {
    if (this.currentJob && confirm('Möchten Sie die Verarbeitung wirklich abbrechen?')) {
      try {
        // Implement cancel logic here
        this.updateStatus({
          ...this.currentJob,
          status: 'cancelled'
        });
      } catch (error) {
        console.error('Error cancelling job:', error);
      }
    }
  }

  /**
   * Show status widget
   */
  show() {
    const wrapper = document.getElementById('processing-status-wrapper');
    if (wrapper) {
      wrapper.style.display = 'block';
    }
  }

  /**
   * Hide status widget
   */
  hide() {
    const wrapper = document.getElementById('processing-status-wrapper');
    if (wrapper) {
      wrapper.style.display = 'none';
    }
    this.stopTimer();
  }

  /**
   * Reset component
   */
  reset() {
    this.currentJob = null;
    this.stopTimer();
    this.hide();
  }

  /**
   * Get current job
   */
  getCurrentJob() {
    return this.currentJob;
  }
}

// Export for global use
window.ProcessingStatusComponent = ProcessingStatusComponent;
