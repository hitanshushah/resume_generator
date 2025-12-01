"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useUser } from "@/contexts/UserContext";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { Upload, FolderPlus, Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileRow } from "./components/FileRow";
import { FolderRow } from "./components/FolderRow";
import { EmptyState } from "./components/EmptyState";
import { CreateFolderDialog } from "./components/CreateFolderDialog";
import { UploadFileDialog } from "./components/UploadFileDialog";
import { RenameFileDialog } from "./components/RenameFileDialog";
import { DeleteFileDialog } from "./components/DeleteFileDialog";
import { CopyFileDialog } from "./components/CopyFileDialog";
import { MoveFileDialog } from "./components/MoveFileDialog";
import { RenameFolderDialog } from "./components/RenameFolderDialog";
import { DeleteFolderDialog } from "./components/DeleteFolderDialog";

interface ResumeFile {
  id: number;
  filename: string;
  url: string;
  created_at: string | null;
  updated_at: string | null;
}

interface FolderStructure {
  files: ResumeFile[];
  folders: { [key: string]: FolderStructure };
  folder_key?: string;
}

interface ResumesData {
  resumes: ResumeFile[];
  folders: { [key: string]: FolderStructure };
}

export default function ResumePage() {
  const { user } = useUser();
  const { user: storeUser } = useUserStore();
  const router = useRouter();

  const currentUser = user || storeUser;
  const isPro = currentUser?.is_pro || false;
  const [uploadingResume, setUploadingResume] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumesData, setResumesData] = useState<ResumesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [renamingFile, setRenamingFile] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<ResumeFile | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ResumeFile | null>(null);
  const [copyingFile, setCopyingFile] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [fileToCopy, setFileToCopy] = useState<ResumeFile | null>(null);
  const [movingFile, setMovingFile] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<ResumeFile | null>(null);
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [renameFolderDialogOpen, setRenameFolderDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<{folderKey: string, folderName: string} | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{folderKey: string, folderName: string, fileCount: number} | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      fetchResumes();
    } else {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const fetchResumes = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/resumes/${currentUser.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch resumes');
      }

      const data = await response.json();
      setResumesData(data);
    } catch (err) {
      console.error('Error fetching resumes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadResumeClick = () => {
    setShowUploadDialog(true);
  };

  const handleFileUpload = async (file: File, folderPath: string) => {
    if (!currentUser?.id) {
      setError("User not authenticated");
      toast.error("Please log in to upload a resume");
      throw new Error("User not authenticated");
    }

    try {
      setUploadingResume(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', currentUser.id.toString());
      formData.append('folder_path', folderPath);

      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success('Resume uploaded successfully!');
      

      await fetchResumes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload resume";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so dialog can handle it
    } finally {
      setUploadingResume(false);
    }
  };

  const handleCreateFolder = async (folderName: string, parentPath: string) => {
    if (!currentUser?.id) {
      setError("User not authenticated");
      toast.error("Please log in to create a folder");
      throw new Error("User not authenticated");
    }

    try {
      setCreatingFolder(true);
      setError(null);

      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          folder_name: folderName,
          parent_folder: parentPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success('Folder created successfully!');
      

      await fetchResumes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create folder";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so dialog can handle it
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFile = async (file: ResumeFile, newFilename: string) => {
    if (!currentUser?.id) {
      setError("User not authenticated");
      toast.error("Please log in to rename a file");
      throw new Error("User not authenticated");
    }

    try {
      setRenamingFile(true);
      setError(null);

      const response = await fetch('/api/rename-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          resume_id: file.id,
          new_filename: newFilename,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success('File renamed successfully!');
      

      await fetchResumes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to rename file";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so dialog can handle it
    } finally {
      setRenamingFile(false);
    }
  };

  const handleRenameClick = (file: ResumeFile) => {
    setFileToRename(file);
    setRenameDialogOpen(true);
  };

  const handleDeleteFile = async (file: ResumeFile) => {
    if (!currentUser?.id) {
      setError("User not authenticated");
      toast.error("Please log in to delete a file");
      throw new Error("User not authenticated");
    }

    try {
      setDeletingFile(true);
      setError(null);

      const response = await fetch('/api/delete-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          resume_id: file.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success('File deleted successfully!');
      

      await fetchResumes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete file";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so dialog can handle it
    } finally {
      setDeletingFile(false);
    }
  };

  const handleDeleteClick = (file: ResumeFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleCopyFile = async (file: ResumeFile, folderPath: string) => {
    if (!currentUser?.id) {
      setError("User not authenticated");
      toast.error("Please log in to copy a file");
      throw new Error("User not authenticated");
    }

    try {
      setCopyingFile(true);
      setError(null);

      const response = await fetch('/api/copy-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          resume_id: file.id,
          folder_path: folderPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success('File copied successfully!');
      

      await fetchResumes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to copy file";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so dialog can handle it
    } finally {
      setCopyingFile(false);
    }
  };

  const handleCopyClick = (file: ResumeFile) => {
    setFileToCopy(file);
    setCopyDialogOpen(true);
  };

  const handleMoveFile = async (file: ResumeFile, folderPath: string) => {
    if (!currentUser?.id) {
      setError("User not authenticated");
      toast.error("Please log in to move a file");
      throw new Error("User not authenticated");
    }

    try {
      setMovingFile(true);
      setError(null);

      const response = await fetch('/api/move-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          resume_id: file.id,
          folder_path: folderPath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success('File moved successfully!');
      

      await fetchResumes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to move file";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so dialog can handle it
    } finally {
      setMovingFile(false);
    }
  };

  const handleMoveClick = (file: ResumeFile) => {
    setFileToMove(file);
    setMoveDialogOpen(true);
  };

  const handleRenameFolder = async (folderKey: string, newFolderName: string) => {
    if (!currentUser?.id) {
      setError("User not authenticated");
      toast.error("Please log in to rename a folder");
      throw new Error("User not authenticated");
    }

    try {
      setRenamingFolder(true);
      setError(null);

      const response = await fetch('/api/rename-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          folder_key: folderKey,
          new_folder_name: newFolderName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success('Folder renamed successfully!');
      

      await fetchResumes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to rename folder";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so dialog can handle it
    } finally {
      setRenamingFolder(false);
    }
  };

  const handleRenameFolderClick = (folderKey: string, folderName: string) => {
    setFolderToRename({ folderKey, folderName });
    setRenameFolderDialogOpen(true);
  };

  const handleDeleteFolder = async (folderKey: string) => {
    if (!currentUser?.id) {
      setError("User not authenticated");
      toast.error("Please log in to delete a folder");
      throw new Error("User not authenticated");
    }

    try {
      setDeletingFolder(true);
      setError(null);

      const response = await fetch('/api/delete-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          folder_key: folderKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      toast.success('Folder deleted successfully!');
      

      await fetchResumes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete folder";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw so dialog can handle it
    } finally {
      setDeletingFolder(false);
    }
  };

  const handleDeleteFolderClick = (folderKey: string, folderName: string, fileCount: number) => {
    setFolderToDelete({ folderKey, folderName, fileCount });
    setDeleteFolderDialogOpen(true);
  };

  // If user is not Pro, show subscription message
  if (!isPro) {
    return (
      <div className="mx-auto p-8 dark:bg-[#212121] min-h-screen">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Lock className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl mb-2">File Storage is a Pro Feature</CardTitle>
            <CardDescription className="text-base">
              Subscribe to Pro plan to access file storage, upload resumes, and create folders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-sm">Pro Plan includes:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Upload files to File Storage
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Create folders to organize your resumes
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Save custom resume template and design
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Import and export resume as HTML
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Everything in Basic plan
                </li>
              </ul>
            </div>
            <Button 
              onClick={() => router.push('/pricing')}
              className="w-full"
              size="lg"
            >
              Subscribe to Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto p-8 space-y-6 dark:bg-[#212121] min-h-screen">
      {/* Header with Upload and Create Folder Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleUploadResumeClick}
            disabled={uploadingResume || !currentUser?.id}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Resume
          </Button>
          <Button
            onClick={() => setShowCreateFolderDialog(true)}
            disabled={!currentUser?.id}
            variant="outline"
            className="gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            Create New Folder
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20">
          <div className="text-red-600 dark:text-red-400 font-medium">
            ✗ Error
          </div>
          <div className="text-sm text-red-500 dark:text-red-400 mt-2">
            {error}
          </div>
        </div>
      )}

      {/* Files and Folders Table */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading resumes...</p>
        </div>
      ) : resumesData && (
        <div className="border rounded-lg bg-white dark:bg-[#303030] dark:text-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="dark:text-white">Name</TableHead>
                <TableHead className="dark:text-white">Created</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Root level files */}
              {resumesData.resumes.map((file) => (
                <FileRow 
                  key={file.id} 
                  file={file} 
                  onRename={() => handleRenameClick(file)}
                  onDelete={() => handleDeleteClick(file)}
                  onCopy={() => handleCopyClick(file)}
                  onMove={() => handleMoveClick(file)}
                />
              ))}

              {/* Folder structure */}
              {Object.entries(resumesData.folders).map(([folderName, folder]) => (
                <FolderRow 
                  key={folderName} 
                  folderName={folderName} 
                  folder={folder}
                  folderKey={folder.folder_key}
                  onRenameFile={(file) => handleRenameClick(file)}
                  onDeleteFile={(file) => handleDeleteClick(file)}
                  onCopyFile={(file) => handleCopyClick(file)}
                  onMoveFile={(file) => handleMoveClick(file)}
                  onRenameFolder={(folderKey, currentName) => handleRenameFolderClick(folderKey, currentName)}
                  onDeleteFolder={(folderKey, folderName, fileCount) => handleDeleteFolderClick(folderKey, folderName, fileCount)}
                />
              ))}

              {resumesData.resumes.length === 0 && Object.keys(resumesData.folders).length === 0 && (
                <EmptyState
                  onUploadClick={() => setShowUploadDialog(true)}
                  uploading={uploadingResume}
                  disabled={!currentUser?.id}
                />
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Folder Dialog */}
      {resumesData && (
        <>
          <CreateFolderDialog
            open={showCreateFolderDialog}
            onOpenChange={setShowCreateFolderDialog}
            folders={resumesData.folders}
            onCreateFolder={handleCreateFolder}
            creating={creatingFolder}
          />
          <UploadFileDialog
            open={showUploadDialog}
            onOpenChange={setShowUploadDialog}
            folders={resumesData.folders}
            onUpload={handleFileUpload}
            uploading={uploadingResume}
          />
          {fileToRename && (
            <RenameFileDialog
              open={renameDialogOpen}
              onOpenChange={setRenameDialogOpen}
              currentFilename={fileToRename.filename}
              onRename={(newFilename) => handleRenameFile(fileToRename, newFilename)}
              renaming={renamingFile}
            />
          )}
          {fileToDelete && (
            <DeleteFileDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              filename={fileToDelete.filename}
              onDelete={() => handleDeleteFile(fileToDelete)}
              deleting={deletingFile}
            />
          )}
          {fileToCopy && resumesData && (
            <CopyFileDialog
              open={copyDialogOpen}
              onOpenChange={setCopyDialogOpen}
              folders={resumesData.folders}
              filename={fileToCopy.filename}
              onCopy={(folderPath) => handleCopyFile(fileToCopy, folderPath)}
              copying={copyingFile}
            />
          )}
          {fileToMove && resumesData && (
            <MoveFileDialog
              open={moveDialogOpen}
              onOpenChange={setMoveDialogOpen}
              folders={resumesData.folders}
              filename={fileToMove.filename}
              onMove={(folderPath) => handleMoveFile(fileToMove, folderPath)}
              moving={movingFile}
            />
          )}
          {folderToRename && (
            <RenameFolderDialog
              open={renameFolderDialogOpen}
              onOpenChange={setRenameFolderDialogOpen}
              currentFolderName={folderToRename.folderName}
              onRename={(newFolderName) => handleRenameFolder(folderToRename.folderKey, newFolderName)}
              renaming={renamingFolder}
            />
          )}
          {folderToDelete && (
            <DeleteFolderDialog
              open={deleteFolderDialogOpen}
              onOpenChange={setDeleteFolderDialogOpen}
              folderName={folderToDelete.folderName}
              fileCount={folderToDelete.fileCount}
              onDelete={() => handleDeleteFolder(folderToDelete.folderKey)}
              deleting={deletingFolder}
            />
          )}
        </>
      )}
    </div>
  );
}
