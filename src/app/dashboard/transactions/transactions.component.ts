import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Transaction, Category } from '../../shared/interfaces';
import { TransactionType } from '../../shared/enums';
import { CategoryUtils } from '../../shared/utils';
import { catchError, of, switchMap, Subscription } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { MatIcon } from "@angular/material/icon";
import { MatIconButton, MatButton } from "@angular/material/button";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../shared/services';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIcon, MatIconButton, MatButton, MatProgressSpinnerModule],
  templateUrl:  './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnDestroy {
  transactionForm: FormGroup;
  transactions: any[] = [];
  loading = inject(LoadingService);
  // Using Firestore via ApiService (no json-server)
  private transactionsSubscription?: Subscription;

  // categories to show in the template (id/name)
  availableCategories: { id: string; name: string }[] = [];

  // cache of user goals with currentAmount
  userGoals: { id: string | number; title: string; currentAmount?: number }[] = [];

  private subscriptions = new Subscription();

  // tolerant snackbar helper (tries .show() then .open())
  private showSnackbar(message: string) {
    try {
      const s: any = this.snackbar;
      if (s?.success && message.startsWith('✅')) s.success(message);
      else if (s?.error && (message.startsWith('⚠️') || /error|failed|invalid/i.test(message))) s.error(message);
      else if (s?.info) s.info(message);
      else if (s?.open) s.open(message, 'OK', { duration: 3000 });
  else /* no snackbar implementation available */;
    } catch (e) {
      /* snackbar show failed */
    }
  }

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private afAuth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private snackbar: SnackbarService
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

    this.afAuth.onAuthStateChanged((fbUser) => {
      if (fbUser?.uid) {
        this.transactionsSubscription?.unsubscribe();
        this.loading.show();
        this.transactionsSubscription = this.api.getTransactions(fbUser.uid).pipe(
          catchError(() => of([]))
        ).subscribe(data => {
          this.transactions = data || [];
          this.loading.hide();
        }, () => {
          this.transactions = [];
          this.loading.hide();
        });
      } else {
        this.transactionsSubscription?.unsubscribe();
        this.transactions = [];
        this.availableCategories = [];
        this.userGoals = [];
      }
    });
  }

  loadTransactions() {
    const fbUser = this.afAuth.currentUser;
    if (fbUser?.uid) {
      this.loading.show();
      this.api.getTransactions(fbUser.uid).pipe(
        catchError(() => of([]))
      ).subscribe(data => {
        this.transactions = data || [];
        this.loading.hide();
      }, () => {
        this.transactions = [];
        this.loading.hide();
      });
    }
  }

  loadGoalsForCurrentUser() {
    const fbUser = this.afAuth.currentUser;
    if (!fbUser?.uid) {
      this.userGoals = [];
      this.availableCategories = [];
      return;
    }

    this.loading.show();
    this.api.getGoals(fbUser.uid).pipe(
      catchError(() => {
        this.showSnackbar('⚠️ Unable to load goals. Please try again.');
        this.loading.hide();
        return of([]);
      })
    ).subscribe(goals => {
      this.loading.hide();
      this.userGoals = goals.map(g => ({
        id: g.id?.toString() ?? '',
        title: g.title ?? 'Unnamed Goal',
        currentAmount: Number((g as any).currentAmount) || 0
      }));

      this.availableCategories = this.userGoals.map(g => ({
        id: g.id?.toString() ?? String(g.id),
        name: g.title
      }));

      if (this.availableCategories.length > 0) {
        this.transactionForm.get('category')?.enable();
      } else {
        this.transactionForm.get('category')?.disable();
      }
    });
  }

  onSubmit() {
    if (!this.transactionForm.valid) {
      this.showSnackbar('⚠️ Please fill out all required fields correctly.');
      return;
    }

    const fbUser = this.afAuth.currentUser;
    if (!fbUser?.uid) {
      this.showSnackbar('⚠️ Authentication required. Please log in.');
      return;
    }

    const fv = this.transactionForm.value;
    const payload: any = {
      userId: fbUser.uid,
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
    this.api.addTransaction(payload).pipe(
      catchError(err => {
        /* Error saving transaction */
        this.showSnackbar('⚠️ Failed to create transaction. Please try again.');
        return of(null);
      })
    ).subscribe(res => {
      if (!res) return;

      // add to UI list
      this.transactions = [res, ...this.transactions];
      this.showSnackbar('✅ Transaction created successfully!');

      // If this is a goal transaction, update the goal's currentAmount using ApiService
      if (fv.type === 'goals') {
        const goalId = fv.category;
        const localGoal = this.userGoals.find(g => g.id?.toString() === goalId?.toString());
        const existing = Number(localGoal?.currentAmount || 0);
        const newAmount = existing + Number(fv.amount || 0);

        this.api.updateGoal(goalId, { currentAmount: newAmount as any }).pipe(
          catchError(err => {
            /* Error updating goal */
            this.showSnackbar('⚠️ Transaction saved but failed to update goal progress.');
            return of(null);
          })
        ).subscribe(patched => {
          if (patched) {
            // update local caches
            this.userGoals = this.userGoals.map(g =>
              g.id?.toString() === goalId?.toString() ? { ...g, currentAmount: Number((patched as any).currentAmount ?? newAmount) } : g
            );
          }
        });
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
    this.transactionsSubscription?.unsubscribe();
  }

  private getCurrentUser(): any | null {
    return this.afAuth.currentUser ? { id: this.afAuth.currentUser.uid } : null;
  }
}