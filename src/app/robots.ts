import type { MetadataRoute } from "next";

/**
 * Robots for Omega Cloud chat app.
 * Allow crawling the landing/root page; block /api/* routes from indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: "https://omega-chat-five.vercel.app/sitemap.xml",
    host: "https://omega-chat-five.vercel.app",
  };
}
