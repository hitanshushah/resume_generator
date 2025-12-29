"use client";

import { useState, useEffect, useRef } from "react";
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

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: { [key: string]: FolderStructure };
  onUpload: (file: File, folderPath: string) => Promise<void>;
  uploading: boolean;
}

export function UploadFileDialog({
  open,
  onOpenChange,
  folders,
  onUpload,
  uploading
}: UploadFileDialogProps) {
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("root");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSelectedFolderPath("root");
      setSelectedFile(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);


    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setError("Invalid file type. Please upload a PDF, DOC, or DOCX file.");
      return;
    }


    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("File size too large. Maximum size is 10MB.");
      return;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    setError(null);
    

    const folderPath = selectedFolderPath === "root" ? "" : selectedFolderPath;
    
    try {
      await onUpload(selectedFile, folderPath);
      setSelectedFile(null);
      setSelectedFolderPath("root");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
    } catch (err) {

      console.error("Upload error:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>
            Select a file and choose where to upload it (root folder or a specific folder).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="file-select" className="text-sm font-medium">Select File</label>
            <input
              ref={fileInputRef}
              id="file-select"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="folder-select" className="text-sm font-medium">
              Upload To
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

