import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { OverviewStoreService } from '../overview/overview-store.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-calendar-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './calendar-dashboard.component.html',
  styleUrls: ['./calendar-dashboard.component.scss']
})
export class CalendarDashboardComponent {
  // month/year signals
  viewYear = signal<number>(new Date().getFullYear());
  viewMonth = signal<number>(new Date().getMonth()); // 0-based

  // selected date as ISO string (yyyy-mm-dd)
  selectedDate = signal<string | null>(null);

  // Date pipe
  private dp = new DatePipe('en-US');

  // raw store references (use raw so calendar shows everything)
  transactions = computed(() => this.store.rawTransactions());
  goals = computed(() => this.store.rawGoals());

  // build daysInMonth: an array of numbers or nulls for leading/trailing blanks
  daysInMonth = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstWeekday = first.getDay(); // 0=Sun .. 6=Sat
    const daysCount = last.getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysCount; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  });

  // daysIso maps each cell index to either the ISO date string or null.
  // It is computed from daysInMonth(), viewYear(), viewMonth()
  daysIso = computed(() => {
    const arr = this.daysInMonth();
    const year = this.viewYear();
    const month = this.viewMonth();
    return arr.map(d => {
      if (d === null) return null;
      const iso = new Date(year, month, d).toISOString().slice(0, 10);
      return iso;
    });
  });

  // dateMap: mapping iso date -> { transactions:[], goals:[] }
  dateMap = signal<Record<string, { transactions: any[]; goals: any[] }>>({});

  constructor(private router: Router, public store: OverviewStoreService) {
    // build date map whenever raw transactions/goals change
    effect(() => {
      const tx = this.transactions() || [];
      const gs = this.goals() || [];
      const map: Record<string, { transactions: any[]; goals: any[] }> = {};

      const push = (iso: string, kind: 'transactions' | 'goals', item: any) => {
        if (!map[iso]) map[iso] = { transactions: [], goals: [] };
        map[iso][kind].push(item);
      };

      tx.forEach(t => {
        const d = new Date(t.date || t.createdAt || t.targetDate);
        if (isNaN(d.getTime())) return;
        const iso = d.toISOString().slice(0, 10);
        push(iso, 'transactions', t);
      });

      gs.forEach(g => {
        const d = new Date(g.targetDate || g.date || g.createdAt || g.dateCreated);
        if (isNaN(d.getTime())) return;
        const iso = d.toISOString().slice(0, 10);
        push(iso, 'goals', g);
      });

      this.dateMap.set(map);
    });
  }

  // month navigation
  prevMonth() {
    const m = this.viewMonth();
    const y = this.viewYear();
    if (m === 0) {
      this.viewMonth.set(11);
      this.viewYear.set(y - 1);
    } else {
      this.viewMonth.set(m - 1);
    }
    this.selectedDate.set(null);
  }

  nextMonth() {
    const m = this.viewMonth();
    const y = this.viewYear();
    if (m === 11) {
      this.viewMonth.set(0);
      this.viewYear.set(y + 1);
    } else {
      this.viewMonth.set(m + 1);
    }
    this.selectedDate.set(null);
  }

  onSelectDay(day: number | null, index: number) {
    if (!day) {
      this.selectedDate.set(null);
      return;
    }
    const iso = this.daysIso()[index];
    this.selectedDate.set(iso);
  }

  // helpers
  getMonthTitle() {
    const year = this.viewYear();
    const month = this.viewMonth();
    const date = new Date(year, month, 1);
    return this.dp.transform(date, 'MMMM yyyy');
  }

  getCountsForDate(iso: string | null) {
    if (!iso) return { tx: 0, goals: 0, txs: [], goalsList: [] };
    const entry = this.dateMap()[iso];
    return { tx: entry?.transactions?.length ?? 0, goals: entry?.goals?.length ?? 0, txs: entry?.transactions ?? [], goalsList: entry?.goals ?? [] };
  }

  // navigation helpers: send date as query param and optionally lock on target page
  addTransactionForDate() {
    const d = this.selectedDate();
    if (!d) return;
    this.router.navigate(['/dashboard/transactions'], { queryParams: { date: d, lockDate: true } });
  }

  addGoalForDate() {
    const d = this.selectedDate();
    if (!d) return;
    this.router.navigate(['/dashboard/goals/create'], { queryParams: { date: d, lockDate: true } });
  }
}
