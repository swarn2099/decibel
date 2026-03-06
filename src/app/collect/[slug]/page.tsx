import { createSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { CollectForm } from "./collect-form";
import type { Metadata } from "next";

type Params = Promise<{ slug: string }>;

async function getPerformer(slug: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("performers")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const performer = await getPerformer(slug);
  if (!performer) return { title: "DECIBEL" };

  return {
    title: `Collect ${performer.name} | DECIBEL`,
    description: `You were on ${performer.name}'s dancefloor. Collect them on Decibel.`,
    openGraph: {
      title: `Collect ${performer.name} | DECIBEL`,
      description: `You were on ${performer.name}'s dancefloor. Collect them on Decibel.`,
      images: performer.photo_url ? [performer.photo_url] : [],
    },
  };
}

export default async function CollectPage({ params }: { params: Params }) {
  const { slug } = await params;
  const performer = await getPerformer(slug);

  if (!performer) notFound();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12">
      <CollectForm performer={performer} />
    </main>
  );
}
