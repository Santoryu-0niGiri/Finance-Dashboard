import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { from, map, Observable, catchError, throwError } from 'rxjs';
import { Transaction, Goal } from '../../shared/interfaces';
import { addDoc, collection, deleteDoc, doc, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { collectionData, Firestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  private uid(userId: number | string): string {
    return String(userId);
  }

  getTransactions(userId: number | string): Observable<Transaction[]> {
    const uid = this.uid(userId);
    const q = query(
      collection(this.firestore, 'transactions'),
      where('userId', '==', uid),
      orderBy('userId'),
      orderBy('date', 'desc')
    );
    return runInInjectionContext(this.injector, () =>
      (collectionData(q, { idField: 'id' }) as Observable<Transaction[]>).pipe(
        catchError(err => {
          console.error('Error fetching transactions:', err);
          return throwError(() => err);
        })
      )
    );
  }

  addTransaction(transaction: Partial<Transaction>): Observable<Transaction> {
    if (transaction.userId != null) transaction.userId = this.uid(transaction.userId);
    return from(addDoc(collection(this.firestore, 'transactions'), transaction)).pipe(
      map(ref => ({ ...transaction, id: ref.id } as Transaction)),
      catchError(err => {
        console.error('Error adding transaction:', err);
        return throwError(() => err);
      })
    );
  }

  updateTransaction(id: string | number, transaction: Partial<Transaction>): Observable<Transaction> {
    const docRef = doc(this.firestore, `transactions/${id}`);
    if (transaction.userId != null) transaction.userId = this.uid(transaction.userId);
    return from(updateDoc(docRef, transaction)).pipe(
      map(() => ({ ...transaction, id: String(id) } as Transaction)),
      catchError(err => {
        console.error('Error updating transaction:', err);
        return throwError(() => err);
      })
    );
  }

  deleteTransaction(id: string | number): Observable<void> {
    const docRef = doc(this.firestore, `transactions/${id}`);
    return from(deleteDoc(docRef)).pipe(
      catchError(err => {
        console.error('Error deleting transaction:', err);
        return throwError(() => err);
      })
    );
  }

  getGoals(userId: number | string): Observable<Goal[]> {
    const uid = this.uid(userId);
    const q = query(
      collection(this.firestore, 'goals'),
      where('userId', '==', uid),
      orderBy('userId'),
      orderBy('targetDate', 'desc')
    );
    return runInInjectionContext(this.injector, () =>
      (collectionData(q, { idField: 'id' }) as Observable<Goal[]>).pipe(
        catchError(err => {
          console.error('Error fetching goals:', err);
          return throwError(() => err);
        })
      )
    );
  }

  addGoal(goal: Partial<Goal>): Observable<Goal> {
    if (goal.userId != null) goal.userId = this.uid(goal.userId);
    return from(addDoc(collection(this.firestore, 'goals'), goal)).pipe(
      map(ref => ({ ...goal, id: ref.id } as Goal)),
      catchError(err => {
        console.error('Error adding goal:', err);
        return throwError(() => err);
      })
    );
  }

  updateGoal(id: string | number, goal: Partial<Goal>): Observable<Goal> {
    const docRef = doc(this.firestore, `goals/${id}`);
    if (goal.userId != null) goal.userId = this.uid(goal.userId);
    return from(updateDoc(docRef, goal)).pipe(
      map(() => ({ ...goal, id: String(id) } as Goal)),
      catchError(err => {
        console.error('Error updating goal:', err);
        return throwError(() => err);
      })
    );
  }

  deleteGoal(id: string | number): Observable<void> {
    const docRef = doc(this.firestore, `goals/${id}`);
    return from(deleteDoc(docRef)).pipe(
      catchError(err => {
        console.error('Error deleting goal:', err);
        return throwError(() => err);
      })
    );
  }
}
