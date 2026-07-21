import type { MetadataRoute } from "next";

// This is an internal, invite-only tool — no page should be indexed. Disallow
// every crawler across the whole site. (Note: robots.txt is a request not to
// index; it is not an access control. Real protection is the auth middleware;
// the only public page, /subscription-request, is shared by link, not search.)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
