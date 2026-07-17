import { NextRequest } from "next/server";

export const runtime = "edge";

const GOOGLE_CLIENT_ID = "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";
const BLOB_URL = "https://blob.vercel-storage.com";

const tokenCache = new Map<string, { sub: string; exp: number }>();

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
    if (!res.ok) return null;
    const data = await res.json();
    if (data.aud !== GOOGLE_CLIENT_ID) return null;
    if (data.exp && parseInt(data.exp) < Date.now() / 1000) return null;
    const info = { sub: data.sub, exp: parseInt(data.exp || "0") };
    const ttl = Math.max(60, info.exp - Date.now() / 1000 - 300) * 1000;
    tokenCache.set(token, info);
    setTimeout(() => tokenCache.delete(token), ttl);
    return info;
  } catch { return null; }
}

async function getGitHubToken(sub: string): Promise<string | null> {
  try {
    const res = await fetch(`${BLOB_URL}/users/${sub}/plugins/github_token.json`, {
      headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch { return null; }
}

// ── GitHub API actions ──────────────────────────────────────────────

type Action =
  | "list_repos"
  | "get_file"
  | "search_code"
  | "list_issues"
  | "get_issue"
  | "create_issue"
  | "list_prs"
  | "get_pr"
  | "readme";

interface ActionRequest {
  action: Action;
  params: Record<string, string>;
}

async function executeAction(token: string, req: ActionRequest): Promise<{ result?: any; error?: string }> {
  const gh = "https://api.github.com";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OmegaCloud/1.0",
  };

  try {
    switch (req.action) {
      case "list_repos": {
        const res = await fetch(`${gh}/user/repos?sort=updated&per_page=30`, { headers });
        if (!res.ok) return { error: `GitHub API: ${res.status} ${await res.text()}` };
        const repos = await res.json();
        return {
          result: repos.map((r: any) => ({
            name: r.full_name,
            private: r.private,
            url: r.html_url,
            description: r.description,
            stars: r.stargazers_count,
            language: r.language,
            updated: r.updated_at,
          })),
        };
      }

      case "get_file": {
        const { repo, path, ref } = req.params;
        if (!repo || !path) return { error: "repo and path required" };
        const url = `${gh}/repos/${repo}/contents/${encodeURIComponent(path)}${ref ? `?ref=${ref}` : ""}`;
        const res = await fetch(url, { headers });
        if (!res.ok) return { error: `GitHub API: ${res.status}` };
        const data = await res.json();
        if (data.type === "file") {
          return {
            result: {
              name: data.name,
              path: data.path,
              size: data.size,
              content: Buffer.from(data.content, "base64").toString("utf-8"),
              html_url: data.html_url,
            },
          };
        }
        return { result: data };
      }

      case "search_code": {
        const { q } = req.params;
        if (!q) return { error: "search query required" };
        const res = await fetch(`${gh}/search/code?q=${encodeURIComponent(q)}&per_page=10`, {
          headers: { ...headers, Accept: "application/vnd.github.v3.text-match+json" },
        });
        if (!res.ok) return { error: `GitHub API: ${res.status}` };
        const data = await res.json();
        return { result: data.items?.map((i: any) => ({ repo: i.repository.full_name, path: i.path, url: i.html_url })) || [] };
      }

      case "list_issues": {
        const { repo, state: issueState } = req.params;
        if (!repo) return { error: "repo required" };
        const res = await fetch(`${gh}/repos/${repo}/issues?state=${issueState || "open"}&per_page=20`, { headers });
        if (!res.ok) return { error: `GitHub API: ${res.status}` };
        const issues = await res.json();
        return {
          result: issues.map((i: any) => ({
            number: i.number,
            title: i.title,
            state: i.state,
            url: i.html_url,
            labels: i.labels?.map((l: any) => l.name),
            created: i.created_at,
            author: i.user?.login,
          })),
        };
      }

      case "get_issue": {
        const { repo, number } = req.params;
        if (!repo || !number) return { error: "repo and number required" };
        const res = await fetch(`${gh}/repos/${repo}/issues/${number}`, { headers });
        if (!res.ok) return { error: `GitHub API: ${res.status}` };
        return { result: await res.json() };
      }

      case "create_issue": {
        const { repo, title, body } = req.params;
        if (!repo || !title) return { error: "repo and title required" };
        const res = await fetch(`${gh}/repos/${repo}/issues`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ title, body: body || "" }),
        });
        if (!res.ok) return { error: `GitHub API: ${res.status} ${await res.text()}` };
        return { result: await res.json() };
      }

      case "list_prs": {
        const { repo, state: prState } = req.params;
        if (!repo) return { error: "repo required" };
        const res = await fetch(`${gh}/repos/${repo}/pulls?state=${prState || "open"}&per_page=20`, { headers });
        if (!res.ok) return { error: `GitHub API: ${res.status}` };
        const prs = await res.json();
        return {
          result: prs.map((p: any) => ({
            number: p.number,
            title: p.title,
            state: p.state,
            url: p.html_url,
            author: p.user?.login,
            created: p.created_at,
          })),
        };
      }

      case "get_pr": {
        const { repo, number } = req.params;
        if (!repo || !number) return { error: "repo and number required" };
        const res = await fetch(`${gh}/repos/${repo}/pulls/${number}`, { headers });
        if (!res.ok) return { error: `GitHub API: ${res.status}` };
        const pr = await res.json();
        // Also get diff
        const diffRes = await fetch(pr.diff_url, { headers: { Authorization: headers.Authorization } });
        const diff = diffRes.ok ? await diffRes.text() : null;
        return { result: { ...pr, diff: diff?.slice(0, 10000) } };
      }

      case "readme": {
        const { repo } = req.params;
        if (!repo) return { error: "repo required" };
        const res = await fetch(`${gh}/repos/${repo}/readme`, { headers });
        if (!res.ok) return { error: `No README found` };
        const data = await res.json();
        return {
          result: {
            name: data.name,
            content: Buffer.from(data.content, "base64").toString("utf-8"),
            html_url: data.html_url,
          },
        };
      }

      default:
        return { error: `Unknown action: ${req.action}` };
    }
  } catch (err) {
    return { error: (err as Error).message || "GitHub action failed" };
  }
}

export async function POST(request: NextRequest) {
  const authInfo = await verifyToken(request.headers.get("Authorization"));
  if (!authInfo) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get GitHub token
  const ghToken = await getGitHubToken(authInfo.sub);
  if (!ghToken) {
    return new Response(JSON.stringify({ error: "GitHub not connected" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: ActionRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await executeAction(ghToken, body);

  return new Response(JSON.stringify(result), {
    status: result.error ? 400 : 200,
    headers: { "Content-Type": "application/json" },
  });
}
