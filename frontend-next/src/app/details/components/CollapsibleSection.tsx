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
    e.stopPropagation(); // Prevent triggering the collapsible toggle
    const url = process.env.NEXT_PUBLIC_WEBBSTYLE_URL;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card>
        <CardHeader className="hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between gap-2 cursor-pointer flex-1">
                <div>
                <CardTitle>{title}</CardTitle>
                </div>
                <div className="flex flex-row items-center gap-4 cursor-pointer">
                <Button
                  onClick={handleAddClick}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <ChevronDownIcon
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                    isOpen && "transform rotate-180"
                  )}
                />
                </div>
              </div>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

