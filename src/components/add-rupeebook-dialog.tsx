
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React, { useEffect } from 'react';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Business } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(1, "RupeeBook name is required."),
  businessId: z.string().min(1, "Please select a workspace."),
});

type AddRupeeBookDialogProps = {
  onAddRupeeBook: (name: string, businessId: string) => void;
  children: React.ReactNode;
  businesses: Business[];
  activeBusinessId: string | null;
};

export function AddRupeeBookDialog({
  onAddRupeeBook,
  children,
  businesses,
  activeBusinessId,
}: AddRupeeBookDialogProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      businessId: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        businessId: activeBusinessId || (businesses && businesses.length > 0 ? businesses[0].id : ""),
      });
    }
  }, [open, activeBusinessId, businesses, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddRupeeBook(values.name, values.businessId);
    form.reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New RupeeBook</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="businessId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a workspace" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>
                          {business.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RupeeBook Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ghar Kharch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
               <Button type="submit">Create RupeeBook</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
