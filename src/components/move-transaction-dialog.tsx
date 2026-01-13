
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import type { RupeeBook } from "@/lib/types";
import { Label } from "./ui/label";

interface MoveTransactionDialogProps {
  destinationRupeeBooks: RupeeBook[];
  onMove: (targetRupeeBookId: string) => void;
  children: React.ReactNode;
}

export function MoveTransactionDialog({
  destinationRupeeBooks,
  onMove,
  children,
}: MoveTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | undefined>();

  const handleConfirmMove = () => {
    if (selectedBook) {
      onMove(selectedBook);
      setSelectedBook(undefined);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to another book</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Select a book to move the selected entries to.</p>
        <div className="space-y-2">
          <Label htmlFor="move-book-select">Destination Book</Label>
          <Select value={selectedBook} onValueChange={setSelectedBook}>
            <SelectTrigger id="move-book-select">
              <SelectValue placeholder="Select a book" />
            </SelectTrigger>
            <SelectContent>
              {destinationRupeeBooks.map((book) => (
                <SelectItem key={book.id} value={book.id}>
                  {book.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmMove} disabled={!selectedBook}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    