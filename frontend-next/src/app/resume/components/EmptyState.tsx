"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Upload } from "lucide-react";

interface EmptyStateProps {
  onUploadClick: () => void;
  uploading?: boolean;
  disabled?: boolean;
}

export function EmptyState({ onUploadClick, uploading = false, disabled = false }: EmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={4} className="text-center py-12">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">No resumes uploaded yet.</p>
          <Button
            onClick={onUploadClick}
            disabled={uploading || disabled}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Resume
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

