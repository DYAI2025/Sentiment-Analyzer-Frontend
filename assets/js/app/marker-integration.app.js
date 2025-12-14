/**
 * Marker Integration App
 * Main application orchestrator for Marker Engine + Sentiment Analysis
 */

class MarkerIntegrationApp {
  constructor() {
    this.supabaseClient = null;
    this.markerService = null;
    this.realtimeService = null;
    this.uploadComponent = null;
    this.statusComponent = null;
    this.annotationsViewer = null;
    this.currentJobId = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('Initializing Marker Integration App...');

      // Initialize Supabase client
      this.supabaseClient = window.SupabaseConfig?.getClient();

      if (!this.supabaseClient) {
        throw new Error('Supabase client not initialized. Check configuration.');
      }

      // Initialize services
      this.markerService = new MarkerEngineService(this.supabaseClient);
      this.realtimeService = new RealtimeAnnotationsService(this.supabaseClient);

      // Initialize UI components
      this.initializeComponents();

      this.isInitialized = true;
      console.log('✓ Marker Integration App initialized successfully');

      // Show success notification
      this.showNotification('System bereit für Dokumentenverarbeitung', 'success');

    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showNotification('Fehler bei der Initialisierung: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * Initialize UI components
   */
  initializeComponents() {
    // Document Upload Component
    this.uploadComponent = new DocumentUploadComponent('document-upload-container', {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['pdf', 'docx', 'doc', 'txt', 'md', 'html'],
      multiple: false,
      onFileSelect: (files) => this.handleFileSelection(files),
      onUploadStart: (files) => this.handleUploadStart(files),
      onUploadComplete: (file, index) => this.handleUploadComplete(file, index),
      onUploadError: (file, error) => this.handleUploadError(file, error),
    });

    // Processing Status Component
    this.statusComponent = new ProcessingStatusComponent('processing-status-container', {
      showDetails: true,
      autoClose: false,
      onStatusChange: (data) => this.handleStatusChange(data),
      onComplete: (data) => this.handleProcessingComplete(data),
      onError: (data) => this.handleProcessingError(data),
    });

    // Annotations Viewer Component
    this.annotationsViewer = new AnnotationsViewerComponent('annotations-viewer-container', {
      showSentiment: true,
      showEmotion: true,
      highlightMode: 'sentiment',
      onAnnotationClick: (annotation) => this.handleAnnotationClick(annotation),
    });

    console.log('✓ UI components initialized');
  }

  /**
   * Handle file selection
   */
  handleFileSelection(files) {
    console.log('Files selected:', files);
    this.showNotification(`${files.length} Datei(en) ausgewählt`, 'info');
  }

  /**
   * Handle upload start
   */
  async handleUploadStart(files) {
    try {
      console.log('Starting upload for files:', files);

      for (const file of files) {
        await this.processDocument(file);
      }

    } catch (error) {
      console.error('Upload start error:', error);
      this.showNotification('Fehler beim Upload-Start: ' + error.message, 'error');
    }
  }

  /**
   * Process document with Marker Engine
   */
  async processDocument(file) {
    try {
      this.showNotification('Starte Dokumentenverarbeitung...', 'info');

      // Upload file and create processing job
      const jobData = await this.markerService.uploadAndProcess(file, {
        extract_images: true,
        extract_tables: true,
        generate_markdown: true,
        analyze_sentiment: true,
      });

      this.currentJobId = jobData.id;

      // Start tracking processing status
      this.statusComponent.startTracking(jobData);

      // Subscribe to real-time updates
      await this.subscribeToJobUpdates(jobData.id);

      console.log('Document processing started:', jobData);
      this.showNotification('Dokument wird verarbeitet...', 'info');

    } catch (error) {
      console.error('Error processing document:', error);
      this.showNotification('Fehler bei der Verarbeitung: ' + error.message, 'error');
      throw error;
    }
  }

  /**
   * Subscribe to real-time job updates
   */
  async subscribeToJobUpdates(jobId) {
    try {
      await this.realtimeService.subscribeToJob(jobId, {
        onStatusChange: (event) => {
          console.log('Job status changed:', event);
          this.statusComponent.updateStatus(event.data);
        },

        onProgressUpdate: (event) => {
          console.log('Progress update:', event);
          this.statusComponent.updateStatus(event.data);
        },

        onJobUpdate: (event) => {
          console.log('Job updated:', event);
          this.handleJobUpdate(event);
        },

        onAnnotationAdded: (event) => {
          console.log('New annotation:', event);
          this.handleNewAnnotation(event.annotation);
        },

        onAnnotationUpdate: (event) => {
          console.log('Annotation updated:', event);
          this.handleAnnotationUpdate(event);
        },

        onConnectionChange: (connected) => {
          console.log('Realtime connection:', connected ? 'Connected' : 'Disconnected');
          this.showNotification(
            connected ? 'Echtzeit-Verbindung hergestellt' : 'Echtzeit-Verbindung getrennt',
            connected ? 'success' : 'warning'
          );
        },
      });

      console.log('✓ Subscribed to real-time updates for job:', jobId);

    } catch (error) {
      console.error('Error subscribing to job updates:', error);
      this.showNotification('Fehler bei Echtzeit-Updates: ' + error.message, 'warning');
    }
  }

  /**
   * Handle job update
   */
  async handleJobUpdate(event) {
    const { data, eventType } = event;

    if (data.status === 'completed') {
      // Load annotations when job is complete
      await this.loadAnnotations(data.id);
    }
  }

  /**
   * Handle new annotation (real-time)
   */
  handleNewAnnotation(annotation) {
    console.log('Adding new annotation in real-time:', annotation);
    this.annotationsViewer.addAnnotation(annotation);
    this.showNotification('Neue Annotation hinzugefügt', 'info');
  }

  /**
   * Handle annotation update
   */
  handleAnnotationUpdate(event) {
    if (event.type === 'update') {
      this.annotationsViewer.updateAnnotation(event.annotation.id, event.annotation);
    }
  }

  /**
   * Load annotations for completed job
   */
  async loadAnnotations(jobId) {
    try {
      const annotations = await this.markerService.getAnnotations(jobId);
      console.log('Loaded annotations:', annotations);

      this.annotationsViewer.loadAnnotations(annotations);
      this.showNotification(`${annotations.length} Annotations geladen`, 'success');

    } catch (error) {
      console.error('Error loading annotations:', error);
      this.showNotification('Fehler beim Laden der Annotations: ' + error.message, 'error');
    }
  }

  /**
   * Handle upload complete
   */
  handleUploadComplete(file, index) {
    console.log('Upload complete:', file, index);
  }

  /**
   * Handle upload error
   */
  handleUploadError(file, error) {
    console.error('Upload error:', file, error);
    this.showNotification(`Fehler beim Upload von ${file.name}: ${error.message}`, 'error');
  }

  /**
   * Handle status change
   */
  handleStatusChange(data) {
    console.log('Status changed:', data);

    // Update UI based on status
    switch (data.status) {
      case 'processing':
        this.showNotification('Marker Engine verarbeitet Ihr Dokument...', 'info');
        break;

      case 'completed':
        this.showNotification('Verarbeitung erfolgreich abgeschlossen!', 'success');
        break;

      case 'failed':
      case 'error':
        this.showNotification('Verarbeitung fehlgeschlagen', 'error');
        break;
    }
  }

  /**
   * Handle processing complete
   */
  async handleProcessingComplete(data) {
    console.log('Processing complete:', data);

    try {
      // Get extracted text
      const extractedText = await this.markerService.getExtractedText(data.id);
      console.log('Extracted text:', extractedText);

      // Trigger sentiment analysis
      if (extractedText) {
        await this.analyzeSentiment(data.id, extractedText);
      }

      // Load annotations
      await this.loadAnnotations(data.id);

      this.showNotification('Text erfolgreich extrahiert und analysiert!', 'success');

    } catch (error) {
      console.error('Error in post-processing:', error);
      this.showNotification('Fehler bei der Nachbearbeitung: ' + error.message, 'error');
    }
  }

  /**
   * Analyze sentiment of extracted text
   */
  async analyzeSentiment(jobId, text) {
    try {
      console.log('Starting sentiment analysis...');

      const analysisResult = await this.markerService.analyzeSentiment(jobId, text);
      console.log('Sentiment analysis result:', analysisResult);

      this.showNotification('Sentiment-Analyse gestartet', 'info');
      return analysisResult;

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      this.showNotification('Fehler bei Sentiment-Analyse: ' + error.message, 'warning');
      throw error;
    }
  }

  /**
   * Handle processing error
   */
  handleProcessingError(data) {
    console.error('Processing error:', data);
    this.showNotification('Verarbeitungsfehler: ' + (data.error_message || 'Unbekannter Fehler'), 'error');
  }

  /**
   * Handle annotation click
   */
  handleAnnotationClick(annotation) {
    console.log('Annotation clicked:', annotation);
  }

  /**
   * Get user job history
   */
  async loadJobHistory(userId, limit = 20) {
    try {
      const history = await this.markerService.getUserJobHistory(userId, limit);
      console.log('Job history:', history);
      return history;

    } catch (error) {
      console.error('Error loading job history:', error);
      this.showNotification('Fehler beim Laden der Historie: ' + error.message, 'error');
      return [];
    }
  }

  /**
   * Cancel current job
   */
  async cancelCurrentJob() {
    if (!this.currentJobId) {
      this.showNotification('Kein aktiver Job zum Abbrechen', 'warning');
      return;
    }

    try {
      await this.markerService.cancelJob(this.currentJobId);
      this.showNotification('Job erfolgreich abgebrochen', 'info');

      // Unsubscribe from updates
      await this.realtimeService.unsubscribeFromJob(this.currentJobId);

      this.currentJobId = null;

    } catch (error) {
      console.error('Error cancelling job:', error);
      this.showNotification('Fehler beim Abbrechen: ' + error.message, 'error');
    }
  }

  /**
   * Reset application state
   */
  reset() {
    this.uploadComponent?.reset();
    this.statusComponent?.reset();
    this.annotationsViewer?.clear();
    this.currentJobId = null;
    console.log('✓ Application reset');
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    try {
      await this.realtimeService?.unsubscribeAll();
      this.markerService?.clearCache();
      console.log('✓ Cleanup complete');

    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    // If Bootstrap notify is available
    if (typeof $.notify === 'function') {
      const iconMap = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info',
      };

      $.notify({
        icon: iconMap[type] || 'notifications',
        message: message
      }, {
        type: type,
        timer: 4000,
        placement: {
          from: 'top',
          align: 'right'
        }
      });
    }
  }

  /**
   * Check if app is initialized
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Get current job ID
   */
  getCurrentJobId() {
    return this.currentJobId;
  }
}

// Create global app instance
window.markerApp = new MarkerIntegrationApp();

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Auto-initialize if containers exist
    if (document.getElementById('document-upload-container')) {
      window.markerApp.init().catch(console.error);
    }
  });
} else {
  // DOM already loaded
  if (document.getElementById('document-upload-container')) {
    window.markerApp.init().catch(console.error);
  }
}

// Export for use in other modules
window.MarkerIntegrationApp = MarkerIntegrationApp;
