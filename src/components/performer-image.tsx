"use client";

import { useState } from "react";

export function PerformerImage({
  src,
  alt,
  className,
  fallbackClassName,
}: {
  src: string;
  alt: string;
  className: string;
  fallbackClassName: string;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div className={fallbackClassName}>
        {alt[0]?.toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
