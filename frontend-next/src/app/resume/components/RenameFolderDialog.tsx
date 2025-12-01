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

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolderName: string;
  onRename: (newFolderName: string) => Promise<void>;
  renaming: boolean;
}

export function RenameFolderDialog({
  open,
  onOpenChange,
  currentFolderName,
  onRename,
  renaming
}: RenameFolderDialogProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewFolderName(currentFolderName);
      setError(null);
    }
  }, [open, currentFolderName]);

  const handleRename = async () => {
    if (!newFolderName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    // Validate folder name (only letters, numbers, hyphens, and underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(newFolderName.trim())) {
      setError("Folder name can only contain letters, numbers, hyphens, and underscores");
      return;
    }

    setError(null);
    
    try {
      await onRename(newFolderName.trim());
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
          <DialogTitle>Rename Folder</DialogTitle>
          <DialogDescription>
            Enter a new name for the folder.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="foldername-input" className="text-sm font-medium">
              Current folder name: <span className="text-muted-foreground">{currentFolderName}</span>
            </label>
            <Input
              id="foldername-input"
              value={newFolderName}
              onChange={(e) => {
                setNewFolderName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter new folder name"
              disabled={renaming}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Folder name can only contain letters, numbers, hyphens, and underscores
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
          <Button onClick={handleRename} disabled={renaming || !newFolderName.trim()}>
            {renaming ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

