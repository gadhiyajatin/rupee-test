
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

function parseJSON<T>(value: string | null, reviver?: (key: string, value: any) => any): T | null {
  try {
    return value === "undefined" ? null : JSON.parse(value ?? "", reviver);
  } catch {
    console.log("parsing error on", { value });
    return null;
  }
}


export function useLocalStorage<T>(key: string, initialValue: T, reviver?: (key: string, value: any) => any): [T, (value: T | ((val: T) => T)) => void] {
    
    const initialValueRef = useRef(initialValue);
    const reviverRef = useRef(reviver);

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValueRef.current;
    }

    try {
      const item = window.localStorage.getItem(key);
      const parsed = parseJSON<T>(item, reviverRef.current);
      return parsed !== null ? parsed : initialValueRef.current;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValueRef.current;
    }
  }, [key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = (value: T | ((val: T) => T)) => {
    if (typeof window == 'undefined') {
      console.warn(
        `Tried setting localStorage key “${key}” even though environment is not a client`,
      );
    }

    try {
      const newValue = value instanceof Function ? value(storedValue) : value;
      window.localStorage.setItem(key, JSON.stringify(newValue));
      setStoredValue(newValue);
      window.dispatchEvent(new StorageEvent('local-storage', { key }));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key || e.key === null) {
            setStoredValue(readValue());
        }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleStorageChange as EventListener);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('local-storage', handleStorageChange as EventListener);
    };
  }, [key, readValue]);

  return [storedValue, setValue];
};
