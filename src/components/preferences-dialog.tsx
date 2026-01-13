
"use client";

import React from 'react';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreferencesDialog({ open, onOpenChange }: PreferencesDialogProps) {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const handleLanguageChange = (lang: 'en' | 'gu') => {
    setLanguage(lang);
    toast({ title: t('language_changed_title'), description: t('language_changed_description') });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('preferences_title')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
            <Card className="border-0 shadow-none">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base">{t('language_preference_title')}</CardTitle>
                <CardDescription>{t('language_preference_description')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <RadioGroup 
                  value={language}
                  onValueChange={(value: 'en' | 'gu') => handleLanguageChange(value)}
                  className="flex gap-4"
                >
                  <Label htmlFor="lang-en" className={cn(
                      "flex-1 flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                      language === 'en' ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                  )}>
                    <RadioGroupItem value="en" id="lang-en"/>
                    English
                  </Label>
                   <Label htmlFor="lang-gu" className={cn(
                      "flex-1 flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                      language === 'gu' ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                  )}>
                    <RadioGroupItem value="gu" id="lang-gu"/>
                    ગુજરાતી
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>
        </div>
         <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('cancel_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
