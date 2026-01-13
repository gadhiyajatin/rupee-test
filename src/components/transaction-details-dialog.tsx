
"use client";

import React from "react";
import { format } from "date-fns";
import { IndianRupee, Pencil, Trash2, ArrowUp, ArrowDown, User, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Transaction, Member, RupeeBook } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "./ui/avatar";
import Link from 'next/link';

interface TransactionDetailsDialogProps {
  transaction: Transaction;
  rupeebook: RupeeBook;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  loggedInMember: Member | null;
}

export function TransactionDetailsDialog({
  transaction,
  rupeebook,
  memberName,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  loggedInMember
}: TransactionDetailsDialogProps) {

  const isCashIn = transaction.type === 'in';
  
  const canEdit = 
    loggedInMember?.role === 'owner' || 
    loggedInMember?.role === 'admin' || 
    (loggedInMember?.role === 'data-operator' && rupeebook.dataOperatorSettings?.allowEntryEditing);

  const canDelete =
    loggedInMember?.role === 'owner' || 
    loggedInMember?.role === 'admin' ||
    (loggedInMember?.role === 'data-operator' && rupeebook.dataOperatorSettings?.allowEntryEditing);

  const handleEditClick = () => {
    onOpenChange(false); // Close this dialog
    onEdit(); // Open the edit dialog
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center justify-center space-y-2">
             <div className={cn("flex items-center text-3xl font-bold", isCashIn ? "text-green-600" : "text-red-600")}>
              {isCashIn ? <ArrowUp className="mr-2 h-7 w-7" /> : <ArrowDown className="mr-2 h-7 w-7" />}
              <IndianRupee className="h-6 w-6" />
              <span>{transaction.amount.toLocaleString('en-IN')}</span>
            </div>
             <Badge variant={isCashIn ? "default" : "destructive"}>
                {isCashIn ? "Cash In" : "Cash Out"}
             </Badge>
          </div>
          
          <Separator />

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="text-muted-foreground">Date</div>
            <div className="text-right font-medium">{format(new Date(transaction.date), "dd-MM-yy, h:mm a")}</div>

            <div className="text-muted-foreground">Category</div>
            <div className="text-right font-medium">{transaction.category}</div>
            
            {transaction.subcategory && (
                <>
                <div className="text-muted-foreground">Subcategory</div>
                <div className="text-right font-medium">{transaction.subcategory}</div>
                </>
            )}

            <div className="text-muted-foreground">Entry By</div>
            <div className="text-right font-medium flex items-center justify-end gap-2">
               <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">{memberName.charAt(0)}</AvatarFallback>
                </Avatar>
                {memberName}
            </div>
          </div>
          
          {transaction.remark && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">Remark</h4>
                <p className="text-sm font-medium p-3 bg-muted/50 rounded-md whitespace-pre-wrap">{transaction.remark}</p>
              </div>
            </>
          )}

          {transaction.attachmentUrl && (
             <>
              <Separator />
               <div>
                  <h4 className="text-sm text-muted-foreground mb-2">Attachment</h4>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={transaction.attachmentUrl} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      View Attachment
                    </Link>
                  </Button>
               </div>
             </>
          )}

        </div>
        {(canEdit || canDelete) && (
          <DialogFooter className="grid grid-cols-2 gap-2 sm:space-x-0">
              {canEdit && (
                <Button variant="outline" onClick={handleEditClick}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className={!canEdit ? 'col-span-2' : ''}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this transaction.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
