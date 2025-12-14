/**
 * Document Upload Component
 * Handles file upload with drag & drop, progress tracking, and file validation
 */

class DocumentUploadComponent {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB default
      allowedTypes: options.allowedTypes || ['pdf', 'docx', 'doc', 'txt', 'md'],
      multiple: options.multiple || false,
      onFileSelect: options.onFileSelect || null,
      onUploadStart: options.onUploadStart || null,
      onUploadProgress: options.onUploadProgress || null,
      onUploadComplete: options.onUploadComplete || null,
      onUploadError: options.onUploadError || null,
    };

    this.selectedFiles = [];
    this.uploadQueue = [];
    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    if (!this.container) {
      console.error('Upload container not found');
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render upload UI
   */
  render() {
    this.container.innerHTML = `
      <div class="document-upload-wrapper">
        <div class="upload-area" id="upload-area">
          <div class="upload-icon">
            <i class="material-icons" style="font-size: 64px; color: #1a73e8;">cloud_upload</i>
          </div>
          <h4 class="upload-title">Dokument hochladen</h4>
          <p class="upload-description">
            Ziehen Sie Ihre Datei hierher oder klicken Sie zum Auswählen
          </p>
          <p class="upload-formats">
            Unterstützte Formate: ${this.options.allowedTypes.join(', ').toUpperCase()}
          </p>
          <p class="upload-size-limit">
            Maximale Dateigröße: ${this.formatBytes(this.options.maxFileSize)}
          </p>
          <input
            type="file"
            id="file-input"
            ${this.options.multiple ? 'multiple' : ''}
            accept="${this.getAcceptString()}"
            style="display: none;"
          />
          <button class="btn btn-primary mt-3" id="browse-button">
            <i class="material-icons">folder_open</i>
            Datei auswählen
          </button>
        </div>

        <div class="upload-queue" id="upload-queue" style="display: none;">
          <h5>Ausgewählte Dateien</h5>
          <div id="file-list"></div>
        </div>

        <div class="upload-actions" id="upload-actions" style="display: none; margin-top: 20px;">
          <button class="btn btn-success" id="start-upload-button">
            <i class="material-icons">upload</i>
            Upload starten
          </button>
          <button class="btn btn-secondary ms-2" id="clear-button">
            <i class="material-icons">clear</i>
            Zurücksetzen
          </button>
        </div>
      </div>

      <style>
        .document-upload-wrapper {
          width: 100%;
        }

        .upload-area {
          border: 3px dashed #cbd5e0;
          border-radius: 12px;
          padding: 60px 40px;
          text-align: center;
          background: #f7fafc;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .upload-area:hover {
          border-color: #1a73e8;
          background: #e3f2fd;
        }

        .upload-area.drag-over {
          border-color: #1a73e8;
          background: #bbdefb;
          transform: scale(1.02);
        }

        .upload-icon {
          margin-bottom: 20px;
        }

        .upload-title {
          color: #2d3748;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .upload-description {
          color: #4a5568;
          margin-bottom: 8px;
        }

        .upload-formats, .upload-size-limit {
          color: #718096;
          font-size: 0.875rem;
          margin: 4px 0;
        }

        .upload-queue {
          margin-top: 30px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px;
          margin: 10px 0;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #1a73e8;
        }

        .file-info {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .file-icon {
          margin-right: 15px;
          color: #1a73e8;
        }

        .file-details h6 {
          margin: 0 0 4px 0;
          font-weight: 600;
          color: #2d3748;
        }

        .file-details p {
          margin: 0;
          font-size: 0.875rem;
          color: #718096;
        }

        .file-actions button {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #e53e3e;
          padding: 8px;
        }

        .file-actions button:hover {
          color: #c53030;
        }

        .progress-bar-wrapper {
          margin-top: 8px;
          width: 100%;
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #1a73e8;
          transition: width 0.3s ease;
        }
      </style>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.getElementById('browse-button');
    const startUploadButton = document.getElementById('start-upload-button');
    const clearButton = document.getElementById('clear-button');

    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

    // Click to browse
    uploadArea.addEventListener('click', () => fileInput.click());
    browseButton.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // Upload actions
    if (startUploadButton) {
      startUploadButton.addEventListener('click', () => this.startUpload());
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearFiles());
    }
  }

  /**
   * Handle drag over
   */
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('upload-area').classList.add('drag-over');
  }

  /**
   * Handle drag leave
   */
  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('upload-area').classList.remove('drag-over');
  }

  /**
   * Handle file drop
   */
  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('upload-area').classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    this.addFiles(files);
  }

  /**
   * Handle file select from input
   */
  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.addFiles(files);
  }

  /**
   * Add files to queue
   */
  addFiles(files) {
    const validFiles = files.filter(file => this.validateFile(file));

    if (validFiles.length === 0) {
      this.showNotification('Keine gültigen Dateien ausgewählt', 'error');
      return;
    }

    if (!this.options.multiple) {
      this.selectedFiles = [validFiles[0]];
    } else {
      this.selectedFiles.push(...validFiles);
    }

    this.renderFileList();
    this.showUploadActions();

    if (this.options.onFileSelect) {
      this.options.onFileSelect(this.selectedFiles);
    }
  }

  /**
   * Validate file
   */
  validateFile(file) {
    const fileExt = file.name.split('.').pop().toLowerCase();

    // Check file type
    if (!this.options.allowedTypes.includes(fileExt)) {
      this.showNotification(
        `Dateityp ${fileExt} wird nicht unterstützt`,
        'error'
      );
      return false;
    }

    // Check file size
    if (file.size > this.options.maxFileSize) {
      this.showNotification(
        `Datei ${file.name} ist zu groß (max. ${this.formatBytes(this.options.maxFileSize)})`,
        'error'
      );
      return false;
    }

    return true;
  }

  /**
   * Render file list
   */
  renderFileList() {
    const fileList = document.getElementById('file-list');
    const uploadQueue = document.getElementById('upload-queue');

    if (this.selectedFiles.length === 0) {
      uploadQueue.style.display = 'none';
      return;
    }

    uploadQueue.style.display = 'block';
    fileList.innerHTML = this.selectedFiles.map((file, index) => `
      <div class="file-item" id="file-${index}">
        <div class="file-info">
          <i class="material-icons file-icon">insert_drive_file</i>
          <div class="file-details">
            <h6>${file.name}</h6>
            <p>${this.formatBytes(file.size)} • ${file.type || 'Unknown type'}</p>
          </div>
        </div>
        <div class="file-actions">
          <button onclick="documentUpload.removeFile(${index})">
            <i class="material-icons">delete</i>
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Show upload actions
   */
  showUploadActions() {
    const uploadActions = document.getElementById('upload-actions');
    if (uploadActions && this.selectedFiles.length > 0) {
      uploadActions.style.display = 'block';
    }
  }

  /**
   * Remove file from queue
   */
  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.renderFileList();

    if (this.selectedFiles.length === 0) {
      this.hideUploadActions();
    }
  }

  /**
   * Hide upload actions
   */
  hideUploadActions() {
    const uploadActions = document.getElementById('upload-actions');
    if (uploadActions) {
      uploadActions.style.display = 'none';
    }
  }

  /**
   * Clear all files
   */
  clearFiles() {
    this.selectedFiles = [];
    this.renderFileList();
    this.hideUploadActions();
    document.getElementById('file-input').value = '';
  }

  /**
   * Start upload
   */
  async startUpload() {
    if (this.selectedFiles.length === 0) {
      this.showNotification('Keine Dateien ausgewählt', 'warning');
      return;
    }

    if (this.options.onUploadStart) {
      this.options.onUploadStart(this.selectedFiles);
    }

    for (let i = 0; i < this.selectedFiles.length; i++) {
      await this.uploadFile(this.selectedFiles[i], i);
    }
  }

  /**
   * Upload single file
   */
  async uploadFile(file, index) {
    try {
      const fileItem = document.getElementById(`file-${index}`);

      // Add progress bar
      const progressHtml = `
        <div class="progress-bar-wrapper">
          <div class="progress-bar-fill" id="progress-${index}" style="width: 0%"></div>
        </div>
      `;
      fileItem.querySelector('.file-details').insertAdjacentHTML('beforeend', progressHtml);

      // Simulate progress (replace with actual upload logic)
      if (this.options.onUploadProgress) {
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          document.getElementById(`progress-${index}`).style.width = `${progress}%`;
          this.options.onUploadProgress(file, progress);
        }
      }

      if (this.options.onUploadComplete) {
        this.options.onUploadComplete(file, index);
      }

    } catch (error) {
      console.error('Upload error:', error);
      if (this.options.onUploadError) {
        this.options.onUploadError(file, error);
      }
    }
  }

  /**
   * Get accepted file types string
   */
  getAcceptString() {
    return this.options.allowedTypes.map(type => `.${type}`).join(',');
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Use Material Dashboard notification system if available
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Get selected files
   */
  getSelectedFiles() {
    return this.selectedFiles;
  }

  /**
   * Reset component
   */
  reset() {
    this.clearFiles();
    this.render();
    this.attachEventListeners();
  }
}

// Export for global use
window.DocumentUploadComponent = DocumentUploadComponent;
