
export type Transaction = {
  id: string;
  date: Date;
  type: 'in' | 'out';
  category: string;
  subcategory: string;
  remark: string;
  amount: number;
};

export type TransactionWithBalance = Transaction & {
  balance: number;
}

export type Cashbook = {
  id: string;
  name: string;
  type: 'personal' | 'business';
  businessId: string;
  transactions: Transaction[];
  categories: string[];
  subcategories: string[];
};

export type Business = {
    id: string;
    name: string;
    ownerId: string;
}

export type Category = string;
export type Subcategory = string;
