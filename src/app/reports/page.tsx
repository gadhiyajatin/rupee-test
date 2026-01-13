

"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSpreadsheet, FileDown, Loader2, Calendar as CalendarIcon, SlidersHorizontal, AlertTriangle, X, Info, Check } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, parseISO, startOfToday, endOfDay, startOfMonth, endOfMonth, subMonths, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { generateReport, ReportType, GenerateReportInput, ReportData } from '@/lib/reports';
import type { RupeeBook, Member, PdfSettings, Transaction } from '@/lib/types';
import { getRupeeBook, getAllMembers } from '@/lib/firebase-service.ts';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { ReportAsPdf } from '@/components/reports/ReportAsPdf';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InlineLoader } from '@/components/ui/loading-animation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from '@/components/ui/badge';


interface ReportFilters {
    type: 'all' | 'in' | 'out';
    category: string[];
    subcategory: string[];
    dateRange?: DateRange;
    members: string[];
    searchTerm: string;
}

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const bookId = searchParams.get('bookId');
  
  const [activeRupeeBook, setActiveRupeeBook] = useState<RupeeBook | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);


  const [pdfSettings] = useLocalStorage<PdfSettings>('pdfSettings', {
    columns: {
      'all-entries': ['date', 'remark', 'category', 'subcategory', 'entryBy', 'cashIn', 'cashOut', 'balance'],
    },
    otherOptions: {
      showNameAndNumber: true,
      showFilters: true,
    }
  });

  const [activeReportType, setActiveReportType] = useState<ReportType>('all-entries');
  
  const [filters, setFilters] = useState<ReportFilters>({
      type: 'all',
      category: [],
      subcategory: [],
      dateRange: undefined,
      members: [],
      searchTerm: '',
  });

  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSubcategorySheetOpen, setIsSubcategorySheetOpen] = useState(false);

  const generateAndDownload = async (type: 'pdf' | 'excel') => {
    if (!activeRupeeBook || !loggedInMember) {
        toast({ title: "Error", description: "Cannot generate report. Book or user not loaded.", variant: "destructive" });
        return;
    }
    
    setIsGenerating(true);
    
    try {
        const fullBookData = await getRupeeBook(activeRupeeBook.id, true);
        const allTransactions = fullBookData.transactions || [];

        const input: GenerateReportInput = {
            transactions: allTransactions,
            members: allMembers,
            reportType: activeReportType,
            filters: {
                type: filters.type,
                category: filters.category,
                subcategory: filters.subcategory,
                dateFrom: filters.dateRange?.from?.toISOString(),
                dateTo: filters.dateRange?.to ? endOfDay(filters.dateRange.to).toISOString() : filters.dateRange?.from ? endOfDay(filters.dateRange.from).toISOString() : undefined,
                searchTerm: filters.searchTerm,
                members: filters.members,
            },
            bookName: activeRupeeBook.name,
            loggedInMember: loggedInMember,
            pdfSettings: pdfSettings
        };
        const generatedData = generateReport(input);
        setReportData(generatedData);
        
        if (type === 'excel') {
             const { data, summary, reportType, reportTitle, bookName, filtersApplied, loggedInMember } = generatedData;

            const wb = XLSX.utils.book_new();
            let ws_data: any[][] = [];
            
            ws_data.push([loggedInMember.name]);
            ws_data.push([`${reportTitle} for ${bookName}`]);
            ws_data.push([`Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`]);
            ws_data.push([]);

            if (filtersApplied.length > 0) {
                ws_data.push(['Filters Applied:']);
                filtersApplied.forEach(f => ws_data.push([f.filterName, f.value]));
                ws_data.push([]);
            }
            
            if (reportType === 'all-entries') {
                const headers = ['Date', 'Remark', 'Category', 'Subcategory', 'Entry By', 'Cash In', 'Cash Out', 'Balance'];
                ws_data.push(headers);
                data.forEach(row => {
                    ws_data.push([
                        format(new Date(row.date), 'dd-MM-yyyy HH:mm'),
                        row.remark || row.category,
                        row.category,
                        row.subcategory || '-',
                        row.memberName,
                        row.type === 'in' ? row.amount : '',
                        row.type === 'out' ? row.amount : '',
                        row.balance
                    ]);
                });
            } else if (reportType === 'day-wise') {
                const headers = ['Date', 'Cash In', 'Cash Out', 'Balance'];
                ws_data.push(headers);
                data.forEach(row => {
                    ws_data.push([format(parseISO(row.date), 'dd-MM-yyyy'), row.cashIn, row.cashOut, row.balance]);
                });
            } else if (reportType === 'category-wise') {
                const headers = ['Category', 'Cash In', 'Cash Out', 'Balance'];
                ws_data.push(headers);
                data.forEach(row => {
                    ws_data.push([row.category, row.cashIn, row.cashOut, row.balance]);
                });
            }
            
            ws_data.push([]);

            ws_data.push(['', '', '', 'Total Cash In:', summary.totalCashIn]);
            ws_data.push(['', '', '', 'Total Cash Out:', summary.totalCashOut]);
            ws_data.push(['', '', '', 'Net Balance:', summary.netBalance]);

            const ws = XLSX.utils.aoa_to_sheet(ws_data);

            ws['!cols'] = [
                { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, 
                { wch: 15 }, { wch: 15 }, { wch: 15 }
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Report');
            const safeBookName = bookName.replace(/[\\/]/g, '_');
            const safeReportTitle = reportTitle.replace(/ /g, '_');
            const fileName = `${safeBookName}_${safeReportTitle}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            XLSX.writeFile(wb, fileName);
            setIsGenerating(false);
            setReportData(null);
        }

    } catch (error) {
        console.error(`Error generating report:`, error);
        toast({ title: `Failed to Generate Report`, description: "An unexpected error occurred.", variant: "destructive" });
        setIsGenerating(false);
        setReportData(null);
    }
  };

  useEffect(() => {
    if (!isGenerating || !reportData) return;

    const generatePdf = async () => {
        if (!printRef.current) {
            toast({ title: "PDF Generation Failed", description: "Report content not found.", variant: "destructive" });
            setIsGenerating(false);
            setReportData(null);
            return;
        }

        if (isMobile) {
            try {
                const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'p',
                    unit: 'px',
                    format: 'a4',
                    hotfixes: ['px_scaling'],
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / pdfWidth;
                const scaledCanvasHeight = canvasHeight / ratio;

                let position = 0;
                let heightLeft = scaledCanvasHeight;
                
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledCanvasHeight);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position = - (scaledCanvasHeight - heightLeft);
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledCanvasHeight);
                    heightLeft -= pdfHeight;
                }

                const safeBookName = reportData.bookName.replace(/[\\/]/g, '_');
                const safeReportType = reportData.reportType.replace(/ /g, '_');
                const fileName = `${safeBookName}_${safeReportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
                pdf.save(fileName);

            } catch (error) {
                console.error("Error generating PDF:", error);
                toast({ title: "PDF Generation Failed", description: "An error occurred while creating the PDF.", variant: "destructive" });
            } finally {
                setIsGenerating(false);
                setReportData(null);
            }
        } else {
             // Desktop: use browser print
            setTimeout(() => {
                window.print();
                setIsGenerating(false);
                setReportData(null);
            }, 500);
        }
    };
    
    // Give react a moment to render the component before we try to capture/print it
    const timer = setTimeout(generatePdf, 100);

    return () => clearTimeout(timer);

  }, [isGenerating, reportData, isMobile, toast]);


  const fetchInitialData = useCallback(async () => {
    if (!bookId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [membersFromDb, bookFromDb] = await Promise.all([
        getAllMembers(),
        getRupeeBook(bookId) 
      ]);
      const superAdminMember = { id: 'm1', name: 'JATIN GADHIYA', pin: '9466', role: 'owner' as const };
      setAllMembers([...membersFromDb, superAdminMember]);
      setActiveRupeeBook(bookFromDb);

    } catch (e) {
      console.error("Could not load initial data", e);
      toast({ title: "Error", description: "Failed to load report data. It may not exist.", variant: "destructive" });
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  }, [bookId, toast, router]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  
  const categoryOptions = useMemo(() => {
    return activeRupeeBook?.categories.map(c => ({ value: c, label: c })) || [];
  }, [activeRupeeBook]);

  const subcategoryOptions = useMemo(() => {
    return activeRupeeBook?.subcategories.map(sc => ({ value: sc, label: sc })) || [];
  }, [activeRupeeBook]);

  const handleClearFilters = () => {
    setFilters({
      type: 'all',
      category: [],
      subcategory: [],
      dateRange: undefined,
      members: [],
      searchTerm: '',
    });
    toast({title: 'Filters Cleared', description: 'All report filters have been reset.'});
  };
  
  const hasActiveFilters = 
    filters.type !== 'all' || 
    filters.category.length > 0 || 
    filters.subcategory.length > 0 || 
    !!filters.dateRange || 
    filters.searchTerm !== '' ||
    filters.members.length > 0;

  const ActiveFiltersDisplay = () => {
    if (!hasActiveFilters) return null;

    const renderDate = () => {
        if (!filters.dateRange?.from) return null;
        const from = format(filters.dateRange.from, 'dd MMM');
        if (!filters.dateRange.to || format(filters.dateRange.from, 'yyyyMMdd') === format(filters.dateRange.to, 'yyyyMMdd')) {
            return `Date: ${from}`;
        }
        const to = format(filters.dateRange.to, 'dd MMM');
        return `Date: ${from} - ${to}`;
    }

    const filterBadges: (React.ReactNode | null)[] = [
        renderDate() ? <Badge variant="secondary">{renderDate()}</Badge> : null,
        filters.type !== 'all' ? <Badge variant="secondary">Type: {filters.type === 'in' ? 'Cash In' : 'Cash Out'}</Badge> : null,
        ...filters.category.map(c => <Badge variant="secondary" key={`cat-${c}`}>{c}</Badge>),
        ...filters.subcategory.map(sc => <Badge variant="secondary" key={`subcat-${sc}`}>{sc}</Badge>),
    ];
    
    return (
        <div className="pt-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground px-1">APPLIED FILTERS</h3>
            <div className="flex flex-wrap gap-2">
                {filterBadges.filter(Boolean).map((badge, i) => <React.Fragment key={i}>{badge}</React.Fragment>)}
            </div>
        </div>
    )
  }


  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><InlineLoader /></div>;
  }
  
  if (!bookId || !activeRupeeBook) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className='text-center'>
                <p className='text-muted-foreground'>Could not load report.</p>
                <p className='text-muted-foreground text-sm mb-4'>Please select a book and try again.</p>
                <Button asChild>
                  <Link href="/">Go to Dashboard</Link>
                </Button>
            </div>
        </div>
      );
  }

  const MobileFilterUI = () => {    
    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" className="justify-start h-12 text-base" onClick={() => setIsDateSheetOpen(true)}>Date</Button>
                <Button variant="outline" className="justify-start h-12 text-base" onClick={() => setIsTypeSheetOpen(true)}>Type</Button>
                <Button variant="outline" className="justify-start h-12 text-base" onClick={() => setIsCategorySheetOpen(true)}>Category</Button>
                <Button variant="outline" className="justify-start h-12 text-base" onClick={() => setIsSubcategorySheetOpen(true)}>Subcategory</Button>
            </div>
            
            <ReportDateFilterSheet open={isDateSheetOpen} onOpenChange={setIsDateSheetOpen} value={filters.dateRange} onChange={(range) => setFilters(prev => ({...prev, dateRange: range}))} />
            
            <TypeFilterSheet 
              open={isTypeSheetOpen} 
              onOpenChange={setIsTypeSheetOpen} 
              value={filters.type} 
              onChange={(v) => setFilters(prev => ({...prev, type: v as any}))} 
            />

            <CategoryFilterSheet 
                open={isCategorySheetOpen} 
                onOpenChange={setIsCategorySheetOpen}
                options={categoryOptions}
                value={filters.category}
                onChange={(v) => setFilters(prev => ({...prev, category: v}))}
                title="Select Categories"
                showSearch={false}
            />
            <CategoryFilterSheet 
                open={isSubcategorySheetOpen} 
                onOpenChange={setIsSubcategorySheetOpen}
                options={subcategoryOptions}
                value={filters.subcategory}
                onChange={(v) => setFilters(prev => ({...prev, subcategory: v}))}
                title="Select Subcategories"
                showSearch={false}
            />
        </>
    )
  }

  const DesktopFilterUI = () => {
    const datePresets = [
        { label: 'Today', range: { from: startOfToday(), to: endOfDay(new Date()) } },
        { label: 'Yesterday', range: { from: startOfYesterday(), to: endOfYesterday() } },
        { label: 'This Week', range: { from: startOfWeek(new Date()), to: endOfWeek(new Date()) } },
        { label: 'Last Week', range: { from: startOfWeek(subWeeks(new Date(), 1)), to: endOfWeek(subWeeks(new Date(), 1)) } },
        { label: 'This Month', range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
        { label: 'Last Month', range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    ];
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex flex-wrap gap-2 items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !filters.dateRange && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dateRange?.from ? (
                                    filters.dateRange.to ? (
                                    <>
                                        {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                                        {format(filters.dateRange.to, "LLL dd, y")}
                                    </>
                                    ) : (
                                    format(filters.dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="range"
                            selected={filters.dateRange}
                            onSelect={(range) => setFilters(prev => ({...prev, dateRange: range}))}
                            className="rounded-md border p-0"
                            captionLayout="dropdown-buttons"
                            fromYear={2015}
                            toYear={new Date().getFullYear() + 5}
                            />
                        </PopoverContent>
                    </Popover>
                    <div className="flex flex-wrap gap-2">
                        {datePresets.map(preset => (
                            <Button key={preset.label} variant="ghost" size="sm" onClick={() => setFilters(prev => ({...prev, dateRange: preset.range}))}>
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Entry Type</Label>
                    <RadioGroup 
                        value={filters.type} 
                        onValueChange={(v) => setFilters(prev => ({...prev, type: v as 'all' | 'in' | 'out'}))} 
                        className="flex items-center gap-2"
                    >
                        <Label htmlFor='type-all' className={cn("flex items-center gap-2 cursor-pointer border rounded-md p-2 px-3 transition-colors", filters.type === 'all' && 'bg-primary text-primary-foreground border-primary')}><RadioGroupItem value="all" id="type-all" className="sr-only"/>All</Label>
                        <Label htmlFor='type-in' className={cn("flex items-center gap-2 cursor-pointer border rounded-md p-2 px-3 transition-colors", filters.type === 'in' && 'bg-primary text-primary-foreground border-primary')}><RadioGroupItem value="in" id="type-in" className="sr-only"/>Cash In</Label>
                        <Label htmlFor='type-out' className={cn("flex items-center gap-2 cursor-pointer border rounded-md p-2 px-3 transition-colors", filters.type === 'out' && 'bg-primary text-primary-foreground border-primary')}><RadioGroupItem value="out" id="type-out" className="sr-only"/>Cash Out</Label>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label>Search Term</Label>
                    <Input placeholder="Search by remark..." value={filters.searchTerm} onChange={(e) => setFilters(prev => ({...prev, searchTerm: e.target.value}))}/>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Category</Label>
                    <MultiSelect
                        options={categoryOptions}
                        selected={filters.category}
                        onChange={(selected) => setFilters(prev => ({...prev, category: selected}))}
                        placeholder="All Categories"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <MultiSelect
                        options={subcategoryOptions}
                        selected={filters.subcategory}
                        onChange={(selected) => setFilters(prev => ({...prev, subcategory: selected}))}
                        placeholder="All Subcategories"
                    />
                </div>
            </div>
        </div>
    )
  }

  return (
    <>
      <div className={cn("flex flex-col h-screen bg-muted/40 no-print")}>
          <header className="flex items-center justify-between p-2 md:p-4 border-b bg-background sticky top-0 z-10">
              <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" asChild>
                  <Link href={bookId ? `/book/${bookId}`: '/'}>
                      <ArrowLeft />
                  </Link>
                  </Button>
                  <h1 className="text-lg font-bold truncate">Generate Report</h1>
              </div>
              <Button asChild variant="outline" size="sm">
                  <Link href={`/reports/settings?bookId=${bookId}`}><SlidersHorizontal className="mr-2 h-4 w-4" /> PDF Settings</Link>
              </Button>
          </header>

          <ScrollArea className="flex-1 min-h-0">
              <main className="p-4 space-y-6">
                  
                  <div className="p-4 bg-background rounded-lg border space-y-4">
                      <div className="flex justify-between items-center">
                          <h2 className="font-semibold text-sm text-muted-foreground">Report Filters</h2>
                          {hasActiveFilters && (
                             <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleClearFilters}>
                                 <X className="mr-2 h-4 w-4" />
                                 Clear Filters
                             </Button>
                          )}
                      </div>
                      {isMobile ? <MobileFilterUI /> : <DesktopFilterUI />}
                  </div>

                  <div className="p-4 bg-background rounded-lg border">
                      <h2 className="font-semibold mb-4 text-sm text-muted-foreground">Select Report Type</h2>
                       <Tabs defaultValue="all-entries" onValueChange={(value) => setActiveReportType(value as ReportType)} className="w-full">
                          <TabsList className="grid w-full grid-cols-3 h-12">
                              <TabsTrigger value="all-entries" data-state={activeReportType === 'all-entries' ? 'active' : ''} className="text-base">All Entries</TabsTrigger>
                              <TabsTrigger value="day-wise" data-state={activeReportType === 'day-wise' ? 'active' : ''} className="text-base">Day-wise</TabsTrigger>
                              <TabsTrigger value="category-wise" data-state={activeReportType === 'category-wise' ? 'active' : ''} className="text-base">Category-wise</TabsTrigger>
                          </TabsList>
                      </Tabs>
                      <ActiveFiltersDisplay />
                  </div>

                  {!isMobile && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Important</AlertTitle>
                      <AlertDescription>
                        For best results on desktop, please use your browser's "Save as PDF" option in the print dialog (Ctrl+P). Avoid "Microsoft Print to PDF" to prevent content from being cut off.
                      </AlertDescription>
                    </Alert>
                  )}
              </main>
          </ScrollArea>
          
          <footer className="p-4 border-t bg-background grid grid-cols-2 gap-4 sticky bottom-0">
              <Button variant="outline" className="h-12 text-base" onClick={() => generateAndDownload('excel')} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileSpreadsheet className="mr-2 h-4 w-4"/>}
                  Generate Excel
              </Button>
              <Button className="h-12 text-base" onClick={() => generateAndDownload('pdf')} disabled={isGenerating}>
                   {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>}
                  Generate PDF
              </Button>
          </footer>
      </div>
      
      {isGenerating && reportData && (
          <div className="print-only">
              <ReportAsPdf ref={printRef} reportData={reportData} />
          </div>
      )}
    </>
  );
}


const ReportDateFilterSheet = ({ open, onOpenChange, value, onChange}: { open: boolean, onOpenChange: (open: boolean) => void, value?: DateRange, onChange: (value?: DateRange) => void }) => {
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

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><InlineLoader /></div>}>
      <ReportsPageContent />
    </Suspense>
  );
}
