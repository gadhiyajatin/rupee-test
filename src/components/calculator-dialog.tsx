
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Equal, Delete, Percent, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

const CalculatorButton = ({
  children,
  onClick,
  className,
  variant = 'secondary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: 'secondary' | 'primary' | 'ghost' | 'destructive';
}) => (
  <Button
    variant={variant}
    className={cn(
      'h-16 w-full text-2xl font-bold rounded-xl shadow-sm active:shadow-inner flex items-center justify-center',
      className
    )}
    onClick={onClick}
  >
    {children}
  </Button>
);

interface CalculatorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSetValue: (value: number) => void;
    initialValue?: number;
}

export function CalculatorDialog({ open, onOpenChange, onSetValue, initialValue }: CalculatorDialogProps) {
  const [displayValue, setDisplayValue] = useState('0');
  const [expression, setExpression] = useState('');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialValue && initialValue > 0) {
        setDisplayValue(String(initialValue));
      } else {
        setDisplayValue('0');
      }
      setExpression('');
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
    }
  }, [open, initialValue]);


  const handleDigitClick = (digit: string) => {
    if (waitingForSecondOperand) {
      setDisplayValue(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
    }
  };

  const handleDecimalClick = () => {
    if (waitingForSecondOperand) {
        setDisplayValue('0.');
        setWaitingForSecondOperand(false);
        return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  };
  
  const handlePercentClick = () => {
    if (operator && firstOperand !== null) {
      const currentValue = parseFloat(displayValue);
      const percentValue = (firstOperand * currentValue) / 100;
      setDisplayValue(String(percentValue));
      setExpression(prev => prev + ` ${currentValue}%`);
    } else {
      const currentValue = parseFloat(displayValue);
      setDisplayValue(String(currentValue / 100));
      setExpression(String(currentValue / 100));
    }
  };

  const performCalculation = (op: string, a: number, b: number): number => {
    switch (op) {
        case '+': return a + b;
        case '−': return a - b;
        case '×': return a * b;
        case '÷': return b === 0 ? NaN : a / b;
        default: return b;
    }
  };

  const handleOperatorClick = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (operator && !waitingForSecondOperand) {
      const result = performCalculation(operator, firstOperand!, inputValue);
      if (isNaN(result)) {
        handleClear();
        setDisplayValue('Error');
        return;
      }
      setDisplayValue(String(result));
      setFirstOperand(result);
      setExpression(`${result} ${nextOperator}`);
    } else {
      setFirstOperand(inputValue);
      setExpression(`${displayValue} ${nextOperator}`);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };
  
  const handleEqualsClick = () => {
    if (operator && firstOperand !== null && !waitingForSecondOperand) {
        const inputValue = parseFloat(displayValue);
        const result = performCalculation(operator, firstOperand, inputValue);
        if (isNaN(result)) {
            handleClear();
            setDisplayValue('Error');
            return;
        }
        setExpression(`${firstOperand} ${operator} ${inputValue} =`);
        setDisplayValue(String(result));
        setFirstOperand(null);
        setOperator(null);
    }
  }

  const handleClear = () => {
    setDisplayValue('0');
    setExpression('');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };
  
  const handleBackspace = () => {
      if (waitingForSecondOperand) return;
      if (displayValue.length === 1) {
          setDisplayValue('0');
      } else {
          setDisplayValue(displayValue.slice(0, -1));
      }
  }

  const handleDone = () => {
    if (displayValue === 'Error' || displayValue === 'NaN') return;
    
    let finalValue = parseFloat(displayValue);

    if (operator && firstOperand !== null) {
      const result = performCalculation(operator, firstOperand, parseFloat(displayValue));
       if (!isNaN(result)) {
         finalValue = result;
       }
    }
    
    onSetValue(finalValue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs p-2">
        <div className="flex flex-col bg-background">
          <main className="flex-1 flex flex-col p-2">
            <div className="flex-1 flex flex-col justify-end p-4 text-right">
              <div className="text-muted-foreground text-2xl min-h-[32px] break-all">
                {expression}
              </div>
              <div className="text-5xl font-light break-all min-h-[60px]">
                {displayValue}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <CalculatorButton onClick={handleClear} variant="destructive" className="bg-destructive/20 text-destructive">C</CalculatorButton>
              <CalculatorButton onClick={handlePercentClick} variant="primary" className="bg-primary/20 text-primary"><Percent size={24}/></CalculatorButton>
              <CalculatorButton onClick={handleBackspace} variant="primary" className="bg-primary/20 text-primary"><Delete /></CalculatorButton>
              <CalculatorButton onClick={() => handleOperatorClick('÷')} variant="primary" className="text-2xl">÷</CalculatorButton>

              <CalculatorButton onClick={() => handleDigitClick('7')}>7</CalculatorButton>
              <CalculatorButton onClick={() => handleDigitClick('8')}>8</CalculatorButton>
              <CalculatorButton onClick={() => handleDigitClick('9')}>9</CalculatorButton>
              <CalculatorButton onClick={() => handleOperatorClick('×')} variant="primary" className="text-2xl">×</CalculatorButton>

              <CalculatorButton onClick={() => handleDigitClick('4')}>4</CalculatorButton>
              <CalculatorButton onClick={() => handleDigitClick('5')}>5</CalculatorButton>
              <CalculatorButton onClick={() => handleDigitClick('6')}>6</CalculatorButton>
              <CalculatorButton onClick={() => handleOperatorClick('−')} variant="primary" className="text-2xl">−</CalculatorButton>

              <CalculatorButton onClick={() => handleDigitClick('1')}>1</CalculatorButton>
              <CalculatorButton onClick={() => handleDigitClick('2')}>2</CalculatorButton>
              <CalculatorButton onClick={() => handleDigitClick('3')}>3</CalculatorButton>
              <CalculatorButton onClick={() => handleOperatorClick('+')} variant="primary" className="text-2xl">+</CalculatorButton>

              <CalculatorButton onClick={() => handleDigitClick('0')} className="col-span-2">0</CalculatorButton>
              <CalculatorButton onClick={handleDecimalClick}>.</CalculatorButton>
              <CalculatorButton onClick={handleEqualsClick} variant="primary"><Equal /></CalculatorButton>
            </div>
          </main>

          <footer className="p-2 mt-auto">
            <Button className="w-full h-12 text-lg" onClick={handleDone}>
              <Check className="mr-2 h-6 w-6" />
              Done
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
