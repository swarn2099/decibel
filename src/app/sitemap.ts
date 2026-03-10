import { createSupabaseServer } from "@/lib/supabase-server";
import { SITE_URL } from "@/lib/config";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createSupabaseServer();

  // Fetch all performer slugs for artist pages
  const { data: performers } = await supabase
    .from("performers")
    .select("slug")
    .order("follower_count", { ascending: false });

  const artistPages: MetadataRoute.Sitemap = (performers ?? []).map((p) => ({
    url: `${SITE_URL}/artist/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...artistPages,
  ];
}
