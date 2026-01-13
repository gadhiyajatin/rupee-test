
import type { Transaction, Member, RupeeBook, PdfSettings } from './types';
import { parseISO, isWithinInterval, format, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';

export type ReportType = 
  | 'all-entries' 
  | 'day-wise' 
  | 'category-wise';
  
type ReportTransaction = Transaction & { memberName?: string };
export type TransactionWithBalance = ReportTransaction & { balance: number };

export interface GenerateReportInput {
  transactions: Transaction[];
  members: Member[];
  reportType: ReportType;
  filters: {
    type: 'all' | 'in' | 'out';
    category: string[];
    subcategory: string[];
    dateFrom?: string;
    dateTo?: string;
    searchTerm: string;
    members: string[];
  };
  bookName: string;
  loggedInMember: Member;
  pdfSettings: PdfSettings;
}

export type ReportData = {
  reportTitle: string;
  generatedFor: string;
  filtersApplied: { filterName: string, value: string }[];
  data: any[];
  summary: {
    totalCashIn: number;
    totalCashOut: number;
    netBalance: number;
  };
  reportType: ReportType;
  bookName: string;
  loggedInMember: Member;
  pdfSettings: PdfSettings;
};

const filterTransactions = (
  transactions: Transaction[],
  members: Member[],
  filters: GenerateReportInput['filters']
): ReportTransaction[] => {
  const { type, category, subcategory, dateFrom, dateTo, searchTerm, members: memberFilters } = filters;

  const getMemberName = (memberId?: string) => {
    if (!memberId) return 'JATIN GADHIYA';
    const member = members.find(m => m.id === memberId);
    if(member?.name === 'GADHIYAJATIN') return 'JATIN GADHIYA';
    return member?.name || 'JATIN GADHIYA';
  }

  const transactionsWithMemberNames = transactions.map(t => ({
    ...t,
    memberName: getMemberName(t.memberId),
  }));

  const dateRange = {
    start: dateFrom ? startOfDay(parseISO(dateFrom)) : new Date(-8640000000000000),
    end: dateTo ? endOfDay(parseISO(dateTo)) : new Date(8640000000000000),
  };

  return transactionsWithMemberNames.filter((t) => {
    const typeMatch = type === 'all' || t.type === type;
    const categoryMatch = category.length === 0 || category.includes(t.category);
    
    const subcategoryMatch = subcategory.length === 0 || 
        (t.subcategory && subcategory.includes(t.subcategory));

    const dateMatch = isWithinInterval(new Date(t.date), dateRange);
    const memberMatch = memberFilters.length === 0 || (t.memberId && memberFilters.includes(t.memberId));
    
    const searchMatch = !searchTerm || (t.remark||"").toLowerCase().includes(searchTerm.toLowerCase()) || t.amount.toString().includes(searchTerm);

    return typeMatch && categoryMatch && subcategoryMatch && dateMatch && memberMatch && searchMatch;
  });
};

const generateAllEntriesData = (transactions: ReportTransaction[]) => {
  let runningBalance = 0;
  const sortedTransactions = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const balanceMap = new Map<string, number>();
  for(const t of sortedTransactions) {
    if (t.type === 'in') {
      runningBalance += t.amount;
    } else {
      runningBalance -= t.amount;
    }
    balanceMap.set(t.id, runningBalance);
  }

  const data = transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => ({...t, balance: balanceMap.get(t.id) || 0 }));
  
  const totalIn = transactions.reduce((acc, t) => (t.type === 'in' ? acc + t.amount : acc), 0);
  const totalOut = transactions.reduce((acc, t) => (t.type === 'out' ? acc + t.amount : acc), 0);

  return {
    data,
    summary: {
      totalCashIn: totalIn,
      totalCashOut: totalOut,
      netBalance: totalIn - totalOut,
    },
  };
};

const generateDayWiseData = (transactions: ReportTransaction[]) => {
  const dailySummary: Record<string, { cashIn: number; cashOut: number }> = {};
  
  transactions.forEach(t => {
    const date = format(new Date(t.date), 'yyyy-MM-dd');
    if (!dailySummary[date]) {
      dailySummary[date] = { cashIn: 0, cashOut: 0 };
    }
    if (t.type === 'in') {
      dailySummary[date].cashIn += t.amount;
    } else {
      dailySummary[date].cashOut += t.amount;
    }
  });

  const sortedDates = Object.keys(dailySummary).sort();

  let runningBalance = 0;
  const data = sortedDates.map(date => {
    const dailyData = dailySummary[date];
    runningBalance += dailyData.cashIn - dailyData.cashOut;
    return {
      date,
      ...dailyData,
      balance: runningBalance,
    };
  });
  
  const totalIn = data.reduce((acc, day) => acc + day.cashIn, 0);
  const totalOut = data.reduce((acc, day) => acc + day.cashOut, 0);

  return {
    data,
    summary: {
      totalCashIn: totalIn,
      totalCashOut: totalOut,
      netBalance: totalIn - totalOut,
    },
  };
};

const generateCategoryWiseData = (transactions: ReportTransaction[]) => {
    const categorySummary: Record<string, { cashIn: number; cashOut: number }> = {};

    transactions.forEach(t => {
        const category = t.category || 'No Category';
        if (!categorySummary[category]) {
            categorySummary[category] = { cashIn: 0, cashOut: 0 };
        }

        if (t.type === 'in') {
            categorySummary[category].cashIn += t.amount;
        } else {
            categorySummary[category].cashOut += t.amount;
        }
    });

    const data = Object.entries(categorySummary).map(([category, values]) => ({
      category,
      ...values,
      balance: values.cashIn - values.cashOut,
    }));
    
    const totalIn = data.reduce((acc, cat) => acc + cat.cashIn, 0);
    const totalOut = data.reduce((acc, cat) => acc + cat.cashOut, 0);

    return {
        data,
        summary: {
            totalCashIn: totalIn,
            totalCashOut: totalOut,
            netBalance: totalIn - totalOut,
        }
    };
};

export const generateReport = (input: GenerateReportInput): ReportData => {
  const { transactions, members, reportType, filters, bookName, loggedInMember, pdfSettings } = input;
  const filtered = filterTransactions(transactions, members, filters);

  let reportData;
  switch (reportType) {
    case 'all-entries':
      reportData = generateAllEntriesData(filtered);
      break;
    case 'day-wise':
      reportData = generateDayWiseData(filtered);
      break;
    case 'category-wise':
        reportData = generateCategoryWiseData(filtered);
        break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  const filtersWithLabels: Record<string, string> = {
    dateFrom: "Start Date",
    dateTo: "End Date",
    type: "Entry Type",
    category: "Categories",
    subcategory: "Subcategories",
    members: "Members",
    searchTerm: "Search Term",
  };

  const appliedFilters = Object.entries(filters)
    .map(([key, value]) => {
      let displayValue: string | null = null;
      if (Array.isArray(value) && value.length > 0) {
        displayValue = value.join(', ');
      } else if (typeof value === 'string' && value && value !== 'all') {
        displayValue = value;
      } else if ((key === 'dateFrom' || key === 'dateTo') && value) {
        displayValue = format(parseISO(value as string), 'dd MMM yyyy');
      }

      if (displayValue && filtersWithLabels[key]) {
        return { filterName: filtersWithLabels[key], value: displayValue };
      }
      return null;
    })
    .filter(Boolean) as { filterName: string, value: string }[];
    
  // Combine date range into one filter entry
  const dateFromFilter = appliedFilters.find(f => f.filterName === 'Start Date');
  const dateToFilter = appliedFilters.find(f => f.filterName === 'End Date');
  const otherFilters = appliedFilters.filter(f => f.filterName !== 'Start Date' && f.filterName !== 'End Date');
  
  if (dateFromFilter && dateToFilter) {
    otherFilters.unshift({ filterName: 'Date Range', value: `${dateFromFilter.value} to ${dateToFilter.value}` });
  } else if (dateFromFilter) {
    otherFilters.unshift({ filterName: 'Date', value: dateFromFilter.value });
  }


  return {
    reportTitle: `${reportType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Report`,
    generatedFor: bookName,
    reportType,
    filtersApplied: otherFilters,
    data: reportData.data,
    summary: reportData.summary,
    bookName: bookName,
    loggedInMember: loggedInMember,
    pdfSettings: pdfSettings,
  };
};

const getExcelFileName = (reportTitle: string, bookName: string) => {
    const safeBookName = bookName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeReportTitle = reportTitle.replace(/ /g, '_');
    return `${safeBookName}_${safeReportTitle}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
}

export const generateExcelReport = (reportData: ReportData) => {
    const { data, summary, reportType, reportTitle, bookName, filtersApplied, loggedInMember } = reportData;

    const wb = XLSX.utils.book_new();
    let ws_data: any[][] = [];
    
    // Header
    ws_data.push([loggedInMember.name]);
    ws_data.push([`${reportTitle} for ${bookName}`]);
    ws_data.push([`Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`]);
    ws_data.push([]); // Spacer

    // Filters
    if (filtersApplied.length > 0) {
        ws_data.push(['Filters Applied:']);
        filtersApplied.forEach(f => ws_data.push([f.filterName, f.value]));
        ws_data.push([]); // Spacer
    }
    
    // Report Data
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
    
    ws_data.push([]); // Spacer

    // Summary
    ws_data.push(['', '', '', 'Total Cash In:', summary.totalCashIn]);
    ws_data.push(['', '', '', 'Total Cash Out:', summary.totalCashOut]);
    ws_data.push(['', '', '', 'Net Balance:', summary.netBalance]);

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Apply column widths (optional, but good for readability)
    ws['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, 
        { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, getExcelFileName(reportTitle, bookName));
};
