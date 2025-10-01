/* src/app/dashboard/calendar-dashboard/calendar-dashboard.component.ts */
import { Component, computed, effect, signal, AfterViewInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { OverviewStoreService } from '../overview/overview-store.service'; // adjust path if needed

import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { SummaryDialogComponent } from '../summary-dialog/summary-dialog.component'; // adjust path if needed

type SelectionMode = 'day' | 'month' | 'year';

@Component({
  selector: 'app-calendar-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    MatButtonToggleModule
  ],
  templateUrl: './calendar-dashboard.component.html',
  styleUrls: ['./calendar-dashboard.component.scss']
})
export class CalendarDashboardComponent implements AfterViewInit {
  private router = inject(Router);
  public store = inject(OverviewStoreService);
  private dialog = inject(MatDialog);

  // view month/year (local, 0-based)
  viewYear = signal<number>(new Date().getFullYear());
  viewMonth = signal<number>(new Date().getMonth());

  // selection mode: 'day' | 'month' | 'year'
  selectionMode = signal<SelectionMode>('day');

  // selected date ISO (yyyy-mm-dd) local; null if month/year selected
  selectedDate = signal<string | null>(null);

  // selected month/year when in month mode
  selectedMonth = signal<{ year: number; month: number } | null>(null);

  // selected year when in year mode
  selectedYear = signal<number | null>(null);

  // today's iso (system/laptop date snapshot)
  todayIso = signal<string>(this._isoFromDateLocal(new Date()));

  private dp = new DatePipe('en-US');

  // raw store references (typed to any[] to avoid unknown)
  transactions = computed((): any[] => (this.store.rawTransactions() as any[]) || []);
  goals = computed((): any[] => (this.store.rawGoals() as any[]) || []);

  // helpers for local ISO
  private pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
  public isoFromLocalParts = (year: number, monthZeroBased: number, day: number) =>
    `${year}-${this.pad(monthZeroBased + 1)}-${this.pad(day)}`;
  public isoFromDateLocal = (d: Date) => this._isoFromDateLocal(d);

  private _isoFromDateLocal(d: Date) {
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  }

  // days grid (numbers | null)
  daysInMonth = computed(() => {
    const year = this.viewYear(); const month = this.viewMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstWeekday = first.getDay();
    const daysCount = last.getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysCount; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  });

  // map each grid cell to local-iso or null
  daysIso = computed(() => {
    const arr = this.daysInMonth(); const year = this.viewYear(); const month = this.viewMonth();
    return arr.map(d => d === null ? null : this.isoFromLocalParts(year, month, d as number));
  });

  dateMap = signal<Record<string, { transactions: any[]; goals: any[] }>>({});

  constructor() {
    // build date map (timezone-safe local iso keys)
    effect(() => {
      const tx = this.transactions() || []; const gs = this.goals() || [];
      const map: Record<string, { transactions: any[]; goals: any[] }> = {};
      const push = (iso: string, kind: 'transactions' | 'goals', item: any) => {
        if (!map[iso]) map[iso] = { transactions: [], goals: [] };
        map[iso][kind].push(item);
      };

      tx.forEach((t: any) => {
        const raw = t.date ?? t.createdAt ?? t.targetDate;
        if (!raw) return;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return;
        push(this._isoFromDateLocal(d), 'transactions', t);
      });

      gs.forEach((g: any) => {
        const raw = g.targetDate ?? g.date ?? g.createdAt ?? g.dateCreated;
        if (!raw) return;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return;
        push(this._isoFromDateLocal(d), 'goals', g);
      });

      this.dateMap.set(map);
    });
  }

  ngAfterViewInit(): void {
    // optionally auto-select today on load:
    // this.goToToday();
  }

  // ---- Today sync & jump ----
  refreshToday(alsoGoToToday = false) {
    const now = new Date();
    this.todayIso.set(this._isoFromDateLocal(now));
    if (alsoGoToToday) this.goToToday();
  }

  goToToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const iso = this._isoFromDateLocal(now);

    this.viewYear.set(y);
    this.viewMonth.set(m);
    this.todayIso.set(iso);

    const mode = this.selectionMode();
    if (mode === 'day') {
      this.selectedDate.set(iso);
      this.selectedMonth.set(null);
      this.selectedYear.set(null);
    } else if (mode === 'month') {
      this.selectedMonth.set({ year: y, month: m });
      this.selectedDate.set(null);
      this.selectedYear.set(null);
    } else {
      this.selectedYear.set(y);
      this.selectedMonth.set(null);
      this.selectedDate.set(null);
    }
  }

  // ---- navigation & selection helpers ----
  prevMonth() {
    const m = this.viewMonth(), y = this.viewYear();
    if (m === 0) { this.viewMonth.set(11); this.viewYear.set(y - 1); } else { this.viewMonth.set(m - 1); }
    this.clearSelectionIfNeeded();
  }

  nextMonth() {
    const m = this.viewMonth(), y = this.viewYear();
    if (m === 11) { this.viewMonth.set(0); this.viewYear.set(y + 1); } else { this.viewMonth.set(m + 1); }
    this.clearSelectionIfNeeded();
  }

  setMonth(m: number) {
    this.viewMonth.set(m);
    if (this.selectionMode() === 'month') {
      this.selectedMonth.set({ year: this.viewYear(), month: m });
      this.selectedDate.set(null);
      this.selectedYear.set(null);
    } else {
      this.clearSelectionIfNeeded();
    }
  }

  setYear(y: number) {
    this.viewYear.set(y);
    if (this.selectionMode() === 'year') {
      this.selectedYear.set(y);
      this.selectedDate.set(null);
      this.selectedMonth.set(null);
    } else {
      this.clearSelectionIfNeeded();
    }
  }

  setSelectionMode(mode: SelectionMode) {
    this.selectionMode.set(mode);
    if (mode === 'day') {
      this.selectedMonth.set(null);
      this.selectedYear.set(null);
    } else if (mode === 'month') {
      this.selectedMonth.set({ year: this.viewYear(), month: this.viewMonth() });
      this.selectedDate.set(null);
      this.selectedYear.set(null);
    } else {
      this.selectedYear.set(this.viewYear());
      this.selectedMonth.set(null);
      this.selectedDate.set(null);
    }
  }

  onSelectDay(day: number | null, index: number) {
    if (day === null) { this.selectedDate.set(null); return; }

    const mode = this.selectionMode();
    if (mode === 'day') {
      const iso = this.daysIso()[index];
      this.selectedDate.set(iso);
      this.selectedMonth.set(null);
      this.selectedYear.set(null);
    } else if (mode === 'month') {
      this.selectedMonth.set({ year: this.viewYear(), month: this.viewMonth() });
      this.selectedDate.set(null);
      this.selectedYear.set(null);
    } else {
      this.selectedYear.set(this.viewYear());
      this.selectedDate.set(null);
      this.selectedMonth.set(null);
    }
  }

  private clearSelectionIfNeeded() {
    if (this.selectionMode() === 'day') {
      this.selectedMonth.set(null);
      this.selectedYear.set(null);
      this.selectedDate.set(null);
    } else if (this.selectionMode() === 'month') {
      this.selectedMonth.set({ year: this.viewYear(), month: this.viewMonth() });
      this.selectedDate.set(null);
      this.selectedYear.set(null);
    } else {
      this.selectedYear.set(this.viewYear());
      this.selectedMonth.set(null);
      this.selectedDate.set(null);
    }
  }

  getMonthTitle() {
    const year = this.viewYear(), month = this.viewMonth();
    return this.dp.transform(new Date(year, month, 1), 'MMMM yyyy');
  }

  getCountsForDate(iso: string | null) {
    if (!iso) return { tx: 0, goals: 0, txs: [], goalsList: [] };
    const entry = this.dateMap()[iso];
    return { tx: entry?.transactions?.length ?? 0, goals: entry?.goals?.length ?? 0, txs: entry?.transactions ?? [], goalsList: entry?.goals ?? [] };
  }

  isInSelectedMonth(index: number) {
    const sm = this.selectedMonth();
    if (!sm) return false;
    const iso = this.daysIso()[index];
    if (!iso) return false;
    const d = this.isoToDate(iso);
    return d.getFullYear() === sm.year && d.getMonth() === sm.month;
  }

  isInSelectedYear(index: number) {
    const sy = this.selectedYear();
    if (sy === null) return false;
    const iso = this.daysIso()[index];
    if (!iso) return false;
    const d = this.isoToDate(iso);
    return d.getFullYear() === sy;
  }

  isTodayCell(index: number) {
    const iso = this.daysIso()[index];
    if (!iso) return false;
    return iso === this.todayIso();
  }

  // ---- summary dialog logic (respects selection mode) ----
  openSummary(scope: 'week' | 'month' | 'year') {
    const map = this.dateMap();
    const selected = this.selectedDate();
    const selectedMonth = this.selectedMonth();
    const selectedYear = this.selectedYear();
    const year = this.viewYear(), month = this.viewMonth();

    const isoToDate = (iso: string) => {
      const [y, m, d] = iso.split('-').map(s => parseInt(s, 10));
      return new Date(y, m - 1, d);
    };

    const getWeekKeyLocal = (d: Date) => {
      const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
      const week1 = new Date(tmp.getFullYear(), 0, 4);
      const weekNo = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${tmp.getFullYear()}-W${this.pad(weekNo)}`;
    };

    const collectDatesForScope = (): string[] => {
      if (scope === 'month') {
        const targetYear = (this.selectionMode() === 'month' && selectedMonth) ? selectedMonth.year : year;
        const targetMonth = (this.selectionMode() === 'month' && selectedMonth) ? selectedMonth.month : month;
        return Object.keys(map).filter(iso => {
          const d = isoToDate(iso);
          return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        }).sort();
      } else if (scope === 'year') {
        const targetYear = (this.selectionMode() === 'year' && selectedYear) ? selectedYear : year;
        return Object.keys(map).filter(iso => {
          const d = isoToDate(iso);
          return d.getFullYear() === targetYear;
        }).sort();
      } else {
        let anchorDate: Date;
        if (this.selectionMode() === 'day' && selected) anchorDate = isoToDate(selected);
        else if (this.selectionMode() === 'month' && selectedMonth) anchorDate = new Date(selectedMonth.year, selectedMonth.month, 1);
        else anchorDate = new Date(this.viewYear(), this.viewMonth(), 1);
        const weekKey = getWeekKeyLocal(anchorDate);
        return Object.keys(map).filter(iso => {
          const d = isoToDate(iso);
          return getWeekKeyLocal(d) === weekKey;
        }).sort();
      }
    };

    const dates = collectDatesForScope();

    const details = dates.map(iso => {
      const entry = map[iso];
      return { iso, txCount: entry?.transactions?.length ?? 0, goalCount: entry?.goals?.length ?? 0, txs: entry?.transactions ?? [], goals: entry?.goals ?? [] };
    });

    this.dialog.open(SummaryDialogComponent, {
      minWidth: 320,
      width: '620px',
      data: { scope, year, month, details, monthTitle: this.getMonthTitle(), selectedDate: this.selectedDate() }
    });
  }

  // === IMPORTANT: these are the Add handlers you requested ===
  // They currently navigate to the transactions/goals pages with the date as query param.
  // Replace with dialog open if you prefer an inline modal.
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

  private isoToDate(iso: string) { const [y, m, d] = iso.split('-').map(s => parseInt(s, 10)); return new Date(y, m - 1, d); }

  // months / years for template
  months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  getYears(range = 8) {
    const current = new Date().getFullYear();
    const years: number[] = [];
    const half = Math.floor(range / 2);
    for (let i = current - half; i <= current + half; i++) years.push(i);
    return years;
  }
}
