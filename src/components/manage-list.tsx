
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PlusCircle, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';

type ManageListProps = {
  items: string[];
  onItemsChange: (items: string[]) => void;
  itemName: string;
};

export function ManageList({
  items,
  onItemsChange,
  itemName,
}: ManageListProps) {
  const [newItem, setNewItem] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const { toast } = useToast();

  const handleAddItem = () => {
    if (newItem.trim() && !items.find(i => i.toLowerCase() === newItem.trim().toLowerCase())) {
      const updatedItems = [...items, newItem.trim()];
      onItemsChange(updatedItems);
      setNewItem('');
      toast({ title: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} added` });
    } else {
      toast({ title: `Error`, description: `This ${itemName} already exists or is empty.`, variant: 'destructive'});
    }
  };

  const handleDeleteItem = (itemToDelete: string) => {
    const updatedItems = items.filter((item) => item !== itemToDelete);
    onItemsChange(updatedItems);
    toast({ title: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted` });
  };
  
  const handleStartEdit = (item: string) => {
    setEditingItem(item);
    setEditingValue(item);
  };
  
  const handleSaveEdit = () => {
    if (editingItem && editingValue.trim()) {
      if (editingValue.trim().toLowerCase() !== editingItem.toLowerCase() && items.find(i => i.toLowerCase() === editingValue.trim().toLowerCase())) {
         toast({ title: `Error`, description: `This ${itemName} already exists.`, variant: 'destructive'});
         return;
      }
      const updatedItems = items.map(i => i === editingItem ? editingValue.trim() : i);
      onItemsChange(updatedItems);
      setEditingItem(null);
      setEditingValue('');
      toast({ title: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} updated` });
    } else {
      setEditingItem(null);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const updatedItems = [...items];
    const temp = updatedItems[index];
    updatedItems[index] = updatedItems[newIndex];
    updatedItems[newIndex] = temp;
    
    onItemsChange(updatedItems);
  };

  return (
    <div className="pt-4 px-6 pb-6 h-full flex flex-col">
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={`Add new ${itemName}...`}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <Button onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
      </div>

      <ScrollArea className="mt-4 flex-1">
            <div className="space-y-2 pr-2">
                {items.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-center gap-2 p-2 rounded-md border">
                    <div className="flex flex-col">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(index, 'up')} disabled={index === 0}>
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1}>
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex-1 min-w-0">
                        {editingItem === item ? (
                            <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                            onBlur={handleSaveEdit}
                            autoFocus
                            className="h-8"
                            />
                        ) : (
                            <span className="break-words py-1">{item}</span>
                        )}
                      </div>
                    
                    <div className="flex items-center shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will delete the "{item}" {itemName}. This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteItem(item)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
            </div>
      </ScrollArea>
    </div>
  );
}
