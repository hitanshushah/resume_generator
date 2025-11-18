"use client";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  sectionName: string;
}

export function EmptyState({ sectionName }: EmptyStateProps) {
  const handleAddClick = () => {
    const url = process.env.NEXT_PUBLIC_WEBBSTYLE_URL;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="text-center py-8 space-y-4">
      <p className="text-muted-foreground">Add your first {sectionName}</p>
      <Button onClick={handleAddClick} variant="outline">
        Add {sectionName}
      </Button>
    </div>
  );
}

