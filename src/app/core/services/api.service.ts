import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Transaction, Goal } from '../../shared/interfaces';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private firebase = inject(FirebaseService);

  getTransactions(userId: string | number): Observable<Transaction[]> {
    return this.firebase.getTransactions(String(userId));
  }

  addTransaction(transaction: Partial<Transaction>): Observable<Transaction> {
    return this.firebase.addTransaction(transaction).pipe(
      map(id => ({ ...transaction, id } as Transaction))
    );
  }

  updateTransaction(id: string | number, transaction: Partial<Transaction>): Observable<Transaction> {
    return this.firebase.updateTransaction(String(id), transaction).pipe(
      map(() => ({ ...transaction, id: String(id) } as Transaction))
    );
  }

  deleteTransaction(id: string | number): Observable<void> {
    return this.firebase.deleteTransaction(String(id));
  }

  getGoals(userId: string | number): Observable<Goal[]> {
    return this.firebase.getGoals(String(userId));
  }

  addGoal(goal: Partial<Goal>): Observable<Goal> {
    return this.firebase.addGoal(goal).pipe(
      map(id => ({ ...goal, id } as Goal))
    );
  }

  updateGoal(id: string | number, goal: Partial<Goal>): Observable<Goal> {
    return this.firebase.updateGoal(String(id), goal).pipe(
      map(() => ({ ...goal, id: String(id) } as Goal))
    );
  }

  deleteGoal(id: string | number): Observable<void> {
    return this.firebase.deleteGoal(String(id));
  }
}
