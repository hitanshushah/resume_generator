"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Folder, FolderOpen, ChevronRight, ChevronDown, MoreVertical, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileRow } from "./FileRow";

interface FolderStructure {
  files: Array<{
    id: number;
    filename: string;
    url: string;
    created_at: string | null;
    updated_at: string | null;
  }>;
  folders: { [key: string]: FolderStructure };
  folder_key?: string;
}

interface FolderRowProps {
  folderName: string;
  folder: FolderStructure;
  folderKey?: string;
  level?: number;
  onRenameFile?: (file: FolderStructure['files'][0]) => void;
  onDeleteFile?: (file: FolderStructure['files'][0]) => void;
  onCopyFile?: (file: FolderStructure['files'][0]) => void;
  onMoveFile?: (file: FolderStructure['files'][0]) => void;
  onRenameFolder?: (folderKey: string, currentName: string) => void;
  onDeleteFolder?: (folderKey: string, folderName: string, fileCount: number) => void;
}

function countAllFiles(folder: FolderStructure): number {
  let count = folder.files.length;
  for (const subFolder of Object.values(folder.folders)) {
    count += countAllFiles(subFolder);
  }
  return count;
}

export function FolderRow({ folderName, folder, folderKey, level = 0, onRenameFile, onDeleteFile, onCopyFile, onMoveFile, onRenameFolder, onDeleteFolder }: FolderRowProps) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const totalFileCount = countAllFiles(folder);

  return (
    <>
      <TableRow 
        className="hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell className="w-[50px]">
          <div 
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 20}px` }}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            )}
            {isOpen ? (
              <FolderOpen className="h-5 w-5 text-blue-500" />
            ) : (
              <Folder className="h-5 w-5 text-blue-500" />
            )}
          </div>
        </TableCell>
        <TableCell className="font-medium min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{folderName}</span>
            <span className="text-sm text-zinc-500 whitespace-nowrap">
              ({totalFileCount} {totalFileCount === 1 ? 'file' : 'files'})
            </span>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    if (onRenameFolder && folderKey) {
                      onRenameFolder(folderKey, folderName);
                    } else {
                      console.log('Rename folder:', folderName);
                    }
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    variant="destructive"
                    onClick={() => {
                      if (onDeleteFolder && folderKey) {
                        onDeleteFolder(folderKey, folderName, totalFileCount);
                      } else {
                        console.log('Delete folder:', folderName);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-sm text-zinc-500 hidden md:table-cell">-</TableCell>
        <TableCell className="w-[100px] hidden md:table-cell">
        </TableCell>
      </TableRow>
      
      {isOpen && (
        <>
          {/* Files in this folder */}
          {folder.files.map((file) => (
            <FileRow 
              key={file.id} 
              file={file} 
              level={level + 1}
              onRename={onRenameFile ? () => onRenameFile(file) : undefined}
              onDelete={onDeleteFile ? () => onDeleteFile(file) : undefined}
              onCopy={onCopyFile ? () => onCopyFile(file) : undefined}
              onMove={onMoveFile ? () => onMoveFile(file) : undefined}
            />
          ))}
          
          {/* Subfolders */}
          {Object.entries(folder.folders).map(([name, subFolder]) => (
            <FolderRow 
              key={name} 
              folderName={name} 
              folder={subFolder}
              folderKey={subFolder.folder_key}
              level={level + 1}
              onRenameFile={onRenameFile}
              onDeleteFile={onDeleteFile}
              onCopyFile={onCopyFile}
              onMoveFile={onMoveFile}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </>
      )}
    </>
  );
}

