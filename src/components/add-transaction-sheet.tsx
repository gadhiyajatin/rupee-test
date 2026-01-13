
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TransactionForm } from "./transaction-form";
import type { RupeeBook, Transaction, Member } from "@/lib/types";

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "in" | "out";
  onAddTransaction: (transaction: Omit<Transaction, "id" | "memberId">) => void;
  rupeebook: RupeeBook;
  loggedInMember: Member | null;
}

export function AddTransactionSheet({
  open,
  onOpenChange,
  type,
  onAddTransaction,
  rupeebook,
  loggedInMember,
}: AddTransactionSheetProps) {

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-0 flex flex-col h-[90dvh]">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Add Cash {type === "in" ? "In" : "Out"}</SheetTitle>
        </SheetHeader>
        <TransactionForm
          type={type}
          rupeebook={rupeebook}
          loggedInMember={loggedInMember}
          onFormSubmit={handleSuccess}
          onCancel={() => onOpenChange(false)}
          isMobile={true}
        />
      </SheetContent>
    </Sheet>
  );
}
