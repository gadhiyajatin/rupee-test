

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRupeeBook, getAllMembers } from '@/lib/supabase-service';
import type { RupeeBook, Member, Transaction } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Calendar, IndianRupee, TrendingUp, TrendingDown, ChevronsUpDown, Check, AreaChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfMonth, endOfMonth, startOfToday, endOfToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { InlineLoader } from '@/components/ui/loading-animation';

function AnalysisPageComponent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const bookId = params.bookId as string;

  const [rupeebook, setRupeebook] = useState<RupeeBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);
  
  const [timeRange, setTimeRange] = useState('all_time');

  const fetchBookData = useCallback(async () => {
    if (!bookId) return;

    setIsLoading(true);
    try {
      const bookData = await getRupeeBook(bookId, true);
      setRupeebook(bookData);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not load book data.", variant: "destructive" });
      router.push(`/`);
    } finally {
      setIsLoading(false);
    }
  }, [bookId, router, toast]);

  useEffect(() => {
    fetchBookData();
  }, [fetchBookData]);

  const dateRange = useMemo(() => {
    const today = new Date();
    switch (timeRange) {
      case 'last_7_days':
        return { start: subDays(today, 6), end: endOfToday() };
      case 'last_30_days':
        return { start: subDays(today, 29), end: endOfToday() };
      case 'this_month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'last_month':
        const lastMonthStart = startOfMonth(subDays(today, 30));
        return { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
      case 'all_time':
      default:
        return null;
    }
  }, [timeRange]);

  const filteredTransactions = useMemo(() => {
    if (!rupeebook?.transactions) return [];
    
    return rupeebook.transactions.filter(t => {
      const transactionDate = parseISO(t.date);
      if (dateRange && (transactionDate < dateRange.start || transactionDate > dateRange.end)) {
        return false;
      }
      return true;
    });
  }, [rupeebook?.transactions, dateRange]);


  const analysisData = useMemo(() => {
    const totalIn = filteredTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const totalOut = filteredTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIn - totalOut;

    const categoryData = filteredTransactions
      .reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = { cashIn: 0, cashOut: 0 };
        }
        if (t.type === 'in') {
          acc[category].cashIn += t.amount;
        } else {
          acc[category].cashOut += t.amount;
        }
        return acc;
      }, {} as Record<string, { cashIn: number, cashOut: number }>);

    const categoryChartData = Object.entries(categoryData)
      .map(([name, { cashIn, cashOut }]) => ({ name, cashIn, cashOut }))
      .sort((a, b) => (b.cashIn + b.cashOut) - (a.cashIn + a.cashOut))
      .slice(0, 15);

    const trendData = filteredTransactions
      .reduce((acc, t) => {
        const date = format(parseISO(t.date), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = { date, cashIn: 0, cashOut: 0 };
        }
        if (t.type === 'in') {
          acc[date].cashIn += t.amount;
        } else {
          acc[date].cashOut += t.amount;
        }
        return acc;
      }, {} as Record<string, { date: string; cashIn: number; cashOut: number }>);
      
    const trendChartData = Object.values(trendData).sort((a,b) => a.date.localeCompare(b.date));
    
    const topIn = [...filteredTransactions.filter(t => t.type === 'in')].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const topOut = [...filteredTransactions.filter(t => t.type === 'out')].sort((a, b) => b.amount - a.amount).slice(0, 5);

    return { totalIn, totalOut, netBalance, categoryChartData, trendChartData, topIn, topOut };
  }, [filteredTransactions]);
  
  if (isLoading || !rupeebook) {
    return <div className="flex h-screen items-center justify-center"><InlineLoader /></div>;
  }
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-background border rounded-lg shadow-sm text-sm">
          <p className="font-bold">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }}>
              {`${p.name}: ₹${p.value.toLocaleString('en-IN')}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const TransactionListItem = ({ t }: { t: Transaction }) => (
    <div className="flex justify-between items-center">
        <p className="truncate font-medium">{t.remark || t.category}</p>
        <p className="font-mono text-base font-semibold">₹{t.amount.toLocaleString('en-IN')}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="flex items-center gap-2 p-2 border-b bg-background sticky top-0 z-10">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/book/${bookId}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-lg font-bold">Financial Analysis</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <Card>
            <CardContent className="p-4">
                 <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full md:w-[280px]">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <SelectValue />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all_time">All Time</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="last_month">Last Month</SelectItem>
                        <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                        <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{analysisData.totalIn.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{analysisData.totalOut.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <IndianRupee className={cn("h-4 w-4", analysisData.netBalance >= 0 ? "text-muted-foreground" : "text-red-500")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", analysisData.netBalance < 0 && "text-red-500")}>
                ₹{analysisData.netBalance.toLocaleString('en-IN')}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle>Cash Flow</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analysisData.trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(tick) => format(parseISO(tick), 'd MMM')} />
                        <YAxis tickFormatter={(tick) => `₹${Number(tick) / 1000}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="cashIn" name="Cash In" stroke="#16a34a" strokeWidth={2} dot={false}/>
                        <Line type="monotone" dataKey="cashOut" name="Cash Out" stroke="#dc2626" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Category Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
                {analysisData.categoryChartData.length > 0 ? (
                    <BarChart data={analysisData.categoryChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, width: 100 }} width={100} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="cashIn" name="Cash In" stackId="a" fill="#16a34a" />
                        <Bar dataKey="cashOut" name="Cash Out" stackId="a" fill="#dc2626" />
                    </BarChart>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No data for this period.</div>
                )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /> Top 5 Cash In</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {analysisData.topIn.length > 0 ? analysisData.topIn.map(t => <TransactionListItem key={t.id} t={t}/>) : <p className="text-sm text-muted-foreground">No cash in entries for this period.</p>}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /> Top 5 Cash Out</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {analysisData.topOut.length > 0 ? analysisData.topOut.map(t => <TransactionListItem key={t.id} t={t}/>) : <p className="text-sm text-muted-foreground">No cash out entries for this period.</p>}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}


export default function BookAnalysisPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><InlineLoader /></div>}>
            <AnalysisPageComponent />
        </Suspense>
    );
}
