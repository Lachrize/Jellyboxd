"use client";

import { useEffect, useState } from "react";

/**
 * Full-bleed crossfading backdrop slideshow, à la Jellyseerr setup screen.
 * Cycles through TMDB backdrop URLs with a slow fade.
 */
export function ImageFader({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 7000);
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === index ? 1 : 0,
          }}
        />
      ))}
      {/* Overlay: backdrop stays visible like Jellyseerr, but dimmed enough
          to keep the foreground readable. */}
      <div className="absolute inset-0 bg-[#111827]/72" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/65 to-[#111827]/82" />
    </div>
  );
}
