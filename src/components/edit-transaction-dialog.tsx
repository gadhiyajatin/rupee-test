

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Calendar as CalendarIcon,
  IndianRupee,
  Clock,
  Link as LinkIcon,
  PlusCircle,
  ChevronsUpDown,
  Check,
  Trash2,
  ChevronRight,
  X,
  Calculator,
} from "lucide-react";
import { format, startOfYesterday } from "date-fns";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RupeeBook, Transaction, Member } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
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
import { useIsMobile } from "@/hooks/use-mobile";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { CalculatorDialog } from "./calculator-dialog";
import { CategoryFilterSheet } from "@/components/transaction-form";


const formSchema = z.object({
  type: z.enum(["in", "out"]),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  date: z.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  category: z.string().min(1, "Category is required."),
  subcategory: z.string().optional(),
  remark: z.string().optional(),
  attachmentUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
});

type EditTransactionDialogProps = {
  transaction: Transaction | null;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionIds: string[]) => void;
  rupeebook: RupeeBook;
  onUpdateBookSettings: (categories: string[], subcategories: string[]) => void;
  loggedInMember: Member | null;
  onClose: () => void;
};

export function EditTransactionDialog({
  transaction,
  onEditTransaction,
  onDeleteTransaction,
  rupeebook,
  onUpdateBookSettings,
  loggedInMember,
  onClose
}: EditTransactionDialogProps) {
  
  const [showAttachment, setShowAttachment] = useState(!!transaction?.attachmentUrl);
  
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [subcategorySheetOpen, setSubcategorySheetOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [subcategoryPopoverOpen, setSubcategoryPopoverOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  
  const isMobile = useIsMobile();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: transaction ? {
      ...transaction,
      date: new Date(transaction.date),
      time: format(new Date(transaction.date), "HH:mm"),
      remark: transaction.remark || "",
      subcategory: transaction.subcategory || "",
      attachmentUrl: transaction.attachmentUrl || "",
    } : {},
  });

  const isDataOperator = loggedInMember?.role === 'data-operator';
  const backdateSettings = rupeebook.dataOperatorSettings?.allowBackdatedEntries;

  let calendarDisabled: any = false;
  if (isDataOperator && backdateSettings === 'never') {
    calendarDisabled = { before: new Date() };
  } else if (isDataOperator && backdateSettings === 'one-day-before') {
    calendarDisabled = { before: startOfYesterday() };
  }

  const canEdit = 
    loggedInMember?.role === 'owner' || 
    loggedInMember?.role === 'admin' || 
    (isDataOperator && rupeebook.dataOperatorSettings?.allowEntryEditing);

  useEffect(() => {
    if (transaction) {
      if (!canEdit && !isMobile) {
        onClose();
        return;
      }
      const transactionDate = new Date(transaction.date);
      form.reset({
        ...transaction,
        date: transactionDate,
        time: format(transactionDate, "HH:mm"),
        remark: transaction.remark || "",
        subcategory: transaction.subcategory || "",
        attachmentUrl: transaction.attachmentUrl || "",
      });
      setShowAttachment(!!transaction.attachmentUrl);
    }
  }, [transaction, form, canEdit, onClose, isMobile]);
  
  if (!transaction) {
    return null;
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const [hours, minutes] = values.time.split(':').map(Number);
    const combinedDate = new Date(values.date);
    combinedDate.setHours(hours, minutes);

    onEditTransaction({ ...values, id: transaction!.id, memberId: transaction!.memberId, date: combinedDate.toISOString(), remark: values.remark || "", subcategory: values.subcategory || "" });
    onClose();
  }
  
  function handleDelete() {
      onDeleteTransaction([transaction!.id]);
      onClose();
  }


  const categoryOptions = rupeebook.categories.map(c => ({ value: c, label: c }));
  const subcategoryOptions = rupeebook.subcategories.map(sc => ({ value: sc, label: sc }));
  
  const selectedCategory = form.watch('category');
  const selectedSubCategory = form.watch('subcategory');

  const CategoryPopover = ({field, className}: any) => (
     <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !field.value && "text-muted-foreground",
              className
            )}
          >
            {field.value
              ? categoryOptions.find(
                  (option) => option.value === field.value
                )?.label
              : "Select a category"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search category..."/>
          <CommandList>
            <ScrollArea className="h-48">
              <CommandEmpty>No category found.</CommandEmpty>
              <CommandGroup>
                  {categoryOptions.map((option) => (
                  <CommandItem
                      value={option.label}
                      key={option.value}
                      onSelect={() => {
                      form.setValue("category", option.value);
                      setCategoryPopoverOpen(false);
                      }}
                  >
                      <Check
                      className={cn(
                          "mr-2 h-4 w-4",
                          option.value === field.value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                      />
                      {option.label}
                  </CommandItem>
                  ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  const CategoryButton = ({field}: any) => (
    <FormControl>
        <Button variant="outline" type="button" className="w-full justify-between h-12 text-base" onClick={() => setCategorySheetOpen(true)}>
            <span className={cn(!field.value && "text-muted-foreground")}>{field.value || "Select a category"}</span>
            <ChevronRight className="h-5 w-5" />
        </Button>
    </FormControl>
  );

 const SubcategoryPopover = ({field, className}: any) => (
     <Popover open={subcategoryPopoverOpen} onOpenChange={setSubcategoryPopoverOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !field.value && "text-muted-foreground",
              className
            )}
          >
            {field.value
              ? subcategoryOptions.find(
                  (option) => option.value === field.value
                )?.label
              : "Select a subcategory"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
           <CommandInput placeholder="Search subcategory..."/>
            <CommandList>
              <ScrollArea className="h-48">
                <CommandEmpty>No subcategory found.</CommandEmpty>
                <CommandGroup>
                    <CommandItem onSelect={() => { form.setValue("subcategory", ""); setSubcategoryPopoverOpen(false);}} className="text-muted-foreground">
                        <Check className={cn("mr-2 h-4 w-4", !field.value ? "opacity-100" : "opacity-0")} />
                        None
                    </CommandItem>
                    {subcategoryOptions.map((option) => (
                    <CommandItem
                        value={option.label}
                        key={option.value}
                        onSelect={() => {
                        form.setValue("subcategory", option.value);
                        setSubcategoryPopoverOpen(false);
                        }}
                    >
                        <Check
                        className={cn(
                            "mr-2 h-4 w-4",
                            option.value === field.value
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                        />
                        {option.label}
                    </CommandItem>
                    ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
  
  const SubcategoryButton = ({field}: any) => (
    <FormControl>
        <Button variant="outline" type="button" className="w-full justify-between h-12 text-base" onClick={() => setSubcategorySheetOpen(true)}>
            <span className={cn(!field.value && "text-muted-foreground")}>{field.value || "Select a subcategory"}</span>
            <ChevronRight className="h-5 w-5" />
        </Button>
    </FormControl>
  );

  const EditForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 h-full">
        <DialogHeader className={cn("p-6 pb-4", isMobile && "p-4 border-b")}>
          <DialogTitle>{isMobile ? "Edit Transaction" : "Transaction Details"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 h-full">
            {/* Left Column */}
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="decimal"
                          placeholder="0"
                          className="pl-9 h-11"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        type="button"
                        onClick={() => setIsCalculatorOpen(true)}
                      >
                        <Calculator className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Category</FormLabel>
                    {isMobile ? <CategoryButton field={field} /> : <CategoryPopover field={field} className="h-11" />}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem className={cn("flex flex-col", !isMobile && "mt-2")}>
                    <FormLabel>Subcategory</FormLabel>
                    {isMobile ? <SubcategoryButton field={field} /> : <SubcategoryPopover field={field} className="h-11" />}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full text-left font-normal h-11",
                                !field.value && "text-muted-foreground",
                                isMobile && "h-12 text-base"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "dd-MM-yy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={new Date(field.value)}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={calendarDisabled}
                            captionLayout="dropdown-buttons"
                            fromYear={2015}
                            toYear={new Date().getFullYear() + 5}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Time</FormLabel>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input
                            type="time"
                            className="pl-9 h-11"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

               <div className="pt-0">
                {showAttachment ? (
                  <FormField
                    control={form.control}
                    name="attachmentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attachment URL (Optional)</FormLabel>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://example.com/invoice.pdf"
                              className="pl-9 h-11"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                if (e.target.value === '') {
                                  setShowAttachment(false);
                                }
                              }}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <Button variant="outline" type="button" onClick={() => setShowAttachment(true)} className="w-full h-11">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Attachment
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col py-4">
              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem className="flex flex-col flex-1">
                    <FormLabel>Remark (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add a note..." {...field} className="flex-1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>


        <DialogFooter className={cn("p-6 pt-2", isMobile && "p-4 border-t mt-auto")}>
          <div className="grid grid-cols-2 gap-4 shrink-0 w-full">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className={cn("w-full h-11", isMobile && "h-12 text-base")}>
                  <Trash2 className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
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
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" className={cn("h-11", isMobile && "h-12 text-base")}>Save Changes</Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <>
    <Dialog open={!!transaction && !isMobile} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-0 flex flex-col w-full sm:max-w-3xl min-h-[550px]">
            <EditForm />
        </DialogContent>
    </Dialog>

    <Sheet open={!!transaction && isMobile} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="p-0 flex flex-col h-[90dvh]">
             <EditForm />
        </SheetContent>
    </Sheet>
    
    <CategoryFilterSheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        options={categoryOptions}
        value={selectedCategory ? [selectedCategory] : []}
        onChange={(value) => form.setValue('category', value[0] || '')}
        title="Select Category"
        mode="single"
        showSearch={true}
    />
    <CategoryFilterSheet
        open={subcategorySheetOpen}
        onOpenChange={setSubcategorySheetOpen}
        options={subcategoryOptions}
        value={selectedSubCategory ? [selectedSubCategory] : []}
        onChange={(value) => form.setValue('subcategory', value[0] || '')}
        title="Select Subcategory"
        mode="single"
        showSearch={true}
    />
    <CalculatorDialog 
        open={isCalculatorOpen} 
        onOpenChange={setIsCalculatorOpen}
        onSetValue={(value) => form.setValue('amount', value, { shouldValidate: true })}
        initialValue={form.getValues('amount')}
      />
    </>
  );
}
