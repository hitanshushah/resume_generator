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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: { [key: string]: FolderStructure };
  onCreateFolder: (folderName: string, parentPath: string) => Promise<void>;
  creating: boolean;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  folders,
  onCreateFolder,
  creating
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [selectedParentPath, setSelectedParentPath] = useState<string>("root");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFolderName("");
      setSelectedParentPath("root");
      setError(null);
    }
  }, [open]);


  const getAllFolderPaths = (
    folderStructure: { [key: string]: FolderStructure },
    parentPath: string = ""
  ): Array<{ value: string; label: string }> => {
    const paths: Array<{ value: string; label: string }> = [{ value: "root", label: "Root (Top Level)" }];
    
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

  const handleCreate = async () => {
    if (!folderName.trim()) {
      setError("Folder name is required");
      return;
    }


    const folderNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!folderNameRegex.test(folderName.trim())) {
      setError("Folder name can only contain letters, numbers, hyphens, and underscores");
      return;
    }

    setError(null);
    const parentPath = selectedParentPath === "root" ? "" : selectedParentPath;
    
    try {
      await onCreateFolder(folderName.trim(), parentPath);
      setFolderName("");
      setSelectedParentPath("root");
      onOpenChange(false);
    } catch (err) {

    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Choose a location and enter a name for the new folder.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="parent-folder">Parent Folder</Label>
            <Select value={selectedParentPath} onValueChange={setSelectedParentPath}>
              <SelectTrigger id="parent-folder">
                <SelectValue placeholder="Select parent folder" />
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
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setError(null);
              }}
              placeholder="Enter folder name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                }
              }}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !folderName.trim()}>
            {creating ? "Creating..." : "Create Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

