import { SelectionMode } from '../enums';
import { Transaction } from './transaction.interface';
import { Goal } from './goal.interface';

export interface CalendarDateEntry {
  transactions?: Transaction[];
  goals?: Goal[];
}

export interface SelectedMonth {
  year: number;
  month: number;
}

export interface DateCounts {
  tx: number;
  goals: number;
  txs: Transaction[];
  goalsList: Goal[];
}