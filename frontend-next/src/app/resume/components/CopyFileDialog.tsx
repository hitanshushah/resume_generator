"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FolderStructure {
  files: any[];
  folders: { [key: string]: FolderStructure };
}

interface CopyFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: { [key: string]: FolderStructure };
  filename: string;
  onCopy: (folderPath: string) => Promise<void>;
  copying: boolean;
}

export function CopyFileDialog({
  open,
  onOpenChange,
  folders,
  filename,
  onCopy,
  copying
}: CopyFileDialogProps) {
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("root");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedFolderPath("root");
      setError(null);
    }
  }, [open]);


  const getAllFolderPaths = (
    folderStructure: { [key: string]: FolderStructure },
    parentPath: string = ""
  ): Array<{ value: string; label: string }> => {
    const paths: Array<{ value: string; label: string }> = [{ value: "root", label: "Root (resumes/)" }];
    
    function traverse(folders: { [key: string]: FolderStructure }, path: string) {
      Object.entries(folders).forEach(([folderName, folder]) => {
        const fullPath = path ? `${path}/${folderName}` : folderName;
        paths.push({ value: fullPath, label: fullPath });
        
        if (Object.keys(folder.folders).length > 0) {
          traverse(folder.folders, fullPath);
        }
      });
    }
    
    traverse(folderStructure, parentPath);
    return paths;
  };

  const folderPaths = getAllFolderPaths(folders);

  const handleCopy = async () => {
    setError(null);
    

    const folderPath = selectedFolderPath === "root" ? "" : selectedFolderPath;
    
    try {
      await onCopy(folderPath);
      setSelectedFolderPath("root");
      onOpenChange(false);
    } catch (err) {

      console.error("Copy error:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy File</DialogTitle>
          <DialogDescription>
            Choose where to copy <strong>{filename}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="folder-select" className="text-sm font-medium">
              Copy To
            </label>
            <Select 
              value={selectedFolderPath} 
              onValueChange={setSelectedFolderPath}
            >
              <SelectTrigger id="folder-select">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {folderPaths.map((path) => (
                  <SelectItem key={path.value} value={path.value}>
                    {path.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div className="p-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={copying}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={copying}>
            {copying ? "Copying..." : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

