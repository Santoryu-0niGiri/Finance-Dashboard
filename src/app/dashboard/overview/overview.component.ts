import { Component, computed, effect } from '@angular/core';
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { OverviewStoreService } from './overview-store.service';
import { OverviewChartsComponent } from './overview-charts/overview-charts.component';
import { CalendarDashboardComponent } from '../calendar-dashboard/calendar-dashboard.component';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    MatDialogModule,
    FormsModule,
    OverviewChartsComponent,
    CurrencyPipe,
    CalendarDashboardComponent,
    CommonModule
  ],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent {
  selectedFilter: 'week' | 'month' | 'year' | 'all' = 'all';
  displayedColumns: string[] = ['date', 'category', 'type', 'amount'];

  // computed: read totals from the (filtered) transactions signal in the store
  income = computed(() =>
    this.store.transactions().filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  );

  expenses = computed(() =>
    this.store.transactions().filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
  );

  balance = computed(() => this.income() - this.expenses());

  // add these computed properties near the top-level computed declarations in OverviewComponent

// list of goals currently in the store (already filtered by selected range)
goalsList = computed(() => this.store.goals());

// number of goals in the current filtered list
goalsCount = computed(() => (this.goalsList() || []).length);

// total target amount across listed goals
totalGoalsTarget = computed(() =>
  (this.goalsList() || []).reduce((sum, g) => sum + Number(g.targetAmount || 0), 0)
);

// total saved/current amount across listed goals
totalGoalsSaved = computed(() =>
  (this.goalsList() || []).reduce((sum, g) => sum + Number(g.currentAmount || g.savedAmount || 0), 0)
);

// overall percentage progress across all goals (guard divide by zero)
goalsProgressPct = computed(() => {
  const target = this.totalGoalsTarget();
  if (!target || target === 0) return 0;
  return Math.round((this.totalGoalsSaved() / target) * 100);
});

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
    public store: OverviewStoreService, // <-- make public so template can access
    private dialog: MatDialog
  ) {
    // whenever user changes, fetch raw data and apply current filter
    effect(() => {
      const user = this.auth.user?.();
      if (user) {
        this.api.getTransactions(user.id).subscribe({
          next: data => {
            this.store.rawTransactions.set(data || []);
            this.applyCurrentFilterToTransactions();
          },
          error: () => {
            this.store.rawTransactions.set([]);
            this.store.transactions.set([]);
          }
        });
        this.api.getGoals(user.id).subscribe({
          next: data => {
            this.store.rawGoals.set(data || []);
            this.applyCurrentFilterToGoals();
          },
          error: () => {
            this.store.rawGoals.set([]);
            this.store.goals.set([]);
          }
        });
      } else {
        this.store.rawTransactions.set([]);
        this.store.transactions.set([]);
        this.store.rawGoals.set([]);
        this.store.goals.set([]);
      }
    });
  }

  // called when the toggle changes
  onFilterChange() {
    this.applyCurrentFilterToTransactions();
    this.applyCurrentFilterToGoals();
  }

  private applyCurrentFilterToTransactions() {
    const items = this.store.rawTransactions();
    this.store.transactions.set(this.filterBySelectedRange(items));
  }

  private applyCurrentFilterToGoals() {
    const items = this.store.rawGoals();
    this.store.goals.set(this.filterBySelectedRange(items));
  }

  private filterBySelectedRange(items: any[]) {
    if (!items || this.selectedFilter === 'all') return items;
    const now = new Date();
    return items.filter(i => {
      const d = new Date(i.date || i.targetDate || i.createdAt || i.dateCreated);
      if (!d || isNaN(d.getTime())) return false;

      if (this.selectedFilter === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        return d >= start && d <= now;
      }
      if (this.selectedFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (this.selectedFilter === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  logout() {
    this.auth.logout();
  }

  goToTransactions() {
    this.router.navigate(['/dashboard/transactions']);
  }

  goToGoals() {
    this.router.navigate(['/dashboard/goals']);
  }

  // Open modal (dialog) showing the charts component in a larger view
  openChartsModal() {
    this.dialog.open(OverviewChartsComponent, {
      width: '92vw',
      maxWidth: '1200px',
      height: '80vh'
    });
  }

  /**
   * Helper: return a friendly category label for a transaction row.
   * Handles transactions of type 'goals' (use goalName/goalId)
   * and normal income/expense rows (categoryName/category/categoryId).
   */
  getCategoryLabel(element: any): string {
    if (!element) return '';
    // If this transaction is linked to a goal, prefer goalName then goalId
    if (element.type === 'goals') {
      return element.goalName ?? element.goalId ?? '';
    }
    // For income/expense: check for categoryName (normalized) then category then categoryId
    return element.categoryName ?? element.category ?? element.categoryId ?? '';
  }
}
