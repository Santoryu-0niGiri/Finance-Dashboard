import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { catchError, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent {
  transactionForm: FormGroup;
  transactions: any[] = [];
  apiUrl = 'http://localhost:3000/transactions';
  goalsUrl = 'http://localhost:3000/goals';

  // static options for income/expense (id/name pairs)
  categoryOptionsStatic: { [key: string]: { id: string; name: string }[] } = {
    income: [
      { id: 'salary', name: 'Salary' },
      { id: 'allowance', name: 'Allowance' }
    ],
    expense: [
      { id: 'food', name: 'Food' },
      { id: 'rent', name: 'Rent' },
      { id: 'transport', name: 'Transport' },
      { id: 'utilities', name: 'Utilities' },
      { id: 'others', name: 'Others' }
    ]
  };

  // categories to show in the template (id/name)
  availableCategories: { id: string; name: string }[] = [];

  // cache of user goals with currentAmount
  userGoals: { id: string | number; title: string; currentAmount?: number }[] = [];

  loadingGoals = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {
    this.transactionForm = this.fb.group({
      type: ['', Validators.required],        // 'income' | 'expense' | 'goals'
      category: ['', Validators.required],    // id string (static) or goal id
      amount: [null, [Validators.required, Validators.min(1)]],
      date: ['', Validators.required],
      notes: ['']
    });

    // react to type changes to set categories
    this.transactionForm.get('type')?.valueChanges.subscribe((selectedType) => {
      this.transactionForm.get('category')?.reset();
      this.availableCategories = [];

      if (selectedType === 'goals') {
        this.loadGoalsForCurrentUser();
      } else if (selectedType === 'income' || selectedType === 'expense') {
        this.availableCategories = this.categoryOptionsStatic[selectedType] || [];
      }
    });

    // initial load of transactions for the user (if logged in)
    this.loadTransactions();
  }

  // load transactions for current logged-in user
  loadTransactions() {
    const user = this.getCurrentUser();
    if (!user) {
      this.transactions = [];
      return;
    }

    this.http.get<any[]>(`${this.apiUrl}?userId=${user.id}&_sort=date&_order=desc`)
      .pipe(
        catchError(err => {
          console.error('Error loading transactions', err);
          alert('⚠️ Error loading transactions');
          return of([]);
        })
      )
      .subscribe(data => this.transactions = data);
  }

  // Loads goals for the current user and maps them to availableCategories
  loadGoalsForCurrentUser() {
    const user = this.getCurrentUser();
    if (!user) {
      this.userGoals = [];
      this.availableCategories = [];
      return;
    }

    this.loadingGoals = true;
    this.http.get<any[]>(`${this.goalsUrl}?userId=${user.id}`)
      .pipe(
        catchError(err => {
          console.error('Error loading goals', err);
          alert('⚠️ Unable to load goals. Please try again.');
          this.loadingGoals = false;
          return of([]);
        })
      )
      .subscribe(goals => {
        this.loadingGoals = false;
        // normalize: ensure id and title, preserve currentAmount (default 0)
        this.userGoals = goals.map(g => ({
          id: g.id,
          title: g.title ?? g.name ?? 'Unnamed Goal',
          currentAmount: Number(g.currentAmount) || 0
        }));

        this.availableCategories = this.userGoals.map(g => ({
          id: g.id?.toString() ?? String(g.id),
          name: g.title
        }));
      });
  }

  // submit new transaction
  onSubmit() {
    if (!this.transactionForm.valid) {
      alert('⚠️ Please fill all fields correctly.');
      return;
    }

    const user = this.getCurrentUser();
    if (!user) {
      alert('⚠️ You must be logged in to add a transaction.');
      return;
    }

    const fv = this.transactionForm.value;
    const payload: any = {
      userId: user.id,
      type: fv.type,
      amount: fv.amount,
      date: fv.date || new Date().toISOString().slice(0, 10),
      notes: fv.notes || ''
    };

    if (fv.type === 'goals') {
      const selectedGoalId = fv.category;
      const matched = this.userGoals.find(g => g.id?.toString() === selectedGoalId?.toString());
      payload.goalId = selectedGoalId;
      payload.goalName = matched ? matched.title : null;
    } else {
      const matched = this.availableCategories.find(c => c.id === fv.category);
      payload.categoryId = fv.category;
      payload.categoryName = matched ? matched.name : fv.category;
    }

    // Create transaction
    this.http.post<any>(this.apiUrl, payload)
      .pipe(
        catchError(err => {
          console.error('Error saving transaction', err);
          alert('⚠️ Error saving transaction');
          return of(null);
        })
      )
      .subscribe(res => {
        if (!res) return;

        // add to UI list
        this.transactions = [res, ...this.transactions];
        alert('✅ Transaction added!');

        // If this is a goal transaction, update the goal's currentAmount
        if (fv.type === 'goals') {
          const goalId = fv.category;

          // find cached goal
          const localGoal = this.userGoals.find(g => g.id?.toString() === goalId?.toString());

          if (localGoal) {
            const existing = Number(localGoal.currentAmount || 0);
            const newAmount = existing + Number(fv.amount || 0);

            // PATCH the goal on server
            this.http.patch<any>(`${this.goalsUrl}/${goalId}`, { currentAmount: newAmount })
              .pipe(
                catchError(err => {
                  console.error('Error updating goal', err);
                  alert('⚠️ Transaction saved but failed to update the goal progress.');
                  return of(null);
                })
              )
              .subscribe(patched => {
                if (patched) {
                  // update local caches
                  this.userGoals = this.userGoals.map(g =>
                    g.id?.toString() === goalId?.toString() ? { ...g, currentAmount: Number(patched.currentAmount ?? newAmount) } : g
                  );
                  // reflect changes in availableCategories if you display current amounts in UI later
                }
              });
          } else {
            // If local cache missing, fetch goal and patch
            this.http.get<any>(`${this.goalsUrl}/${goalId}`)
              .pipe(
                catchError(err => {
                  console.error('Error fetching goal', err);
                  alert('⚠️ Transaction saved but failed to refresh goal progress.');
                  return of(null);
                }),
                switchMap(goalFromServer => {
                  if (!goalFromServer) return of(null);
                  const existing = Number(goalFromServer.currentAmount || 0);
                  const newAmount = existing + Number(fv.amount || 0);
                  return this.http.patch<any>(`${this.goalsUrl}/${goalId}`, { currentAmount: newAmount })
                    .pipe(
                      catchError(err => {
                        console.error('Error patching goal', err);
                        alert('⚠️ Transaction saved but failed to update the goal progress.');
                        return of(null);
                      })
                    );
                })
              )
              .subscribe(patched => {
                if (patched) {
                  // reload goals so UI is in-sync
                  this.loadGoalsForCurrentUser();
                }
              });
          }
        }

        // reset form and categories
        this.transactionForm.reset();
        this.availableCategories = [];
      });
  }

  goBack() {
    this.router.navigate(['/dashboard/overview']);
  }
  goToGoals() {
    this.router.navigate(['/dashboard/goals']);
  }

  // helper to read the current user from AuthService (your service uses signals)
  private getCurrentUser(): any | null {
    try {
      // prefer auth.getUser() or auth.user() if available
      const anyAuth: any = this.auth as any;
      if (typeof anyAuth.getUser === 'function') return anyAuth.getUser();
      if (typeof anyAuth.user === 'function') return anyAuth.user();
      // fallback to localStorage
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    }
  }
}
