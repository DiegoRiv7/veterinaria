"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadRecetaButton({ id }: { id: string }) {
  const href = `/api/receta/${id}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full"
    >
      <Button
        type="button"
        variant="secondary"
        size="xl"
        className="w-full"
      >
        <Download className="h-5 w-5" aria-hidden="true" />
        <span>Descargar receta médica</span>
      </Button>
    </a>
  );
}

export default DownloadRecetaButton;
