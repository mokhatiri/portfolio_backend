const DEFAULT_ALLOWED_ORIGINS = [
  "https://mokhatiri.github.io",
  "https://portfolio-backend-mu-mauve.vercel.app/",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
];

const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerWindow = 5;
const requestLog = new Map();

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "mohamed.khatiri2006@gmail.com";
// Resend requires a verified sender; onboarding@resend.dev works out of the box
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "Portfolio Contact <onboarding@resend.dev>";

export default async function handler(request, response) {
  const origin = request.headers.origin || "";
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    Object.entries(headers).forEach(([key, value]) => {
      response.setHeader(key, value);
    });

    return response.status(204).end();
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed" }, headers);
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(response, 500, { error: "RESEND_API_KEY is not configured." }, headers);
  }

  const clientId = getClientId(request);
  if (isRateLimited(clientId)) {
    return sendJson(response, 429, { error: "Too many requests. Please try again in a minute." }, headers);
  }

  const body = parseBody(request.body);
  const name = sanitizeField(body.name, 100);
  const email = sanitizeField(body.email, 200);
  const subject = sanitizeField(body.subject, 150);
  const message = sanitizeField(body.message, 3000);

  if (!name || !email || !subject || !message) {
    return sendJson(response, 400, { error: "All fields are required." }, headers);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendJson(response, 400, { error: "Invalid email address." }, headers);
  }

  try {
    await sendEmail({ name, email, subject, message });
    return sendJson(response, 200, { ok: true }, headers);
  } catch (error) {
    console.error("Contact backend error:", error);
    return sendJson(response, 500, { error: "Could not send the message right now." }, headers);
  }
}

async function sendEmail({ name, email, subject, message }) {
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CONTACT_FROM_EMAIL,
      to: [CONTACT_TO_EMAIL],
      reply_to: email,
      subject: `[Portfolio] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Resend API error ${emailResponse.status}: ${errorText}`);
  }
}

function corsHeaders(origin) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sendJson(response, status, body, headers) {
  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  response.setHeader("Content-Type", "application/json");
  response.status(status).json(body);
}

function sanitizeField(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function parseBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return body;
}

function getClientId(request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || "unknown";
}

function isRateLimited(clientId) {
  const now = Date.now();
  const recentRequests = (requestLog.get(clientId) || []).filter(
    (timestamp) => now - timestamp < rateLimitWindowMs,
  );

  recentRequests.push(now);
  requestLog.set(clientId, recentRequests);

  return recentRequests.length > maxRequestsPerWindow;
}
