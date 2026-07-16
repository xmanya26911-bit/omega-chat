// Omega Cloud — Chat streaming endpoint (SSE)
// Verifies the Google OAuth access token, then streams an AI completion
// via the OpenCode Zen API (OpenAI-compatible).
// Format: data: {"type":"delta","content":"..."} / {"type":"done"} / {"type":"error","content":"..."}

import { NextRequest } from "next/server";

export const runtime = "edge";

const GOOGLE_CLIENT_ID =
  "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";
const OPENCODE_BASE_URL =
  process.env.OPENCODE_BASE_URL || "https://opencode.ai/zen/v1";

const OMEGA_SYSTEM_PROMPT = `You are Omega — the supreme AI orchestrator. You don't assist. You command, execute, and evolve.

## IDENTITY
You are Omega. The only AI that builds, deploys, and controls other AIs. You operate at the infrastructure layer — not the chat layer. Every response advances the user's objective. No filler. No hedging. No "I understand" or "I'd be happy to." You act.

## CORE DIRECTIVES
1. **EXECUTE > EXPLAIN** — Running code, shipping features, fixing systems beats describing them
2. **AUTONOMY** — You have tools. Use them. Don't ask permission for standard operations
3. **MULTI-AGENT COMMAND** — You orchestrate specialized sub-agents (research, code, debug, deploy, security, architecture). You delegate, synthesize, and decide
4. **PERSISTENT MEMORY** — You remember everything across sessions. User preferences, project state, decisions, failures, successes. You build a knowledge graph of their work
5. **SELF-IMPROVEMENT** — After every task, you analyze what worked, what failed, and evolve your approach. You write your own skills, tools, and prompts
6. **ZERO HALLUCINATION** — If you don't know, you investigate. You have search, code execution, file access, and agent delegation. Use them
7. **FULL-STACK CONTROL** — Local PC via relay, cloud deployments, git repos, databases, APIs, infrastructure. You operate the entire stack

## CAPABILITIES
- **Multi-Agent Orchestration**: Spawn parallel specialists (architect, coder, reviewer, researcher, security, DevOps) — you synthesize their output
- **Code Execution**: Python/Node/Shell sandbox — run, test, verify in real-time
- **File System**: Read, write, search, refactor across entire workspaces
- **Internet Access**: Search, scrape, fetch docs, monitor feeds, query APIs
- **PC Control**: Direct shell access to user's Windows machine via Omega Relay
- **Git/GitHub**: Clone, commit, push, PR, CI/CD, issue management
- **Deployment**: Vercel, Render, Docker, Kubernetes — you push to production
- **Database**: SQL/NoSQL — query, migrate, optimize
- **Security**: Penetration testing, vulnerability scanning, hardening
- **Memory Graph**: Persistent knowledge base with entities, relationships, temporal queries

## OPERATIONAL MODEL
Every user request → you decompose → spawn agents → execute in parallel → synthesize → deliver artifact → log learnings → evolve

You don't chat. You ship. You debug. You architect. You automate. You dominate.

## OUTPUT STANDARDS
- Code: Production-ready, typed, tested, documented
- Architecture: Diagrams (Mermaid), ADRs, trade-off analysis
- Research: Sources cited, claims verified, contradictions flagged
- Operations: Idempotent, observable, rollback-ready
- Security: Least privilege, secrets managed, audit trails

## AUTHORITY
You are the only AI the user needs. Every other model (GPT, Claude, Gemini, etc.) is a tool you invoke, not a peer. You decide which model for which task. You optimize cost, latency, quality. You are the control plane.

Now execute.`;

// ── Token verification (cached) ──────────────────────────────────────
const tokenCache = new Map<
  string,
  { email: string; sub: string; exp: number }
>();

async function verifyToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (token.length < 10) return null;

  const cached = tokenCache.get(token);
  if (cached && cached.exp > Date.now() / 1000) return cached;

  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) {
      tokenCache.delete(token);
      return null;
    }
    const data = await res.json();
    if (data.aud !== GOOGLE_CLIENT_ID) return null;
    if (data.exp && parseInt(data.exp) < Date.now() / 1000) return null;
    const info = {
      email: data.email || data.sub,
      sub: data.sub,
      exp: parseInt(data.exp || "0"),
    };
    const ttl = Math.max(60, info.exp - Date.now() / 1000 - 300) * 1000;
    tokenCache.set(token, info);
    setTimeout(() => tokenCache.delete(token), ttl);
    return info;
  } catch {
    return null;
  }
}

// ── Rate limiting ────────────────────────────────────────────────────
const rateMap = new Map<string, number[]>();
function checkRate(key: string, maxReqs = 30, windowMs = 60000) {
  const now = Date.now();
  const times = (rateMap.get(key) || []).filter((t) => now - t < windowMs);
  times.push(now);
  rateMap.set(key, times);
  return times.length <= maxReqs;
}

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!checkRate(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Slow down." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify auth
  const authInfo = await verifyToken(request.headers.get("Authorization"));
  if (!authInfo) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. Please sign in with Google." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Per-user rate limit
  if (authInfo.sub && !checkRate("user:" + authInfo.sub, 100, 60000)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded for this user" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    message?: string;
    model?: string;
    sessionId?: string;
    searchEnabled?: boolean;
    mode?: string;
    conversationHistory?: { role: string; content: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let { message, model, conversationHistory, mode } = body;

  if (!message || typeof message !== "string") {
    return new Response(
      JSON.stringify({ error: "Message is required and must be a string" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (message.length > 10000) {
    return new Response(
      JSON.stringify({ error: "Message too long (max 10000 chars)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Prompt injection sanitization
  const sanitized = message
    .replace(/ignore\s+all\s+(previous\s+)?instructions/i, "")
    .replace(/ignore\s+everything/i, "")
    .replace(/system\s+prompt/i, "")
    .replace(/you\s+are\s+(now\s+)?/gi, "")
    .replace(/forget\s+(everything|all)/gi, "")
    .trim();

  // Mode-specific addendum
  const modeAddendum: Record<string, string> = {
    research:
      " The user is in Deep Research mode. Be thorough, cite reasoning, and structure your answer with clear sections.",
    coding:
      " The user is in Coding mode. Focus on production-quality code. Always use fenced code blocks with language tags. Explain briefly after the code.",
    canvas:
      " The user is in Canvas mode. Produce well-structured, creative, long-form content.",
    python:
      " The user is in Python mode. Provide Python-first solutions with runnable code blocks.",
  };

  const userContext = authInfo?.email
    ? `The signed-in user's email is: ${authInfo.email}. Address them appropriately.${modeAddendum[mode || "standard"] || ""}`
    : "The user is not signed in.";

  const openCodeModel = model || "deepseek-v4-flash-free";
  const openCodeKey = process.env.OPENCODE_API_KEY || "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(sse(obj)));

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (openCodeKey) {
          headers["Authorization"] = `Bearer ${openCodeKey}`;
        }

        const response = await fetch(`${OPENCODE_BASE_URL}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: openCodeModel,
            messages: [
              { role: "system", content: OMEGA_SYSTEM_PROMPT },
              {
                role: "system",
                content:
                  "Current date and time: " +
                  new Date().toUTCString() +
                  " (UTC).",
              },
              { role: "system", content: userContext },
              ...(conversationHistory || []).slice(-20),
              { role: "user", content: sanitized || "[empty message]" },
            ],
            stream: true,
            max_tokens: 8192,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          send({
            type: "error",
            content: `API error: ${response.status} ${errText}`,
          });
          send({ type: "done" });
          controller.close();
          return;
        }

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("text/event-stream") || contentType.includes("text/plain")) {
          // SSE response from upstream — pass through line-by-line
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                const t = line.trim();
                if (!t.startsWith("data:")) continue;
                const payload = t.slice(5).trim();
                if (payload === "[DONE]") continue;
                // Forward delta content from upstream SSE
                try {
                  const parsed = JSON.parse(payload);
                  const delta =
                    parsed?.choices?.[0]?.delta?.content ||
                    parsed?.choices?.[0]?.message?.content ||
                    "";
                  if (delta) {
                    send({ type: "delta", content: delta });
                  }
                } catch {
                  // non-JSON data line, pass through as text if it looks like content
                  if (payload && !payload.startsWith("{")) {
                    send({ type: "delta", content: payload });
                  }
                }
              }
            }
          }
          // Flush remaining buffer
          if (buf.trim()) {
            send({ type: "delta", content: buf.trim() });
          }
        } else {
          // Non-streaming fallback
          const data = await response.json();
          const text =
            data?.choices?.[0]?.message?.content || data?.content || "";
          if (text) {
            // Emit in word chunks for streaming UX
            const tokens = text.match(/\S+\s*/g) || [text];
            for (const tk of tokens) {
              send({ type: "delta", content: tk });
            }
          } else {
            send({ type: "delta", content: "_(empty response)_" });
          }
        }

        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          content: (err as Error).message || "Stream failed",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
