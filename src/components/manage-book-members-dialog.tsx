

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RupeeBook, Member, Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from './ui/checkbox';


interface ManageBookMembersDialogProps {
  rupeebook: RupeeBook;
  allMembers: Member[];
  onUpdateMembers: (bookId: string, members: { memberId: string; role: Role }[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loggedInMember: Member | null;
}

const roles: Role[] = ['admin', 'viewer', 'data-operator'];

export function ManageBookMembersDialog({
  rupeebook,
  allMembers,
  onUpdateMembers,
  open,
  onOpenChange,
  loggedInMember,
}: ManageBookMembersDialogProps) {
  const [currentBookMembers, setCurrentBookMembers] = useState<Map<string, Role>>(new Map());
  const { toast } = useToast();

  const isBookOwner = loggedInMember?.id === rupeebook.ownerId;

  useEffect(() => {
    if (rupeebook) {
      const membersMap = new Map((rupeebook.members || []).map(m => [m.memberId, m.role]));
      // Ensure the book owner is always in the map, and preserve their 'owner' role
      if (rupeebook.ownerId) {
        membersMap.set(rupeebook.ownerId, 'owner');
      }
      setCurrentBookMembers(membersMap);
    }
  }, [rupeebook, open]);

  const membersForDisplay = useMemo(() => {
    if (loggedInMember?.role === 'owner') {
        // Owner sees everyone.
        return allMembers;
    }
    if (loggedInMember?.role === 'admin') {
        // Admin sees only themselves and members they have created.
        return allMembers.filter(m => m.ownerId === loggedInMember.id || m.id === loggedInMember.id);
    }
    return [];
  }, [allMembers, loggedInMember]);
  
  const handleToggleMember = (memberId: string) => {
    if (!isBookOwner) {
        toast({ title: "Permission Denied", description: "Only the book owner can manage members.", variant: "destructive" });
        return;
    }
    setCurrentBookMembers(prev => {
      const newMap = new Map(prev);
      if (newMap.has(memberId)) {
        // Cannot remove the owner
        if (rupeebook.ownerId === memberId) {
            toast({ title: "Error", description: "Cannot remove the owner of the book.", variant: "destructive" });
            return newMap;
        }
        newMap.delete(memberId);
      } else {
        newMap.set(memberId, 'viewer'); // Default role when adding
      }
      return newMap;
    });
  };

  const handleRoleChange = (memberId: string, role: Role) => {
      if (!isBookOwner) {
        toast({ title: "Permission Denied", description: "Only the book owner can change roles.", variant: "destructive" });
        return;
      }
      // Owner role cannot be changed from this dialog
      if (rupeebook.ownerId === memberId && role !== 'owner') {
         toast({ title: "Error", description: "Owner role cannot be changed.", variant: "destructive" });
         return;
      }
      setCurrentBookMembers(prev => new Map(prev).set(memberId, role));
  }

  const handleSaveChanges = () => {
    if (!isBookOwner) {
        toast({ title: "Permission Denied", description: "Only the book owner can save changes.", variant: "destructive" });
        return;
    }
    const newMembers = Array.from(currentBookMembers.entries()).map(([memberId, role]) => ({ memberId, role }));
    onUpdateMembers(rupeebook.id, newMembers);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Members for "{rupeebook.name}"</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Select members to add to this book and assign their roles.</p>
        
        <ScrollArea className="h-72">
            <div className="space-y-3 pr-4">
            {membersForDisplay.map(member => {
                const isMemberInBook = currentBookMembers.has(member.id);
                const memberRole = currentBookMembers.get(member.id);
                const memberIsBookOwner = rupeebook.ownerId === member.id;
                
                const isCheckboxDisabled = memberIsBookOwner;

                return (
                    <div key={member.id} className={cn("p-3 rounded-lg border flex flex-col gap-3", isMemberInBook && "bg-muted/50")}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{member.name}</span>
                            </div>
                            <Checkbox 
                                checked={isMemberInBook} 
                                onCheckedChange={() => handleToggleMember(member.id)}
                                disabled={isCheckboxDisabled || !isBookOwner}
                            />
                        </div>
                        {isMemberInBook && (
                             <Select value={memberRole} onValueChange={(role: Role) => handleRoleChange(member.id, role)} disabled={memberIsBookOwner || !isBookOwner}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role} value={role} className="capitalize">
                                            {role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                );
            })}
            </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={!isBookOwner}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
