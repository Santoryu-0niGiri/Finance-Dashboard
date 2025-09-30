import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OverviewStoreService {
  // raw fetched data
  rawTransactions: WritableSignal<any[]> = signal([]);
  rawGoals: WritableSignal<any[]> = signal([]);

  // filtered data (what charts & tables consume)
  transactions: WritableSignal<any[]> = signal([]);
  goals: WritableSignal<any[]> = signal([]);
}
