

"use client";

import React from 'react';
import type { ReportData } from '@/lib/reports';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format, parseISO } from 'date-fns';
import { IndianRupee } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Member, PdfSettings } from '@/lib/types';
import { cn } from '@/lib/utils';


interface ReportAsPdfProps {
  reportData: ReportData;
}

const AllEntriesReport = ({ reportData }: { reportData: ReportData }) => {
    const { data, pdfSettings } = reportData;
    const columns = pdfSettings.columns['all-entries'] || [];

    const showCol = (key: keyof PdfSettings['columns']['all-entries']) => columns.includes(key);

    return (
         <div className="mt-4">
             <p className="text-sm text-gray-600 my-2">Total No. of entries: {data.length}</p>
        
            <table className="w-full text-sm border-collapse mt-2" style={{ tableLayout: 'fixed' }}>
                <thead>
                    <tr className="bg-gray-100">
                        {showCol('date') && <th className="p-2 border text-left font-semibold text-black" style={{ width: '8%' }}>Date</th>}
                        {showCol('remark') && <th className="p-2 border text-left font-semibold text-black" style={{ width: '30%' }}>Remark</th>}
                        {showCol('category') && <th className="p-2 border text-left font-semibold text-black" style={{ width: '10%' }}>Category</th>}
                        {showCol('subcategory') && <th className="p-2 border text-left font-semibold text-black" style={{ width: '10%' }}>Subcategory</th>}
                        {showCol('entryBy') && <th className="p-2 border text-left font-semibold text-black" style={{ width: '10%' }}>Entry by</th>}
                        {showCol('cashIn') && <th className="p-2 border text-right font-semibold text-black" style={{ width: '10%' }}>Cash in</th>}
                        {showCol('cashOut') && <th className="p-2 border text-right font-semibold text-black" style={{ width: '10%' }}>Cash out</th>}
                        {showCol('balance') && <th className="p-2 border text-right font-semibold text-black" style={{ width: '12%' }}>Balance</th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row: any, index: number) => (
                        <tr key={index} className="bg-white data-row break-inside-avoid">
                            {showCol('date') && <td className="p-2 border align-top"><span className="whitespace-nowrap">{format(new Date(row.date), 'dd-MM-yy')}</span></td>}
                            {showCol('remark') && <td className="p-2 border align-top whitespace-pre-wrap">{row.remark || row.category}</td>}
                            {showCol('category') && <td className="p-2 border align-top break-words">{row.category}</td>}
                            {showCol('subcategory') && <td className="p-2 border align-top break-words">{row.subcategory || '-'}</td>}
                            {showCol('entryBy') && <td className="p-2 border align-top break-words">{row.memberName}</td>}
                            {showCol('cashIn') && <td className="p-2 border text-right font-mono align-top">{row.type === 'in' ? row.amount.toLocaleString('en-IN') : '-'}</td>}
                            {showCol('cashOut') && <td className={cn("p-2 border text-right font-mono align-top", row.type === 'out' && "text-red-600")}>{row.type === 'out' ? row.amount.toLocaleString('en-IN') : '-'}</td>}
                            {showCol('balance') && <td className={cn("p-2 border text-right font-mono align-top", row.balance < 0 && 'text-red-600')}>{row.balance.toLocaleString('en-IN')}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const CategoryWiseReport = ({ reportData }: { reportData: ReportData }) => {
    const { data, summary } = reportData;

    return (
        <div className="mt-4">
             <p className="text-sm text-gray-600 my-2">Total No. of entries: {data.length}</p>
            <table className="w-full text-sm border-collapse mt-2" style={{ tableLayout: 'fixed' }}>
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2 border text-left font-semibold text-black" style={{ width: '40%' }}>Category</th>
                        <th className="p-2 border text-right font-semibold text-black" style={{ width: '20%' }}>Cash in</th>
                        <th className="p-2 border text-right font-semibold text-black" style={{ width: '20%' }}>Cash out</th>
                        <th className="p-2 border text-right font-semibold text-black" style={{ width: '20%' }}>Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row: any, index: number) => (
                        <tr key={index} className="bg-white data-row break-inside-avoid">
                            <td className="p-2 border align-top break-words">{row.category}</td>
                            <td className="p-2 border text-right font-mono align-top">{row.cashIn.toLocaleString('en-IN')}</td>
                            <td className="p-2 border text-right font-mono align-top text-red-600">{row.cashOut.toLocaleString('en-IN')}</td>
                            <td className={cn("p-2 border text-right font-mono align-top", row.balance < 0 && 'text-red-600')}>{row.balance.toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <div className="flex justify-end mt-4 break-inside-avoid">
                <table className="w-1/2 text-sm">
                    <tbody>
                        <tr>
                            <td className="p-2 text-left font-semibold">Total Cash In</td>
                            <td className="p-2 text-right font-mono">{summary.totalCashIn.toLocaleString('en-IN')}</td>
                        </tr>
                         <tr>
                            <td className="p-2 text-left font-semibold">Total Cash Out</td>
                            <td className="p-2 text-right font-mono text-red-600">{summary.totalCashOut.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr className="border-t font-bold">
                            <td className="p-2 text-left">Final Balance</td>
                             <td className={cn("p-2 text-right font-mono", summary.netBalance < 0 && 'text-red-600')}>{summary.netBalance.toLocaleString('en-IN')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    )
}

const DayWiseReport = ({ reportData }: { reportData: ReportData }) => {
    const { data } = reportData;
    return (
         <div className="mt-4">
            <p className="text-sm text-gray-600 my-2">Total No. of days: {data.length}</p>
            <table className="w-full text-sm border-collapse mt-2">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2 border text-left font-semibold text-black">Date</th>
                        <th className="p-2 border text-right font-semibold text-black">Cash In</th>
                        <th className="p-2 border text-right font-semibold text-black">Cash Out</th>
                        <th className="p-2 border text-right font-semibold text-black">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row: any, index: number) => (
                        <tr key={index} className="bg-white data-row break-inside-avoid">
                            <td className="p-2 border">{format(parseISO(row.date), 'dd-MM-yy')}</td>
                            <td className="p-2 border text-right font-mono">{row.cashIn.toLocaleString('en-IN')}</td>
                            <td className="p-2 border text-right font-mono text-red-600">{row.cashOut.toLocaleString('en-IN')}</td>
                            <td className={cn("p-2 border text-right font-mono", row.balance < 0 && 'text-red-600')}>{row.balance.toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}


const renderReportBody = (reportData: ReportData) => {
    switch (reportData.reportType) {
        case 'category-wise':
            return <CategoryWiseReport reportData={reportData} />;
        case 'day-wise':
            return <DayWiseReport reportData={reportData} />;
        case 'all-entries':
        default:
            return <AllEntriesReport reportData={reportData} />;
    }
}


export const ReportAsPdf = React.forwardRef<HTMLDivElement, ReportAsPdfProps>(({ reportData }, ref) => {
    const [loggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);
    const [avatar] = useLocalStorage<string | null>(`userAvatar_${loggedInMember?.id}`, null);

    const { reportTitle, generatedFor, filtersApplied, summary, pdfSettings } = reportData;
    
    const showHeaderInfo = pdfSettings.otherOptions.showNameAndNumber;
    const showFiltersInfo = pdfSettings.otherOptions.showFilters;


    return (
        <div ref={ref} id="print-content" className="bg-white text-black p-8 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
             {/* Header */}
            <div id="pdf-header">
                {showHeaderInfo && (
                    <header className="flex justify-between items-start pb-4 border-b">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={avatar ?? undefined} />
                                <AvatarFallback>{loggedInMember?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl font-bold">{loggedInMember?.name}</h1>
                                <p className="text-sm text-gray-500">
                                {reportTitle} for {generatedFor}
                                </p>
                                <p className="text-xs text-gray-500">
                                Generated on {format(new Date(), "dd MMM yyyy, hh:mm a")} by {loggedInMember?.name}
                                </p>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-right">•• Jatin Gadhiya ••</h3>
                            <p className="text-sm text-gray-500 text-right">RupeeBook</p>
                        </div>
                    </header>
                )}

                {/* Sub-header & Summary */}
                <div className="mt-4">
                    {showFiltersInfo && filtersApplied.length > 0 && (
                        <div className="mb-4 p-3 border rounded-md bg-gray-50 text-xs break-inside-avoid">
                            <h4 className="font-bold mb-2">Filters Applied:</h4>
                            <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                                {filtersApplied.map(f => (
                                    <div key={f.filterName} className="grid grid-cols-[100px_1fr] gap-x-2">
                                        <span className="font-semibold">{f.filterName}:</span>
                                        <span className="text-gray-700 break-words">{f.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-4 my-4">
                        <div className="border p-3 rounded-md bg-gray-50">
                            <p className="text-sm text-gray-500">Total Cash in</p>
                            <p className="text-lg font-bold flex items-center"><IndianRupee className="h-4 w-4 mr-1"/>{summary.totalCashIn.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="border p-3 rounded-md bg-gray-50">
                            <p className="text-sm text-gray-500">Total Cash out</p>
                            <p className="text-lg font-bold text-red-600 flex items-center"><IndianRupee className="h-4 w-4 mr-1"/>{summary.totalCashOut.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="border p-3 rounded-md bg-gray-50">
                            <p className="text-sm text-gray-500">Final Balance</p>
                            <p className={cn("text-lg font-bold flex items-center", summary.netBalance < 0 && "text-red-600")}><IndianRupee className="h-4 w-4 mr-1"/>{summary.netBalance.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>
            </div>
             {renderReportBody(reportData)}
        </div>
    );
});

ReportAsPdf.displayName = 'ReportAsPdf';
