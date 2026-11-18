import type { MetadataRoute } from "next";

// Web app manifest (Android home screen, Chrome tab color). Icons live in public/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crystal Clean",
    short_name: "Crystal Clean",
    start_url: "/",
    display: "browser",
    theme_color: "#0E1F3D",
    background_color: "#FAF6F0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
