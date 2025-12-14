/**
 * Marker Engine Service
 * Handles document processing, text extraction, and annotation management
 */

class MarkerEngineService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.processingQueue = new Map();
    this.annotationCache = new Map();
  }

  /**
   * Upload document and trigger Marker Engine processing
   * @param {File} file - Document file (PDF, DOCX, etc.)
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing job details
   */
  async uploadAndProcess(file, options = {}) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `documents/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase
        .storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Create processing job in database
      const { data: jobData, error: jobError } = await this.supabase
        .from('marker_jobs')
        .insert({
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: fileExt,
          status: 'pending',
          options: options,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Add to processing queue
      this.processingQueue.set(jobData.id, {
        status: 'pending',
        progress: 0,
        startTime: Date.now()
      });

      console.log('Document uploaded successfully:', jobData);
      return jobData;

    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Get processing status for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId) {
    try {
      const { data, error } = await this.supabase
        .from('marker_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error fetching job status:', error);
      throw error;
    }
  }

  /**
   * Get extracted text from completed job
   * @param {string} jobId - Job ID
   * @returns {Promise<string>} Extracted text
   */
  async getExtractedText(jobId) {
    try {
      const { data, error } = await this.supabase
        .from('marker_jobs')
        .select('extracted_text, markdown_output')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data.extracted_text || data.markdown_output || '';

    } catch (error) {
      console.error('Error fetching extracted text:', error);
      throw error;
    }
  }

  /**
   * Get annotations for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Annotations
   */
  async getAnnotations(jobId) {
    try {
      // Check cache first
      if (this.annotationCache.has(jobId)) {
        return this.annotationCache.get(jobId);
      }

      const { data, error } = await this.supabase
        .from('text_annotations')
        .select('*')
        .eq('job_id', jobId)
        .order('position', { ascending: true });

      if (error) throw error;

      // Cache the results
      this.annotationCache.set(jobId, data);
      return data;

    } catch (error) {
      console.error('Error fetching annotations:', error);
      throw error;
    }
  }

  /**
   * Create new annotation
   * @param {Object} annotation - Annotation data
   * @returns {Promise<Object>} Created annotation
   */
  async createAnnotation(annotation) {
    try {
      const { data, error } = await this.supabase
        .from('text_annotations')
        .insert({
          job_id: annotation.jobId,
          text: annotation.text,
          position: annotation.position,
          sentiment_score: annotation.sentimentScore,
          emotion: annotation.emotion,
          metadata: annotation.metadata || {},
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Clear cache for this job
      this.annotationCache.delete(annotation.jobId);

      return data;

    } catch (error) {
      console.error('Error creating annotation:', error);
      throw error;
    }
  }

  /**
   * Trigger sentiment analysis on extracted text
   * @param {string} jobId - Job ID
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeSentiment(jobId, text) {
    try {
      const { data, error } = await this.supabase
        .from('sentiment_analysis')
        .insert({
          job_id: jobId,
          text: text,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error triggering sentiment analysis:', error);
      throw error;
    }
  }

  /**
   * Get user's job history
   * @param {string} userId - User ID
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Job history
   */
  async getUserJobHistory(userId, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('marker_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error fetching job history:', error);
      throw error;
    }
  }

  /**
   * Cancel processing job
   * @param {string} jobId - Job ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelJob(jobId) {
    try {
      const { error } = await this.supabase
        .from('marker_jobs')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      this.processingQueue.delete(jobId);
      return true;

    } catch (error) {
      console.error('Error cancelling job:', error);
      throw error;
    }
  }

  /**
   * Clear annotation cache
   */
  clearCache() {
    this.annotationCache.clear();
    console.log('Annotation cache cleared');
  }
}

// Export for global use
window.MarkerEngineService = MarkerEngineService;
