
import type { RupeeBook, Business, Member, DataOperatorSettings } from './types';

// This file now exports the default data structure for a new user.
// This will be used to seed the local storage on the first visit.

export const defaultMembers: Member[] = [
    { id: 'm1', name: 'GADHIYAJATIN', pin: '9466', role: 'owner' },
];

export const defaultBusinesses: Business[] = [];

export const defaultDataOperatorSettings: DataOperatorSettings = {
  allowBackdatedEntries: 'always',
  hideNetBalanceAndReports: false,
  hideEntriesByOtherMembers: false,
};

export const defaultRupeeBooks: RupeeBook[] = [];

export const defaultCategories: string[] = [];

export const defaultSubcategories: string[] = [];
