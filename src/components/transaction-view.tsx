

"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, startOfYesterday, startOfToday, endOfYesterday, startOfWeek, subWeeks, endOfWeek } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar as CalendarIcon,
  Search,
  IndianRupee,
  SlidersHorizontal,
  Copy,
  FolderInput,
  X,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  Trash2,
  ChevronDown,
  Check,
  MoreVertical,
  Settings,
  History,
  Upload,
  FileText,
  Paperclip,
  Plus,
  Loader2,
  AreaChart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Transaction, RupeeBook, Member } from "@/lib/types";
import { DateRange } from "react-day-picker";
import { CopyTransactionDialog } from "./copy-transaction-dialog";
import { MoveTransactionDialog } from "./move-transaction-dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { cn } from "@/lib/utils";
import { TransactionDetailsDialog } from "./transaction-details-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import Link from "next/link";
import { BookSettingsSheet } from "./book-settings-sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";


interface TransactionViewProps {
  transactions: Transaction[];
  allRupeeBooks: RupeeBook[];
  members: Member[];
  activeRupeeBook: RupeeBook;
  onAddTransaction: (transaction: Omit<Transaction, "id" | "memberId">) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionIds: string[]) => void;
  onCopyTransactions: (transactionIds: string[], targetRupeeBookIds: string[]) => void;
  onMoveTransactions: (transactionIds: string[], targetRupeeBookId: string) => void;
  onUpdateBookSettings: (categories: string[], subcategories: string[]) => void;
  loggedInMember: Member | null;
  selectedTransactionId: string | null;
  setSelectedTransactionId: (id: string | null) => void;
  onAddButtonClick: (type: 'in' | 'out') => void;
  onSummaryUpdate: (summary: { totalCashIn: number; totalCashOut: number; netBalance: number; }) => void;
}

const ClientOnlyTime = ({ date }: { date: Date | string }) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return <>{format(d, 'h:mm a')}</>;
}


const DeleteAllEntriesDialog = ({ bookName, onConfirm }: { bookName: string, onConfirm: () => void }) => {
    const [confirmationText, setConfirmationText] = useState("");
    const isConfirmationMatching = confirmationText === bookName;

    return (
        <AlertDialog onOpenChange={(open) => !open && setConfirmationText('')}>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete All Entries
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all entries in "{bookName}".
                        <br/><br/>
                        Please type <span className="font-bold text-foreground">{bookName}</span> to confirm.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input 
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Enter book name to confirm"
                    className="mt-2"
                />
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={onConfirm}
                        disabled={!isConfirmationMatching}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


export function TransactionView({
  transactions,
  allRupeeBooks,
  members,
  activeRupeeBook,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onCopyTransactions,
  onMoveTransactions,
  onUpdateBookSettings,
  loggedInMember,
  selectedTransactionId,
  setSelectedTransactionId,
  onAddButtonClick,
  onSummaryUpdate,
}: TransactionViewProps) {
  
  const [typeFilter, setTypeFilter] = useLocalStorage(`filters_type_${activeRupeeBook.id}`, "all");
  const [categoryFilter, setCategoryFilter] = useLocalStorage<string[]>(`filters_categories_${activeRupeeBook.id}`, []);
  const [subcategoryFilter, setSubcategoryFilter] = useLocalStorage<string[]>(`filters_subcategories_${activeRupeeBook.id}`, []);
  const [memberFilter, setMemberFilter] = useLocalStorage<string[]>(`filters_members_${activeRupeeBook.id}`, []);
  const [dateRange, setDateRange] = useLocalStorage<DateRange | undefined>(`filters_dateRange_${activeRupeeBook.id}`, undefined);
  const [appliedSearch, setAppliedSearch] = useLocalStorage(`filters_search_${activeRupeeBook.id}`, "");
  
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  
  const isMobile = useIsMobile();
  
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSubcategorySheetOpen, setIsSubcategorySheetOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);

  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [transactionForDetails, setTransactionForDetails] = useState<Transaction | null>(null);
  
  const isSelectionMode = selectedTransactions.size > 0;
  
  const handleTouchStart = useCallback((transactionId: string) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
        handleSelectTransaction(transactionId);
        longPressTriggeredRef.current = true;
    }, 2000);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
    }
  }, []);

  const handleClick = (transaction: Transaction, e: React.MouseEvent) => {
    if (longPressTriggeredRef.current) {
        e.preventDefault();
        longPressTriggeredRef.current = false;
        return;
    }
    
    if (isSelectionMode) {
      handleSelectTransaction(transaction.id);
    } else if (isMobile) {
      setTransactionForDetails(transaction);
      setIsDetailsDialogOpen(true);
    } else {
      setSelectedTransactionId(transaction.id);
    }
  };
  
  const getMemberName = useCallback((memberId?: string) => {
    if (!memberId) return 'JATIN GADHIYA';
    const member = members.find(m => m.id === memberId);
    if (member?.name === 'GADHIYAJATIN') return 'JATIN GADHIYA';
    return member?.name || 'JATIN GADHIYA';
  }, [members])

  const transactionsWithBalance = useMemo(() => {
    let runningBalance = activeRupeeBook.balanceBefore || 0;
    
    const sortedForBalance = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const balanceMap = new Map<string, number>();
    for (const t of sortedForBalance) {
        if (t.type === 'in') {
            runningBalance += t.amount;
        } else {
            runningBalance -= t.amount;
        }
        balanceMap.set(t.id, runningBalance);
    }

    return transactions
        .map(t => ({
            ...t,
            memberName: getMemberName(t.memberId),
            balance: balanceMap.get(t.id) || 0,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, getMemberName, activeRupeeBook.balanceBefore]);


  const filteredTransactions = useMemo(() => {
    const dataOperator = loggedInMember?.role === 'data-operator';
    
    const effectiveDateRange = dateRange
      ? {
          from: dateRange.from ? new Date(dateRange.from) : undefined,
          to: dateRange.to ? new Date(dateRange.to) : undefined,
        }
      : undefined;

    return transactionsWithBalance
      .filter((t) => {
        if (dataOperator && activeRupeeBook?.dataOperatorSettings?.hideEntriesByOtherMembers && t.memberId !== loggedInMember?.id) {
            return false;
        }
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (categoryFilter.length > 0 && !categoryFilter.includes(t.category)) return false;
        if (subcategoryFilter.length > 0 && (!t.subcategory || !subcategoryFilter.includes(t.subcategory))) return false;
        if (memberFilter.length > 0 && t.memberId && !memberFilter.includes(t.memberId)) return false;
        
        if (effectiveDateRange?.from && new Date(t.date) < startOfDay(effectiveDateRange.from)) return false;
        if (effectiveDateRange?.to) {
            const toDate = endOfDay(effectiveDateRange.to);
            if (new Date(t.date) > toDate) return false;
        }
        if (appliedSearch) {
            const searchTerm = appliedSearch.toLowerCase();
            return (
                (t.remark||"").toLowerCase().includes(searchTerm) ||
                t.amount.toString().includes(searchTerm)
            );
        }
        return true;
      })
  }, [
    transactionsWithBalance,
    appliedSearch,
    typeFilter,
    categoryFilter,
    subcategoryFilter,
    memberFilter,
    dateRange,
    loggedInMember,
    activeRupeeBook
  ]);

  const filteredSummary = useMemo(() => {
    const totalCashIn = filteredTransactions.reduce((acc, t) => (t.type === 'in' ? acc + t.amount : acc), 0);
    const totalCashOut = filteredTransactions.reduce((acc, t) => (t.type === 'out' ? acc + t.amount : acc), 0);
    const netBalance = totalCashIn - totalCashOut;
    return { totalCashIn, totalCashOut, netBalance };
  }, [filteredTransactions]);

  useEffect(() => {
    onSummaryUpdate(filteredSummary);
  }, [filteredSummary, onSummaryUpdate]);

  useEffect(() => {
    setSelectedTransactions(new Set());
  }, [transactions, activeRupeeBook.id]);

  const handleSelectTransaction = useCallback((id: string) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  }, [filteredTransactions, selectedTransactions.size]);

  const destinationRupeeBooks = useMemo(() => {
    const currentBusinessId = activeRupeeBook?.businessId;
    if (!currentBusinessId) return [];
    
    return allRupeeBooks.filter(
      (book) => book.businessId === currentBusinessId && book.id !== activeRupeeBook.id
    );
  }, [allRupeeBooks, activeRupeeBook]);

  const handleClearFilters = () => {
    setAppliedSearch("");
    setTypeFilter("all");
    setCategoryFilter([]);
    setSubcategoryFilter([]);
    setMemberFilter([]);
    setDateRange(undefined);
  }
  
  const hasActiveFilters = appliedSearch !== "" || typeFilter !== 'all' || categoryFilter.length > 0 || subcategoryFilter.length > 0 || !!dateRange;

  const WebTransactionView = () => {
    const isDataOperatorNoBalance = loggedInMember?.role === 'data-operator' && activeRupeeBook.dataOperatorSettings?.hideNetBalanceAndReports;

    const groupedTransactions = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            const date = format(new Date(t.date), "dd-MM-yy");
            if (!acc[date]) acc[date] = [];
            acc[date].push(t);
            return acc;
        }, {} as Record<string, typeof filteredTransactions>);
    }, [filteredTransactions]);

    const MultiSelectPopover = ({
        options,
        value,
        onChange,
        title,
        className,
    }: {
        options: { value: string; label: string }[],
        value: string[],
        onChange: (value: string[]) => void,
        title: string,
        className?: string
    }) => {
        const [open, setOpen] = useState(false);
        
        let triggerText = `${title}`;
        if (value.length > 0 && value.length < options.length) {
            triggerText = `${value.length} ${title.toLowerCase()} selected`;
        } else if (value.length === 0) {
          triggerText = `All ${title}`;
        }

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className={cn("justify-between h-9 text-sm font-normal", className)}>
                        <span>{triggerText}</span>
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                        <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                <ScrollArea className="h-48">
                                    {options.map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            onSelect={() => {
                                                const newSelected = value.includes(option.value)
                                                    ? value.filter((item) => item !== option.value)
                                                    : [...value, option.value];
                                                onChange(newSelected);
                                            }}
                                            className="text-sm cursor-pointer"
                                        >
                                            <Checkbox
                                                className="mr-2"
                                                checked={value.includes(option.value)}
                                            />
                                            <span>{option.label}</span>
                                        </CommandItem>
                                    ))}
                                </ScrollArea>
                            </CommandGroup>
                        </CommandList>
                         <div className="flex justify-end gap-2 p-2 border-t">
                            <Button variant="ghost" size="sm" onClick={() => onChange([])}>Clear</Button>
                            <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
                        </div>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    };

    const DesktopFilterBar = () => {
      const categoryOptions = activeRupeeBook.categories.map(c => ({value: c, label: c}));
      const subcategoryOptions = activeRupeeBook.subcategories.map(sc => ({value: sc, label: sc}));
      const bookMemberIds = activeRupeeBook.members.map(m => m.memberId);
      const memberOptions = members
        .filter(m => bookMemberIds.includes(m.id))
        .map(m => ({ value: m.id, label: getMemberName(m.id) }));
        
      const [searchTerm, setSearchTerm] = useState(appliedSearch);

      const handleSearch = () => {
        setAppliedSearch(searchTerm);
      }
  
      return (
        <div className="flex items-center gap-2 p-2 border-b bg-muted/40">
            <div className="flex items-center gap-2 flex-wrap flex-1">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={'outline'} className={cn("w-auto justify-start text-left font-normal h-9 text-sm", !dateRange && "text-muted-foreground")}>
                            <span className="mr-1">Duration:</span>
                            {dateRange?.from ? (
                                dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                                <>
                                    {format(dateRange.from, "dd MMM")} -{" "}
                                    {format(dateRange.to, "dd MMM")}
                                </>
                                ) : (
                                format(dateRange.from, "dd MMM, y")
                                )
                            ) : (
                                <span>All Time</span>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                         <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={setDateRange}
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={2015}
                            toYear={new Date().getFullYear() + 5}
                        />
                    </PopoverContent>
                </Popover>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-between h-9 text-sm font-normal w-auto capitalize">
                            <span>Type: {typeFilter}</span>
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2">
                         <RadioGroup value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'in' | 'out')} className="text-sm">
                            <Label htmlFor="r1" className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"><RadioGroupItem value="all" id="r1" /><span>All</span></Label>
                            <Label htmlFor="r2" className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"><RadioGroupItem value="in" id="r2" /><span>Cash In</span></Label>
                            <Label htmlFor="r3" className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"><RadioGroupItem value="out" id="r3" /><span>Cash Out</span></Label>
                        </RadioGroup>
                    </PopoverContent>
                </Popover>
                 
                <MultiSelectPopover
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  title="Categories"
                  className="w-auto"
                />
                 <MultiSelectPopover
                  options={subcategoryOptions}
                  value={subcategoryFilter}
                  onChange={setSubcategoryFilter}
                  title="Sub-Categories"
                  className="w-auto"
                />
                 <MultiSelectPopover
                  options={memberOptions}
                  value={memberFilter}
                  onChange={setMemberFilter}
                  title="Members"
                  className="w-auto"
                />
                 {hasActiveFilters && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-9" onClick={handleClearFilters}><X className="mr-2 h-4 w-4"/>Clear</Button>}
            </div>
            <div className="flex items-center">
                <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-9 text-sm pr-10 rounded-r-none"
                />
                <Button size="sm" className="h-9 bg-primary rounded-l-none" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                </Button>
            </div>
        </div>
      );
    };

    return (
        <div className="flex flex-col bg-background p-0 md:p-0 h-full overflow-hidden">
             <div className="flex-1 flex flex-col min-h-0">
                <DesktopFilterBar />
                
                <div className="flex-1 min-h-0 p-4">
                    <ScrollArea className="h-full">
                        <Table className="bg-background rounded-lg border">
                             <TableHeader>
                                <TableRow className="hover:bg-muted/50 border-b">
                                    <TableHead className="p-0 px-2 w-10">
                                        <Checkbox
                                            checked={filteredTransactions.length > 0 && selectedTransactions.size === filteredTransactions.length}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[120px] text-black">Date &amp; Time</TableHead>
                                    <TableHead className="text-black">Details</TableHead>
                                    <TableHead className="w-[150px] text-black">Category</TableHead>
                                    <TableHead className="w-[150px] text-black">Subcategory</TableHead>
                                    <TableHead className="text-right w-[120px] text-black">Amount</TableHead>
                                    {!isDataOperatorNoBalance && <TableHead className="text-right w-[140px] text-black">Balance</TableHead>}
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {Object.entries(groupedTransactions).map(([date, transactions]) => (
                                    <React.Fragment key={date}>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableCell colSpan={isDataOperatorNoBalance ? 7 : 6} className="font-bold text-muted-foreground p-2">
                                                {format(new Date(transactions[0].date), "eeee, dd MMMM yyyy")}
                                            </TableCell>
                                        </TableRow>
                                        {transactions.map((t, index) => (
                                            <TableRow 
                                                key={t.id} 
                                                className={cn("cursor-pointer", index % 2 === 0 ? "bg-muted/5" : "bg-background")}
                                                onClick={(e) => handleClick(t, e)}
                                            >
                                                <TableCell className="p-0 px-2 border-r">
                                                    <Checkbox checked={selectedTransactions.has(t.id)} onCheckedChange={() => handleSelectTransaction(t.id)} onClick={e => e.stopPropagation()} />
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    <div className="font-medium">{format(new Date(t.date), "dd MMM, yyyy")}</div>
                                                    <div className="text-xs text-muted-foreground"><ClientOnlyTime date={t.date}/></div>
                                                </TableCell>
                                                <TableCell className="border-r">
                                                    <div className="font-medium truncate max-w-xs">{t.remark || t.category}</div>
                                                    <div className="text-xs text-muted-foreground">by {t.memberName}</div>
                                                </TableCell>
                                                <TableCell className="border-r">{t.category}</TableCell>
                                                <TableCell className="border-r">{t.subcategory || '-'}</TableCell>
                                                <TableCell className={cn("text-right font-mono", t.type === 'out' ? 'text-red-600' : 'text-green-600')}>
                                                    {t.amount.toLocaleString('en-IN')}
                                                </TableCell>
                                                {!isDataOperatorNoBalance && <TableCell className={cn("text-right font-mono", t.balance < 0 && 'text-red-500')}>{t.balance.toLocaleString('en-IN')}</TableCell>}
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

  const MobileTransactionView = () => {
    
    const SelectionActions = () => (
        (isSelectionMode &&
            <div className="fixed bottom-24 md:relative md:bottom-auto md:left-auto md:right-auto md:w-auto md:z-auto left-4 right-4 z-20 md:flex md:items-center md:justify-center">
                <div className="bg-background border rounded-lg shadow-lg p-2 flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedTransactions(new Set())}>
                            <X className="h-4 w-4"/>
                        </Button>
                        <span className="text-sm font-medium">{selectedTransactions.size} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CopyTransactionDialog
                            destinationRupeeBooks={destinationRupeeBooks}
                            onCopy={(targetRupeeBookIds) => {
                                onCopyTransactions(Array.from(selectedTransactions), targetRupeeBookIds);
                                setSelectedTransactions(new Set());
                            }}
                        >
                            <Button variant="outline" size="sm"><Copy className="mr-2 h-4 w-4" /> Copy</Button>
                        </CopyTransactionDialog>
                        <MoveTransactionDialog
                            destinationRupeeBooks={destinationRupeeBooks}
                            onMove={(targetRupeeBookId) => {
                                onMoveTransactions(Array.from(selectedTransactions), targetRupeeBookId);
                                setSelectedTransactions(new Set());
                            }}
                        >
                            <Button variant="outline" size="sm"><FolderInput className="mr-2 h-4 w-4" /> Move</Button>
                        </MoveTransactionDialog>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete {selectedTransactions.size} transaction(s).
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => {
                                onDeleteTransaction(Array.from(selectedTransactions));
                                setSelectedTransactions(new Set());
                            }}>
                                Delete
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>
        )
    );
  
    const MobileFilterBar = () => {
      
      const hasActiveFilters = appliedSearch !== "" || typeFilter !== 'all' || categoryFilter.length > 0 || subcategoryFilter.length > 0 || !!dateRange?.from;
      const categoryOptions = activeRupeeBook.categories.map(c => ({value: c, label: c}));
      const subcategoryOptions = activeRupeeBook.subcategories.map(sc => ({value: sc, label: sc}));
  
      return (
        <div className="space-y-4">
             <div className="relative flex items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by amount or remark" 
                        className="pl-10 h-12 text-base" 
                        value={appliedSearch}
                        onChange={(e) => setAppliedSearch(e.target.value)}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" className="justify-start text-base h-12" onClick={() => setIsDateSheetOpen(true)}>Date</Button>
                <Button variant="outline" className="justify-start text-base h-12" onClick={() => setIsTypeSheetOpen(true)}>Type</Button>
                <Button variant="outline" className="justify-start text-base h-12" onClick={() => setIsCategorySheetOpen(true)}>Category</Button>
                <Button variant="outline" className="justify-start text-base h-12" onClick={() => setIsSubcategorySheetOpen(true)}>Subcategory</Button>
    
                <DateFilterSheet open={isDateSheetOpen} onOpenChange={setIsDateSheetOpen} value={dateRange} onChange={setDateRange} />
                <TypeFilterSheet open={isTypeSheetOpen} onOpenChange={setIsTypeSheetOpen} value={typeFilter} onChange={setTypeFilter} />
                <CategoryFilterSheet 
                    open={isCategorySheetOpen} 
                    onOpenChange={setIsCategorySheetOpen}
                    options={categoryOptions}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    title="Select Categories"
                    showSearch={false}
                />
                <CategoryFilterSheet 
                    open={isSubcategorySheetOpen} 
                    onOpenChange={setIsSubcategorySheetOpen}
                    options={subcategoryOptions}
                    value={subcategoryFilter}
                    onChange={setSubcategoryFilter}
                    title="Select Subcategories"
                    showSearch={false}
                />
            </div>
          
            {hasActiveFilters && (
                <Button variant="link" size="sm" className="text-destructive h-auto p-0" onClick={handleClearFilters}>
                    Clear all filters
                </Button>
            )}
        </div>
      );
    };
    
    const TransactionList = () => {
        const grouped = filteredTransactions.reduce((acc, t) => {
            const date = format(new Date(t.date), "dd-MM-yy");
            if (!acc[date]) acc[date] = [];
            acc[date].push(t);
            return acc;
        }, {} as Record<string, typeof filteredTransactions>);
        
        return (
            <div className="space-y-4">
                {Object.entries(grouped).length > 0 ? (
                <>
                    {Object.entries(grouped).map(([date, transactions]) => (
                    <div key={date}>
                        <div className="px-1 text-sm font-medium text-muted-foreground mb-2">{date}</div>
                        <div className="bg-card rounded-lg border divide-y divide-border">
                        {transactions.map((t) => {
                            return (
                                <div
                                key={t.id}
                                className={cn(
                                    "p-3 flex items-start gap-3 relative",
                                    isSelectionMode && selectedTransactions.has(t.id) && "bg-primary/10"
                                )}
                                onTouchStart={() => handleTouchStart(t.id)}
                                onTouchEnd={handleTouchEnd}
                                onClick={(e) => handleClick(t, e)}
                                >
                                {isSelectionMode && (
                                    <div className="pt-1" onClick={(e) => { e.stopPropagation(); handleSelectTransaction(t.id) }}>
                                    <Checkbox
                                        checked={selectedTransactions.has(t.id)}
                                        onCheckedChange={() => handleSelectTransaction(t.id)}
                                    />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                        <p className="font-medium text-base whitespace-pre-wrap break-words">{t.remark || 'No remark'}</p>
                                        <div className="flex items-center flex-wrap gap-2 mt-2">
                                            <Badge variant="outline" className="text-sm">{t.category}</Badge>
                                            {t.subcategory && <Badge variant="secondary" className="text-sm">{t.subcategory}</Badge>}
                                            {t.attachmentUrl && <Badge variant="outline" className="text-blue-600 border-blue-600"><Paperclip className="h-3 w-3 mr-1"/>Attached</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-2">by {t.memberName} at <ClientOnlyTime date={t.date} /></p>
                                        </div>
                                        <div className="text-right shrink-0">
                                        <p className={`font-bold flex items-center justify-end text-lg ${t.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.amount.toLocaleString("en-IN")}
                                        </p>
                                        {!(loggedInMember?.role === 'data-operator' && activeRupeeBook.dataOperatorSettings?.hideNetBalanceAndReports) && (
                                            <p className="text-sm text-muted-foreground mt-1 font-bold">Bal: {t.balance.toLocaleString("en-IN")}</p>
                                        )}
                                        </div>
                                    </div>
                                </div>
                                </div>
                            )
                        })}
                        </div>
                    </div>
                    ))}
                </>
                ) : (
                <div className="text-center text-muted-foreground py-10">
                    No transactions found.
                </div>
                )}
            </div>
        )
    };

    return (
      <ScrollArea className="h-full" ref={scrollRef}>
        <div className="p-4 space-y-4 pb-48 md:pb-4">
        {!(loggedInMember?.role === 'data-operator' && activeRupeeBook.dataOperatorSettings?.hideNetBalanceAndReports) && (
          <Card className="overflow-hidden">
              <CardContent className="p-4 bg-muted/50">
                  <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-muted-foreground">Net Balance for selected filters</p>
                      <p className="text-2xl font-bold flex items-center justify-center">
                        <IndianRupee className="h-5 w-5 mr-1" />
                        {filteredSummary.netBalance.toLocaleString('en-IN')}
                      </p>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center text-green-600">
                          <ArrowUp className="h-4 w-4 mr-1"/>
                          Total In
                      </span>
                      <span className="font-bold text-green-600">
                          {filteredSummary.totalCashIn.toLocaleString('en-IN')}
                      </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                      <span className="flex items-center text-red-600">
                          <ArrowDown className="h-4 w-4 mr-1"/>
                          Total Out
                      </span>
                      <span className="font-bold text-red-600">
                          {filteredSummary.totalCashOut.toLocaleString('en-IN')}
                      </span>
                  </div>
              </CardContent>
            </Card>
          )}
        
        <MobileFilterBar />

        <SelectionActions />
        
        <TransactionList />
        
        </div>
      </ScrollArea>
    )
  }

  const View = isMobile ? MobileTransactionView : WebTransactionView;
  
  return (
    <>
      <View />
      {transactionForDetails && (
        <TransactionDetailsDialog
          transaction={transactionForDetails}
          rupeebook={activeRupeeBook}
          memberName={getMemberName(transactionForDetails.memberId)}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          onEdit={() => {
            setIsDetailsDialogOpen(false);
            setSelectedTransactionId(transactionForDetails.id);
          }}
          onDelete={() => {
            setIsDetailsDialogOpen(false);
            onDeleteTransaction([transactionForDetails.id]);
          }}
          loggedInMember={loggedInMember}
        />
      )}
    </>
  )
}

// Mobile Filter Sheets
const DateFilterSheet = ({ open, onOpenChange, value, onChange}: { open: boolean, onOpenChange: (open: boolean) => void, value?: DateRange, onChange: (value?: DateRange) => void }) => {
    const [duration, setDuration] = useState('all-time');
    const [localDateRange, setLocalDateRange] = useState<DateRange|undefined>(value);

    useEffect(() => {
        if(open) {
            setLocalDateRange(value);
            if (!value?.from && !value?.to) setDuration('all-time');
            else setDuration('date-range');
        }
    }, [open, value]);

    const handleDurationChange = (selectedDuration: string) => {
        setDuration(selectedDuration);
        const now = new Date();
        switch (selectedDuration) {
            case 'all-time':
                setLocalDateRange(undefined);
                break;
            case 'today':
                setLocalDateRange({ from: startOfToday(), to: endOfDay(startOfToday()) });
                break;
            case 'yesterday':
                setLocalDateRange({ from: startOfYesterday(), to: endOfYesterday() });
                break;
            case 'this-month':
                 setLocalDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
                break;
            case 'last-month':
                 const lastMonthStart = startOfMonth(subMonths(now, 1));
                 setLocalDateRange({ from: lastMonthStart, to: endOfMonth(lastMonthStart) });
                break;
            case 'date-range':
                setLocalDateRange(undefined);
                break;
        }
    }

    const handleApply = () => {
        let finalRange = localDateRange;
        if(duration === 'date-range' && finalRange?.from && !finalRange.to) {
            finalRange = {...finalRange, to: endOfDay(finalRange.from)}
        }
        onChange(finalRange);
        onOpenChange(false);
    }
    
    const handleClear = () => {
        setLocalDateRange(undefined);
        setDuration('all-time');
        onChange(undefined);
        onOpenChange(false);
    }

    const RadioOption = ({ value: optionValue, label }: { value: string; label: string }) => (
        <Label
            htmlFor={`date-duration-${optionValue}`}
            className={cn(
                "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                duration === optionValue ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
            )}
        >
            <RadioGroupItem value={optionValue} id={`date-duration-${optionValue}`} />
            <span>{label}</span>
        </Label>
    );
    
    const presets = [
        { value: "all-time", label: "All Time" },
        { value: "today", label: "Today" },
        { value: "yesterday", label: "Yesterday" },
        { value: "this-month", label: "This Month" },
        { value: "last-month", label: "Last Month" },
        { value: "date-range", label: "Custom Range" },
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="p-0 flex flex-col h-[90dvh]">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>Select Date Filter</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <RadioGroup value={duration} onValueChange={handleDurationChange} className="grid grid-cols-2 gap-3">
                      {presets.map(p => <RadioOption key={p.value} value={p.value} label={p.label}/>)}
                    </RadioGroup>

                    {duration === 'date-range' && (
                        <div className="pt-4 flex justify-center">
                            <Calendar
                                mode="range"
                                selected={localDateRange}
                                onSelect={setLocalDateRange}
                                className="border rounded-md"
                                numberOfMonths={1}
                                captionLayout="dropdown-buttons"
                                fromYear={2015}
                                toYear={new Date().getFullYear() + 5}
                            />
                        </div>
                    )}
                </div>
                 <SheetFooter className="p-4 border-t grid grid-cols-2 gap-2">
                    <Button variant="ghost" onClick={handleClear} className="w-full">
                        <X className="mr-2 h-4 w-4"/> Clear
                    </Button>
                    <Button onClick={handleApply} className="w-full">Apply</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

const TypeFilterSheet = ({ open, onOpenChange, value, onChange}: { open: boolean, onOpenChange: (open: boolean) => void, value: string, onChange: (value: string) => void }) => {
    
    const handleApply = (newValue: string) => {
        onChange(newValue);
        onOpenChange(false);
    }
    
    const RadioOption = ({ value: optionValue, label }: { value: string; label: string }) => (
        <Label
            htmlFor={`type-${optionValue}`}
            className={cn(
                "flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                value === optionValue ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
            )}
            onClick={() => handleApply(optionValue)}
        >
            <RadioGroupItem value={optionValue} id={`type-${optionValue}`} />
            <span>{label}</span>
        </Label>
    );

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="p-0 flex flex-col h-auto">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>Select Entry Type</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4">
                    <RadioGroup value={value} className="grid grid-cols-1 gap-3">
                      <RadioOption value="all" label="All" />
                      <RadioOption value="in" label="Cash In" />
                      <RadioOption value="out" label="Cash Out" />
                    </RadioGroup>
                </div>
            </SheetContent>
        </Sheet>
    )
}

const CategoryFilterSheet = ({
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
                                       {mode === 'multi' && (
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
                                <p className="text-center text-sm text-muted-foreground py-4">No {title.toLowerCase().replace(/s$/, '')} to select.</p>
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
