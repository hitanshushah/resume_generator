"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RenameFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilename: string;
  onRename: (newFilename: string) => Promise<void>;
  renaming: boolean;
}

export function RenameFileDialog({
  open,
  onOpenChange,
  currentFilename,
  onRename,
  renaming
}: RenameFileDialogProps) {
  const [newFilename, setNewFilename] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Extract filename without extension for easier editing
      const nameWithoutExt = currentFilename.substring(0, currentFilename.lastIndexOf('.')) || currentFilename;
      setNewFilename(nameWithoutExt);
      setError(null);
    }
  }, [open, currentFilename]);

  const handleRename = async () => {
    if (!newFilename.trim()) {
      setError("Filename cannot be empty");
      return;
    }

    // Get the original file extension
    const fileExtension = currentFilename.substring(currentFilename.lastIndexOf('.')) || '';
    const finalFilename = newFilename.trim() + fileExtension;

    setError(null);
    
    try {
      await onRename(finalFilename);
      onOpenChange(false);
    } catch (err) {
      // Error is handled by parent component
      console.error("Rename error:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !renaming) {
      handleRename();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename File</DialogTitle>
          <DialogDescription>
            Enter a new name for the file. The file extension will be preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="filename-input" className="text-sm font-medium">
              Current filename: <span className="text-muted-foreground">{currentFilename}</span>
            </label>
            <Input
              id="filename-input"
              value={newFilename}
              onChange={(e) => {
                setNewFilename(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter new filename"
              disabled={renaming}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              New filename: {newFilename.trim() + (currentFilename.includes('.') ? currentFilename.substring(currentFilename.lastIndexOf('.')) : '')}
            </p>
          </div>
          {error && (
            <div className="p-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={renaming}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={renaming || !newFilename.trim()}>
            {renaming ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

