import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private http = inject(HttpClient);
private apiUrl = 'http://localhost:3000';

  // TRANSACTIONS
  getTransactions(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/transactions?userId=${userId}&_sort=date&_order=desc`);
  }

  addTransaction(transaction: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/transactions`, transaction);
  }

  updateTransaction(id: number, transaction: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/transactions/${id}`, transaction);
  }

  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/transactions/${id}`);
  }

  // GOALS
  getGoals(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/goals?userId=${userId}&_sort=targetDate&_order=desc`);
  }

  addGoal(goal: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/goals`, goal);
  }

  updateGoal(id: number, goal: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/goals/${id}`, goal);
  }

  deleteGoal(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/goals/${id}`);
  }
}
