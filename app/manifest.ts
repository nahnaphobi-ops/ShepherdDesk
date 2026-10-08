import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Shepherd's Desk",
    short_name: "Shepherd's Desk",
    description: "A focused workspace for Bible study and sermon preparation.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f1e8",
    theme_color: "#25231f",
    categories: ["books", "education", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Read", url: "/read/psalm/23" },
      { name: "Dictionary", url: "/dictionary" },
      { name: "Sermon notes", url: "/sermon-notes" },
    ],
  };
}
