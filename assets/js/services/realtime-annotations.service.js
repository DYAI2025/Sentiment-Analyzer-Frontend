/**
 * Realtime Annotations Service
 * Manages real-time updates for text annotations using Supabase Realtime
 */

class RealtimeAnnotationsService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.subscriptions = new Map();
    this.eventHandlers = new Map();
    this.isConnected = false;
  }

  /**
   * Subscribe to realtime updates for a specific job
   * @param {string} jobId - Job ID to subscribe to
   * @param {Object} handlers - Event handlers
   * @returns {Promise<Object>} Subscription object
   */
  async subscribeToJob(jobId, handlers = {}) {
    try {
      // Unsubscribe if already subscribed
      if (this.subscriptions.has(jobId)) {
        await this.unsubscribeFromJob(jobId);
      }

      const channel = this.supabase
        .channel(`job-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'marker_jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => this.handleJobUpdate(jobId, payload, handlers)
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'text_annotations',
            filter: `job_id=eq.${jobId}`
          },
          (payload) => this.handleAnnotationInsert(jobId, payload, handlers)
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'text_annotations',
            filter: `job_id=eq.${jobId}`
          },
          (payload) => this.handleAnnotationUpdate(jobId, payload, handlers)
        )
        .subscribe((status) => {
          console.log(`Subscription status for job ${jobId}:`, status);
          this.isConnected = status === 'SUBSCRIBED';

          if (handlers.onConnectionChange) {
            handlers.onConnectionChange(this.isConnected);
          }
        });

      this.subscriptions.set(jobId, channel);
      this.eventHandlers.set(jobId, handlers);

      console.log(`Subscribed to realtime updates for job: ${jobId}`);
      return channel;

    } catch (error) {
      console.error('Error subscribing to job:', error);
      throw error;
    }
  }

  /**
   * Handle job status updates
   * @private
   */
  handleJobUpdate(jobId, payload, handlers) {
    console.log('Job update received:', payload);

    const { new: newData, old: oldData, eventType } = payload;

    // Trigger onStatusChange if status changed
    if (newData.status !== oldData?.status && handlers.onStatusChange) {
      handlers.onStatusChange({
        jobId,
        oldStatus: oldData?.status,
        newStatus: newData.status,
        data: newData
      });
    }

    // Trigger onProgressUpdate if progress changed
    if (newData.progress !== oldData?.progress && handlers.onProgressUpdate) {
      handlers.onProgressUpdate({
        jobId,
        progress: newData.progress,
        data: newData
      });
    }

    // Trigger generic update handler
    if (handlers.onJobUpdate) {
      handlers.onJobUpdate({
        jobId,
        eventType,
        data: newData,
        oldData
      });
    }
  }

  /**
   * Handle new annotation insertions
   * @private
   */
  handleAnnotationInsert(jobId, payload, handlers) {
    console.log('New annotation received:', payload);

    if (handlers.onAnnotationAdded) {
      handlers.onAnnotationAdded({
        jobId,
        annotation: payload.new
      });
    }

    // Trigger generic annotation handler
    if (handlers.onAnnotationUpdate) {
      handlers.onAnnotationUpdate({
        jobId,
        type: 'insert',
        annotation: payload.new
      });
    }
  }

  /**
   * Handle annotation updates
   * @private
   */
  handleAnnotationUpdate(jobId, payload, handlers) {
    console.log('Annotation updated:', payload);

    if (handlers.onAnnotationModified) {
      handlers.onAnnotationModified({
        jobId,
        annotation: payload.new,
        oldAnnotation: payload.old
      });
    }

    // Trigger generic annotation handler
    if (handlers.onAnnotationUpdate) {
      handlers.onAnnotationUpdate({
        jobId,
        type: 'update',
        annotation: payload.new,
        oldAnnotation: payload.old
      });
    }
  }

  /**
   * Subscribe to all annotations (global)
   * @param {Object} handlers - Event handlers
   * @returns {Promise<Object>} Subscription object
   */
  async subscribeToAllAnnotations(handlers = {}) {
    try {
      const channelName = 'annotations-global';

      if (this.subscriptions.has(channelName)) {
        await this.unsubscribeFromJob(channelName);
      }

      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'text_annotations'
          },
          (payload) => {
            if (handlers.onGlobalAnnotationUpdate) {
              handlers.onGlobalAnnotationUpdate(payload);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Global annotations subscription status:`, status);
        });

      this.subscriptions.set(channelName, channel);
      return channel;

    } catch (error) {
      console.error('Error subscribing to global annotations:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a job
   * @param {string} jobId - Job ID
   * @returns {Promise<void>}
   */
  async unsubscribeFromJob(jobId) {
    try {
      const channel = this.subscriptions.get(jobId);

      if (channel) {
        await this.supabase.removeChannel(channel);
        this.subscriptions.delete(jobId);
        this.eventHandlers.delete(jobId);
        console.log(`Unsubscribed from job: ${jobId}`);
      }

    } catch (error) {
      console.error('Error unsubscribing from job:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   * @returns {Promise<void>}
   */
  async unsubscribeAll() {
    try {
      const unsubscribePromises = Array.from(this.subscriptions.keys()).map(
        jobId => this.unsubscribeFromJob(jobId)
      );

      await Promise.all(unsubscribePromises);
      console.log('Unsubscribed from all jobs');

    } catch (error) {
      console.error('Error unsubscribing from all jobs:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get active subscriptions count
   * @returns {number} Number of active subscriptions
   */
  getActiveSubscriptionsCount() {
    return this.subscriptions.size;
  }

  /**
   * Check if subscribed to a specific job
   * @param {string} jobId - Job ID
   * @returns {boolean} Subscription status
   */
  isSubscribedToJob(jobId) {
    return this.subscriptions.has(jobId);
  }
}

// Export for global use
window.RealtimeAnnotationsService = RealtimeAnnotationsService;
