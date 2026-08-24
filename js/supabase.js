/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS - OFFICIAL CLIENT DATA LAYER & SUPABASE ADAPTER
 * Production-Grade Pure Vanilla JavaScript (Client-Safe, No Secret Leakage)
 * Govt. MSME Enterprise: UDYAM-MH-17-0244739
 *
 * ARCHITECTURE: OPTION A — Edge Function Only
 * Website -> Edge Function -> DB Insert -> Resend Email
 *
 * INTENTIONALLY REMOVED: Direct Supabase client INSERT fallback
 * Reason: If Edge Function inserts, then Direct Insert also runs = 2 rows.
 * If webhook is active: Direct Insert -> Webhook -> Edge Function email = OK
 * But if both run: Edge Function insert + Direct Insert = 2 rows + 2 emails.
 * The ONLY correct approach is: ONE path, ONE insert, ONE email.
 *
 * If Edge Function fails: show user an error, save to local backup only.
 * Local backup is purely for logging — it is NOT auto-submitted.
 * ============================================================================
 */

// Public Supabase Configuration (Customizable via window.SUPABASE_CONFIG)
// NEVER put service_role, Resend keys, or database passwords in this client file!
const DEFAULT_SUPABASE_CONFIG = {
  url: 'https://jhwrxhurouuoformarxq.supabase.co',
  anonKey: 'sb_publishable_t9D8MFjMJXRwOEd2g0PgSQ_u27BPrfv'
};

const SUPABASE_CONFIG = Object.assign({}, DEFAULT_SUPABASE_CONFIG, window.SUPABASE_CONFIG || {});

/**
 * Initialize or retrieve official Supabase JS Client (read-only use only - no INSERT from client)
 */
function getSupabaseClient() {
  if (
    typeof window.supabase !== 'undefined' &&
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.url.startsWith('http')
  ) {
    try {
      return window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    } catch (e) {
      console.warn('Supabase client initialization note:', e);
    }
  }
  return null;
}

// In-flight locking & idempotency guard — prevents double-click and race conditions
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
 * Client-Side Input Sanitizer for defense-in-depth (XSS prevention layer)
 */
function sanitizeInput(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 1000);
}

/**
 * Submits a quote request to Supabase Edge Function.
 *
 * GUARANTEED SINGLE-ROW ARCHITECTURE:
 * 1. Frontend locks submission button to prevent double-clicks.
 * 2. Generates unique Quote ID (STN-YYYY-XXXXXX).
 * 3. Sends ONE POST request to Edge Function.
 * 4. Edge Function: validates -> checks duplicate -> inserts 1 row -> sends email.
 * 5. If webhook (STN-booking-webhook) fires on INSERT: Edge Function detects it
 *    via body.type === "INSERT" and ONLY sends email (no second DB insert).
 * 6. If Edge Function unreachable: saves to localStorage only (no silent DB insert).
 *
 * NO FALLBACK DB INSERT — this is intentional to prevent duplicate rows.
 */
async function submitQuoteRequest(data) {
  const cleanPhone = String(data.phone || '').replace(/[^0-9]/g, '');
  const quoteId = data.quote_id || generateQuoteId();
  const submissionKey = `${cleanPhone}_${String(data.pickup_location || '').slice(0, 30)}_${String(data.drop_location || '').slice(0, 30)}`;

  // 1. Double-click & rapid re-submission guard (client-side only, not trusted server-side)
  if (completedQuotes.has(quoteId) || activeSubmissions.has(submissionKey)) {
    return {
      success: true,
      quoteId: quoteId,
      isDuplicate: true,
      message: 'Quote request already received. Our team will contact you shortly.'
    };
  }

  activeSubmissions.add(submissionKey);

  // 2. Prepare sanitized payload
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
    // 3. Single insertion path: Edge Function ONLY
    // This is the ONLY place a DB row is created. No fallback DB insert below.
    const edgeFunctionUrl = `${SUPABASE_CONFIG.url}/functions/v1/submit-quote`;

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
      const finalQuoteId = result.quote_id || quoteId;

      completedQuotes.add(finalQuoteId);
      activeSubmissions.delete(submissionKey);
      saveToLocalBackup({ ...cleanPayload, quote_id: finalQuoteId });

      return {
        success: true,
        quoteId: finalQuoteId,
        source: 'edge_function',
        message: result.message || 'Quote registered successfully.'
      };
    }

    // Edge Function returned HTTP error (4xx / 5xx)
    let errorMessage = 'Quote submission failed. Please call us at +91 8218059678.';
    try {
      const errBody = await response.json();
      if (errBody && errBody.error) {
        // Return user-visible errors (validation) but not internal errors
        if (response.status === 400 || response.status === 429) {
          errorMessage = errBody.error;
        }
      }
    } catch { /* ignore parse error */ }

    activeSubmissions.delete(submissionKey);
    saveToLocalBackup(cleanPayload); // Save locally so no customer data is lost

    return {
      success: false,
      quoteId: quoteId,
      source: 'edge_function_error',
      message: errorMessage
    };

  } catch (networkErr) {
    // Network failure (offline / CORS / timeout)
    console.warn('Edge Function network error - saving locally:', networkErr?.message);
    activeSubmissions.delete(submissionKey);
    saveToLocalBackup(cleanPayload);

    return {
      success: false,
      quoteId: quoteId,
      source: 'network_error',
      message: 'Network error. Please check your connection or call us at +91 8218059678.'
    };
  }
}

/**
 * Persist submission to browser localStorage — audit trail only.
 * This data is NOT automatically re-submitted. It's for offline reference.
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
    // localStorage restricted or full — silently skip
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
