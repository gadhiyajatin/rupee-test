

"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManageList } from "./manage-list";
import type { RupeeBook } from "@/lib/types";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface BookSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rupeebook: RupeeBook;
  onUpdateBookSettings: (
    newCategories: string[],
    newSubcategories: string[],
  ) => void;
}

export function BookSettingsSheet({
  open,
  onOpenChange,
  rupeebook,
  onUpdateBookSettings,
}: BookSettingsSheetProps) {
  const [categories, setCategories] = useState(rupeebook.categories);
  const [subcategories, setSubcategories] = useState(rupeebook.subcategories);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setCategories(rupeebook.categories);
      setSubcategories(rupeebook.subcategories);
    }
  }, [open, rupeebook]);
    
  const handleSaveChanges = () => {
    onUpdateBookSettings(categories, subcategories);
    toast({ title: "Settings Saved", description: "Your book settings have been updated." });
    onOpenChange(false);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 h-[90vh]">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Book Settings</SheetTitle>
          <SheetDescription>
            Manage categories and subcategories for "{rupeebook.name}".
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="categories" className="flex flex-col flex-1 min-h-0">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="categories" className="flex-1 overflow-hidden">
              <ManageList
                  items={categories}
                  onItemsChange={setCategories}
                  itemName="category"
              />
          </TabsContent>
          <TabsContent value="subcategories" className="flex-1 overflow-hidden">
               <ManageList
                  items={subcategories}
                  onItemsChange={setSubcategories}
                  itemName="subcategory"
              />
          </TabsContent>
        </Tabs>
        <SheetFooter className="p-4 border-t bg-background">
          <Button onClick={handleSaveChanges} className="w-full">Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
