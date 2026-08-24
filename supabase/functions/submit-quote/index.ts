/**
 * ============================================================================
 * SHANTANU PACKERS AND MOVERS — SUPABASE EDGE FUNCTION
 * Function Name: submit-quote
 * Architecture: OPTION A (Clean Single Path)
 *
 *   CUSTOMER → WEBSITE → submit-quote → VALIDATE → DB INSERT → RESEND EMAIL
 *
 * THIS FUNCTION ONLY:
 *   1. Validates the incoming request
 *   2. Checks for duplicate submissions (idempotency)
 *   3. Inserts EXACTLY ONE row into quote_requests
 *   4. Sends ONE email via Resend API
 *   5. Returns a success/error response
 *
 * THIS FUNCTION NEVER:
 *   - Responds to database webhooks (see WEBHOOK NOTE below)
 *   - Calls itself recursively
 *   - Inserts multiple rows
 *
 * WEBHOOK NOTE:
 *   The Supabase Database Webhook "STN-booking-webhook" that points to
 *   this function MUST BE DELETED/DISABLED from the Supabase Dashboard.
 *   Reason: If the webhook fires after INSERT here, it calls this function
 *   again → another INSERT → another webhook → INFINITE LOOP.
 *   
 *   DELETE the webhook at:
 *   Supabase Dashboard → Database → Webhooks → STN-booking-webhook → Delete
 * ============================================================================
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ─── Environment Secrets (set via Supabase Edge Function Secrets panel) ──────
// NEVER expose these values in frontend code, HTML, or Git repositories.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const NOTIFICATION_EMAIL = Deno.env.get("NOTIFICATION_EMAIL") || "shantanupackers@gmail.com";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Shantanu Movers <onboarding@resend.dev>";

// ─── Allowed CORS Origins ─────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://www.shantanupackers.com",
  "https://shantanupackers.com",
  "https://www.shantanupackersandmovers.com",
  "https://shantanupackersandmovers.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
]);

/**
 * Returns strict CORS headers.
 * Uses exact hostname matching — NOT substring includes — to prevent
 * bypass attacks such as evilocalhost.com or evilshantanu.com.
 */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  let allowed = ALLOWED_ORIGINS.has(origin);

  if (!allowed && origin) {
    try {
      const { hostname } = new URL(origin);
      if (hostname === "localhost" || hostname === "127.0.0.1") allowed = true;
      if (hostname.endsWith(".vercel.app")) allowed = true;
      if (
        hostname.endsWith(".shantanupackers.com") ||
        hostname.endsWith(".shantanupackersandmovers.com")
      ) allowed = true;
    } catch {
      allowed = false;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowed && origin
      ? origin
      : "https://www.shantanupackers.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * HTML-escapes a value to prevent XSS injection in email HTML bodies.
 */
function esc(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates a unique booking ID in format: STN-YYYY-XXXXXX
 * e.g. STN-2026-847321
 */
function generateQuoteId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `STN-${year}-${rand}`;
}

/**
 * Builds a professional HTML email body.
 * All customer data is HTML-escaped before insertion.
 */
function buildEmailHtml(d: {
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
  submittedAt: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Quote Request | Shantanu Packers and Movers</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,0.06);max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#ff5b00 0%,#d94f00 100%);padding:28px 32px;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.75);text-transform:uppercase;margin-bottom:6px;">Govt. MSME Registered | UDYAM-MH-17-0244739</div>
              <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">SHANTANU PACKERS AND MOVERS</div>
              <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);margin-top:6px;">📦 NEW QUOTE REQUEST RECEIVED</div>
            </td>
          </tr>

          <!-- QUOTE ID BANNER -->
          <tr>
            <td style="background:#0f172a;padding:18px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Official Booking ID</div>
                    <div style="font-size:24px;font-weight:900;color:#fb923c;letter-spacing:0.02em;">${esc(d.quoteId)}</div>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="font-size:11px;color:#475569;white-space:nowrap;">${esc(d.submittedAt)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:28px 32px;">

              <!-- CUSTOMER DETAILS -->
              <div style="margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ff5b00;border-bottom:2px solid #fed7aa;padding-bottom:6px;margin-bottom:12px;">Customer Details</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;width:38%;font-size:13px;font-weight:600;color:#64748b;">Full Name</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(d.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Mobile Phone</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;">
                      <a href="tel:${esc(d.phone)}" style="color:#ff5b00;font-weight:700;text-decoration:none;">${esc(d.phone)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Email</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;">${esc(d.email)}</td>
                  </tr>
                </table>
              </div>

              <!-- MOVING DETAILS -->
              <div style="margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ff5b00;border-bottom:2px solid #fed7aa;padding-bottom:6px;margin-bottom:12px;">Moving Details</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;width:38%;font-size:13px;font-weight:600;color:#64748b;">Pickup Location</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(d.pickup)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Drop Location</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(d.drop)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Moving Date</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;">${esc(d.date)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Preferred Time</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;">${esc(d.time)}</td>
                  </tr>
                </table>
              </div>

              <!-- SERVICE DETAILS -->
              <div style="margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ff5b00;border-bottom:2px solid #fed7aa;padding-bottom:6px;margin-bottom:12px;">Service Details</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;width:38%;font-size:13px;font-weight:600;color:#64748b;">Service Type</td>
                    <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(d.service)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Vehicle / Move Size</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;">${esc(d.vehicle)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Floor Number</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;">${esc(d.floor)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Lift Available</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;">${d.lift ? "✅ Yes — Lift Available" : "❌ No Lift"}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#64748b;">Packing Required</td>
                    <td style="padding:6px 0;font-size:13px;color:#0f172a;">${esc(d.packing)}</td>
                  </tr>
                </table>
              </div>

              ${d.notes ? `<!-- ADDITIONAL NOTES -->
              <div style="margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ff5b00;border-bottom:2px solid #fed7aa;padding-bottom:6px;margin-bottom:12px;">Additional Information</div>
                <div style="background:#f8fafc;border-left:3px solid #ff5b00;padding:10px 14px;font-size:13px;color:#334155;border-radius:0 4px 4px 0;white-space:pre-wrap;">${esc(d.notes)}</div>
              </div>` : ""}

              <!-- ACTION BUTTONS -->
              <div style="text-align:center;padding:20px 0 8px 0;border-top:1px solid #e2e8f0;margin-top:8px;">
                <div style="margin-bottom:10px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Contact This Customer Now</div>
                <a href="https://wa.me/91${esc(d.phone.replace(/[^0-9]/g, ""))}" style="display:inline-block;background:#25D366;color:#ffffff;font-weight:700;text-decoration:none;padding:11px 22px;border-radius:6px;font-size:13px;margin:4px;">
                  💬 WhatsApp Customer
                </a>
                <a href="tel:${esc(d.phone)}" style="display:inline-block;background:#ff5b00;color:#ffffff;font-weight:700;text-decoration:none;padding:11px 22px;border-radius:6px;font-size:13px;margin:4px;">
                  📞 Call Customer
                </a>
              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;">SHANTANU PACKERS AND MOVERS</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Nalasopara East, Maharashtra</div>
              <div style="font-size:12px;color:#64748b;">
                📞 +91 8218059678 &nbsp;|&nbsp; +91 9371482180<br>
                ✉️ shantanupackers@gmail.com
              </div>
              <div style="font-size:10px;color:#94a3b8;margin-top:10px;">
                This inquiry was submitted through the official Shantanu Packers and Movers website.<br>
                Server-Side Validated &amp; Idempotency Protected.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the quote notification email via Resend API.
 * Returns { ok: true } on success, { ok: false, error: string } on failure.
 * Email failures do NOT roll back the database insert.
 */
async function sendEmail(quoteId: string, emailHtml: string, customerName: string, pickup: string, drop: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[submit-quote] RESEND_API_KEY secret is not configured — email skipped.");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [NOTIFICATION_EMAIL],
        subject: `New Quote Request | SHANTANU PACKERS AND MOVERS | ${quoteId} — ${customerName} (${pickup} → ${drop})`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[submit-quote] Resend API error:", res.status, body);
      return { ok: false, error: `Resend HTTP ${res.status}` };
    }

    console.log("[submit-quote] Email sent successfully for quote:", quoteId);
    return { ok: true };
  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? "unknown";
    console.error("[submit-quote] Resend fetch exception:", msg);
    return { ok: false, error: msg };
  }
}

// ─── Main Edge Function Handler ───────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const hdrs = corsHeaders(req);

  // ── CORS Preflight ──────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: hdrs });
  }

  // ── Enforce POST ────────────────────────────────────────────────────────────
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...hdrs, "Content-Type": "application/json" } }
    );
  }

  console.log("[submit-quote] Request received from:", req.headers.get("origin") ?? "unknown");

  try {
    // ── 1. Payload Size Guard (max 32 KB) ─────────────────────────────────────
    const cl = req.headers.get("content-length");
    if (cl && parseInt(cl, 10) > 32 * 1024) {
      return new Response(
        JSON.stringify({ error: "Request payload too large." }),
        { status: 413, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Parse JSON Body ────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body." }),
        { status: 400, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return new Response(
        JSON.stringify({ error: "Request body must be a JSON object." }),
        { status: 400, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Server-Side Validation ─────────────────────────────────────────────
    const rawName = String(body.full_name ?? "").trim();
    if (rawName.length < 2 || rawName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid full name (2–100 characters)." }),
        { status: 400, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    const rawPhone = String(body.phone ?? "").replace(/[^0-9]/g, "").slice(0, 15);
    if (rawPhone.length < 10) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid 10-digit mobile number." }),
        { status: 400, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    let cleanEmail = String(body.email ?? "").trim().toLowerCase().slice(0, 150);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      cleanEmail = `${rawPhone}@shantanupackers.com`;
    }

    const rawPickup = String(body.pickup_location ?? "").trim().slice(0, 300);
    if (rawPickup.length < 2) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid pickup location." }),
        { status: 400, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    const rawDrop = String(body.drop_location ?? "").trim().slice(0, 300);
    if (rawDrop.length < 2) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid drop/destination location." }),
        { status: 400, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    const rawDate = String(body.moving_date ?? "").trim();
    if (!rawDate || isNaN(Date.parse(rawDate))) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid moving date (YYYY-MM-DD)." }),
        { status: 400, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    const cleanTime    = String(body.moving_time    ?? "Morning (8 AM – 12 PM)").trim().slice(0, 100);
    const cleanService = String(body.service_type   ?? "Household Shifting").trim().slice(0, 100);
    const cleanVehicle = String(body.vehicle_type   ?? "Standard Move").trim().slice(0, 100);
    const cleanFloor   = String(body.floor_number   ?? "Ground Floor").trim().slice(0, 50);
    const cleanLift    = Boolean(body.lift_available);
    const cleanPacking = String(body.packing_required ?? "Full Professional Packing").trim().slice(0, 100);
    const cleanNotes   = String(body.additional_notes ?? "").trim().slice(0, 2000);

    const clientIp = (
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown"
    ).slice(0, 64);

    console.log("[submit-quote] Validation successful for phone:", rawPhone.slice(0, 4) + "XXXXXX");

    // ── 4. Supabase Admin Client ──────────────────────────────────────────────
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      // Preview mode: no DB configured — return simulated success
      const previewId = generateQuoteId();
      console.warn("[submit-quote] No Supabase config — running in preview mode.");
      return new Response(
        JSON.stringify({ success: true, quote_id: previewId, mode: "preview" }),
        { status: 200, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // ── 5. Rate Limiting (max 5 requests per 10 min per phone number) ─────────
    try {
      const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("quote_rate_limits")
        .select("id", { count: "exact", head: true })
        .eq("identifier", rawPhone)
        .gte("created_at", windowStart);

      if (typeof count === "number" && count >= 5) {
        console.warn("[submit-quote] Rate limit exceeded for phone:", rawPhone.slice(0, 4) + "XXXXXX");
        return new Response(
          JSON.stringify({
            error: "Too many requests. Please wait a few minutes or call us directly at +91 8218059678.",
          }),
          { status: 429, headers: { ...hdrs, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("quote_rate_limits").insert([
        { identifier: rawPhone, action_type: "quote_submit" },
      ]);
    } catch (rateErr) {
      // Non-blocking — rate limit table may not exist in dev
      console.warn("[submit-quote] Rate limit check skipped:", (rateErr as Error)?.message);
    }

    // ── 6. Idempotency / Duplicate Submission Check ───────────────────────────
    // If same phone + same route submitted within 5 minutes, return existing quote ID.
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("quote_requests")
        .select("quote_id")
        .eq("phone", rawPhone)
        .eq("pickup_location", rawPickup)
        .eq("drop_location", rawDrop)
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.quote_id) {
        console.log("[submit-quote] Duplicate detected — returning existing quote:", existing.quote_id);
        return new Response(
          JSON.stringify({
            success: true,
            quote_id: existing.quote_id,
            is_duplicate: true,
            message: "Quote already registered. Our team will contact you shortly.",
          }),
          { status: 200, headers: { ...hdrs, "Content-Type": "application/json" } }
        );
      }
    } catch (dupErr) {
      // Non-blocking — continue to insert
      console.warn("[submit-quote] Duplicate check skipped:", (dupErr as Error)?.message);
    }

    // ── 7. Generate Unique Quote ID ───────────────────────────────────────────
    // Client may suggest an ID; we use it only if it starts with "STN-".
    // Otherwise we generate one server-side.
    const clientSuggestedId = String(body.quote_id ?? "").trim();
    const quoteId = clientSuggestedId.startsWith("STN-") ? clientSuggestedId : generateQuoteId();

    const submittedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // ── 8. Insert EXACTLY ONE Row into quote_requests ─────────────────────────
    console.log("[submit-quote] Creating database record:", quoteId);

    const record = {
      quote_id:         quoteId,
      full_name:        rawName,
      phone:            rawPhone,
      email:            cleanEmail,
      pickup_location:  rawPickup,
      drop_location:    rawDrop,
      moving_date:      rawDate,
      moving_time:      cleanTime,
      service_type:     cleanService,
      vehicle_type:     cleanVehicle,
      floor_number:     cleanFloor,
      lift_available:   cleanLift,
      packing_required: cleanPacking,
      additional_notes: cleanNotes,
      status:           "pending",
      ip_address:       clientIp,
      user_agent:       (req.headers.get("user-agent") ?? "unknown").slice(0, 512),
    };

    const { error: dbError } = await supabase
      .from("quote_requests")
      .insert([record]);

    if (dbError) {
      // Do NOT send a success response if insertion failed
      console.error("[submit-quote] Database insert error:", dbError.message);
      return new Response(
        JSON.stringify({
          error: "Unable to save your quote. Please call us at +91 8218059678 or try again.",
        }),
        { status: 500, headers: { ...hdrs, "Content-Type": "application/json" } }
      );
    }

    console.log("[submit-quote] Quote created:", quoteId);

    // ── 9. Send Email Notification via Resend ─────────────────────────────────
    // Email failure does NOT roll back the database row — the quote is already saved.
    console.log("[submit-quote] Email dispatch started for:", quoteId);

    const emailHtml = buildEmailHtml({
      quoteId,
      name:        rawName,
      phone:       rawPhone,
      email:       cleanEmail,
      pickup:      rawPickup,
      drop:        rawDrop,
      date:        rawDate,
      time:        cleanTime,
      service:     cleanService,
      vehicle:     cleanVehicle,
      floor:       cleanFloor,
      lift:        cleanLift,
      packing:     cleanPacking,
      notes:       cleanNotes,
      submittedAt,
    });

    const emailResult = await sendEmail(quoteId, emailHtml, rawName, rawPickup, rawDrop);

    if (!emailResult.ok) {
      // Quote IS saved — email just failed to send. Log it but return success.
      console.warn("[submit-quote] Quote saved but email dispatch failed:", emailResult.error);
    } else {
      console.log("[submit-quote] Email sent successfully.");
    }

    // ── 10. Return Success ────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        quote_id: quoteId,
        message: "Quote request submitted successfully. Our team will contact you shortly.",
        email_sent: emailResult.ok,
      }),
      { status: 200, headers: { ...hdrs, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const msg = (err as Error)?.message ?? "Unknown error";
    console.error("[submit-quote] Unhandled exception:", msg);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please call us at +91 8218059678.",
      }),
      { status: 500, headers: { ...hdrs, "Content-Type": "application/json" } }
    );
  }
});
