import { Injectable, signal, WritableSignal } from '@angular/core';
import { Transaction, Goal } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class OverviewStoreService {
  rawTransactions: WritableSignal<Transaction[]> = signal([]);
  rawGoals: WritableSignal<Goal[]> = signal([]);
  transactions: WritableSignal<Transaction[]> = signal([]);
  goals: WritableSignal<Goal[]> = signal([]);
  savedGoals: WritableSignal<Goal[]> = signal([]);
}
