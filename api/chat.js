import { profileContext } from "./profile.js";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://mokhatiri.github.io",
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

  if (!process.env.OPENAI_API_KEY) {
    return sendJson(response, 500, { error: "OPENAI_API_KEY is not configured." }, headers);
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
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const context = buildAssistantContext();

  const modelResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "You are MK Bot, a concise and friendly robot assistant on Mohammed Khatiri's portfolio. Answer only from the supplied context. If the context does not contain the answer, say that you do not know and suggest contacting Mohammed. Do not invent degrees, employers, dates, endorsements, or LinkedIn details.",
      input: `Portfolio context:\n${context}\n\nVisitor question:\n${question}`,
      max_output_tokens: 350,
    }),
  });

  if (!modelResponse.ok) {
    const errorText = await modelResponse.text();
    throw new Error(`OpenAI API error ${modelResponse.status}: ${errorText}`);
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
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const textParts = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim() || "I could not generate an answer right now.";
}
