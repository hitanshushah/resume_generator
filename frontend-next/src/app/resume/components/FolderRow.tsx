"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
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
}

interface FolderRowProps {
  folderName: string;
  folder: FolderStructure;
  level?: number;
}

function countAllFiles(folder: FolderStructure): number {
  let count = folder.files.length;
  for (const subFolder of Object.values(folder.folders)) {
    count += countAllFiles(subFolder);
  }
  return count;
}

export function FolderRow({ folderName, folder, level = 0 }: FolderRowProps) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const totalFileCount = countAllFiles(folder);

  return (
    <>
      <TableRow className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
        <TableCell className="w-[50px]">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            style={{ paddingLeft: `${level * 20}px` }}
            onClick={() => setIsOpen(!isOpen)}
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
        <TableCell className="font-medium">
          <span className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            {folderName}
          </span>
          <span className="text-sm text-zinc-500 ml-2">
            ({totalFileCount} {totalFileCount === 1 ? 'file' : 'files'})
          </span>
        </TableCell>
        <TableCell className="text-sm text-zinc-500">-</TableCell>
        <TableCell className="w-[100px]"></TableCell>
      </TableRow>
      
      {isOpen && (
        <>
          {/* Files in this folder */}
          {folder.files.map((file) => (
            <FileRow key={file.id} file={file} level={level + 1} />
          ))}
          
          {/* Subfolders */}
          {Object.entries(folder.folders).map(([name, subFolder]) => (
            <FolderRow 
              key={name} 
              folderName={name} 
              folder={subFolder} 
              level={level + 1}
            />
          ))}
        </>
      )}
    </>
  );
}

