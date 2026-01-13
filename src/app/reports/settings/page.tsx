
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { Member, PdfSettings, ReportType } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';


const defaultPdfSettings: PdfSettings = {
  columns: {
    'all-entries': ['date', 'remark', 'category', 'subcategory', 'entryBy', 'cashIn', 'cashOut', 'balance'],
  },
  otherOptions: {
    showNameAndNumber: true,
    showFilters: true,
  }
};

const allEntriesColumns: (keyof PdfSettings['columns']['all-entries'])[] = ['date', 'remark', 'category', 'subcategory', 'entryBy', 'cashIn', 'cashOut', 'balance'];
const columnLabels: Record<keyof PdfSettings['columns']['all-entries'], string> = {
  date: 'Date',
  remark: 'Remark',
  category: 'Category',
  subcategory: 'Subcategory',
  entryBy: 'Entry by',
  cashIn: 'Cash In',
  cashOut: 'Cash Out',
  balance: 'Balance'
};
const compulsoryColumns: (keyof PdfSettings['columns']['all-entries'])[] = ['date', 'cashIn', 'cashOut', 'balance'];


function PdfSettingsComponent() {
  const [pdfSettings, setPdfSettings] = useLocalStorage<PdfSettings>('pdfSettings', defaultPdfSettings);
  const [loggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);
  const [avatar] = useLocalStorage<string | null>(`userAvatar_${loggedInMember?.id}`, null);
  const { toast } = useToast();
  
  const [activeReportType, setActiveReportType] = useState<ReportType>('all-entries');

  const [localSettings, setLocalSettings] = useState<PdfSettings>(pdfSettings);
  
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');

  useEffect(() => {
    setLocalSettings(pdfSettings);
  }, [pdfSettings]);

  const handleColumnChange = (column: keyof PdfSettings['columns']['all-entries'], checked: boolean) => {
    setLocalSettings(prev => {
      const currentColumns = prev.columns[activeReportType] || [];
      const newColumns = checked 
        ? [...currentColumns, column]
        : currentColumns.filter(c => c !== column);
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [activeReportType]: newColumns
        }
      };
    });
  };

  const handleOptionChange = (option: keyof PdfSettings['otherOptions'], checked: boolean) => {
     setLocalSettings(prev => ({
      ...prev,
      otherOptions: {
        ...prev.otherOptions,
        [option]: checked
      }
    }));
  };

  const handleSave = () => {
    setPdfSettings(localSettings);
    toast({ title: 'Settings Saved', description: 'Your PDF settings have been updated.' });
  }

  const renderColumnCheckboxes = () => {
    switch(activeReportType) {
      case 'all-entries':
        return allEntriesColumns.map(col => {
          const isCompulsory = compulsoryColumns.includes(col);
          const isChecked = localSettings.columns['all-entries']?.includes(col);
          return (
             <div key={col} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <Label htmlFor={`col-${col}`} className={cn("font-medium", isCompulsory && "text-muted-foreground")}>{columnLabels[col]}</Label>
                {isCompulsory ? (
                  <span className="text-sm text-muted-foreground italic">Compulsory</span>
                ) : (
                  <Checkbox 
                    id={`col-${col}`} 
                    checked={isChecked} 
                    onCheckedChange={(checked) => handleColumnChange(col, !!checked)}
                  />
                )}
            </div>
          );
        });
      default:
        return <p className="text-sm text-muted-foreground text-center p-4">Column selection is only available for "All Entries Report" at the moment.</p>;
    }
  }


  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="flex items-center p-2 md:p-4 border-b bg-background sticky top-0 z-10">
          <Button variant="ghost" size="icon" asChild>
            <Link href={bookId ? `/reports?bookId=${bookId}` : '/reports'}>
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="text-lg font-bold text-center flex-1">PDF Settings</h1>
          <div className="w-10" />
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Identity</CardTitle>
            <CardDescription>Tap below to update your logo/name in settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <Avatar>
                <AvatarImage src={avatar ?? undefined} alt={loggedInMember?.name} />
                <AvatarFallback>{loggedInMember?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{loggedInMember?.name}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Column Selection</CardTitle>
            <CardDescription>Select columns you wish to include in your report.</CardDescription>
            <Select value={activeReportType} onValueChange={(v) => setActiveReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-entries">All Entries Report</SelectItem>
                <SelectItem value="day-wise">Day-wise Summary</SelectItem>
                <SelectItem value="category-wise">Category-wise Summary</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-3">
             {renderColumnCheckboxes()}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Other Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <Label htmlFor="opt-name" className="font-medium">Your name and mobile number</Label>
                <Checkbox
                  id="opt-name"
                  checked={localSettings.otherOptions.showNameAndNumber}
                  onCheckedChange={checked => handleOptionChange('showNameAndNumber', !!checked)}
                />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <Label htmlFor="opt-filters" className="font-medium">Applied Filters</Label>
                <Checkbox 
                  id="opt-filters"
                  checked={localSettings.otherOptions.showFilters}
                  onCheckedChange={checked => handleOptionChange('showFilters', !!checked)}
                />
            </div>
          </CardContent>
        </Card>

      </main>

       <footer className="p-4 border-t bg-background">
        <Button className="w-full h-12 text-lg" onClick={handleSave}>
          <Save className="mr-2 h-5 w-5" />
          Save
        </Button>
      </footer>

    </div>
  );
}

export default function PdfSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PdfSettingsComponent />
        </Suspense>
    )
}
