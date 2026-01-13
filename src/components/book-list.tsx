
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  MoreVertical,
  Plus,
  Pencil,
  Copy,
  UserPlus,
  FolderInput,
  Trash2,
  ListFilter,
  Building,
  LogOut,
  Settings,
  ChevronRight,
  MoreHorizontal,
  User,
  Share2,
  Languages,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { AddRupeeBookDialog } from './add-rupeebook-dialog';
import { RenameBookDialog } from './rename-book-dialog';
import { AddBusinessDialog } from './add-business-dialog';
import type { RupeeBook, Business, Member, Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MoveBookDialog } from './move-book-dialog';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ManageBookMembersDialog } from './manage-book-members-dialog';
import { ManageBusinessesDialog } from './manage-businesses-dialog';
import { useRouter } from 'next/navigation';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { useLanguage } from '@/context/language-context';
import { PreferencesDialog } from './preferences-dialog';

interface BookListProps {
  businesses: Business[];
  activeBusinessId: string | null;
  onSelectBusiness: (id: string) => void;
  onAddBusiness: (name: string, type: 'personal' | 'business') => void;
  onUpdateBusiness: (id: string, name: string) => void;
  onUpdateBusinessOrder: (businesses: Business[]) => void;
  onDeleteBusiness: (id: string) => void;
  rupeebooks: RupeeBook[];
  sharedBooksByOwner: Map<string, RupeeBook[]>;
  allMembers: Member[];
  activeRupeeBookId: string | null;
  onSelectRupeeBook: (id: string) => void;
  onAddRupeeBook: (name: string) => void;
  onDeleteRupeeBook: (id: string) => void;
  onUpdateRupeeBook: (bookId: string, updates: Partial<Omit<RupeeBook, 'id'>>) => void;
  onDuplicateRupeeBook: (bookId: string) => void;
  loggedInMember: Member | null;
  setLoggedInMember: (member: Member | null) => void;
}

const formatBalance = (amount: number) => {
  const absoluteAmount = Math.abs(amount);
  if (absoluteAmount >= 10000000) {
    return `${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (absoluteAmount >= 100000) {
    return `${(amount / 100000).toFixed(2)} Lac`;
  }
  return amount.toLocaleString('en-IN');
};

const ClientOnlyDate = ({ date }: { date: Date | string }) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) return null;

  const d = typeof date === 'string' ? new Date(date) : date;
  if (d && !isNaN(d.getTime())) {
    const formattedDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
    return <>Updated on {formattedDate}</>;
  }
  return null;
}

const DeleteBookDialog = ({ book, onDelete, trigger }: { book: RupeeBook, onDelete: (id: string) => void, trigger: React.ReactNode }) => {
    const [open, setOpen] = useState(false);
    const [confirmationText, setConfirmationText] = useState("");
    const isConfirmationMatching = confirmationText === book.name;
    
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setConfirmationText('');
        }
        setOpen(isOpen);
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogTrigger asChild onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
                {trigger}
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the RupeeBook <span className="font-bold">"{book.name}"</span> and all its transactions.
                        <br/><br/>
                        Please type <span className="font-bold text-foreground">{book.name}</span> to confirm.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <Input 
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Enter the book name to confirm"
                    className="mt-2"
                />
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => { e.stopPropagation(); handleOpenChange(false); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isConfirmationMatching) {
                                onDelete(book.id);
                                handleOpenChange(false);
                            }
                        }} 
                        disabled={!isConfirmationMatching}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

const BookItem = ({ book, balance, lastUpdated, isActive, onClick, dropdownActions, t }: {
    book: RupeeBook;
    balance: number;
    lastUpdated?: Date;
    isActive: boolean;
    onClick: () => void;
    dropdownActions: React.ReactNode;
    t: (key: string) => string;
}) => {
    const memberCount = book.members ? book.members.length : 1;
    return (
        <div 
            className={cn(
                "flex items-center gap-4 p-3 rounded-lg cursor-pointer",
                isActive ? "bg-sidebar-accent shadow-sm" : "hover:bg-sidebar-accent/50"
            )}
            onClick={onClick}
        >
            <div className="bg-muted p-3 rounded-lg">
                <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className='flex-1 min-w-0'>
                <p className="font-semibold text-base truncate">{book.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                    {memberCount} {t(memberCount > 1 ? 'members' : 'member')}
                    {lastUpdated && <> &middot; <ClientOnlyDate date={lastUpdated} /></>}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p className={`font-bold text-base ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatBalance(balance)}
                </p>
            </div>
            {dropdownActions}
        </div>
    );
};

export function BookList({
  businesses,
  activeBusinessId,
  onSelectBusiness,
  onAddBusiness,
  onUpdateBusiness,
  onUpdateBusinessOrder,
  onDeleteBusiness,
  rupeebooks,
  sharedBooksByOwner,
  allMembers,
  activeRupeeBookId,
  onSelectRupeeBook,
  onAddRupeeBook,
  onDeleteRupeeBook,
  onUpdateRupeeBook,
  onDuplicateRupeeBook,
  loggedInMember,
  setLoggedInMember
}: BookListProps) {
  const [editingBook, setEditingBook] = useState<RupeeBook | null>(null);
  const [movingBook, setMovingBook] = useState<RupeeBook | null>(null);
  const [managingMembersBook, setManagingMembersBook] = useState<RupeeBook | null>(null);
  const [isManagingBusinesses, setIsManagingBusinesses] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useLanguage();
  const [avatar, setAvatar] = useLocalStorage<string | null>(`userAvatar_${loggedInMember?.id}`, null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const otherBusinesses = useMemo(() => businesses.filter(b => b.id !== activeBusinessId), [businesses, activeBusinessId]);
  
  const isOwnerOrAdmin = loggedInMember?.role === 'owner' || loggedInMember?.role === 'admin';

  const { lastUpdatedTimestamps, sortedRupeeBooks } = useMemo(() => {
    const allBooks = [...rupeebooks, ...Array.from(sharedBooksByOwner.values()).flat()];
    const lastUpdated = new Map<string, Date>();
    
    allBooks.forEach(cb => {
      // Since transactions aren't loaded, we can't sort by last update time here.
      // We will sort by name as a fallback.
      // If lastUpdated timestamp is available from server in future, we can use it.
    });

    const sorted = [...rupeebooks].sort((a, b) => a.name.localeCompare(b.name));

    return { lastUpdatedTimestamps: lastUpdated, sortedRupeeBooks: sorted };
  }, [rupeebooks, sharedBooksByOwner]);
  
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        toast({ title: 'Avatar Updated!', description: 'Your new avatar has been saved.' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleItemClick = (id: string) => {
    onSelectRupeeBook(id);
  }
  
  const handleMoveBook = (rupeebookId: string, targetBusinessId: string) => {
    const book = rupeebooks.find(rb => rb.id === rupeebookId);
    if(book) {
      onUpdateRupeeBook(book.id, { businessId: targetBusinessId });
      toast({title: "Book Moved", description: `"${book.name}" has been moved.`})
    }
  }

  const handleUpdateBookMembers = (bookId: string, newMembers: {memberId: string, role: Role}[]) => {
     const allBooks = [...rupeebooks, ...Array.from(sharedBooksByOwner.values()).flat()];
     const book = allBooks.find(rb => rb.id === bookId);
     if (book) {
        onUpdateRupeeBook(book.id, { members: newMembers });
        toast({title: "Members Updated", description: `Member list for "${book.name}" has been updated.`});
     }
  }

  const handleLogout = () => {
    setLoggedInMember(null);
    router.push('/login');
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
  };
  
  const renderBookItem = (book: RupeeBook) => {
    const balance = book.balance ?? 0;
    const lastUpdated = undefined; // We don't have this info now
    const isActive = book.id === activeRupeeBookId;
    const isBookOwner = book.ownerId === loggedInMember?.id;

    const dropdown = (
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {isBookOwner ? (
                    <>
                        <DropdownMenuItem onSelect={() => setEditingBook(book)}>
                            <Pencil className="mr-2 h-4 w-4" /> {t('rename')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDuplicateRupeeBook(book.id)}>
                            <Copy className="mr-2 h-4 w-4" /> {t('duplicate_book')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setManagingMembersBook(book)}>
                            <UserPlus className="mr-2 h-4 w-4" /> {t('manage_members')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setMovingBook(book)} disabled={otherBusinesses.length === 0}>
                            <FolderInput className="mr-2 h-4 w-4" /> {t('move_book')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DeleteBookDialog book={book} onDelete={onDeleteRupeeBook} trigger={
                            <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-destructive focus:bg-destructive/10 focus:text-destructive data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> {t('delete_book')}
                            </div>
                        }/>
                    </>
                ) : (
                    <DropdownMenuItem disabled>{t('no_actions_available')}</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <BookItem
            key={book.id}
            book={book}
            balance={balance}
            lastUpdated={lastUpdated}
            isActive={isActive}
            onClick={() => handleItemClick(book.id)}
            dropdownActions={dropdown}
            t={t}
        />
    );
  };

  return (
    <div className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground h-full",
    )}>
      <header className="p-4 flex items-center justify-between border-b border-sidebar-border">
         <div className="flex items-center gap-4">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <label className="cursor-pointer rounded-full">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={avatar ?? undefined} alt="User" />
                        <AvatarFallback>{loggedInMember?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    </label>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => document.getElementById('avatar-upload')?.click()}>
                        {t('change_avatar')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsPreferencesOpen(true)}>
                        <Languages className="mr-2 h-4 w-4" />
                        {t('preferences_title')}
                    </DropdownMenuItem>
                    {isOwnerOrAdmin && (
                        <Link href="/admin/settings" passHref>
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                {t('admin_settings')}
                            </DropdownMenuItem>
                        </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('logout')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div>
              <p className="font-bold text-lg">{isClient ? loggedInMember?.name : 'Loading...'}</p>
              <p className="text-sm text-muted-foreground">{t('my_workspaces')}</p>
            </div>
          </div>
           {isOwnerOrAdmin && (
              <AddBusinessDialog onAddBusiness={onAddBusiness}>
                <Button variant="ghost" size="icon">
                  <Plus className="h-6 w-6" />
                </Button>
              </AddBusinessDialog>
           )}
      </header>
      
      <main className="flex-1 overflow-y-auto p-2 space-y-4">
        {businesses.length > 0 && (
            <div>
                <h2 className="px-4 text-sm font-semibold text-muted-foreground mb-2 uppercase">{t('workspaces')}</h2>
                <div className="space-y-1 p-2">
                    {businesses.map(business => (
                        <div 
                            key={business.id}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-lg cursor-pointer",
                                activeBusinessId === business.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                            )}
                            onClick={() => onSelectBusiness(business.id)}
                        >
                            <div className="bg-muted p-3 rounded-lg">
                            {business.type === 'personal' ? <User className="h-6 w-6 text-muted-foreground" /> : <Building className="h-6 w-6 text-muted-foreground" />}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-base">{business.name}</p>
                            </div>
                            {activeBusinessId === business.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                    ))}
                </div>
                {isOwnerOrAdmin && (
                    <Button variant="link" size="sm" className="w-full mt-2" onClick={() => setIsManagingBusinesses(true)}>
                        {t('manage_workspaces')}
                    </Button>
                )}
            </div>
        )}

        {businesses.length > 0 && sortedRupeeBooks.length > 0 && (
            <div className="border-t border-sidebar-border pt-4">
            <div className="flex justify-between items-center mb-2 px-4">
                <h1 className="text-sm font-semibold text-muted-foreground uppercase">{t('your_rupeebooks')}</h1>
                <div className="flex items-center gap-0">
                <Button variant="ghost" size="icon" className="h-8 w-8"><ListFilter className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Search className="h-4 w-4" /></Button>
                </div>
            </div>
            
            <div className="space-y-2 p-2">
                {sortedRupeeBooks.map(book => renderBookItem(book))}
            </div>
            </div>
        )}

        {Array.from(sharedBooksByOwner.entries()).map(([ownerName, books]) => (
            <div key={ownerName} className="border-t border-sidebar-border pt-4">
                <div className="flex justify-between items-center mb-2 px-4">
                    <h1 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                        <Share2 className="h-4 w-4"/>
                        {t('shared_by', { name: ownerName })}
                    </h1>
                </div>
                <div className="space-y-2 p-2">
                    {books.map(book => renderBookItem(book))}
                </div>
            </div>
        ))}
      </main>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-center p-2 text-sm text-muted-foreground">
          •● Jatin Gadhiya ●•
        </div>
        {isOwnerOrAdmin && (
          <AddRupeeBookDialog 
            onAddRupeeBook={onAddRupeeBook}
            businesses={businesses}
            activeBusinessId={activeBusinessId}
          >
             <Button className="w-full h-12" disabled={!activeBusinessId && businesses.length > 0}>
               <Plus className="mr-2 h-5 w-5"/> {t('add_new_book')}
            </Button>
          </AddRupeeBookDialog>
        )}
      </div>

       {editingBook && (
        <RenameBookDialog
          rupeebook={editingBook}
          onUpdateRupeeBook={(updates) => onUpdateRupeeBook(editingBook.id, updates)}
          open={!!editingBook}
          onOpenChange={(open) => !open && setEditingBook(null)}
        />
      )}
      
       {movingBook && (
        <MoveBookDialog
          rupeebook={movingBook}
          businesses={otherBusinesses}
          onMoveBook={handleMoveBook}
          open={!!movingBook}
          onOpenChange={(open) => !open && setMovingBook(null)}
        />
       )}
       
       {managingMembersBook && (
         <ManageBookMembersDialog
            rupeebook={managingMembersBook}
            allMembers={allMembers}
            onUpdateMembers={handleUpdateBookMembers}
            open={!!managingMembersBook}
            onOpenChange={(open) => !open && setManagingMembersBook(null)}
            loggedInMember={loggedInMember}
         />
       )}

       {isManagingBusinesses && (
            <ManageBusinessesDialog
                businesses={businesses}
                open={isManagingBusinesses}
                onOpenChange={setIsManagingBusinesses}
                onUpdateBusiness={onUpdateBusiness}
                onDeleteBusiness={onDeleteBusiness}
                onUpdateBusinessOrder={onUpdateBusinessOrder}
                isOwnerOrAdmin={isOwnerOrAdmin}
            />
       )}

       <PreferencesDialog 
        open={isPreferencesOpen}
        onOpenChange={setIsPreferencesOpen}
       />

    </div>
  );
}
