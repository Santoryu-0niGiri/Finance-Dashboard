import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Transaction, Goal, User } from '../../shared/interfaces';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private firestore = inject(Firestore);

  // Users
  addUser(user: Partial<User>): Observable<string> {
    const usersRef = collection(this.firestore, 'users');
    return from(addDoc(usersRef, user)).pipe(map(docRef => docRef.id));
  }

  getUsers(): Observable<User[]> {
    const usersRef = collection(this.firestore, 'users');
    return from(getDocs(usersRef)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)))
    );
  }

  // Transactions
  getTransactions(userId: string): Observable<Transaction[]> {
    const transactionsRef = collection(this.firestore, 'transactions');
    const q = query(transactionsRef, where('userId', '==', userId), orderBy('date', 'desc'));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)))
    );
  }

  addTransaction(transaction: Partial<Transaction>): Observable<string> {
    const transactionsRef = collection(this.firestore, 'transactions');
    return from(addDoc(transactionsRef, transaction)).pipe(map(docRef => docRef.id));
  }

  updateTransaction(id: string, transaction: Partial<Transaction>): Observable<void> {
    const transactionDoc = doc(this.firestore, 'transactions', id);
    return from(updateDoc(transactionDoc, transaction));
  }

  deleteTransaction(id: string): Observable<void> {
    const transactionDoc = doc(this.firestore, 'transactions', id);
    return from(deleteDoc(transactionDoc));
  }

  // Goals
  getGoals(userId: string): Observable<Goal[]> {
    const goalsRef = collection(this.firestore, 'goals');
    const q = query(goalsRef, where('userId', '==', userId), orderBy('targetDate', 'desc'));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)))
    );
  }

  addGoal(goal: Partial<Goal>): Observable<string> {
    const goalsRef = collection(this.firestore, 'goals');
    return from(addDoc(goalsRef, goal)).pipe(map(docRef => docRef.id));
  }

  updateGoal(id: string, goal: Partial<Goal>): Observable<void> {
    const goalDoc = doc(this.firestore, 'goals', id);
    return from(updateDoc(goalDoc, goal));
  }

  deleteGoal(id: string): Observable<void> {
    const goalDoc = doc(this.firestore, 'goals', id);
    return from(deleteDoc(goalDoc));
  }
}