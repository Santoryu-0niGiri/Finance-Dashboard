// src/app/dashboard/overview/overview.component.ts
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
import { ApiService, AuthService } from '../../core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OverviewStoreService, ThemeService } from '../../shared/services';
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

  goalsList = computed(() => this.store.goals());
  goalsCount = computed(() => (this.goalsList() || []).length);
  totalGoalsTarget = computed(() =>
    (this.goalsList() || []).reduce((sum, g) => sum + Number(g.targetAmount || 0), 0)
  );
  totalGoalsSaved = computed(() =>
    (this.goalsList() || []).reduce((sum, g) => sum + Number(g.currentAmount || 0), 0)
  );
  goalsProgressPct = computed(() => {
    const target = this.totalGoalsTarget();
    if (!target || target === 0) return 0;
    return Math.round((this.totalGoalsSaved() / target) * 100);
  });

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
    public store: OverviewStoreService,
    private dialog: MatDialog,
    public theme: ThemeService // kept public so template can toggle
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

  openChartsModal() {
    const isLight = this.theme.isLight();
  this.dialog.open(OverviewChartsComponent, {
    width: '92vw',
    maxWidth: '1200px',
    height: '80vh',
    panelClass: isLight ? 'light-theme' : '',        // apply theme class to dialog panel
    backdropClass: isLight ? 'light-theme-backdrop' : '' // optional: style backdrop if needed
  });
  }

  getCategoryLabel(element: any): string {
    if (!element) return '';
    if (element.type === 'goals') {
      return element.goalName ?? element.goalId ?? '';
    }
    return element.categoryName ?? element.category ?? element.categoryId ?? '';
  }
}
