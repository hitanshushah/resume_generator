"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const url = process.env.NEXT_PUBLIC_WEBBSTYLE_URL || "https://admin.webbstyle.com/pricing";
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="bg-white dark:bg-[#303030] border-gray-200 dark:border-gray-700">
        <CardHeader className="hover:bg-muted/50 dark:hover:bg-[#404040] transition-colors">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                <CardTitle className="text-gray-900 dark:text-white truncate">{title}</CardTitle>
                <ChevronDownIcon
                  className={cn(
                    "h-5 w-5 text-muted-foreground dark:text-gray-300 transition-transform duration-200 flex-shrink-0",
                    isOpen && "transform rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <Button
              onClick={handleAddClick}
              variant="outline"
              size="sm"
              className="gap-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#404040] flex-shrink-0"
            >
              <Pencil className="h-4 w-4 text-gray-600 dark:text-white" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="bg-white dark:bg-[#303030]">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

