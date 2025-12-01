"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { File, Download, ExternalLink, MoreVertical, Copy, Move, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileRowProps {
  file: {
    id: number;
    filename: string;
    url: string;
    created_at: string | null;
    updated_at: string | null;
  };
  level?: number;
  onRename?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onMove?: () => void;
}

export function FileRow({ file, level = 0, onRename, onDelete, onCopy, onMove }: FileRowProps) {
  return (
    <TableRow className="hover:bg-zinc-50 dark:hover:bg-zinc-900 group/item">
      <TableCell className="w-[50px]">
        <div style={{ paddingLeft: `${level * 20}px` }}>
          <File className="h-5 w-5 text-zinc-500" />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span>{file.filename}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => window.open(file.url, '_blank')}
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => window.open(file.url, '_blank')}
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm text-zinc-500">
        {file.created_at ? new Date(file.created_at).toLocaleDateString() : '-'}
      </TableCell>
      <TableCell className="w-[100px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              if (onCopy) {
                onCopy();
              } else {
                console.log('Copy file:', file.id);
              }
            }}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (onMove) {
                onMove();
              } else {
                console.log('Move file:', file.id);
              }
            }}>
              <Move className="h-4 w-4 mr-2" />
              Move
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (onRename) {
                onRename();
              } else {
                console.log('Rename file:', file.id);
              }
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              variant="destructive"
              onClick={() => {
                if (onDelete) {
                  onDelete();
                } else {
                  console.log('Delete file:', file.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

