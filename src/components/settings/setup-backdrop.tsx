import { getMediaProvider } from "@/lib/media";
import { ImageFader } from "./image-fader";

/** Trending TMDB backdrops for the immersive setup/login background. */
export async function getBackdrops(): Promise<string[]> {
  try {
    const trending = await getMediaProvider().trending();
    return trending
      .map((m) => m.backdropUrl)
      .filter((u): u is string => Boolean(u))
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function SetupBackdrop({ backdrops }: { backdrops: string[] }) {
  if (backdrops.length > 0) {
    return <ImageFader images={backdrops} />;
  }
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(99,102,241,.35),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(79,70,229,.22),transparent_28%),linear-gradient(160deg,#1f2937_0%,#111827_55%,#0b1120_100%)]" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#111827] to-transparent" />
    </div>
  );
}
