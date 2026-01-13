

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Calendar as CalendarIcon,
  Clock,
  IndianRupee,
  Link as LinkIcon,
  PlusCircle,
  ChevronRight,
  Calculator,
  ChevronsUpDown,
  Check,
  X,
} from "lucide-react";
import { format, startOfYesterday } from "date-fns";
import React, { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { RupeeBook, Member } from "@/lib/types";
import { ScrollArea } from "./ui/scroll-area";
import { CalculatorDialog } from "./calculator-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "./ui/sheet";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "./ui/command";

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

interface TransactionFormProps {
  type: "in" | "out";
  rupeebook: RupeeBook;
  loggedInMember: Member | null;
  onFormSubmit: (values: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
  initialData?: Partial<z.infer<typeof formSchema>>;
  isMobile?: boolean;
}

export function TransactionForm({
  type,
  rupeebook,
  loggedInMember,
  onFormSubmit,
  onCancel,
  initialData,
  isMobile = false,
}: TransactionFormProps) {
  const now = new Date();
  const [showAttachment, setShowAttachment] = useState(!!initialData?.attachmentUrl);
  
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [subcategorySheetOpen, setSubcategorySheetOpen] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [subcategoryPopoverOpen, setSubcategoryPopoverOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      type: type,
      amount: undefined,
      date: now,
      time: format(now, "HH:mm"),
      category: "",
      subcategory: "",
      remark: "",
      attachmentUrl: "",
    },
  });

  useEffect(() => {
    form.reset(initialData || {
      type: type,
      amount: undefined,
      date: new Date(),
      time: format(new Date(), "HH:mm"),
      category: "",
      subcategory: "",
      remark: "",
      attachmentUrl: "",
    });
    setShowAttachment(!!initialData?.attachmentUrl);
  }, [initialData, type, form]);
  
  const isDataOperator = loggedInMember?.role === 'data-operator';
  const backdateSettings = rupeebook.dataOperatorSettings?.allowBackdatedEntries;
  
  let calendarDisabled: any = false;
  if (isDataOperator && backdateSettings === 'never') {
    calendarDisabled = { before: new Date() };
  } else if (isDataOperator && backdateSettings === 'one-day-before') {
    calendarDisabled = { before: startOfYesterday() };
  }
  
  if (!rupeebook) {
    return null;
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

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="flex flex-col flex-1 h-full">
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
                                  value={field.value ?? ''}
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
                          <FormItem className="flex flex-col">
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
                                <PopoverTrigger asChild disabled={isDataOperator && backdateSettings !== 'always'}>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn("w-full text-left font-normal h-11", isMobile && "h-12 text-base")}
                                    >
                                      {field.value ? format(field.value, "dd-MM-yy") : <span>Pick a date</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={calendarDisabled}
                                    initialFocus
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
                                  <Input type="time" className="pl-9 h-11" {...field} />
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

          <div className={cn("grid grid-cols-2 gap-4 shrink-0", isMobile ? "p-4 border-t" : "px-6 pb-6 pt-2")}>
            <Button type="button" variant="ghost" className="h-12 text-base" onClick={onCancel}>Cancel</Button>
            <Button type="submit" className="h-12 text-base">Save Transaction</Button>
          </div>
        </form>
      </Form>

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

export const CategoryFilterSheet = ({
    open,
    onOpenChange,
    options,
    value,
    onChange,
    title,
    showSearch = true,
    mode = "multi"
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    options: {value: string; label: string}[],
    value: string[],
    onChange: (value: string[]) => void,
    title: string,
    showSearch?: boolean,
    mode?: "single" | "multi"
}) => {
    const [localSelected, setLocalSelected] = useState(value);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if(open) {
            setLocalSelected(value);
            setSearch('');
        }
    }, [open, value]);

    const handleSelect = (itemValue: string) => {
        if (mode === "single") {
            onChange([itemValue]);
            onOpenChange(false);
            return;
        }
        setLocalSelected(prev => 
            prev.includes(itemValue)
                ? prev.filter(i => i !== itemValue)
                : [...prev, itemValue]
        );
    }
    
    const handleSelectAll = () => {
        const filteredValues = filteredOptions.map(o => o.value);
        const allSelectedInFilter = filteredValues.every(v => localSelected.includes(v));

        if (allSelectedInFilter) {
            // Deselect all that are currently filtered
            setLocalSelected(prev => prev.filter(p => !filteredValues.includes(p)));
        } else {
            // Select all that are currently filtered
            setLocalSelected(prev => [...new Set([...prev, ...filteredValues])]);
        }
    }

    const handleApply = () => {
        onChange(localSelected);
        onOpenChange(false);
    }

    const handleClear = () => {
        setLocalSelected([]);
        onChange([]);
        onOpenChange(false);
    }
    
    const filteredOptions = (showSearch && search)
        ? options.filter(option => option.label.toLowerCase().includes(search.toLowerCase()))
        : options;
    
    const isSubcategorySheet = title === "Select Subcategory";


    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="p-0 flex flex-col h-[90dvh]">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                 <Command className="flex-1 flex flex-col min-h-0" shouldFilter={false}>
                    {showSearch && (
                        <div className="p-4 border-b">
                            <CommandInput 
                                placeholder="Search..." 
                                value={search} 
                                onValueChange={setSearch} 
                                autoFocus={false}
                            />
                        </div>
                    )}
                    <ScrollArea className="flex-1">
                        <CommandList className="p-4">
                            {isSubcategorySheet && (
                                <CommandItem onSelect={() => handleSelect('')} className="p-3 border rounded-lg mb-2 aria-selected:bg-primary/10 font-bold text-base text-muted-foreground">
                                    <Check className={cn("mr-3 h-5 w-5", value.length === 0 || value[0] === '' ? "opacity-100" : "opacity-0")} />
                                    None
                                </CommandItem>
                            )}
                             {options.length > 0 ? (
                                <>
                                {mode === 'multi' && (
                                    <CommandItem onSelect={handleSelectAll} className="font-semibold p-3 border rounded-lg mb-2 text-base">
                                        <Check
                                            className={cn(
                                            "mr-3 h-5 w-5",
                                            filteredOptions.length > 0 && filteredOptions.every(o => localSelected.includes(o.value))
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                        />
                                        {filteredOptions.every(o => localSelected.includes(o.value)) ? 'Deselect All' : 'Select All'}
                                    </CommandItem>
                                )}
                                {filteredOptions.map(option => (
                                    <CommandItem 
                                        key={option.value}
                                        onSelect={() => handleSelect(option.value)}
                                        className="p-3 border rounded-lg mb-2 aria-selected:bg-primary/10 font-bold text-base"
                                    >
                                       {(mode === 'single') && (
                                         <Check
                                            className={cn(
                                            "mr-3 h-5 w-5",
                                            localSelected.includes(option.value)
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                        />
                                       )}
                                        {option.label}
                                    </CommandItem>
                                ))}
                                </>
                            ) : (
                                !isSubcategorySheet && <p className="text-center text-sm text-muted-foreground py-4">No {title.toLowerCase().replace(/select /,'').replace(/s$/, '')} to select.</p>
                            )}
                        </CommandList>
                    </ScrollArea>
                </Command>
                {mode === 'multi' && (
                    <SheetFooter className="p-4 border-t grid grid-cols-2 gap-2">
                        <Button variant="ghost" onClick={handleClear} className="w-full">
                            <X className="mr-2 h-4 w-4"/> Clear
                        </Button>
                        <Button onClick={handleApply} className="w-full">Apply</Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    )
}
