"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  fileCount: number;
  onDelete: () => Promise<void>;
  deleting: boolean;
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  folderName,
  fileCount,
  onDelete,
  deleting
}: DeleteFolderDialogProps) {
  const handleDelete = async () => {
    try {
      await onDelete();
      onOpenChange(false);
    } catch (err) {

      console.error("Delete error:", err);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{folderName}</strong>?
            </p>
            <p className="text-destructive font-medium">
              ⚠️ Warning: Everything inside this folder will be deleted, including all files and subfolders.
            </p>
            {fileCount > 0 && (
              <p className="text-sm text-muted-foreground">
                This folder contains {fileCount} {fileCount === 1 ? 'file' : 'files'}.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

