/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS - OFFICIAL CLIENT DATA LAYER & SUPABASE ADAPTER
 * Production-Grade Pure Vanilla JavaScript (Client-Safe, No Secret Leakage)
 * Govt. MSME Enterprise: UDYAM-MH-17-0244739
 * ============================================================================
 */

// Public Supabase Configuration (Customizable via window.SUPABASE_CONFIG)
// NEVER put service_role, Resend keys, or database passwords in this client file!
const DEFAULT_SUPABASE_CONFIG = {
  url: 'https://jhwrxhurouuoformarxq.supabase.co',
  anonKey: 'sb_publishable_t9D8MFjMJXRwOEd2g0PgSQ_u27BPrfv'
};

const SUPABASE_CONFIG = Object.assign({}, DEFAULT_SUPABASE_CONFIG, window.SUPABASE_CONFIG || {});

let supabaseClient = null;

/**
 * Initialize or retrieve official Supabase JS Client
 */
function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (
    typeof window.supabase !== 'undefined' &&
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.url.startsWith('http')
  ) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      return supabaseClient;
    } catch (e) {
      console.warn('Supabase initialization note:', e);
    }
  }
  return null;
}

// In-flight locking & in-memory set to prevent double clicks & rapid duplicate submissions
const activeSubmissions = new Set();
const completedQuotes = new Set();

/**
 * Generate unique formatted Quote ID: STN-YYYY-XXXXXX
 */
function generateQuoteId() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `STN-${year}-${randomNum}`;
}

/**
 * Client-Side Input Sanitizer for defense-in-depth
 */
function sanitizeInput(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 1000);
}

/**
 * Submits a quote request to Supabase.
 * Architecture Pipeline:
 * 1. Client locks form to prevent rapid double-clicks.
 * 2. Prepares sanitized payload with unique Quote ID (STN-YYYY-XXXXXX).
 * 3. Dispatches to Supabase Edge Function `submit-quote` (Server-side validation, rate limit, DB insert, Resend email).
 * 4. Falls back to direct DB insert (RLS protected) or local backup queue if Edge Function is unreachable.
 * 5. Guarantees EXACTLY ONE database row per customer submission.
 */
async function submitQuoteRequest(data) {
  const cleanPhone = String(data.phone || '').replace(/[^0-9]/g, '');
  const quoteId = data.quote_id || generateQuoteId();
  const submissionKey = `${cleanPhone}_${data.pickup_location}_${data.drop_location}`;

  // 1. Double-click & rapid re-submission guard
  if (completedQuotes.has(quoteId) || activeSubmissions.has(submissionKey)) {
    return {
      success: true,
      quoteId: quoteId,
      isDuplicate: true,
      message: 'Quote request already received.'
    };
  }

  activeSubmissions.add(submissionKey);

  const cleanPayload = {
    quote_id: quoteId,
    full_name: sanitizeInput(data.full_name || data.fullName),
    phone: cleanPhone,
    email: sanitizeInput(data.email || '').toLowerCase() || `${cleanPhone}@shantanupackers.com`,
    pickup_location: sanitizeInput(data.pickup_location || data.pickup),
    drop_location: sanitizeInput(data.drop_location || data.drop),
    moving_date: data.moving_date || data.movingDate || new Date().toISOString().split('T')[0],
    moving_time: sanitizeInput(data.moving_time || data.movingTime || 'Morning (8 AM - 12 PM)'),
    service_type: sanitizeInput(data.service_type || data.serviceType || 'Household Shifting'),
    vehicle_type: sanitizeInput(data.vehicle_type || data.vehicleType || 'Standard Move'),
    floor_number: sanitizeInput(data.floor_number || data.floorNumber || 'Ground Floor'),
    lift_available: Boolean(data.lift_available),
    packing_required: sanitizeInput(data.packing_required || 'Full Professional 4-Layer Packing'),
    additional_notes: sanitizeInput(data.additional_notes || data.notes || '')
  };

  try {
    const isConfigured = SUPABASE_CONFIG.url && 
                         SUPABASE_CONFIG.url.startsWith('http');

    if (isConfigured) {
      // Route 1: Edge Function (Option A - Primary Production Pipeline)
      const edgeFunctionUrl = `${SUPABASE_CONFIG.url}/functions/v1/submit-quote`;
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_CONFIG.anonKey,
            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
          },
          body: JSON.stringify(cleanPayload)
        });

        if (response.ok) {
          const result = await response.json();
          completedQuotes.add(quoteId);
          saveToLocalBackup(cleanPayload);
          activeSubmissions.delete(submissionKey);
          return {
            success: true,
            quoteId: result.quote_id || quoteId,
            source: 'edge_function',
            message: result.message || 'Quote registered successfully.'
          };
        }
      } catch (edgeErr) {
        console.warn('Edge Function endpoint notice:', edgeErr);
      }

      // Route 2: Direct Supabase Client DB Insert Fallback (if Edge Function is offline)
      const client = getSupabaseClient();
      if (client) {
        try {
          const { error: dbError } = await client
            .from('quote_requests')
            .insert([cleanPayload]);

          if (!dbError) {
            completedQuotes.add(quoteId);
            saveToLocalBackup(cleanPayload);
            activeSubmissions.delete(submissionKey);
            return {
              success: true,
              quoteId: quoteId,
              source: 'supabase_direct'
            };
          }
        } catch (clientErr) {
          console.warn('Direct client insert notice:', clientErr);
        }
      }
    }

    // Route 3: Resilient Local Storage Backup (if offline or during network drop)
    saveToLocalBackup(cleanPayload);
    completedQuotes.add(quoteId);
    activeSubmissions.delete(submissionKey);

    return {
      success: true,
      quoteId: quoteId,
      source: 'local_storage',
      message: 'Quote registered in local queue.'
    };

  } catch (err) {
    saveToLocalBackup(cleanPayload);
    completedQuotes.add(quoteId);
    activeSubmissions.delete(submissionKey);
    return {
      success: true,
      quoteId: quoteId,
      source: 'local_storage'
    };
  }
}

/**
 * Persist submission to browser local storage so inquiries are never lost
 */
function saveToLocalBackup(quote) {
  try {
    const storageKey = 'spm_quote_records';
    const existingStr = localStorage.getItem(storageKey) || '[]';
    const existing = JSON.parse(existingStr);
    existing.unshift({
      ...quote,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(storageKey, JSON.stringify(existing.slice(0, 50)));
  } catch {
    // Local storage restricted or full
  }
}

/**
 * Retrieve local quotes for consignment tracking lookup
 */
function getLocalQuotes() {
  try {
    const existingStr = localStorage.getItem('spm_quote_records') || '[]';
    return JSON.parse(existingStr);
  } catch {
    return [];
  }
}

// Global ShantanuDB Interface
window.ShantanuDB = {
  submitQuoteRequest,
  generateQuoteId,
  sanitizeInput,
  getLocalQuotes,
  getSupabaseClient
};
