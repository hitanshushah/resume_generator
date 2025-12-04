"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WebbStyleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebbStyleModal({ open, onOpenChange }: WebbStyleModalProps) {
  const handleGoToWebbStyle = () => {
    const url = process.env.NEXT_PUBLIC_WEBBSTYLE_URL || "https://admin.webbstyle.com";
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Go to WebbStyle</DialogTitle>
          <DialogDescription className="pt-2">
            To add profile information, please go to the WebbStyle
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm font-medium mb-3 text-gray-900 dark:text-black">
            What you can do in WebbStyle:
          </p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-500">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Create your personal website</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Customize your theme</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Choose from variety of templates</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Add and Manage personal data and information</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Host your website in minutes</span>
            </li>
          </ul>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button onClick={handleGoToWebbStyle}>
            Go to WebbStyle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

