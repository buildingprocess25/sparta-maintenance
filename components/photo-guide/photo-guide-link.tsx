"use client";

import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhotoGuideLink({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="link" size="sm" onClick={onClick}>
      <ImageIcon data-icon="inline-start" />
      Lihat contoh foto
    </Button>
  );
}
