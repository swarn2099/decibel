"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("./map-client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-120px)] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink border-t-transparent" />
    </div>
  ),
});

export default function MapLoader() {
  return <MapClient />;
}
