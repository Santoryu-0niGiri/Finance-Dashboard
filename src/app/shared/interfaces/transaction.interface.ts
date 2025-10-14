import { TransactionType } from '../enums';

export interface Transaction {
  id?: number;
  userId: number;
  type: TransactionType;
  amount: number;
  date: string;
  notes?: string;
  categoryId?: string;
  categoryName?: string;
  goalId?: string | number;
  goalName?: string;
}

export interface Category {
  id: string;
  name: string;
}