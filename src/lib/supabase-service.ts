
'use server';

import { supabase } from './supabase';
import { createHash } from 'crypto';
import type { RupeeBook, Business, Member, Transaction, ActivityLog, Role, DataOperatorSettings, VerifyPinResult } from './types';
import { differenceInDays, addHours } from 'date-fns';

const TRANSACTIONS_PAGE_SIZE = 50;

function hashPin(pin: string): string {
    return createHash('sha256').update(pin).digest('hex');
}

// --- Member Functions ---
export async function getAllMembers(): Promise<Member[]> {
    const { data: members, error } = await supabase.from('members').select('*');
    if (error) throw error;
    return members || [];
}

export async function addMember(member: Omit<Member, 'id'>): Promise<Member> {
    const memberWithHashedPin = {
        ...member,
        pin: hashPin(member.pin),
        failedPinAttempts: 0,
        lockedUntil: null,
    };
    const { data, error } = await supabase.from('members').insert([memberWithHashedPin]).select();
    if (error) throw error;
    return data[0];
}

export async function updateMember(id: string, updates: Partial<Member>): Promise<void> {
    const updatesToApply: { [key: string]: any } = { ...updates };
    if (updates.pin) {
        updatesToApply.pin = hashPin(updates.pin);
    }
    const { error } = await supabase.from('members').update(updatesToApply).eq('id', id);
    if (error) throw error;
}

export async function deleteMember(id: string): Promise<void> {
    // We assume cascade delete is set up in the database.
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
}

// --- Business Functions ---
export async function getBusinesses(loggedInMember: Member): Promise<Business[]> {
    if (!loggedInMember) return [];
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('ownerId', loggedInMember.id)
        .order('sortOrder');
    if (error) throw error;
    return data || [];
}

export async function getAllBusinessesForBackup(): Promise<Business[]> {
    const { data, error } = await supabase.from('businesses').select('*');
    if (error) throw error;
    return data || [];
}

export async function addBusiness(business: Omit<Business, 'id'>): Promise<Business> {
    const { data, error } = await supabase.from('businesses').insert([business]).select();
    if (error) throw error;
    return data[0];
}

export async function updateBusiness(id: string, updates: Partial<Business>): Promise<void> {
    const { error } = await supabase.from('businesses').update(updates).eq('id', id);
    if (error) throw error;
}

export async function updateBusinessOrder(businesses: Business[]): Promise<void> {
    const updates = businesses.map((business, index) => 
        supabase.from('businesses').update({ sortOrder: index }).eq('id', business.id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find(res => res.error);
    if (firstError) throw firstError.error;
}

export async function deleteBusiness(id: string, associatedBookIds: string[]): Promise<void> {
    // Assuming cascade delete for rupeebooks associated with the business
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    if (error) throw error;
}


// --- RupeeBook Functions ---
async function getDataOperatorSettingsForOwner(ownerId: string): Promise<DataOperatorSettings> {
    const defaultSettings: DataOperatorSettings = {
        allowBackdatedEntries: 'always',
        hideNetBalanceAndReports: false,
        hideEntriesByOtherMembers: false,
        allowEntryEditing: true,
    };
    
    if (ownerId === 'm1') {
        const { data, error } = await supabase.from('settings').select('dataOperator').single();
        if (error) return defaultSettings;
        return { ...defaultSettings, ...data?.dataOperator };
    }

    const { data: owner, error } = await supabase.from('members').select('dataOperatorSettings').eq('id', ownerId).single();
    if (error || !owner) return defaultSettings;
    return { ...defaultSettings, ...owner.dataOperatorSettings };
}

export async function getRupeeBook(id: string, includeTransactions = false): Promise<RupeeBook> {
    const { data: book, error } = await supabase.from('rupeebooks').select('*').eq('id', id).single();
    if (error || !book) throw new Error(`RupeeBook with id ${id} not found.`);

    if (book.balance === undefined || book.balance === null) {
        console.log(`Balance not found for book ${id}. Calculating...`);
        book.balance = await calculateAndSetBookBalance(id);
    }

    book.dataOperatorSettings = await getDataOperatorSettingsForOwner(book.ownerId);

    if (includeTransactions) {
        const { data: transactions, error: transError } = await supabase.from('transactions').select('*').eq('rupeebookId', id);
        if (transError) throw transError;
        book.transactions = transactions || [];
    } else {
        book.transactions = [];
    }
    
    return book;
}

async function calculateAndSetBookBalance(bookId: string): Promise<number> {
    const { data: transactions, error } = await supabase.from('transactions').select('amount, type').eq('rupeebookId', bookId);
    if (error) throw error;

    let balance = 0;
    for (const t of transactions) {
        if (t.type === 'in') {
            balance += t.amount;
        } else {
            balance -= t.amount;
        }
    }

    const { error: updateError } = await supabase.from('rupeebooks').update({ balance: balance }).eq('id', bookId);
    if (updateError) throw updateError;
    return balance;
}

export async function getRupeeBooks(member: Member): Promise<RupeeBook[]> {
    if (!member) return [];

    const { data: books, error } = await supabase
        .from('rupeebooks')
        .select('*')
        .or(`ownerId.eq.${member.id},memberIds.cs.{${member.id}}`);

    if (error) throw error;

    const ownerIds = new Set<string>((books || []).map(book => book.ownerId));
    const ownerSettingsMap = new Map<string, DataOperatorSettings>();
    for (const ownerId of ownerIds) {
      const settings = await getDataOperatorSettingsForOwner(ownerId);
      ownerSettingsMap.set(ownerId, settings);
    }
    
    return (books || []).map(book => {
        book.dataOperatorSettings = ownerSettingsMap.get(book.ownerId);
        book.transactions = []; // Don't return transactions for the list view
        return book;
    });
}

export async function addRupeeBook(rupeebook: Omit<RupeeBook, 'id'>): Promise<RupeeBook> {
    const { transactions, ...bookData } = rupeebook;
    const memberIds = (bookData.members || []).map(m => m.memberId);

    const { data, error } = await supabase.from('rupeebooks').insert([{ ...bookData, balance: 0, memberIds }]).select();
    if (error || !data) throw error;

    const newBook = data[0];

    if (transactions && transactions.length > 0) {
        const transactionData = transactions.map(t => ({ ...t, rupeebookId: newBook.id }));
        const { error: transError } = await supabase.from('transactions').insert(transactionData);
        if (transError) throw transError;
    }
    
    return newBook;
}

export async function updateRupeeBook(id: string, updates: Partial<Omit<RupeeBook, 'id'>>): Promise<void> {
    const { transactions, ...simpleUpdates } = updates;
    
    if (Object.keys(simpleUpdates).length > 0) {
        if (simpleUpdates.members) {
            simpleUpdates.memberIds = simpleUpdates.members.map(m => m.memberId);
        }
        const { error } = await supabase.from('rupeebooks').update(simpleUpdates).eq('id', id);
        if (error) throw error;
    }

    if (transactions) {
        // Assuming this is for backup restoration
        const { error: deleteError } = await supabase.from('transactions').delete().eq('rupeebookId', id);
        if (deleteError) throw deleteError;

        const transactionData = transactions.map(t => ({ ...t, rupeebookId: id }));
        const { error: insertError } = await supabase.from('transactions').insert(transactionData);
        if (insertError) throw insertError;
    }
}

export async function deleteRupeeBook(id: string): Promise<void> {
    // Assuming cascade delete for transactions and activities
    const { error } = await supabase.from('rupeebooks').delete().eq('id', id);
    if (error) throw error;
}

// --- Activity Log Functions ---
async function logActivity(rupeebookId: string, memberId: string, type: ActivityLog['type'], details: any) {
    const { error } = await supabase.from('activities').insert([{
        rupeebookId,
        memberId,
        type,
        details,
    }]);
    if (error) console.error('Error logging activity:', error);
}

export async function getBookActivities(rupeebookId: string): Promise<ActivityLog[]> {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('rupeebookId', rupeebookId)
        .order('timestamp', { ascending: false });
    if (error) throw error;
    return data || [];
}

// --- Transaction Functions ---
const updateBookBalance = async (bookId: string, amount: number, type: 'in' | 'out', operation: 'add' | 'subtract') => {
    const { data: book, error } = await supabase.from('rupeebooks').select('balance').eq('id', bookId).single();
    if (error || !book) return;

    let currentBalance = book.balance || 0;
    let change = (type === 'in') ? amount : -amount;
    if (operation === 'subtract') {
        change = -change;
    }

    const { error: updateError } = await supabase.from('rupeebooks').update({ balance: currentBalance + change }).eq('id', bookId);
    if (updateError) throw updateError;
};

export async function addTransaction(rupeebookId: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const newTransactionData = { ...transaction, rupeebookId };

    const { data, error } = await supabase.from('transactions').insert([newTransactionData]).select();
    if (error || !data) throw error;

    const newTransaction = data[0];

    await updateBookBalance(rupeebookId, transaction.amount, transaction.type, 'add');

    const isBackdated = differenceInDays(new Date(), new Date(transaction.date)) > 0;
    await logActivity(rupeebookId, transaction.memberId || '', 'create', {
        amount: transaction.amount,
        type: transaction.type,
        remark: transaction.remark,
        category: transaction.category,
        isBackdated,
    });

    return newTransaction;
}

export async function updateTransaction(rupeebookId: string, updatedTransactionData: Transaction): Promise<void> {
    const { data: oldTransaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', updatedTransactionData.id)
        .single();
    
    if (fetchError || !oldTransaction) throw fetchError;

    const { id, ...updates } = updatedTransactionData;
    const { error } = await supabase.from('transactions').update(updates).eq('id', id);
    if (error) throw error;

    // Update balance
    const amountDiff = updatedTransactionData.amount - oldTransaction.amount;
    const typeChanged = updatedTransactionData.type !== oldTransaction.type;
    
    let balanceChange = 0;
    if (typeChanged) {
        const oldEffect = oldTransaction.type === 'in' ? -oldTransaction.amount : +oldTransaction.amount;
        const newEffect = updatedTransactionData.type === 'in' ? +updatedTransactionData.amount : -updatedTransactionData.amount;
        balanceChange = oldEffect + newEffect;
    } else {
        balanceChange = updatedTransactionData.type === 'in' ? amountDiff : -amountDiff;
    }

    if (balanceChange !== 0) {
        const { data: book, error: bookError } = await supabase.from('rupeebooks').select('balance').eq('id', rupeebookId).single();
        if (bookError || !book) throw bookError;
        await supabase.from('rupeebooks').update({ balance: (book.balance || 0) + balanceChange }).eq('id', rupeebookId);
    }

    const changes: any = {};
    (Object.keys(updatedTransactionData) as Array<keyof Transaction>).forEach(key => {
        if (key !== 'id' && key !== 'memberId' && String(oldTransaction[key]) !== String(updatedTransactionData[key])) {
            changes[key] = { from: oldTransaction[key], to: updatedTransactionData[key] };
        }
    });
    
    const isBackdated = differenceInDays(new Date(), new Date(updatedTransactionData.date)) > 0;

    await logActivity(rupeebookId, updatedTransactionData.memberId || '', 'update', {
        changes,
        isBackdated,
    });
}

export async function deleteTransactions(rupeebookId: string, transactionIds: string[]): Promise<void> {
    if (transactionIds.length === 0) return;

    const { data: transactions, error } = await supabase.from('transactions').select('*').in('id', transactionIds);
    if (error || !transactions) throw error;

    let balanceChange = 0;
    transactions.forEach(t => {
        balanceChange += (t.type === 'in' ? -t.amount : t.amount);
    });

    const { error: deleteError } = await supabase.from('transactions').delete().in('id', transactionIds);
    if (deleteError) throw deleteError;

    if (balanceChange !== 0) {
        const { data: book, error: bookError } = await supabase.from('rupeebooks').select('balance').eq('id', rupeebookId).single();
        if (bookError || !book) throw bookError;
        await supabase.from('rupeebooks').update({ balance: (book.balance || 0) + balanceChange }).eq('id', rupeebookId);
    }

    if (transactions.length > 0) {
        await logActivity(rupeebookId, transactions[0].memberId || '', 'delete', {
            count: transactionIds.length,
        });
    }
}

export async function deleteAllTransactions(rupeebookId: string, memberId: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('rupeebookId', rupeebookId);
    if (error) throw error;

    await supabase.from('rupeebooks').update({ balance: 0 }).eq('id', rupeebookId);
    
    await logActivity(rupeebookId, memberId, 'delete_all', { deletedOn: new Date().toISOString() });
}

export async function copyTransactions(sourceBookId: string, transactionIds: string[], targetBookIds: string[], memberId: string): Promise<void> {
    if (transactionIds.length === 0) return;

    const { data: transactionsToCopy, error } = await supabase.from('transactions').select('*').in('id', transactionIds);
    if (error || !transactionsToCopy) throw error;

    const { data: sourceBook, error: sourceBookError } = await supabase.from('rupeebooks').select('name').eq('id', sourceBookId).single();
    if (sourceBookError) throw sourceBookError;

    for (const targetBookId of targetBookIds) {
        const newTransactions = transactionsToCopy.map(t => { 
            const {id, ...trans} = t; 
            return {...trans, rupeebookId: targetBookId, memberId }; 
        });
        const { error: insertError } = await supabase.from('transactions').insert(newTransactions);
        if (insertError) throw insertError;

        let balanceChange = 0;
        transactionsToCopy.forEach(t => {
            balanceChange += (t.type === 'in' ? t.amount : -t.amount);
        });

        const { data: book, error: bookError } = await supabase.from('rupeebooks').select('balance, name').eq('id', targetBookId).single();
        if (bookError || !book) throw bookError;
        await supabase.from('rupeebooks').update({ balance: (book.balance || 0) + balanceChange }).eq('id', targetBookId);

        await logActivity(targetBookId, memberId, 'copy', {
            count: transactionsToCopy.length,
            fromBook: sourceBook?.name || 'Unknown Book',
            toBook: book.name || 'Unknown Book',
        });
    }
}

export async function moveTransactions(sourceBookId: string, transactionIds: string[], targetBookId: string, memberId: string): Promise<void> {
    if (transactionIds.length === 0) return;

    const { data: transactionsToMove, error } = await supabase.from('transactions').select('*').in('id', transactionIds);
    if (error || !transactionsToMove) throw error;

    const { data: sourceBook, error: sourceBookError } = await supabase.from('rupeebooks').select('name, balance').eq('id', sourceBookId).single();
    const { data: targetBook, error: targetBookError } = await supabase.from('rupeebooks').select('name, balance').eq('id', targetBookId).single();
    if (sourceBookError || !sourceBook || targetBookError || !targetBook) throw sourceBookError || targetBookError;

    let balanceChange = 0;
    transactionsToMove.forEach(t => {
        balanceChange += (t.type === 'in' ? t.amount : -t.amount);
    });

    const { error: deleteError } = await supabase.from('transactions').delete().in('id', transactionIds);
    if (deleteError) throw deleteError;

    const newTransactions = transactionsToMove.map(t => { 
        const {id, ...trans} = t; 
        return {...trans, rupeebookId: targetBookId, memberId }; 
    });
    const { error: insertError } = await supabase.from('transactions').insert(newTransactions);
    if (insertError) throw insertError;

    await supabase.from('rupeebooks').update({ balance: (sourceBook.balance || 0) - balanceChange }).eq('id', sourceBookId);
    await supabase.from('rupeebooks').update({ balance: (targetBook.balance || 0) + balanceChange }).eq('id', targetBookId);

    await logActivity(sourceBookId, memberId, 'move', {
        count: transactionIds.length,
        direction: 'out',
        toBook: targetBook.name,
    });

    await logActivity(targetBookId, memberId, 'move', {
        count: transactionIds.length,
        direction: 'in',
        fromBook: sourceBook.name,
    });
}

// --- Danger Zone Functions ---
export async function deleteAllRupeeBooks(): Promise<void> {
    const { error } = await supabase.from('rupeebooks').delete().neq('id', '0'); // Dummy condition to delete all
    if (error) throw error;
}

export async function deleteAllBusinesses(): Promise<void> {
    const { error } = await supabase.from('businesses').delete().neq('id', '0');
    if (error) throw error;
}

export async function deleteAllMembers(): Promise<void> {
    const { error } = await supabase.from('members').delete().neq('id', '0');
    if (error) throw error;
}

export async function resetAllData(): Promise<void> {
    await deleteAllRupeeBooks();
    await deleteAllBusinesses();
    await deleteAllMembers();
    await supabase.from('settings').delete().neq('id', '0');
}

export async function restoreData(data: any): Promise<void> {
    if (data.businesses) {
        const { error } = await supabase.from('businesses').insert(data.businesses);
        if (error) throw error;
    }
    if (data.members) {
        const membersWithHashedPins = data.members.map((m: Member) => ({ ...m, pin: hashPin(m.pin) }));
        const { error } = await supabase.from('members').insert(membersWithHashedPins);
        if (error) throw error;
    }
    if (data.dataOperatorSettings) {
        const { error } = await supabase.from('settings').insert([{ id: 'dataOperator', dataOperator: data.dataOperatorSettings }]);
        if (error) throw error;
    }
    if (data.rupeebooks) {
        const books = data.rupeebooks.map((b: any) => { delete b.transactions; return b; });
        const { error: bookError } = await supabase.from('rupeebooks').insert(books);
        if (bookError) throw bookError;

        const allTransactions = data.rupeebooks.flatMap((b: any) => b.transactions || []);
        if (allTransactions.length > 0) {
            const { error: transError } = await supabase.from('transactions').insert(allTransactions);
            if (transError) throw transError;
        }
    }
}

export async function verifyPin(memberName: string, pin: string): Promise<VerifyPinResult> {
    const { data: member, error } = await supabase.from('members').select('*').eq('name', memberName).single();

    if (error || !member) {
        return { status: 'incorrect', attempts: 5 };
    }

    if (member.lockedUntil && new Date(member.lockedUntil) > new Date()) {
        return { status: 'locked', lockedUntil: member.lockedUntil };
    }

    const hashedPin = hashPin(pin);

    if (member.pin === hashedPin) {
        if (member.failedPinAttempts > 0) {
            await supabase.from('members').update({ failedPinAttempts: 0, lockedUntil: null }).eq('id', member.id);
        }
        return { status: 'success', member };
    } else {
        const newAttempts = (member.failedPinAttempts || 0) + 1;
        if (newAttempts >= 5) {
            const lockedUntil = addHours(new Date(), 1).toISOString();
            await supabase.from('members').update({ failedPinAttempts: newAttempts, lockedUntil }).eq('id', member.id);
            return { status: 'locked', lockedUntil };
        } else {
            await supabase.from('members').update({ failedPinAttempts: newAttempts }).eq('id', member.id);
            return { status: 'incorrect', attempts: newAttempts };
        }
    }
}
