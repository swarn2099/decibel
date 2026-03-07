export function generateFanSlug(fan: { name: string | null; id: string }): string {
  if (fan.name) {
    return (
      fan.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || fan.id.slice(0, 8)
    );
  }
  return fan.id.slice(0, 8);
}
