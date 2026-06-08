/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // TMDB image CDN + a placeholder host for the seed provider.
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  experimental: {
    // Server Actions are stable in 15, this only raises the body limit for reviews.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
