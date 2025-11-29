"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner";
import { Upload, FolderPlus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileRow } from "./components/FileRow";
import { FolderRow } from "./components/FolderRow";
import { EmptyState } from "./components/EmptyState";
import { CreateFolderDialog } from "./components/CreateFolderDialog";
import { UploadFileDialog } from "./components/UploadFileDialog";

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
}

interface ResumesData {
  resumes: ResumeFile[];
  folders: { [key: string]: FolderStructure };
}

export default function ResumePage() {
  const { user } = useUser();
  const { user: storeUser } = useUserStore();
  // Fallback to store user if context user is not available
  const currentUser = user || storeUser;
  const [uploadingResume, setUploadingResume] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumesData, setResumesData] = useState<ResumesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

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
      
      // Refresh the resumes list
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
      
      // Refresh the resumes list
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

  return (
    <div className="container mx-auto p-8 space-y-6">
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
        <div className="border rounded-lg bg-white dark:bg-[#212121]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Root level files */}
              {resumesData.resumes.map((file) => (
                <FileRow key={file.id} file={file} />
              ))}

              {/* Folder structure */}
              {Object.entries(resumesData.folders).map(([folderName, folder]) => (
                <FolderRow 
                  key={folderName} 
                  folderName={folderName} 
                  folder={folder}
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
        </>
      )}
    </div>
  );
}
