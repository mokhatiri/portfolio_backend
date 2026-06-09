import { profileContext } from "./profile.js";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://mokhatiri.github.io",
  "https://portfolio-backend-mu-mauve.vercel.app/",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
];


const rateLimitWindowMs = 60 * 1000;
const maxRequestsPerWindow = 12;
const requestLog = new Map();

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

  if (!process.env.HF_TOKEN) {
    return sendJson(response, 500, { error: "HF_TOKEN is not configured." }, headers);
  }

  const clientId = getClientId(request);
  if (isRateLimited(clientId)) {
    return sendJson(response, 429, { error: "Too many requests. Please try again in a minute." }, headers);
  }

  const body = parseBody(request.body);
  const question = sanitizeQuestion(body.question);
  if (!question) {
    return sendJson(response, 400, { error: "Missing question." }, headers);
  }

  try {
    const answer = await askModel(question);
    return sendJson(response, 200, { answer }, headers);
  } catch (error) {
    console.error("Chat backend error:", error);
    return sendJson(response, 500, { error: "The assistant is unavailable right now." }, headers);
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

function sanitizeQuestion(question) {
  if (typeof question !== "string") {
    return "";
  }

  return question.trim().slice(0, 1000);
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

async function askModel(question) {
  const model = process.env.HF_MODEL || "Qwen/Qwen2.5-72B-Instruct";
  const context = buildAssistantContext();

  const systemPrompt =
    "You are MK Bot, a concise and friendly robot assistant on Mohammed Khatiri's portfolio. Answer only from the supplied context. If the context does not contain the answer, say that you do not know and suggest contacting Mohammed. Do not invent degrees, employers, dates, endorsements, or LinkedIn details.";

  const modelResponse = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Portfolio context:\n${context}\n\nVisitor question:\n${question}`,
        },
      ],
      max_tokens: 350,
      temperature: 0.3,
    }),
  });

  if (!modelResponse.ok) {
    const errorText = await modelResponse.text();
    throw new Error(`Hugging Face API error ${modelResponse.status}: ${errorText}`);
  }

  const data = await modelResponse.json();
  return extractOutputText(data);
}

function buildAssistantContext() {
  const linkedinContext = process.env.LINKEDIN_PROFILE_CONTEXT
    ? `\nLinkedIn context configured by Mohammed:\n${process.env.LINKEDIN_PROFILE_CONTEXT}`
    : "\nLinkedIn live profile data is not configured. Use only the LinkedIn URL from the portfolio.";

  return `${profileContext}${linkedinContext}`;
}

function extractOutputText(data) {
  const message = data.choices?.[0]?.message?.content;

  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  return "I could not generate an answer right now.";
}
