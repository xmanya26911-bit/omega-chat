import type { MetadataRoute } from "next";

/**
 * Sitemap for Omega Cloud chat app.
 * Only the root is public (everything else requires auth).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://omega-chat-five.vercel.app";
  const lastModified = new Date();

  return [
    {
      url: base + "/",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
