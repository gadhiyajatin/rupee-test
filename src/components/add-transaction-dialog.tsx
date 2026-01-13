

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionForm } from "./transaction-form";
import type { RupeeBook, Transaction, Member } from "@/lib/types";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "in" | "out";
  onAddTransaction: (transaction: Omit<Transaction, "id" | "memberId">) => void;
  rupeebook: RupeeBook;
  loggedInMember: Member | null;
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  type,
  onAddTransaction,
  rupeebook,
  loggedInMember,
}: AddTransactionDialogProps) {
  if (!rupeebook) {
    return null;
  }

  const handleSuccess = (values: any) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    const combinedDate = new Date(values.date);
    combinedDate.setHours(hours, minutes);

    onAddTransaction({ ...values, date: combinedDate.toISOString(), remark: values.remark || "", subcategory: values.subcategory || "" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 min-h-[550px] flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Add Cash {type === "in" ? "In" : "Out"}</DialogTitle>
        </DialogHeader>
        <TransactionForm
          type={type}
          rupeebook={rupeebook}
          loggedInMember={loggedInMember}
          onFormSubmit={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

    
