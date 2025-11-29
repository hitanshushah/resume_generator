"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { File, Download, ExternalLink, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
}

export function FileRow({ file, level = 0 }: FileRowProps) {
  return (
    <TableRow className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <TableCell className="w-[50px]">
        <div style={{ paddingLeft: `${level * 20}px` }}>
          <File className="h-5 w-5 text-zinc-500" />
        </div>
      </TableCell>
      <TableCell className="font-medium">{file.filename}</TableCell>
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
            <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const link = document.createElement('a');
              link.href = file.url;
              link.download = file.filename;
              link.click();
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

