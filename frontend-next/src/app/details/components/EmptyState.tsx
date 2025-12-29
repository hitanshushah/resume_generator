"use client";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  sectionName: string;
}

export function EmptyState({ sectionName }: EmptyStateProps) {
  const handleAddClick = () => {
    const url = process.env.NEXT_PUBLIC_WEBBSTYLE_URL || "https://admin.webbstyle.com";
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="text-center py-8 space-y-4">
      <p className="text-muted-foreground dark:text-gray-300">Add your first {sectionName}</p>
      <Button onClick={handleAddClick} variant="outline" className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#404040]">
        Add {sectionName}
      </Button>
    </div>
  );
}

