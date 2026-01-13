
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getAllMembers, verifyPin } from '@/lib/supabase-service';
import type { Member } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Loader2, Fingerprint, ArrowLeft, Delete, ShieldX } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { formatDistanceToNow } from 'date-fns';

const userVerificationSchema = z.object({
  name: z.string().min(1, 'User Name is required.'),
});

type UserVerificationForm = z.infer<typeof userVerificationSchema>;

type LoginStep = 'verify-user' | 'enter-pin';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [, setLoggedInMember] = useLocalStorage<Member | null>('loggedInMember', null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('verify-user');
  const [verifiedMemberName, setVerifiedMemberName] = useState<string | null>(null);
  const [pin, setPin] = useState('');

  const form = useForm<UserVerificationForm>({
    resolver: zodResolver(userVerificationSchema),
    defaultValues: {
      name: '',
    },
  });

  const onUserVerify = async (values: UserVerificationForm) => {
    setIsLoading(true);
    try {
        const allMembers = await getAllMembers();
        const superOwnerName = 'JATIN GADHIYA';
        const allUserNames = [superOwnerName, ...allMembers.map(m => m.name)];
        
        const providedName = values.name.trim();

        const matchingUser = allUserNames.find(
            (name) => name.toLowerCase() === providedName.toLowerCase()
        );

        if (matchingUser) {
            setVerifiedMemberName(matchingUser);
            setStep('enter-pin');
        } else {
            toast({
            title: 'User Not Found',
            description: 'No member found with that name. Please check the name and try again.',
            variant: 'destructive',
            });
        }
    } catch (error) {
      console.error('User verification error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred during verification.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePinChange = (value: string) => {
    setPin(value);
    if (value.length === 4) {
      handlePinSubmit(value);
    }
  }

  const handlePinSubmit = async (finalPin: string) => {
    if (!verifiedMemberName) return;
    setIsLoading(true);

    const result = await verifyPin(verifiedMemberName, finalPin);

    if (result.status === 'success') {
        setLoggedInMember(result.member);
        toast({ title: 'Login Successful', description: `Welcome back, ${result.member.name}!` });
        router.push('/');
    } else if (result.status === 'locked') {
        setIsLoading(false);
        setPin('');
        const lockedUntil = new Date(result.lockedUntil);
        const distance = formatDistanceToNow(lockedUntil, { addSuffix: true });
        toast({
            title: 'Account Locked',
            description: `Too many failed attempts. Please try again ${distance}.`,
            variant: 'destructive',
            duration: 5000,
        });
    } else { // Incorrect PIN
        setIsLoading(false);
        setPin('');
        toast({
            title: 'Incorrect PIN',
            description: `The PIN you entered is incorrect. ${5 - result.attempts} attempts remaining.`,
            variant: 'destructive',
        });
    }
  };
  
  const handleNumpadClick = (num: string) => {
    if (pin.length < 4) {
        handlePinChange(pin + num);
    }
  }
  
  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  }
  
  const resetLoginFlow = () => {
    setStep('verify-user');
    setVerifiedMemberName(null);
    setPin('');
    form.reset();
  }


  if (step === 'verify-user') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm border-0 shadow-lg sm:border">
          <CardHeader className="text-center">
             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Fingerprint className="h-10 w-10 text-primary" />
             </div>
            <CardTitle className="text-2xl">Member Verification</CardTitle>
            <CardDescription>Enter your user name to proceed</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onUserVerify)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your registered name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify User
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (step === 'enter-pin') {
    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <header className="p-4 flex items-center">
                <Button variant="ghost" size="icon" onClick={resetLoginFlow}>
                    <ArrowLeft />
                </Button>
            </header>
            <main className="flex-1 flex flex-col items-center justify-center text-center px-8 -mt-16">
                <h1 className="text-xl font-medium mb-4">Enter your pin for {verifiedMemberName}</h1>
                 <InputOTP maxLength={4} value={pin} onChange={handlePinChange}>
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                    </InputOTPGroup>
                </InputOTP>
                {isLoading && <Loader2 className="mt-8 h-8 w-8 animate-spin text-primary" />}
            </main>
            <footer className="bg-gradient-to-t from-primary/10 via-primary/5 to-transparent">
                <div className="p-4 pb-8 grid grid-cols-3 gap-4 text-primary text-2xl font-bold">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <Button key={num} variant="ghost" className="h-20 text-3xl rounded-full" onClick={() => handleNumpadClick(String(num))}>{num}</Button>
                    ))}
                    <Button variant="ghost" className="h-20 text-3xl rounded-full" onClick={resetLoginFlow}><ShieldX className="text-muted-foreground" /></Button>
                    <Button variant="ghost" className="h-20 text-3xl rounded-full" onClick={() => handleNumpadClick('0')}>0</Button>
                    <Button variant="ghost" className="h-20 text-3xl rounded-full" onClick={handleBackspace}><Delete className="text-muted-foreground" /></Button>
                </div>
            </footer>
        </div>
    );
  }
  
  return null;
}
