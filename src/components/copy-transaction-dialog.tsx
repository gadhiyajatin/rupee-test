
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RupeeBook } from "@/lib/types";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyTransactionDialogProps {
  destinationRupeeBooks: RupeeBook[];
  onCopy: (targetRupeeBookIds: string[]) => void;
  children: React.ReactNode;
}

export function CopyTransactionDialog({
  destinationRupeeBooks,
  onCopy,
  children,
}: CopyTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());

  const handleToggleBook = (bookId: string) => {
    setSelectedBooks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  const handleConfirmCopy = () => {
    onCopy(Array.from(selectedBooks));
    setSelectedBooks(new Set());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy to another book</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select one or more books to copy the selected entries to.
        </p>
        <ScrollArea className="h-60 w-full rounded-md border">
          <div className="p-2">
            {destinationRupeeBooks.map((book) => (
              <div
                key={book.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent",
                  selectedBooks.has(book.id) && "bg-primary/10"
                )}
                onClick={() => handleToggleBook(book.id)}
              >
                <div className="bg-muted p-3 rounded-full">
                    <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 font-medium">{book.name}</div>
                <Checkbox
                  id={`book-${book.id}`}
                  checked={selectedBooks.has(book.id)}
                  onCheckedChange={() => handleToggleBook(book.id)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmCopy} disabled={selectedBooks.size === 0}>
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    