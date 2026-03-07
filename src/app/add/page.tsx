import { Suspense } from "react";
import { AddArtistClient } from "./add-client";

export default function AddPage() {
  return (
    <Suspense>
      <AddArtistClient />
    </Suspense>
  );
}
