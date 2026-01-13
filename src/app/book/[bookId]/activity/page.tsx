

'use client';

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBookActivities, getRupeeBook, getAllMembers } from '@/lib/supabase-service';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Member, RupeeBook, ActivityLog, ActivityType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Info, Calendar, X, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, startOfToday, startOfYesterday, endOfYesterday, subDays, isToday } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function ActivityPageComponent() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const bookId = params.bookId as string;

    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [rupeebook, setRupeebook] = useState<RupeeBook | null>(null);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);
    
    const [memberFilter, setMemberFilter] = useState('all');
    const [activityFilter, setActivityFilter] = useState<ActivityType | 'all'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);


    const fetchActivityData = useCallback(async () => {
        if (!bookId || !loggedInMember) return;

        const isAuthorized = loggedInMember.role === 'owner' || loggedInMember.role === 'admin';
        if (!isAuthorized) {
            toast({ title: "Access Denied", description: "You don't have permission to view this page.", variant: "destructive" });
            router.push(`/book/${bookId}`);
            return;
        }

        setIsLoading(true);
        try {
            const [bookData, membersData, activitiesData] = await Promise.all([
                getRupeeBook(bookId),
                getAllMembers(),
                getBookActivities(bookId)
            ]);
            
            const superAdminMember = { id: 'm1', name: 'JATIN GADHIYA', pin: '9466', role: 'owner' as const };
            setAllMembers([superAdminMember, ...membersData]);

            setRupeebook(bookData);
            setActivities(activitiesData);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not load book activity. The book may not exist.", variant: "destructive" });
            router.push(`/`);
        } finally {
            setIsLoading(false);
        }
    }, [bookId, loggedInMember, router, toast]);

    useEffect(() => {
        fetchActivityData();
    }, [fetchActivityData]);
    
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop > 300) {
            setShowScrollTop(true);
        } else {
            setShowScrollTop(false);
        }
    };
    
    const scrollToTop = () => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const filteredActivities = useMemo(() => {
        return activities
            .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
            .filter(activity => {
                if (memberFilter !== 'all' && activity.memberId !== memberFilter) return false;
                if (activityFilter !== 'all' && activity.type !== activityFilter) return false;
                if (dateRange?.from && parseISO(activity.timestamp) < startOfDay(dateRange.from)) return false;
                if (dateRange?.to && parseISO(activity.timestamp) > endOfDay(dateRange.to)) return false;
                return true;
            });
    }, [activities, memberFilter, activityFilter, dateRange]);

    const groupedActivities = useMemo(() => {
        return filteredActivities.reduce((acc, activity) => {
            const date = format(parseISO(activity.timestamp), 'd MMMM yyyy');
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(activity);
            return acc;
        }, {} as Record<string, ActivityLog[]>);
    }, [filteredActivities]);
    
    const getMemberName = (memberId: string) => {
        if (loggedInMember?.id === memberId) return "You";
        const member = allMembers.find(m => m.id === memberId);
        if (member?.name === 'GADHIYAJATIN') return 'JATIN GADHIYA';
        return member?.name || "Unknown Member";
    };

    const renderActivityDetails = (activity: ActivityLog) => {
        const details = activity.details;
        const formatAmount = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

        switch (activity.type) {
            case 'create':
                const remarkOrCategory = details.remark ? `"${details.remark}"` : `"${details.category}"`;
                return (
                    <span>
                        Added {remarkOrCategory} for <strong>{formatAmount(details.amount)}</strong> ({details.type === 'in' ? 'Cash In' : 'Cash Out'})
                    </span>
                );

            case 'update':
                const changedKeys = Object.keys(details.changes);
                if (changedKeys.length === 0) {
                    return <span>Edited an entry with no changes.</span>;
                }
                const changes = changedKeys.map(key => {
                    const change = details.changes[key];
                    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                    if (key === 'amount') {
                         return `amount from ${formatAmount(change.from)} to ${formatAmount(change.to)}`;
                    }
                    if (key === 'date') {
                        return `date from ${format(parseISO(change.from), 'd MMM')} to ${format(parseISO(change.to), 'd MMM')}`;
                    }
                    return `${formattedKey.toLowerCase()}`;
                }).join(', ');

                return <span>Edited entry: Changed {changes}.</span>;

            case 'delete':
                if (details.count > 1) {
                    return <span>Deleted <strong>{details.count}</strong> entries.</span>;
                }
                 if(details.deletedEntry) {
                    const { remark, category, amount } = details.deletedEntry;
                    return <span>Deleted entry: <strong>"{remark || category}"</strong> ({formatAmount(amount)})</span>
                }
                return <span>Deleted <strong>1</strong> entry.</span>;

            case 'copy':
                 return <span>Copied <strong>{details.count}</strong> {details.count > 1 ? 'entries' : 'entry'} to <strong>"{details.toBook}"</strong> book.</span>;
            
            case 'move':
                 return <span>Moved <strong>{details.count}</strong> {details.count > 1 ? 'entries' : 'entry'} to <strong>"{details.toBook}"</strong> book.</span>;

            case 'delete_all':
                return <span>Deleted all entries in the book.</span>;
                
            default:
                return <span>Performed an action: {activity.type}</span>;
        }
    };
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col h-screen bg-muted/20">
            <header className="flex items-center gap-2 p-2 border-b bg-background sticky top-0 z-10">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/book/${bookId}`}>
                        <ArrowLeft />
                    </Link>
                </Button>
                <h1 className="text-lg font-bold">Book Activity</h1>
            </header>

            <main className="flex-1 flex flex-col min-h-0">
                <div className="p-4 bg-background border-b">
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <Select value={memberFilter} onValueChange={setMemberFilter}>
                            <SelectTrigger><SelectValue placeholder="All Members" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Members</SelectItem>
                                {rupeebook?.members.map(m => (
                                    <SelectItem key={m.memberId} value={m.memberId}>{getMemberName(m.memberId)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as ActivityType | 'all')}>
                            <SelectTrigger><SelectValue placeholder="All Activity" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Activity</SelectItem>
                                <SelectItem value="create">Added</SelectItem>
                                <SelectItem value="update">Edited</SelectItem>
                                <SelectItem value="delete">Deleted</SelectItem>
                                <SelectItem value="copy">Copied</SelectItem>
                                <SelectItem value="move">Moved</SelectItem>
                                <SelectItem value="delete_all">Deleted All</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DateFilterButtons dateRange={dateRange} setDateRange={setDateRange} />
                </div>
                
                <div className="p-4 text-sm text-muted-foreground text-center">
                    Total {filteredActivities.length} activities
                </div>

                <ScrollArea className="flex-1 px-4" onScroll={handleScroll} ref={scrollRef}>
                    <div className="space-y-6 pb-4">
                        {Object.keys(groupedActivities).length > 0 ? (
                             Object.entries(groupedActivities).map(([date, acts]) => (
                                <div key={date}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-semibold text-sm">{date}</h3>
                                        <p className="text-xs text-muted-foreground">({acts.length} Activities)</p>
                                    </div>
                                    <div className="space-y-3">
                                        {acts.map(activity => (
                                            <div key={activity.id} className="flex items-start gap-3">
                                                <Avatar className="mt-1">
                                                    <AvatarFallback>{getMemberName(activity.memberId).charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold">{getMemberName(activity.memberId)}</p>
                                                            <p className="text-sm">{renderActivityDetails(activity)}</p>
                                                            {activity.details.isBackdated && <Badge variant="outline" className="mt-1">Backdate</Badge>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground shrink-0">{format(parseISO(activity.timestamp), 'hh:mm a')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground pt-10">No activities found for the selected filters.</div>
                        )}
                    </div>
                </ScrollArea>
            </main>
            
            <footer className="p-4 border-t bg-background space-y-2 text-center text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-2 text-green-600">
                    <Info className="h-4 w-4" />
                    <p>Only Owner/Admin can see these activities</p>
                </div>
            </footer>
            {showScrollTop && (
                <Button 
                    size="icon" 
                    className="rounded-full fixed bottom-24 right-4 h-12 w-12 shadow-lg"
                    onClick={scrollToTop}
                >
                    <ArrowUp />
                </Button>
            )}
        </div>
    );
}

const DateFilterButtons = ({ dateRange, setDateRange }: { dateRange?: DateRange, setDateRange: (range?: DateRange) => void }) => {
    const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
    
    const setRange = (range: 'today' | 'yesterday') => {
        if (range === 'today') {
            const today = startOfToday();
            setDateRange({ from: today, to: endOfDay(today) });
        } else {
            const yesterday = startOfYesterday();
            setDateRange({ from: yesterday, to: endOfYesterday() });
        }
    };
    
    const isTodayActive = dateRange?.from && isToday(dateRange.from);
    const isYesterdayActive = dateRange?.from && isToday(subDays(dateRange.from, -1));


    return (
        <div className="flex items-center gap-2 mt-2">
            <Button variant={dateRange && !isTodayActive && !isYesterdayActive ? 'secondary' : 'outline'} className="flex-1" onClick={() => setIsDateSheetOpen(true)}>
                <Calendar className="mr-2 h-4 w-4"/>
                Date Range
            </Button>
            <Button variant={isTodayActive ? 'secondary' : 'outline'} onClick={() => setRange('today')}>Today</Button>
            <Button variant={isYesterdayActive ? 'secondary' : 'outline'} onClick={() => setRange('yesterday')}>Yesterday</Button>

            <DateFilterSheet open={isDateSheetOpen} onOpenChange={setIsDateSheetOpen} value={dateRange} onChange={setDateRange} />
        </div>
    )
}

const DateFilterSheet = ({ open, onOpenChange, value, onChange}: { open: boolean, onOpenChange: (open: boolean) => void, value?: DateRange, onChange: (value?: DateRange) => void }) => {
    const [localDateRange, setLocalDateRange] = useState<DateRange|undefined>(value);

    useEffect(() => {
        if(open) {
            setLocalDateRange(value);
        }
    }, [open, value]);

    const handleApply = () => {
        let finalRange = localDateRange;
        if(localDateRange?.from && !localDateRange.to) {
            finalRange = {...finalRange, to: endOfDay(localDateRange.from)}
        }
        onChange(finalRange);
        onOpenChange(false);
    }
    
    const handleClear = () => {
        setLocalDateRange(undefined);
        onChange(undefined);
        onOpenChange(false);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="p-0 flex flex-col h-[60dvh]">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>Select Date Range</SheetTitle>
                </SheetHeader>
                <div className="flex-1 flex justify-center items-center">
                    <CalendarPicker
                        mode="range"
                        selected={localDateRange}
                        onSelect={setLocalDateRange}
                        className="border rounded-md"
                        numberOfMonths={1}
                    />
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


export default function BookActivityPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <ActivityPageComponent />
        </Suspense>
    );
}

    
