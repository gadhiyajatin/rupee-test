

'use client';

import { useLocalStorage } from '@/hooks/use-local-storage';
import type { RupeeBook, Business, Transaction, Member, Role } from '@/lib/types';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BookList } from './book-list';
import { TransactionView } from './transaction-view';
import { Button } from './ui/button';
import { IndianRupee, ArrowDown, ArrowUp, ChevronLeft, Settings, MoreVertical, Upload, FileText, History, Trash2, Languages, LogOut, Building, User, ChevronDown, Plus, Share2, AreaChart, ChevronsUpDown, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { BookSettingsSheet } from './book-settings-sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuGroup, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
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
} from "@/components/ui/alert-dialog";
import { 
    getBusinesses, 
    getRupeeBooks, 
    getRupeeBook, 
    getAllMembers,
    addBusiness,
    updateBusiness,
    updateBusinessOrder,
    deleteBusiness,
    addRupeeBook, 
    updateRupeeBook, 
    deleteRupeeBook,
    addTransaction,
    updateTransaction,
    deleteTransactions,
    copyTransactions,
    moveTransactions,
    deleteAllTransactions,
    updateMember,
} from '@/lib/firebase-service';
import { AddBusinessDialog } from './add-business-dialog';
import { AddRupeeBookDialog } from './add-rupeebook-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { AddTransactionSheet } from './add-transaction-sheet';
import { AddTransactionDialog } from './add-transaction-dialog';
import { LoadingAnimation, InlineLoader } from './ui/loading-animation';
import { EditTransactionDialog } from './edit-transaction-dialog';
import { useLanguage } from '@/context/language-context';
import { PreferencesDialog } from './preferences-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Card, CardContent } from './ui/card';

interface RupeeBookAppComponentProps {
  isMobile: boolean;
}

export function RupeeBookAppWrapper({ isMobile: isMobileProp }: { isMobile: boolean }) {
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [allRupeeBooks, setAllRupeeBooks] = useState<RupeeBook[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();

  const [activeBusinessId, setActiveBusinessId] = useLocalStorage<string | null>('activeBusinessId', null);
  const [activeRupeeBookId, setActiveRupeeBookId] = useState<string | null>(null);
  const [loggedInMember, setLoggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);

  const [isLoading, setIsLoading] = useState(true);
  const [detailedBookCache, setDetailedBookCache] = useLocalStorage<Record<string, RupeeBook>>('detailedBookCache', {});
  
  const isMobile = useIsMobile();


  const refreshData = useCallback(async (options: { refetchBooks?: boolean, refetchBusinesses?: boolean, refetchMembers?: boolean } = {}) => {
    if (!loggedInMember) return;
    
    const { refetchBooks = true, refetchBusinesses = true, refetchMembers = true } = options;

    try {
        if (refetchBooks) {
            const books = await getRupeeBooks(loggedInMember);
            setAllRupeeBooks(books);
        }
        if (refetchBusinesses) {
            const businesses = await getBusinesses(loggedInMember);
            setAllBusinesses(businesses);
        }
        if (refetchMembers) {
            const members = await getAllMembers();
            const superAdminMember = { id: 'm1', name: 'JATIN GADHIYA', pin: '9466', role: 'owner' as const, failedPinAttempts: 0 };
            setAllMembers([...members, superAdminMember]);
        }
    } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({ title: "Error", description: "Could not sync data from server.", variant: "destructive" });
    }
  }, [loggedInMember, toast]);


  useEffect(() => {
    async function initialFetch() {
        if (loggedInMember) {
            setIsLoading(true);
            await refreshData();
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    }
    initialFetch();
  }, [loggedInMember, refreshData]);

  // Set initial active book
  useEffect(() => {
      if (isLoading) return;
      if (isMobile) {
          const bookId = params.bookId as string;
          if (bookId) {
              const bookExists = allRupeeBooks.some(b => b.id === bookId);
              if (bookExists && bookId !== activeRupeeBookId) {
                  setActiveRupeeBookId(bookId);
                  const book = allRupeeBooks.find(b => b.id === bookId);
                  if (book && book.businessId && book.businessId !== activeBusinessId) {
                    setActiveBusinessId(book.businessId)
                  }
              }
          }
      } else {
          // On web, maybe restore the last viewed book
          const lastViewed = loggedInMember?.lastViewedBookId;
          const bookExists = (bookId: string) => allRupeeBooks.some(b => b.id === bookId);

          if (activeRupeeBookId && bookExists(activeRupeeBookId)) {
              // A book is already active and exists, do nothing
          } else if (lastViewed && bookExists(lastViewed)) {
              setActiveRupeeBookId(lastViewed);
              const book = allRupeeBooks.find(b => b.id === lastViewed);
              if (book && book.businessId && book.businessId !== activeBusinessId) {
                  setActiveBusinessId(book.businessId);
              }
          } else if (activeBusinessId && allBusinesses.some(b => b.id === activeBusinessId)) {
              const booksInBusiness = allRupeeBooks.filter(b => b.businessId === activeBusinessId);
              if (booksInBusiness.length > 0) {
                  setActiveRupeeBookId(booksInBusiness[0].id);
              } else {
                  setActiveRupeeBookId(null);
              }
          } else if (allBusinesses.length > 0) {
              const firstBusinessId = allBusinesses[0].id;
              setActiveBusinessId(firstBusinessId);
              const booksInFirstBusiness = allRupeeBooks.filter(b => b.businessId === firstBusinessId);
               if (booksInFirstBusiness.length > 0) {
                  setActiveRupeeBookId(booksInFirstBusiness[0].id);
              } else {
                  setActiveRupeeBookId(null);
              }
          } else {
              setActiveRupeeBookId(null);
              setActiveBusinessId(null);
          }
      }
  }, [isMobile, params.bookId, allRupeeBooks, allBusinesses, loggedInMember, activeBusinessId, activeRupeeBookId, setActiveBusinessId, isLoading]);


  const ownedBooks = useMemo(() => {
    if (!loggedInMember) return [];
    return allRupeeBooks.filter(book => book.ownerId === loggedInMember.id);
  }, [allRupeeBooks, loggedInMember]);

  const sharedBooksByOwner = useMemo(() => {
    if (!loggedInMember) return new Map();
    
    const sharedBooks = allRupeeBooks.filter(book => book.ownerId !== loggedInMember.id);
    
    return sharedBooks.reduce((acc, book) => {
        const owner = allMembers.find(m => m.id === book.ownerId);
        const ownerName = owner?.name === 'JATIN GADHIYA' ? 'JATIN GADHIYA' : owner?.name || 'Unknown Owner';
        if (!acc.has(ownerName)) {
            acc.set(ownerName, []);
        }
        acc.get(ownerName)!.push(book);
        return acc;
    }, new Map<string, RupeeBook[]>());
  }, [allRupeeBooks, allMembers, loggedInMember]);


  const booksForActiveBusiness = useMemo(() => {
    if (!activeBusinessId) return [];
    return ownedBooks.filter(rb => rb.businessId === activeBusinessId);
  }, [ownedBooks, activeBusinessId]);

  const [detailedBook, setDetailedBook] = useState<RupeeBook | null>(null);

  useEffect(() => {
    async function fetchBookDetails() {
      if (activeRupeeBookId) {
        // Optimistic load from cache
        if (detailedBookCache[activeRupeeBookId]) {
          setDetailedBook(detailedBookCache[activeRupeeBookId]);
          setIsLoading(false); // Assume fast load, but fetch in background
        } else {
          setIsLoading(true);
        }

        try {
            const book = await getRupeeBook(activeRupeeBookId, true);
            setDetailedBook(book);
            setDetailedBookCache(prev => ({...prev, [activeRupeeBookId]: book}));
        } catch (e) {
            console.error(e);
            toast({title: "Error", description: "Could not load the selected book."})
            setActiveRupeeBookId(null);
            setDetailedBook(null);
        } finally {
            setIsLoading(false);
        }
      } else {
        setDetailedBook(null);
      }
    }
    fetchBookDetails();
  }, [activeRupeeBookId, toast, setActiveRupeeBookId, setDetailedBookCache]);
  
  const handleSelectBusiness = useCallback((id: string) => {
      setActiveBusinessId(id);
      const booksInNewBusiness = allRupeeBooks.filter(rb => rb.businessId === id);
      if (booksInNewBusiness.length > 0) {
          setActiveRupeeBookId(booksInNewBusiness[0].id);
      } else {
          setActiveRupeeBookId(null);
      }
  }, [allRupeeBooks, setActiveBusinessId, setActiveRupeeBookId]);

  const handleAddBusiness = useCallback(async (name: string, type: 'personal' | 'business') => {
      if (!loggedInMember) return;
      const ownerId = loggedInMember.id;
      const newBusiness = await addBusiness({ name, ownerId: ownerId, type: type, sortOrder: allBusinesses.length });
      await refreshData({ refetchBooks: false, refetchBusinesses: true, refetchMembers: false });
      setActiveBusinessId(newBusiness.id);
  }, [loggedInMember, allBusinesses.length, refreshData, setActiveBusinessId]);
  
  const handleUpdateBusiness = useCallback(async (id: string, name: string) => {
      await updateBusiness(id, { name });
      refreshData({ refetchBooks: false, refetchBusinesses: true, refetchMembers: false });
  }, [refreshData]);

  const handleUpdateBusinessOrder = useCallback(async (businesses: Business[]) => {
      const updatedBusinesses = businesses.map((b, index) => ({...b, sortOrder: index}));
      setAllBusinesses(updatedBusinesses); // Optimistic update
      await updateBusinessOrder(updatedBusinesses);
      refreshData({ refetchBooks: false, refetchBusinesses: true, refetchMembers: false });
  }, [refreshData]);

  const handleDeleteBusiness = useCallback(async (id: string) => {
      const booksToDelete = allRupeeBooks.filter(rb => rb.businessId === id).map(rb => rb.id);
      await deleteBusiness(id, booksToDelete);
      if (activeBusinessId === id) {
          const remainingBusinesses = allBusinesses.filter(b => b.id !== id);
          setActiveBusinessId(remainingBusinesses.length > 0 ? remainingBusinesses[0].id : null);
      }
      refreshData({ refetchBooks: true, refetchBusinesses: true, refetchMembers: false });
  }, [allRupeeBooks, activeBusinessId, allBusinesses, setActiveBusinessId, refreshData]);
  
  const handleSelectRupeeBook = useCallback((bookId: string) => {
      setIsLoading(true); // Show loader immediately
      setActiveRupeeBookId(bookId);
      if(isMobile) {
        router.push(`/book/${bookId}`);
      } else if (loggedInMember) {
          if (loggedInMember.id === 'm1') {
              setLoggedInMember({...loggedInMember, lastViewedBookId: bookId });
              return;
          }
          updateMember(loggedInMember.id, { lastViewedBookId: bookId });
          setLoggedInMember({...loggedInMember, lastViewedBookId: bookId });
      }
  }, [isMobile, loggedInMember, router, setLoggedInMember, setActiveRupeeBookId]);

  const handleAddRupeeBook = useCallback(async (name: string, businessId?: string) => {
      const targetBusinessId = businessId || activeBusinessId;
      if (!loggedInMember || !targetBusinessId) {
          if (allBusinesses.length === 0 && (loggedInMember?.role === 'owner' || loggedInMember?.role === 'admin')) {
               toast({ title: 'Error', description: 'Create a workspace first.', variant: 'destructive'});
          } else {
              toast({ title: 'Error', description: 'No active workspace selected.', variant: 'destructive'});
          }
          return;
      };
       
      const newBookData: Omit<RupeeBook, 'id'> = {
          name: name,
          businessId: targetBusinessId,
          ownerId: loggedInMember.id,
          members: [{ memberId: loggedInMember.id, role: 'owner', lastViewed: new Date().toISOString() }],
          categories: [],
          subcategories: [],
          transactions: []
      };
       
      const newBook = await addRupeeBook(newBookData);
      await refreshData({ refetchBooks: true, refetchBusinesses: false, refetchMembers: false });
      setActiveRupeeBookId(newBook.id);
  }, [loggedInMember, activeBusinessId, allBusinesses.length, refreshData, toast, setActiveRupeeBookId]);

  const handleDeleteRupeeBook = useCallback(async (id: string) => {
      await deleteRupeeBook(id);
      if (activeRupeeBookId === id) {
        setActiveRupeeBookId(null);
      }
      await refreshData({ refetchBooks: true, refetchBusinesses: false, refetchMembers: false });
  }, [activeRupeeBookId, refreshData, setActiveRupeeBookId]);

  const handleUpdateRupeeBook = useCallback(async (bookId: string, updates: Partial<Omit<RupeeBook, 'id'>>) => {
      await updateRupeeBook(bookId, updates);
      await refreshData({ refetchBooks: true, refetchBusinesses: false, refetchMembers: false });
      
      if ('businessId' in updates && updates.businessId) {
         setActiveBusinessId(updates.businessId);
      }
  }, [refreshData, setActiveBusinessId]);

  const handleDuplicateRupeeBook = useCallback(async (bookId: string) => {
      const bookToDuplicate = allRupeeBooks.find(rb => rb.id === bookId);
      if (!bookToDuplicate || !loggedInMember) return;
  
      const ownerId = loggedInMember.id;
  
      const duplicatedBookData: Omit<RupeeBook, 'id'> = {
        ...bookToDuplicate,
        name: `${bookToDuplicate.name} (copy)`,
        ownerId: ownerId,
        members: [{ memberId: ownerId, role: 'owner', lastViewed: new Date().toISOString() }],
        transactions: [],
      };
       
      const newBook = await addRupeeBook(duplicatedBookData);
      await refreshData({ refetchBooks: true, refetchBusinesses: false, refetchMembers: false });
      setActiveRupeeBookId(newBook.id);
      toast({
        title: "Book Duplicated",
        description: `"${bookToDuplicate.name}" has been duplicated.`,
      });
  }, [allRupeeBooks, loggedInMember, refreshData, toast, setActiveRupeeBookId]);

  const bookListProps = useMemo(() => ({
    businesses: allBusinesses.sort((a, b) => a.sortOrder - b.sortOrder),
    activeBusinessId,
    onSelectBusiness: handleSelectBusiness,
    onAddBusiness: handleAddBusiness,
    onUpdateBusiness: handleUpdateBusiness,
    onUpdateBusinessOrder: handleUpdateBusinessOrder,
    onDeleteBusiness: handleDeleteBusiness,
    rupeebooks: booksForActiveBusiness,
    allMembers,
    activeRupeeBookId,
    onSelectRupeeBook: handleSelectRupeeBook,
    onAddRupeeBook: (name: string) => handleAddRupeeBook(name), // Mobile doesn't select business
    onDeleteRupeeBook: handleDeleteRupeeBook,
    onUpdateRupeeBook: handleUpdateRupeeBook,
    onDuplicateRupeeBook: handleDuplicateRupeeBook,
    loggedInMember,
    setLoggedInMember,
    sharedBooksByOwner,
  }), [
    allBusinesses, activeBusinessId, handleSelectBusiness, handleAddBusiness, handleUpdateBusiness, handleUpdateBusinessOrder, handleDeleteBusiness,
    booksForActiveBusiness, allMembers, activeRupeeBookId, handleSelectRupeeBook, handleAddRupeeBook, handleDeleteRupeeBook, 
    handleUpdateRupeeBook, handleDuplicateRupeeBook, loggedInMember, setLoggedInMember, sharedBooksByOwner
  ]);

  const refreshBookDetails = useCallback(async () => {
    if (activeRupeeBookId) {
        const updatedBook = await getRupeeBook(activeRupeeBookId, true);
        setDetailedBook(updatedBook);
        setDetailedBookCache(prev => ({...prev, [activeRupeeBookId]: updatedBook}));
        await refreshData({refetchBooks: true, refetchBusinesses: false, refetchMembers: false});
    }
  }, [activeRupeeBookId, refreshData, setDetailedBookCache]);

  
    const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false);
    const [addTransactionType, setAddTransactionType] = useState<'in' | 'out'>('in');

  if (isLoading && !detailedBook) {
    return <LoadingAnimation />;
  }

  if (isMobile) {
      const bookId = params.bookId as string;
      if (bookId && detailedBook && detailedBook.id === bookId) {
          return (
            <TransactionDetailsView
              key={`${bookId}-${isMobile}`}
              allBusinesses={allBusinesses}
              activeRupeeBook={detailedBook}
              allRupeeBooks={allRupeeBooks}
              allMembers={allMembers}
              loggedInMember={loggedInMember}
              refreshBookDetails={refreshBookDetails}
              onSelectBusiness={handleSelectBusiness}
              onSelectRupeeBook={handleSelectRupeeBook}
              onAddBusiness={handleAddBusiness}
              onAddRupeeBook={handleAddRupeeBook}
            />
          );
      }
      if (isLoading) {
          return <LoadingAnimation />;
      }
      if (allBusinesses.length === 0 && !isLoading && (loggedInMember?.role === 'owner' || loggedInMember?.role === 'admin')) {
            return (
                <div className="flex flex-col h-screen items-center justify-center text-center p-4">
                    <h2 className="text-xl font-bold mb-2">Welcome!</h2>
                    <p className="text-muted-foreground mb-4">Create your first workspace to get started.</p>
                    <AddBusinessDialog onAddBusiness={bookListProps.onAddBusiness}>
                      <Button>Create Workspace</Button>
                    </AddBusinessDialog>
                </div>
            )
      }
      return <BookList {...bookListProps} />;
  }

  // --- Desktop View ---
  const isOwnerOrAdmin = loggedInMember?.role === 'owner' || loggedInMember?.role === 'admin';

  const renderDesktopView = () => {
    if (isLoading) {
      return <div className="flex h-full w-full items-center justify-center"><InlineLoader /></div>;
    }
    
    if (allBusinesses.length === 0 && isOwnerOrAdmin) {
      return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
                <p className="mb-4 text-lg">Welcome to RupeeBook!</p>
                <p className="text-muted-foreground mb-6">Create a workspace to get started.</p>
                <AddBusinessDialog onAddBusiness={handleAddBusiness}>
                    <Button>Create Workspace</Button>
                </AddBusinessDialog>
            </div>
        </div>
      );
    }
    
    if (!activeBusinessId || !activeRupeeBookId || !detailedBook) {
       return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="mb-4 text-lg text-muted-foreground">Select a book to view transactions or create a new one.</p>
                    {isOwnerOrAdmin && (
                        <AddRupeeBookDialog 
                            onAddRupeeBook={handleAddRupeeBook}
                            businesses={allBusinesses}
                            activeBusinessId={activeBusinessId}
                        >
                            <Button>Create New Book</Button>
                        </AddRupeeBookDialog>
                    )}
                </div>
            </div>
        );
    }

    return (
      <TransactionDetailsView
          key={`${activeRupeeBookId}-desktop`}
          allBusinesses={allBusinesses}
          activeRupeeBook={detailedBook}
          allRupeeBooks={allRupeeBooks}
          allMembers={allMembers}
          loggedInMember={loggedInMember}
          refreshBookDetails={refreshBookDetails}
          onAddButtonClick={(type) => {
              setAddTransactionType(type);
              setIsAddTransactionDialogOpen(true);
          }}
          onSelectBusiness={handleSelectBusiness}
          onSelectRupeeBook={handleSelectRupeeBook}
          onAddBusiness={handleAddBusiness}
          onAddRupeeBook={handleAddRupeeBook}
      />
    );
  }

  return (
    <div className="h-screen bg-background text-foreground">
        <main className="flex flex-col h-full min-h-0">
          {renderDesktopView()}
        </main>
        <AddTransactionDialog
            open={isAddTransactionDialogOpen}
            onOpenChange={setIsAddTransactionDialogOpen}
            type={addTransactionType}
            onAddTransaction={(newTransaction) => {
                if(detailedBook) {
                    addTransaction(detailedBook.id, {...newTransaction, memberId: loggedInMember?.id || ''})
                    .then(() => refreshBookDetails())
                }
            }}
            rupeebook={detailedBook!}
            loggedInMember={loggedInMember}
        />
    </div>
  );
}


interface TransactionDetailsViewProps {
    allBusinesses: Business[];
    activeRupeeBook: RupeeBook;
    allRupeeBooks: RupeeBook[];
    allMembers: Member[];
    loggedInMember: Member | null;
    refreshBookDetails: () => Promise<void>;
    onAddButtonClick?: (type: 'in' | 'out') => void;
    onSelectBusiness: (id: string) => void;
    onSelectRupeeBook: (id: string) => void;
    onAddBusiness: (name: string, type: 'personal' | 'business') => void;
    onAddRupeeBook: (name: string, businessId?: string) => void;
}

function TransactionDetailsView({ 
    allBusinesses,
    activeRupeeBook, 
    allRupeeBooks, 
    allMembers, 
    loggedInMember,
    refreshBookDetails,
    onAddButtonClick,
    onSelectBusiness,
    onSelectRupeeBook,
    onAddBusiness,
    onAddRupeeBook,
}: TransactionDetailsViewProps) {
  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isAddTransactionSheetOpen, setIsAddTransactionSheetOpen] = useState(false);
  const [addTransactionType, setAddTransactionType] = useState<'in' | 'out'>('in');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [summary, setSummary] = useState({ totalCashIn: 0, totalCashOut: 0, netBalance: 0 });

  const isOwnerOrAdmin = loggedInMember?.role === 'owner' || loggedInMember?.role === 'admin';
  const isViewer = loggedInMember?.role === 'viewer';
  
  const transactions = activeRupeeBook?.transactions || [];

  const handleAddTransaction = async (newTransactionData: Omit<Transaction, 'id' | 'memberId'>) => {
    if (!activeRupeeBook || !loggedInMember) return;
    
    try {
      await addTransaction(activeRupeeBook.id, { ...newTransactionData, memberId: loggedInMember.id });
      await refreshBookDetails();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      toast({ title: "Save Failed", description: "Could not save the new transaction.", variant: "destructive" });
      await refreshBookDetails();
    }
  };

  const handleEditTransaction = async (updatedTransactionData: Transaction) => {
    if (!activeRupeeBook || !loggedInMember) return;
    
    try {
      await updateTransaction(activeRupeeBook.id, updatedTransactionData);
      await refreshBookDetails();
    } catch(error) {
      console.error("Failed to edit transaction:", error);
      toast({ title: "Update Failed", description: "Could not save your changes.", variant: "destructive" });
    }
  };
  
  const handleDeleteTransaction = async (transactionIds: string[]) => {
    if (!activeRupeeBook || !loggedInMember) return;
    
    if (transactionIds.includes(selectedTransactionId!)) {
      setSelectedTransactionId(null);
    }

    try {
      await deleteTransactions(activeRupeeBook.id, transactionIds);
      await refreshBookDetails();
    } catch (error) {
      console.error("Failed to delete transaction(s):", error);
      toast({ title: "Delete Failed", description: "Could not delete the selected transaction(s).", variant: "destructive" });
    }
  };

  const handleUpdateBookSettings = async (newCategories: string[], newSubcategories: string[]) => {
    if (!activeRupeeBook) return;
    try {
      await updateRupeeBook(activeRupeeBook.id, {
        categories: newCategories,
        subcategories: newSubcategories,
      });
      await refreshBookDetails();
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast({ title: "Settings Save Failed", description: "Could not save book settings.", variant: "destructive" });
    }
  };

  const handleCopyTransactions = async (transactionIds: string[], targetRupeeBookIds: string[]) => {
      if (!activeRupeeBook || !loggedInMember) return;
      await copyTransactions(activeRupeeBook.id, transactionIds, targetRupeeBookIds, loggedInMember.id);
      toast({title: "Transactions Copied", description: `${transactionIds.length} transaction(s) have been copied.`});
  };

  const handleMoveTransactions = async (transactionIds: string[], targetRupeeBookId: string) => {
      if (!activeRupeeBook || !loggedInMember) return;
      try {
        await moveTransactions(activeRupeeBook.id, transactionIds, targetRupeeBookId, loggedInMember.id);
        toast({title: "Transactions Moved", description: `${transactionIds.length} transaction(s) have been moved.`});
        await refreshBookDetails();
      } catch (error) {
          console.error("Failed to move transactions:", error);
          toast({ title: "Move Failed", description: "Could not move transactions.", variant: "destructive" });
      }
  };
  
  const handleDeleteAllTransactions = async () => {
    if (!activeRupeeBook || !loggedInMember) return;
    
    try {
        await deleteAllTransactions(activeRupeeBook.id, loggedInMember.id);
        toast({title: "All Entries Deleted", description: `All entries in "${activeRupeeBook.name}" have been deleted.`, variant: "destructive"});
        await refreshBookDetails();
    } catch(error) {
        console.error("Failed to delete all transactions:", error);
        toast({ title: "Delete Failed", description: "Could not delete all entries.", variant: "destructive" });
    }
  };

  const activeBusiness = allBusinesses.find(b => b.id === activeRupeeBook.businessId);
  const booksInCurrentBusiness = allRupeeBooks.filter(b => b.businessId === activeBusiness?.id);

  const DesktopHeader = () => {
    return (
        <header className="flex items-center justify-between p-2 pl-4 border-b bg-background z-10">
            <div className="flex items-center gap-2 flex-wrap">
                {/* Workspace Switcher */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-10">
                           <Avatar className="h-6 w-6 mr-2">
                                <AvatarFallback>{activeBusiness?.name.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <span className="font-semibold">{activeBusiness?.name}</span>
                           <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                         <Command>
                            <CommandInput placeholder="Search workspace..." />
                            <CommandList>
                                <CommandEmpty>No workspace found.</CommandEmpty>
                                <CommandGroup>
                                {allBusinesses.map(business => (
                                    <CommandItem key={business.id} onSelect={() => onSelectBusiness(business.id)}>
                                        <CheckCircle className={cn("mr-2 h-4 w-4", activeBusiness?.id === business.id ? "opacity-100" : "opacity-0")} />
                                        {business.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                         </Command>
                         <DropdownMenuSeparator />
                          <AddBusinessDialog onAddBusiness={onAddBusiness}>
                            <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                <Plus className="mr-2 h-4 w-4" /> Add Workspace
                            </DropdownMenuItem>
                         </AddBusinessDialog>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Book Selector */}
                <span className="text-muted-foreground">/</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="h-10">
                           <span className="font-semibold">{activeRupeeBook?.name}</span>
                           <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                         <Command>
                            <CommandInput placeholder="Search book..." />
                            <CommandList>
                                <CommandEmpty>No book found.</CommandEmpty>
                                <CommandGroup>
                                {booksInCurrentBusiness.map(book => (
                                    <CommandItem key={book.id} onSelect={() => onSelectRupeeBook(book.id)}>
                                        <CheckCircle className={cn("mr-2 h-4 w-4", activeRupeeBook.id === book.id ? "opacity-100" : "opacity-0")} />
                                        {book.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                         </Command>
                         <DropdownMenuSeparator />
                        <AddRupeeBookDialog 
                            onAddRupeeBook={onAddRupeeBook}
                            businesses={allBusinesses}
                            activeBusinessId={activeBusiness?.id || null}
                          >
                           <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                <Plus className="mr-2 h-4 w-4" /> Add Book
                            </DropdownMenuItem>
                        </AddRupeeBookDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="flex-1 flex justify-center items-center gap-2 px-4">
                <div className="flex items-center gap-2 border bg-muted rounded-md p-2 h-9">
                    <span className="text-muted-foreground text-sm">Cash In:</span>
                    <span className="text-green-600 text-base font-bold">₹{summary.totalCashIn.toLocaleString('en-IN')}</span>
                </div>
                 <div className="flex items-center gap-2 border bg-muted rounded-md p-2 h-9">
                    <span className="text-muted-foreground text-sm">Cash Out:</span>
                    <span className="text-red-600 text-base font-bold">₹{summary.totalCashOut.toLocaleString('en-IN')}</span>
                </div>
                 <div className="flex items-center gap-2 border bg-muted rounded-md p-2 h-9">
                    <span className="text-muted-foreground text-sm">Balance:</span>
                    <span className={cn("text-base font-bold", summary.netBalance < 0 && "text-red-500")}>₹{summary.netBalance.toLocaleString('en-IN')}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <Button className="h-9 px-3 border bg-muted font-bold" variant="outline" onClick={() => { if(onAddButtonClick) onAddButtonClick('in') }}>
                    <Plus className="mr-1 h-4 w-4 text-green-600" /> <span className="text-green-600">Cash In</span>
                </Button>
                <Button className="h-9 px-3 border bg-muted font-bold" variant="outline" onClick={() => { if(onAddButtonClick) onAddButtonClick('out') }}>
                    <Plus className="mr-1 h-4 w-4 text-red-600" /> <span className="text-red-600">Cash Out</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setIsSettingsSheetOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" /> Book Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/book/${activeRupeeBook.id}/analysis`}><AreaChart className="mr-2 h-4 w-4" /> Analysis</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/book/${activeRupeeBook.id}/activity`}><History className="mr-2 h-4 w-4" /> Book Activity</Link>
                    </DropdownMenuItem>
                    {isOwnerOrAdmin && (
                        <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/import"><Upload className="mr-2 h-4 w-4" /> Import Entries</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href={`/reports?bookId=${activeRupeeBook.id}`}><FileText className="mr-2 h-4 w-4" /> Reports</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete All Entries
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone. This will permanently delete all entries in "{activeRupeeBook.name}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteAllTransactions}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </>
                    )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
  }

  const MobileHeader = () => (
      <header className="flex items-center justify-between p-2 md:p-4 border-b bg-background z-10">
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                  <Link href="/">
                      <ChevronLeft />
                  </Link>
              </Button>
              <Avatar>
              <AvatarFallback>{activeRupeeBook?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                  <h1 className="font-bold text-lg">{activeRupeeBook?.name}</h1>
              </div>
          </div>
          {/* Header actions for mobile are similar to desktop */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsSettingsSheetOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Book Settings
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/book/${activeRupeeBook.id}/analysis`}>
                    <AreaChart className="mr-2 h-4 w-4" /> Analysis
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/book/${activeRupeeBook.id}/activity`}>
                    <History className="mr-2 h-4 w-4" />
                    Book Activity
                    </Link>
                </DropdownMenuItem>
                {isOwnerOrAdmin && (
                    <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/import">
                        <Upload className="mr-2 h-4 w-4" />
                        Import Entries
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/reports?bookId=${activeRupeeBook.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Reports
                        </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete All Entries
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone. This will permanently delete all entries in "{activeRupeeBook.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAllTransactions}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </>
                )}
                </DropdownMenuContent>
            </DropdownMenu>
            </div>
      </header>
  );

  return (
     <div className={cn("flex flex-col h-full", isMobile ? "bg-background" : "")}>
        {!isMobile && <DesktopHeader />}
        {isMobile && <MobileHeader />}

         <div className="flex-1 min-h-0">
            <TransactionView
                transactions={transactions}
                allRupeeBooks={allRupeeBooks}
                members={allMembers}
                activeRupeeBook={activeRupeeBook}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onCopyTransactions={handleCopyTransactions}
                onMoveTransactions={handleMoveTransactions}
                onUpdateBookSettings={handleUpdateBookSettings}
                loggedInMember={loggedInMember}
                selectedTransactionId={selectedTransactionId}
                setSelectedTransactionId={setSelectedTransactionId}
                onAddButtonClick={onAddButtonClick!}
                onSummaryUpdate={setSummary}
            />
        </div>
        
        {isMobile && !isViewer && (
            <footer className="p-4 border-t grid grid-cols-2 gap-4 bg-background z-20 sticky bottom-0">
                <Button variant="outline" className="w-full h-12 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => { setAddTransactionType('in'); setIsAddTransactionSheetOpen(true); }}>
                    <ArrowUp className="mr-2"/> Cash In
                </Button>
                <Button variant="outline" className="w-full h-12 text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { setAddTransactionType('out'); setIsAddTransactionSheetOpen(true); }}>
                    <ArrowDown className="mr-2"/> Cash Out
                </Button>
            </footer>
        )}

        <BookSettingsSheet
            open={isSettingsSheetOpen}
            onOpenChange={setIsSettingsSheetOpen}
            rupeebook={activeRupeeBook}
            onUpdateBookSettings={handleUpdateBookSettings}
        />

        {isMobile && (
             <AddTransactionSheet
                open={isAddTransactionSheetOpen}
                onOpenChange={setIsAddTransactionSheetOpen}
                type={addTransactionType}
                onAddTransaction={handleAddTransaction}
                rupeebook={activeRupeeBook}
                loggedInMember={loggedInMember}
            />
        )}
       
        <EditTransactionDialog
          transaction={transactions.find(t => t.id === selectedTransactionId) ?? null}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          rupeebook={activeRupeeBook}
          onUpdateBookSettings={handleUpdateBookSettings}
          loggedInMember={loggedInMember}
          onClose={() => setSelectedTransactionId(null)}
        />
    </div>
  );
}
