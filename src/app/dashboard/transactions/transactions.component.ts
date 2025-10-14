import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, ApiService } from '../../core/services';
import { Transaction, Category } from '../../shared/interfaces';
import { TransactionType } from '../../shared/enums';
import { CategoryUtils } from '../../shared/utils';
import { catchError, of, switchMap, Subscription } from 'rxjs';
import { MatIcon } from "@angular/material/icon";
import { MatIconButton, MatButton } from "@angular/material/button";

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIcon, MatIconButton, MatButton],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnDestroy {
  transactionForm: FormGroup;
  transactions: any[] = [];

  // categories to show in the template (id/name)
  availableCategories: { id: string; name: string }[] = [];

  // cache of user goals with currentAmount
  userGoals: { id: string | number; title: string; currentAmount?: number }[] = [];

  loadingGoals = false;
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.transactionForm = this.fb.group({
      type: ['', Validators.required],        // 'income' | 'expense' | 'goals'
      category: ['', Validators.required],    // id string (static) or goal id
      amount: [null, [Validators.required, Validators.min(1)]],
      date: ['', Validators.required],
      notes: ['']
    });

    // react to type changes to set categories
    this.subscriptions.add(
      this.transactionForm.get('type')?.valueChanges.subscribe((selectedType) => {
        this.transactionForm.get('category')?.reset();
        this.availableCategories = [];

        if (selectedType === 'goals') {
          this.transactionForm.get('category')?.disable();
          this.loadGoalsForCurrentUser();
        } else if (selectedType === 'income' || selectedType === 'expense') {
          this.availableCategories = CategoryUtils.getCategoriesForType(selectedType);
          this.transactionForm.get('category')?.enable();
        } else {
          this.transactionForm.get('category')?.disable();
        }
      })
    );

    // check for date query parameter and set it
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        if (params['date']) {
          this.transactionForm.patchValue({ date: params['date'] });
        }
      })
    );

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

    this.api.getTransactions(user.id)
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
    this.api.getGoals(user.id)
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
        this.userGoals = goals.filter(g => g.id).map(g => ({
          id: g.id!,
          title: g.title ?? g.name ?? 'Unnamed Goal',
          currentAmount: Number(g.currentAmount) || 0
        }));

        this.availableCategories = this.userGoals.map(g => ({
          id: String(g.id),
          name: g.title
        }));

        // Enable category control when goals are loaded
        if (this.availableCategories.length > 0) {
          this.transactionForm.get('category')?.enable();
        } else {
          this.transactionForm.get('category')?.disable();
        }
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
    this.api.addTransaction(payload)
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

            // Update the goal on server
            this.api.updateGoal(goalId, { currentAmount: newAmount })
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
                    g.id?.toString() === goalId?.toString() ? { ...g, currentAmount: newAmount } : g
                  );
                }
              });
          } else {
            // reload goals to get updated data
            this.loadGoalsForCurrentUser();
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

  getTotalAmount(): string {
    if (!this.transactions || this.transactions.length === 0) {
      return '0.00';
    }
    const total = this.transactions.reduce((sum, t) => {
      const amount = Number(t.amount) || 0;
      return sum + amount;
    }, 0);
    return total.toFixed(2);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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
