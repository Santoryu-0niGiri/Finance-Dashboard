import { TransactionType } from '../enums';

export interface Transaction {
  id?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  date: string;
  notes?: string;
  categoryId?: string;
  categoryName?: string;
  goalId?: string;
  goalName?: string;
}

export interface Category {
  id: string;
  name: string;
}
