
export type Role = 'owner' | 'admin' | 'viewer' | 'data-operator';

export type Transaction = {
  id: string;
  date: string;
  type: 'in' | 'out';
  category: string;
  subcategory?: string;
  remark: string;
  amount: number;
  attachmentUrl?: string;
  memberId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TransactionWithBalance = Transaction & {
  balance: number;
}

export type RupeeBook = {
  id: string;
  name: string;
  businessId?: string;
  ownerId: string;
  members: { memberId: string; role: Role; lastViewed: string }[];
  transactions?: Transaction[]; 
  categories: string[];
  subcategories: string[];
  balance?: number;
  balanceBefore?: number;
  dataOperatorSettings?: DataOperatorSettings;
};

export type Business = {
    id: string;
    name: string;
    ownerId: string;
    type: 'personal' | 'business';
    sortOrder: number;
}

export type Member = {
    id: string;
    name: string;
    pin: string;
    role: Role;
    ownerId?: string;
    lastViewedBookId?: string;
    failedPinAttempts: number;
    lockedUntil?: string | null;
}

export type DataOperatorSettings = {
  allowBackdatedEntries: 'always' | 'never' | 'one-day-before';
  hideNetBalanceAndReports: boolean;
  hideEntriesByOtherMembers: boolean;
  allowEntryEditing: boolean;
}

export type ActivityType = 'create' | 'update' | 'delete' | 'copy' | 'move' | 'delete_all';

export interface ActivityLog {
  id: string;
  rupeebookId: string;
  memberId: string;
  timestamp: string;
  type: ActivityType;
  details: any;
}

export type Category = string;
export type Subcategory = string;


export type ReportType = 
  | 'all-entries' 
  | 'day-wise' 
  | 'category-wise';

export interface PdfSettings {
  columns: {
    'all-entries'?: (
      | 'date'
      | 'remark'
      | 'category'
      | 'subcategory'
      | 'entryBy'
      | 'cashIn'
      | 'cashOut'
      | 'balance'
    )[];
  };
  otherOptions: {
    showNameAndNumber: boolean;
    showFilters: boolean;
  };
}

export type VerifyPinResult =
  | { status: 'success'; member: Member }
  | { status: 'incorrect'; attempts: number }
  | { status: 'locked'; lockedUntil: string };
