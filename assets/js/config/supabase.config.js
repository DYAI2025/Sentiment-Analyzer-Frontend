/**
 * Supabase Configuration
 * Initialize Supabase client for backend integration
 */

// Supabase Configuration - Replace with your actual values
const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  anonKey: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
  realtime: {
    enabled: true,
    heartbeatInterval: 30000,
    reconnectDelay: 1000,
  }
};

/**
 * Initialize Supabase Client
 * @returns {Object} Supabase client instance
 */
function initSupabaseClient() {
  if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded. Please include the Supabase CDN script.');
    return null;
  }

  const client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    realtime: SUPABASE_CONFIG.realtime,
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });

  console.log('Supabase client initialized successfully');
  return client;
}

// Global Supabase client
let supabaseClient = null;

/**
 * Get Supabase Client Instance
 * @returns {Object} Supabase client
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = initSupabaseClient();
  }
  return supabaseClient;
}

// Export for use in other modules
window.SupabaseConfig = {
  getClient: getSupabaseClient,
  config: SUPABASE_CONFIG
};
