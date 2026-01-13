
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImportEntriesWizard } from '@/components/import-entries-wizard';
import { getRupeeBooks, updateRupeeBook } from '@/lib/supabase-service';
import type { RupeeBook, Transaction, Member } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
    const [rupeebooks, setRupeeBooks] = useState<RupeeBook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);
    const { toast } = useToast();
    const router = useRouter();

    const isAuthorized = loggedInMember?.role === 'owner' || loggedInMember?.role === 'admin';

    const fetchBooks = useCallback(async () => {
        if (loggedInMember && isAuthorized) {
            try {
                setIsLoading(true);
                const books = await getRupeeBooks(loggedInMember);
                setRupeeBooks(books);
            } catch (err) {
                console.error("Failed to load RupeeBooks:", err);
                toast({ title: "Error", description: "Could not load your books.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [loggedInMember, isAuthorized, toast]);


    useEffect(() => {
        if (!loggedInMember) {
            router.push('/login');
        } else {
            fetchBooks();
        }
    }, [fetchBooks, loggedInMember, router]);
    
    const handleImportTransactions = async (bookId: string, newTransactions: Omit<Transaction, 'id'|'memberId'>[]) => {
        const targetBook = rupeebooks.find(b => b.id === bookId);
        if (!targetBook || !loggedInMember) {
             toast({ title: "Error", description: "Could not find the book or user.", variant: "destructive" });
             return;
        }

        const transactionsWithIds = newTransactions.map((t, index) => ({
            ...t,
            id: `imported-${Date.now()}-${index}`,
            memberId: loggedInMember.id
        }));

        const updatedTransactions = [...(targetBook.transactions || []), ...transactionsWithIds];
        
        // Auto-add new categories and subcategories
        const importedCategories = new Set(newTransactions.map(t => t.category).filter(Boolean));
        const importedSubcategories = new Set(newTransactions.map(t => t.subcategory).filter(Boolean));

        const existingCategories = new Set(targetBook.categories || []);
        const existingSubcategories = new Set(targetBook.subcategories || []);

        importedCategories.forEach(cat => existingCategories.add(cat));
        importedSubcategories.forEach(sub => existingSubcategories.add(sub));
        
        const updatedCategories = Array.from(existingCategories).sort();
        const updatedSubcategories = Array.from(existingSubcategories).sort();


        try {
            await updateRupeeBook(bookId, { 
                transactions: updatedTransactions,
                categories: updatedCategories,
                subcategories: updatedSubcategories,
            });
            toast({ title: "Import Successful", description: `${newTransactions.length} transactions were imported into "${targetBook.name}".`});
            // Re-fetch books to ensure UI is up-to-date
            await fetchBooks();
        } catch (error) {
            console.error("Failed to save imported transactions:", error);
            throw new Error("Failed to save transactions.");
        }
    }


    return (
        <div className="flex flex-col h-screen bg-muted/40">
            <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href="/">
                          <ArrowLeft />
                      </Link>
                    </Button>
                    <h1 className="text-lg font-bold">Import Entries</h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    isAuthorized ? (
                        <ImportEntriesWizard allRupeeBooks={rupeebooks} onImportTransactions={handleImportTransactions} />
                    ) : (
                        <div className="flex justify-center items-center h-full">
                            <Card className="w-full max-w-md text-center">
                                <CardHeader>
                                    <div className="mx-auto bg-destructive/10 rounded-full p-3 w-fit">
                                        <ShieldAlert className="h-10 w-10 text-destructive"/>
                                    </div>
                                    <CardTitle className="mt-4">Access Denied</CardTitle>
                                    <CardDescription>
                                        You do not have permission to access this page. Please contact an administrator if you believe this is an error.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild>
                                        <Link href="/">Return to Dashboard</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}
