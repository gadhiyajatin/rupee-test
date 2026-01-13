
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React, { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { RupeeBook } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "RupeeBook name is required."),
});

type RenameBookDialogProps = {
  rupeebook: RupeeBook;
  onUpdateRupeeBook: (updates: Partial<RupeeBook>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RenameBookDialog({
  rupeebook,
  onUpdateRupeeBook,
  open,
  onOpenChange
}: RenameBookDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: rupeebook.name,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: rupeebook.name });
    }
  }, [open, rupeebook, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onUpdateRupeeBook({ name: values.name });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Book</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RupeeBook Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Household Expenses" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
               <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
