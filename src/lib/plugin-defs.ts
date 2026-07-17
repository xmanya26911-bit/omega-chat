// ── Plugin definitions ─────────────────────────────────────────────
export type PluginId = "github" | "notion" | "linear" | "jira" | "figma" | "slack" | "gmail" | "calendar" | "vercel" | "stripe";

export interface PluginDef {
  id: PluginId;
  name: string;
  icon: string;
  desc: string;
  scopes: string;
  coming_soon?: boolean;
}

export const PLUGIN_DEFS: PluginDef[] = [
  {
    id: "github",
    name: "GitHub",
    icon: "🐙",
    desc: "Repos, issues, PRs, commits, files",
    scopes: "repo,user",
  },
  {
    id: "notion",
    name: "Notion",
    icon: "📝",
    desc: "Read/write pages, databases",
    scopes: "read,write",
    coming_soon: true,
  },
  {
    id: "linear",
    name: "Linear",
    icon: "📋",
    desc: "Issues, projects, sprints",
    scopes: "read,write",
    coming_soon: true,
  },
  {
    id: "jira",
    name: "Jira",
    icon: "🗂️",
    desc: "Tickets, boards, sprints",
    scopes: "read,write",
    coming_soon: true,
  },
  {
    id: "figma",
    name: "Figma",
    icon: "🎨",
    desc: "Read designs, leave comments",
    scopes: "read",
    coming_soon: true,
  },
  {
    id: "slack",
    name: "Slack",
    icon: "💬",
    desc: "Send/read messages, channels",
    scopes: "channels:read,chat:write",
    coming_soon: true,
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: "📧",
    desc: "Read/draft/send emails",
    scopes: "gmail.read,gmail.send",
    coming_soon: true,
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: "📅",
    desc: "Create events, check schedule",
    scopes: "read,write",
    coming_soon: true,
  },
  {
    id: "vercel",
    name: "Vercel",
    icon: "▲",
    desc: "Deployments, logs, env vars",
    scopes: "read,write",
    coming_soon: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    icon: "💳",
    desc: "Revenue, refunds, customers",
    scopes: "read",
    coming_soon: true,
  },
];
