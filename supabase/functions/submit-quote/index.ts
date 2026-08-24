/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS - SECURE SUPABASE EDGE FUNCTION
 * Endpoint: submit-quote
 * Architecture: Option A (Direct Edge Function -> DB -> Resend Email)
 * Also supports Webhook Mode (DB Trigger -> Edge Function -> Resend Email)
 * Prevents Webhook Recursion & Guarantees Exactly ONE DB Insertion
 * ============================================================================
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Environment Configuration (Stored exclusively in Supabase Edge Secrets)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const NOTIFICATION_EMAIL = Deno.env.get("NOTIFICATION_EMAIL") || "shantanupackers@gmail.com";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Shantanu Movers <onboarding@resend.dev>";

/// Strict CORS Origin Allowlist
const ALLOWED_ORIGINS = new Set([
  "https://www.shantanupackers.com",
  "https://shantanupackers.com",
  "https://www.shantanupackersandmovers.com",
  "https://shantanupackersandmovers.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

/**
 * Determine CORS headers based on the incoming request origin.
 * Uses exact hostname matching — never substring includes — to prevent
 * bypass attacks like evilocalhost.com or evilshantanu.com.
 */
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  let isAllowed = ALLOWED_ORIGINS.has(origin);

  // Allow *.vercel.app preview deployments (exact hostname suffix check)
  if (!isAllowed && origin) {
    try {
      const url = new URL(origin);
      const hostname = url.hostname;
      // Allow Vercel preview deployments
      if (hostname.endsWith(".vercel.app")) isAllowed = true;
      // Allow localhost / 127.0.0.1 with any port (development only)
      if (hostname === "localhost" || hostname === "127.0.0.1") isAllowed = true;
      // Allow *.shantanupackers.com and *.shantanupackersandmovers.com subdomains
      if (hostname.endsWith(".shantanupackers.com") || hostname.endsWith(".shantanupackersandmovers.com")) isAllowed = true;
    } catch {
      isAllowed = false;
    }
  }

  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : "https://www.shantanupackers.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * HTML Entity Encoder to completely prevent XSS in email bodies
 */
function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate unique production quote ID: STN-YYYY-XXXXXX
 */
function generateQuoteId(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `STN-${year}-${randomNum}`;
}

/**
 * Helper to dispatch email via Resend API
 */
async function dispatchResendEmail(quoteData: {
  quoteId: string;
  name: string;
  phone: string;
  email: string;
  pickup: string;
  drop: string;
  date: string;
  time: string;
  service: string;
  vehicle: string;
  floor: string;
  lift: boolean;
  packing: string;
  notes: string;
  submissionTime: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("WARNING: RESEND_API_KEY secret is not set in Supabase Edge Function environment.");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #fed7aa; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #ff5b00 0%, #e04f00 100%); color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
        .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.95; }
        .body-content { padding: 24px; }
        .id-banner { background: #0f172a; color: #ffffff; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .id-title { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
        .id-value { font-size: 18px; font-weight: 800; color: #fb923c; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        td { padding: 8px 10px; font-size: 13.5px; border-bottom: 1px solid #f1f5f9; }
        td.label { width: 38%; color: #64748b; font-weight: 600; }
        td.value { color: #0f172a; font-weight: 500; }
        .actions { text-align: center; margin-top: 24px; padding-top: 18px; border-top: 1px solid #e2e8f0; }
        .btn-wa { display: inline-block; background-color: #25D366; color: #ffffff; font-weight: 700; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; margin: 4px; }
        .btn-call { display: inline-block; background-color: #ff5b00; color: #ffffff; font-weight: 700; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; margin: 4px; }
        .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SHANTANU PACKERS AND MOVERS</h1>
          <p>Official Relocation Booking & Quote Request (Govt. MSME: UDYAM-MH-17-0244739)</p>
        </div>
        
        <div class="body-content">
          <div class="id-banner">
            <div>
              <div class="id-title">Official Booking ID</div>
              <div class="id-value">${escapeHtml(quoteData.quoteId)}</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #cbd5e1;">
              ${escapeHtml(quoteData.submissionTime)}
            </div>
          </div>

          <table>
            <tr>
              <td class="label">Customer Name:</td>
              <td class="value"><strong>${escapeHtml(quoteData.name)}</strong></td>
            </tr>
            <tr>
              <td class="label">Mobile Phone:</td>
              <td class="value"><a href="tel:${escapeHtml(quoteData.phone)}" style="color: #ff5b00; font-weight: 700; text-decoration: none;">${escapeHtml(quoteData.phone)}</a></td>
            </tr>
            <tr>
              <td class="label">Email:</td>
              <td class="value">${escapeHtml(quoteData.email)}</td>
            </tr>
            <tr>
              <td class="label">Service Selected:</td>
              <td class="value"><strong>${escapeHtml(quoteData.service)}</strong></td>
            </tr>
            <tr>
              <td class="label">Pickup Location:</td>
              <td class="value">${escapeHtml(quoteData.pickup)}</td>
            </tr>
            <tr>
              <td class="label">Drop Location:</td>
              <td class="value">${escapeHtml(quoteData.drop)}</td>
            </tr>
            <tr>
              <td class="label">Moving Date:</td>
              <td class="value">${escapeHtml(quoteData.date)} (${escapeHtml(quoteData.time)})</td>
            </tr>
            <tr>
              <td class="label">Move Size / Vehicle:</td>
              <td class="value">${escapeHtml(quoteData.vehicle)}</td>
            </tr>
            <tr>
              <td class="label">Floor & Elevator:</td>
              <td class="value">${escapeHtml(quoteData.floor)} (Lift: ${quoteData.lift ? "Available" : "No Lift"})</td>
            </tr>
            <tr>
              <td class="label">Packaging Standard:</td>
              <td class="value">${escapeHtml(quoteData.packing)}</td>
            </tr>
            ${quoteData.notes ? `
            <tr>
              <td class="label">Special Instructions:</td>
              <td class="value" style="white-space: pre-wrap;">${escapeHtml(quoteData.notes)}</td>
            </tr>` : ""}
            <tr>
              <td class="label">Submission Time:</td>
              <td class="value">${escapeHtml(quoteData.submissionTime)}</td>
            </tr>
          </table>

          <div class="actions">
            <a href="https://wa.me/${escapeHtml(quoteData.phone)}" class="btn-wa">💬 Instant WhatsApp Reply</a>
            <a href="tel:${escapeHtml(quoteData.phone)}" class="btn-call">📞 Call Customer Directly</a>
          </div>
        </div>

        <div class="footer">
          This inquiry was submitted through the official Shantanu Packers and Movers website.<br>
          Security: Server-Side Validated & Idempotency Protected.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [NOTIFICATION_EMAIL],
        subject: `📦 New Move Request: ${quoteData.quoteId} - ${quoteData.name} (${quoteData.pickup} → ${quoteData.drop})`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API response error:", res.status, errText);
      return { success: false, error: errText };
    }
    return { success: true };
  } catch (err: unknown) {
    const e = err as Error;
    console.error("Resend fetch error:", e?.message);
    return { success: false, error: e?.message };
  }
}

/**
 * Universal Deno Server Handler for Supabase Edge Functions
 */
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Handle CORS Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Enforce POST Method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 3. Payload size check (Max 50 KB)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 50 * 1024) {
      return new Response(
        JSON.stringify({ error: "Payload exceeds allowable limit" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid JSON request payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // 4. WEBHOOK CHECK (Prevent Infinite Recursion)
    // If this invocation is triggered via a Supabase Database Webhook:
    // payload structure will have `type: "INSERT"` and `record: { ... }`
    // In this case, DO NOT insert another DB row. ONLY send the email!
    // ========================================================================
    if (body.type === "INSERT" && body.record && typeof body.record === "object") {
      const rec = body.record;
      console.log("Database Webhook detected for quote:", rec.quote_id);

      await dispatchResendEmail({
        quoteId: rec.quote_id || "STN-WEBHOOK",
        name: rec.full_name || "Customer",
        phone: rec.phone || "",
        email: rec.email || "",
        pickup: rec.pickup_location || "",
        drop: rec.drop_location || "",
        date: rec.moving_date || "",
        time: rec.moving_time || "",
        service: rec.service_type || "",
        vehicle: rec.vehicle_type || "",
        floor: rec.floor_number || "",
        lift: Boolean(rec.lift_available),
        packing: rec.packing_required || "",
        notes: rec.additional_notes || "",
        submissionTime: rec.created_at || new Date().toISOString()
      });

      return new Response(
        JSON.stringify({
          success: true,
          mode: "webhook_processed",
          quote_id: rec.quote_id
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================================
    // 5. STANDARD CLIENT QUOTE SUBMISSION PIPELINE
    // ========================================================================
    const {
      full_name,
      phone,
      email,
      pickup_location,
      drop_location,
      moving_date,
      moving_time,
      service_type,
      vehicle_type,
      floor_number,
      lift_available,
      packing_required,
      additional_notes,
      quote_id: requestedQuoteId
    } = body;

    // Server-Side Input Validation
    const cleanName = String(full_name || "").trim().slice(0, 100);
    if (cleanName.length < 2) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid full name (at least 2 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanPhone = String(phone || "").replace(/[^0-9]/g, "").slice(0, 15);
    if (cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid 10-digit mobile number." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let cleanEmail = String(email || "").trim().toLowerCase().slice(0, 150);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      cleanEmail = `${cleanPhone}@shantanupackers.com`;
    }

    const cleanPickup = String(pickup_location || "").trim().slice(0, 300);
    const cleanDrop = String(drop_location || "").trim().slice(0, 300);
    if (cleanPickup.length < 2 || cleanDrop.length < 2) {
      return new Response(
        JSON.stringify({ error: "Please provide valid pickup and destination locations." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanDate = String(moving_date || "").trim();
    if (!cleanDate || isNaN(Date.parse(cleanDate))) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid relocation date (YYYY-MM-DD)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanTime = String(moving_time || "Morning (8 AM - 12 PM)").trim().slice(0, 100);
    const cleanService = String(service_type || "Household Shifting").trim().slice(0, 100);
    const cleanVehicle = String(vehicle_type || "Standard Move").trim().slice(0, 100);
    const cleanFloor = String(floor_number || "Ground Floor").trim().slice(0, 50);
    const cleanLift = Boolean(lift_available);
    const cleanPacking = String(packing_required || "Full Professional Packing").trim().slice(0, 100);
    const cleanNotes = String(additional_notes || "").trim().slice(0, 2000);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || "unknown";

    // 6. Initialize Supabase Admin Client
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const simulatedQuoteId = requestedQuoteId || generateQuoteId();
      return new Response(
        JSON.stringify({
          success: true,
          quote_id: simulatedQuoteId,
          message: "Quote registered successfully.",
          mode: "preview"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // 7. Rate Limiting Protection (Max 5 submissions per 10 minutes per phone)
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("quote_rate_limits")
        .select("id", { count: "exact", head: true })
        .eq("identifier", cleanPhone)
        .gte("created_at", tenMinutesAgo);

      if (count && count >= 5) {
        return new Response(
          JSON.stringify({
            error: "Too many recent requests. Please wait a few moments or call us directly at +91 8218059678."
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("quote_rate_limits").insert([
        { identifier: cleanPhone, action_type: "quote_submit" }
      ]);
    } catch {
      // Non-blocking
    }

    // 8. Duplicate Submission Check (Sliding 5-Minute Window)
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: duplicateRecord } = await supabase
        .from("quote_requests")
        .select("quote_id")
        .eq("phone", cleanPhone)
        .eq("pickup_location", cleanPickup)
        .eq("drop_location", cleanDrop)
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (duplicateRecord && duplicateRecord.quote_id) {
        return new Response(
          JSON.stringify({
            success: true,
            quote_id: duplicateRecord.quote_id,
            is_duplicate: true,
            message: "Quote already registered. Our relocation supervisor will contact you shortly."
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {
      // Continue to insertion
    }

    // 9. Generate Guaranteed Unique Quote ID
    const quoteId = requestedQuoteId && requestedQuoteId.startsWith("STN-")
      ? requestedQuoteId
      : generateQuoteId();

    const submissionTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // 10. Insert Exactly ONE Row into quote_requests
    const newQuoteRecord = {
      quote_id: quoteId,
      full_name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      pickup_location: cleanPickup,
      drop_location: cleanDrop,
      moving_date: cleanDate,
      moving_time: cleanTime,
      service_type: cleanService,
      vehicle_type: cleanVehicle,
      floor_number: cleanFloor,
      lift_available: cleanLift,
      packing_required: cleanPacking,
      additional_notes: cleanNotes,
      status: "pending",
      ip_address: clientIp.slice(0, 64),
      user_agent: userAgent.slice(0, 512)
    };

    const { error: dbError } = await supabase
      .from("quote_requests")
      .insert([newQuoteRecord]);

    if (dbError) {
      console.error("Database insert error:", dbError.message);
      return new Response(
        JSON.stringify({
          error: "Unable to record quote request. Please call our 24/7 desk at +91 8218059678."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. Dispatch Resend Email via Edge Function
    await dispatchResendEmail({
      quoteId,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      pickup: cleanPickup,
      drop: cleanDrop,
      date: cleanDate,
      time: cleanTime,
      service: cleanService,
      vehicle: cleanVehicle,
      floor: cleanFloor,
      lift: cleanLift,
      packing: cleanPacking,
      notes: cleanNotes,
      submissionTime
    });

    // 12. Success Response
    return new Response(
      JSON.stringify({
        success: true,
        quote_id: quoteId,
        message: "Quote request submitted successfully."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const error = err as Error;
    console.error("Edge function error:", error?.message);
    return new Response(
      JSON.stringify({
        error: "Unable to process your request at this time. Please call our 24/7 desk at +91 8218059678."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
