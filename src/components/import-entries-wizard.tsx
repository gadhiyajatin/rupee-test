
"use client";

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Upload, AlertCircle, ArrowRight, PartyPopper, Loader2 } from 'lucide-react';
import type { RupeeBook, Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { parse, isValid } from 'date-fns';

type WizardStep = 'selectBook' | 'upload' | 'mapColumns' | 'review' | 'complete';

const REQUIRED_FIELDS = ['date']; 
const ALL_FIELDS = ['date', 'time', 'cashIn', 'cashOut', 'category', 'subcategory', 'remark', 'entryBy', 'balance'];
const FIELD_LABELS: Record<string, string> = {
    date: 'Date',
    time: 'Time',
    cashIn: 'Cash In (Credit)',
    cashOut: 'Cash Out (Debit)',
    category: 'Category',
    subcategory: 'Subcategory',
    remark: 'Remark',
    entryBy: 'Entry By',
    balance: 'Balance'
};

interface ImportEntriesWizardProps {
    allRupeeBooks: RupeeBook[];
    onImportTransactions: (bookId: string, newTransactions: Omit<Transaction, 'id' | 'memberId'>[]) => Promise<void>;
}

export function ImportEntriesWizard({ allRupeeBooks, onImportTransactions }: ImportEntriesWizardProps) {
    const [step, setStep] = useState<WizardStep>('selectBook');
    const [selectedBookId, setSelectedBookId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<string[][]>([]);
    const [headerRow, setHeaderRow] = useState<number>(1);
    const [firstEntryRow, setFirstEntryRow] = useState<number>(2);
    const [lastEntryRow, setLastEntryRow] = useState<number>(0);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({});
    const [isImporting, setIsImporting] = useState(false);

    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);
            parseCsv(uploadedFile);
        }
    };

    const parseCsv = (fileToParse: File) => {
        Papa.parse(fileToParse, {
            encoding: "UTF-8",
            complete: (results) => {
                const data = results.data as string[][];
                setParsedData(data);
                if(data.length > 0) {
                    setLastEntryRow(data.length);
                }
            },
            error: (error: any) => {
                toast({
                    title: 'CSV Parsing Error',
                    description: error.message,
                    variant: 'destructive',
                });
            }
        });
    };

    const headers = parsedData.length > 0 && parsedData[headerRow - 1] ? parsedData[headerRow - 1] : [];
    
    const getMappedData = useCallback(() => {
        if (parsedData.length < firstEntryRow) return [];
        const dataRows = parsedData.slice(firstEntryRow - 1, lastEntryRow);
        
        const headerToIndexMap: Record<string, number> = {};
        headers.forEach((header, index) => {
            headerToIndexMap[header] = index;
        });

        const fieldToHeaderMap: Record<string, string> = {};
        Object.entries(columnMap).forEach(([header, field]) => {
            fieldToHeaderMap[field] = header;
        });

        return dataRows.map((row, rowIndex) => {
            const mappedRow: Partial<Record<string, string>> = { id: String(rowIndex) };
            ALL_FIELDS.forEach(field => {
                const header = fieldToHeaderMap[field];
                if (header) {
                    const colIndex = headerToIndexMap[header];
                    if (colIndex !== undefined) {
                        mappedRow[field] = row[colIndex];
                    }
                }
            });
            return mappedRow;
        });
    }, [parsedData, firstEntryRow, lastEntryRow, columnMap, headers]);

    const handleConfirmImport = async () => {
        if (!selectedBookId) {
            toast({ title: 'Error', description: 'No RupeeBook selected.', variant: 'destructive' });
            return;
        }

        setIsImporting(true);
        const mappedData = getMappedData();

        const dateFormats = [
            'dd-MM-yyyy', 'MM-dd-yyyy', 'yyyy-MM-dd',
            'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd',
            'dd MMM yyyy', 'd MMM yyyy', 'MMM d, yyyy'
        ];

        const parseDate = (dateString: string, timeString?: string): Date | null => {
            if (!dateString) return null;
            let combinedString = dateString;
            if (timeString) {
                combinedString += ` ${timeString}`;
            }

            for (const format of dateFormats) {
                let date = parse(dateString, format, new Date());
                if(isValid(date)) {
                   if (timeString) {
                        // Attempt to parse time, assuming common formats
                        const timeParts = timeString.match(/(\d+):(\d+)(?::(\d+))?\s*(am|pm)?/i);
                        if (timeParts) {
                            let [ , hours, minutes, seconds, ampm ] = timeParts;
                            let h = parseInt(hours, 10);
                            if (ampm && ampm.toLowerCase() === 'pm' && h < 12) h += 12;
                            if (ampm && ampm.toLowerCase() === 'am' && h === 12) h = 0;
                            date.setHours(h, parseInt(minutes, 10), seconds ? parseInt(seconds, 10) : 0);
                        }
                    }
                    return date;
                }
            }
            return null;
        }

        const newTransactions: Omit<Transaction, 'id' | 'memberId'>[] = mappedData.flatMap((row) => {
            const date = parseDate(row.date as string, row.time as string);
            if (!date) return [];
            
            const cashIn = parseFloat(row.cashIn || '0');
            const cashOut = parseFloat(row.cashOut || '0');

            const transactions: Omit<Transaction, 'id' | 'memberId'>[] = [];

            if (cashIn !== 0) {
                 if(cashIn > 0) {
                    transactions.push({
                        date: date.toISOString(),
                        amount: cashIn,
                        type: 'in',
                        category: row.category || 'Uncategorized',
                        subcategory: row.subcategory || '',
                        remark: row.remark || '',
                    });
                 } else { // Handle negative debits in credit column
                     transactions.push({
                        date: date.toISOString(),
                        amount: Math.abs(cashIn),
                        type: 'out',
                        category: row.category || 'Uncategorized',
                        subcategory: row.subcategory || '',
                        remark: row.remark || '',
                    });
                 }
            }
            
            if (cashOut !== 0) {
                transactions.push({
                    date: date.toISOString(),
                    amount: Math.abs(cashOut),
                    type: 'out',
                    category: row.category || 'Uncategorized',
                    subcategory: row.subcategory || '',
                    remark: row.remark || '',
                });
            }

            return transactions;
        });

        if (newTransactions.length === 0) {
            toast({ title: 'No Transactions to Import', description: 'Could not find any valid transactions in your file.', variant: 'destructive'});
            setIsImporting(false);
            return;
        }

        try {
            await onImportTransactions(selectedBookId, newTransactions);
            setIsImporting(false);
            setStep('complete');
        } catch (error) {
            console.error("Import failed:", error);
            toast({ title: 'Import Failed', description: 'Could not save transactions to the book.', variant: 'destructive'});
            setIsImporting(false);
        }
    };


    const handleNext = () => {
        switch (step) {
            case 'selectBook':
                if (selectedBookId) setStep('upload');
                break;
            case 'upload':
                if (parsedData.length > 0) setStep('mapColumns');
                break;
            case 'mapColumns':
                const mappedFields = Object.values(columnMap);
                const hasAllRequired = REQUIRED_FIELDS.every(field => mappedFields.includes(field));
                const hasAmount = mappedFields.includes('cashIn') || mappedFields.includes('cashOut');

                if (!hasAllRequired) {
                     toast({
                        title: 'Mapping Incomplete',
                        description: `Please map all required fields: ${REQUIRED_FIELDS.join(', ')}.`,
                        variant: 'destructive',
                    });
                    return;
                }
                if (!hasAmount) {
                     toast({
                        title: 'Mapping Incomplete',
                        description: 'You must map either a "Cash In" column or a "Cash Out" column.',
                        variant: 'destructive',
                    });
                    return;
                }
                setStep('review');
                break;
            case 'review':
                handleConfirmImport();
                break;
        }
    };
    
    const handleBack = () => {
        switch (step) {
            case 'upload':
                setStep('selectBook');
                break;
            case 'mapColumns':
                setStep('upload');
                break;
            case 'review':
                setStep('mapColumns');
                break;
        }
    };
    
    const handleStartOver = () => {
        setStep('selectBook');
        setSelectedBookId('');
        setFile(null);
        setParsedData([]);
        setHeaderRow(1);
        setFirstEntryRow(2);
        setLastEntryRow(0);
        setColumnMap({});
    }

    const renderSelectBook = () => (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Step 1: Select RupeeBook</CardTitle>
                <CardDescription>Choose the RupeeBook where you want to import entries.</CardDescription>
            </CardHeader>
            <CardContent>
                <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a RupeeBook..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allRupeeBooks.map(book => (
                            <SelectItem key={book.id} value={book.id}>{book.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
            <CardFooter>
                <Button onClick={handleNext} disabled={!selectedBookId} className="ml-auto">
                    Next <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            </CardFooter>
        </Card>
    );

    const renderUploadStep = () => (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Step 2: Upload CSV File</CardTitle>
                <CardDescription>Select the CSV file you want to import.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-6 border rounded-lg">
                        <h3 className="font-semibold">Upload your file</h3>
                         <div className="space-y-2">
                            <Label htmlFor="csv-file">CSV File</Label>
                            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                        </div>
                        <Alert>
                            <Download className="h-4 w-4" />
                            <AlertTitle>Don't have a file?</AlertTitle>
                            <AlertDescription>
                                You can <a href="/sample-import.csv" download className="font-semibold underline">download a sample file</a> to see the required format.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <div className="space-y-4 p-6 border rounded-lg">
                        <h3 className="font-semibold">Specify rows</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="header-row">Header row</Label>
                                <Input id="header-row" type="number" value={headerRow} onChange={e => setHeaderRow(Number(e.target.value))} min={1}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="first-row">First entry row</Label>
                                <Input id="first-row" type="number" value={firstEntryRow} onChange={e => setFirstEntryRow(Number(e.target.value))} min={1}/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last-row">Last entry row</Label>
                                <Input id="last-row" type="number" value={lastEntryRow} onChange={e => setLastEntryRow(Number(e.target.value))} min={1} />
                            </div>
                        </div>
                        <Alert variant="destructive">
                             <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Ensure rows are specified correctly to avoid errors during import.
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>

                {parsedData.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">File Preview</h3>
                        <ScrollArea className="h-64 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">Row</TableHead>
                                        {parsedData[0].map((_, colIndex) => (
                                            <TableHead key={colIndex}>Col {colIndex + 1}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedData.slice(0, 10).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                            <TableCell className="font-medium">{rowIndex + 1}</TableCell>
                                            {row.map((cell, cellIndex) => (
                                                <TableCell key={cellIndex}>{cell}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>Back</Button>
                <Button onClick={handleNext} disabled={parsedData.length === 0}>
                    Next <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            </CardFooter>
        </Card>
    );

    const renderMapColumnsStep = () => (
         <Card className="w-full max-w-2xl mx-auto">
             <CardHeader>
                <CardTitle>Step 3: Map Columns</CardTitle>
                <CardDescription>Match the columns from your file to the transaction fields. At least one amount column is required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {ALL_FIELDS.map(field => (
                        <div key={field} className="flex items-center justify-between">
                            <Label htmlFor={`map-${field}`} className="font-semibold">
                                {FIELD_LABELS[field]}
                                {REQUIRED_FIELDS.includes(field) && <span className="text-destructive ml-1">*</span>}
                            </Label>
                             <Select
                                onValueChange={(value) => {
                                    const newMap = {...columnMap};
                                    // Remove old mapping for this field if it exists
                                    Object.keys(newMap).forEach(key => {
                                        if (newMap[key] === field) delete newMap[key];
                                    });
                                    if(value !== 'unmapped') {
                                        newMap[value] = field;
                                    }
                                    setColumnMap(newMap);
                                }}
                                value={Object.keys(columnMap).find(key => columnMap[key] === field) || ""}
                             >
                                <SelectTrigger className="w-[200px]" id={`map-${field}`}>
                                    <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unmapped" className="text-muted-foreground">Don't map</SelectItem>
                                    {headers.map((header, index) => (
                                        <SelectItem 
                                            key={`${header}-${index}`} 
                                            value={header}
                                            disabled={Object.keys(columnMap).includes(header) && columnMap[header] !== field}
                                        >
                                            {header}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
                 <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Amount Mapping</AlertTitle>
                    <AlertDescription>
                        You can map separate "Cash In" and "Cash Out" columns. If your file has debits as negative numbers in a single amount column, map that column to "Cash In".
                    </AlertDescription>
                </Alert>
            </CardContent>
             <CardFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>Back</Button>
                <Button onClick={handleNext}>
                    Review & Import <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            </CardFooter>
         </Card>
    );
    
    const renderReviewStep = () => {
        const dataToReview = getMappedData();

        return (
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Step 4: Review Data</CardTitle>
                    <CardDescription>Review the {dataToReview.length} transactions below before importing. This is a preview of the first 100 rows.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {ALL_FIELDS.map(field => {
                                        if (Object.values(columnMap).includes(field)) {
                                            return <TableHead key={field}>{FIELD_LABELS[field]}</TableHead>
                                        }
                                        return null;
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dataToReview.slice(0, 100).map((row, index) => (
                                    <TableRow key={index}>
                                       {ALL_FIELDS.map(field => {
                                            if (Object.values(columnMap).includes(field)) {
                                                return <TableCell key={field}>{row[field as keyof typeof row]}</TableCell>
                                            }
                                            return null;
                                       })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={handleBack} disabled={isImporting}>Back</Button>
                    <Button onClick={handleNext} disabled={isImporting}>
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm & Import
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    const renderCompleteStep = () => (
         <Card className="w-full max-w-lg mx-auto text-center">
            <CardHeader>
                <div className="mx-auto bg-green-100 rounded-full p-4 w-fit">
                    <PartyPopper className="h-12 w-12 text-green-600"/>
                </div>
                <CardTitle className="mt-4">Import Complete!</CardTitle>
                <CardDescription>
                    Your transactions have been successfully imported into your RupeeBook.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You can now view your updated transaction list.</p>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                 <Link href="/" className="w-full">
                    <Button className="w-full">Go to Dashboard</Button>
                </Link>
                <Button variant="outline" onClick={handleStartOver} className="w-full">
                    Import Another File
                </Button>
            </CardFooter>
         </Card>
    );


    switch (step) {
        case 'selectBook':
            return renderSelectBook();
        case 'upload':
            return renderUploadStep();
        case 'mapColumns':
            return renderMapColumnsStep();
        case 'review':
             return renderReviewStep();
        case 'complete':
            return renderCompleteStep();
        default:
            return <div>Unknown Step</div>;
    }
}

    