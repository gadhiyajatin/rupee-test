
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RupeeBook, Business } from "@/lib/types";
import { Label } from "./ui/label";

interface MoveBookDialogProps {
  rupeebook: RupeeBook;
  businesses: Business[];
  onMoveBook: (rupeebookId: string, targetBusinessId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoveBookDialog({
  rupeebook,
  businesses,
  onMoveBook,
  open,
  onOpenChange,
}: MoveBookDialogProps) {
  const [selectedBusiness, setSelectedBusiness] = useState<string | undefined>();

  const handleConfirmMove = () => {
    if (selectedBusiness) {
      onMoveBook(rupeebook.id, selectedBusiness);
      setSelectedBusiness(undefined);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move "{rupeebook.name}"</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Select a workspace to move this book to.</p>
        <div className="space-y-2">
          <Label htmlFor="move-book-select">Destination</Label>
          <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
            <SelectTrigger id="move-book-select">
              <SelectValue placeholder="Select a workspace" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmMove} disabled={!selectedBusiness}>
            Move Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
