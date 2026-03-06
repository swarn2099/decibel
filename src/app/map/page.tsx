import type { Metadata } from "next";
import MapLoader from "./map-loader";

export const metadata: Metadata = {
  title: "Scene Map | DECIBEL",
  description: "Explore Chicago's underground music scene — find venues, events, and tonight's action.",
};

export default function MapPage() {
  return <MapLoader />;
}
