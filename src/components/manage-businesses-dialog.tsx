
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Trash2, Building, User, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Business } from '@/lib/types';


interface ManageBusinessesDialogProps {
  businesses: Business[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateBusiness: (id: string, name: string) => void;
  onDeleteBusiness: (id: string) => void;
  onUpdateBusinessOrder: (businesses: Business[]) => void;
  isOwnerOrAdmin: boolean;
}

const DeleteBusinessDialog = ({ business, onDelete, trigger }: { business: Business, onDelete: (id: string) => void, trigger: React.ReactNode }) => {
    const [confirmationText, setConfirmationText] = useState("");
    const isConfirmationMatching = confirmationText === business.name;

    return (
        <AlertDialog onOpenChange={(open) => !open && setConfirmationText('')}>
            <AlertDialogTrigger asChild>
                {trigger}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{business.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this workspace and all RupeeBooks associated with it. This action cannot be undone.
                        <br/><br/>
                        Please type <span className="font-bold text-foreground">{business.name}</span> to confirm.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <Input 
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Enter the workspace name to confirm"
                    className="mt-2"
                />
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmationText('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={() => onDelete(business.id)}
                        disabled={!isConfirmationMatching}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


export function ManageBusinessesDialog({
  businesses,
  open,
  onOpenChange,
  onUpdateBusiness,
  onDeleteBusiness,
  onUpdateBusinessOrder,
  isOwnerOrAdmin,
}: ManageBusinessesDialogProps) {
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editingName, setEditingName] = useState('');
  const { toast } = useToast();

  const handleStartEdit = (business: Business) => {
    setEditingBusiness(business);
    setEditingName(business.name);
  };

  const handleCancelEdit = () => {
    setEditingBusiness(null);
    setEditingName('');
  };
  
  const handleSaveEdit = () => {
    if (editingBusiness && editingName.trim()) {
       if (businesses.find(b => b.id !== editingBusiness.id && b.name.toLowerCase() === editingName.trim().toLowerCase())) {
          toast({ title: "Error", description: "A workspace with this name already exists.", variant: "destructive" });
          return;
       }
       onUpdateBusiness(editingBusiness.id, editingName.trim());
       handleCancelEdit();
       toast({ title: "Workspace Renamed", description: `Workspace has been renamed to "${editingName.trim()}".` });
    }
  };

  const handleDelete = (businessId: string) => {
    onDeleteBusiness(businessId);
    toast({ title: "Workspace Deleted", description: "The workspace and all its books have been deleted.", variant: "destructive"});
  }
  
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= businesses.length) return;

    const newBusinesses = [...businesses];
    const [movedItem] = newBusinesses.splice(index, 1);
    newBusinesses.splice(newIndex, 0, movedItem);

    onUpdateBusinessOrder(newBusinesses);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Workspaces</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Rename, reorder, or delete your workspaces. Deleting a workspace will also delete all RupeeBooks inside it.
        </p>
        <ScrollArea className="h-60 w-full rounded-md border">
          <div className="p-2 space-y-2">
            {businesses.map((business, index) => (
              <div
                key={business.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"
              >
                 <div className="flex flex-col">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMove(index, 'down')} disabled={index === businesses.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                 </div>
                 <div className="bg-muted p-3 rounded-full">
                    {business.type === 'personal' ? <User className="h-5 w-5 text-muted-foreground" /> : <Building className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 font-medium">
                  {editingBusiness?.id === business.id ? (
                      <Input 
                        value={editingName} 
                        onChange={e => setEditingName(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                        onBlur={handleSaveEdit}
                        autoFocus
                      />
                  ) : (
                    business.name
                  )}
                </div>
                
                {editingBusiness?.id === business.id ? (
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                ) : (
                  <>
                    {isOwnerOrAdmin && (
                        <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(business)}><Edit className="h-4 w-4" /></Button>
                            <DeleteBusinessDialog
                                business={business}
                                onDelete={handleDelete}
                                trigger={
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                }
                            />
                        </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
