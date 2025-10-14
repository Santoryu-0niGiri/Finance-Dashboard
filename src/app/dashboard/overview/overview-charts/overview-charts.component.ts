// src/app/dashboard/overview/overview-charts.component.ts
import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { OverviewStoreService } from '../../../shared/services/overview-store.service';

Chart.register(...registerables);
Chart.register(ChartDataLabels);

@Component({
  selector: 'app-overview-charts',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [
    provideCharts(withDefaultRegisterables())
  ],
  templateUrl: './overview-charts.component.html',
  styleUrls: ['./overview-charts.component.scss']
})
export class OverviewChartsComponent implements OnInit, OnDestroy {
  // datasets
  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  pieChartData: ChartData<'pie'> = { labels: [], datasets: [] };
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  // options
  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true }, title: { display: true, text: 'Date' } },
      y: { beginAtZero: true, title: { display: true, text: 'Amount' } }
    }
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { enabled: true },
      datalabels: {
        formatter: (value: any, ctx: any) => {
          const data = ctx.chart.data.datasets[0].data as number[];
          const total = data.reduce((acc, v) => acc + Number(v || 0), 0);
          if (!total) return '';
          const pct = (Number(value) / total) * 100;
          return pct >= 0.1 ? pct.toFixed(1) + '%' : '';
        },
        color: '#fff',
        font: { weight: '600', size: 11 },
        clamp: true,
        anchor: 'center',
        align: 'center'
      } as any
    }
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
    scales: {
      x: { ticks: { autoSkip: false } },
      y: { beginAtZero: true, title: { display: true, text: 'Amount' } }
    }
  };

  hasData = false;

  // fallback palette (used if CSS vars missing)
  private palette = [
    '#f44336', '#2196f3', '#ff9800', '#4caf50', '#9c27b0',
    '#00bcd4', '#795548', '#607d8b', '#e91e63', '#3f51b5',
    '#8bc34a', '#ffc107'
  ];

  // theme change listener
  private themeListener = () => this.refreshColors();

  constructor(private store: OverviewStoreService) {
    effect(() => {
      const tx = this.store.transactions();
      this.rebuildLineChart(tx);
      this.rebuildPieAndBarCharts(tx);
    });
  }

  ngOnInit(): void {
    // apply initial colors
    this.refreshColors();
    // listen to runtime theme change event
    window.addEventListener('theme:changed', this.themeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('theme:changed', this.themeListener);
  }

  private rebuildLineChart(transactions: any[]) {
    if (!transactions?.length) {
      this.lineChartData = { labels: [], datasets: [] };
      this.hasData = false;
      return;
    }

    const grouped = this.groupTransactionsByDate(transactions);
    const labels = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const datasets = this.createLineChartDatasets(labels, grouped);
    
    this.lineChartData = { labels, datasets };
    this.hasData = datasets.some(ds => ds.data.some(v => v > 0));
  }

  private groupTransactionsByDate(transactions: any[]): Record<string, { income: number; expense: number; goals: number }> {
    const grouped: Record<string, { income: number; expense: number; goals: number }> = {};

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const d = new Date(t.date || t.createdAt || t.targetDate);
      if (isNaN(d.getTime())) return;
      
      const label = d.toISOString().slice(0, 10);
      if (!grouped[label]) grouped[label] = { income: 0, expense: 0, goals: 0 };
      
      const type = (t.type || '').toLowerCase();
      if (type === 'income') grouped[label].income += amt;
      else if (type === 'goals') grouped[label].goals += amt;
      else grouped[label].expense += amt;
    });

    return grouped;
  }

  private createLineChartDatasets(labels: string[], grouped: Record<string, { income: number; expense: number; goals: number }>) {
    const incomeData = labels.map(l => grouped[l].income);
    const expenseData = labels.map(l => grouped[l].expense);
    const goalsData = labels.map(l => grouped[l].goals);

    const incomeColor = getCssVar('--success') || '#4caf50';
    const expenseColor = getCssVar('--warn') || '#f44336';
    const goalsColor = getCssVar('--primary') || '#2196f3';

    return [
      {
        label: 'Income',
        data: incomeData,
        borderColor: incomeColor,
        backgroundColor: hexToRgba(incomeColor, 0.08),
        fill: true,
        tension: 0.3
      },
      {
        label: 'Expenses',
        data: expenseData,
        borderColor: expenseColor,
        backgroundColor: hexToRgba(expenseColor, 0.06),
        fill: true,
        tension: 0.3
      },
      {
        label: 'Goals',
        data: goalsData,
        borderColor: goalsColor,
        backgroundColor: hexToRgba(goalsColor, 0.06),
        fill: true,
        tension: 0.3
      }
    ];
  }

  private rebuildPieAndBarCharts(transactions: any[]) {
    if (!transactions?.length) {
      this.clearPieAndBarCharts();
      return;
    }

    const totals = this.calculateCategoryTotals(transactions);
    const labels = Object.keys(totals);
    const data = Object.values(totals);

    if (!labels.length) {
      this.clearPieAndBarCharts();
      return;
    }

    const backgroundColor = this.generateColorPalette(labels.length);
    this.createPieChart(labels, data, backgroundColor);
    this.createBarChart(labels, data, backgroundColor);
    this.hasData = this.hasData || data.some(v => v > 0);
  }

  private clearPieAndBarCharts() {
    this.pieChartData = { labels: [], datasets: [] };
    this.barChartData = { labels: [], datasets: [] };
  }

  private calculateCategoryTotals(transactions: any[]): Record<string, number> {
    const totals: Record<string, number> = {};
    
    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (amt <= 0) return;
      
      const type = (t.type || '').toLowerCase();
      const label = this.getCategoryLabel(t, type);
      if (label) totals[label] = (totals[label] || 0) + amt;
    });
    
    return totals;
  }

  private getCategoryLabel(transaction: any, type: string): string | null {
    if (type === 'expense') {
      return transaction.categoryName ?? transaction.category ?? 'Uncategorized';
    }
    if (type === 'goals') {
      return `Goal: ${transaction.goalName ?? transaction.goalId ?? 'Unknown'}`;
    }
    return null;
  }

  private generateColorPalette(count: number): string[] {
    const cssPalette = [getCssVar('--accent'), getCssVar('--warn'), getCssVar('--primary')].filter(Boolean);
    
    return Array.from({ length: count }, (_, idx) => {
      if (cssPalette.length) return cssPalette[idx % cssPalette.length];
      return this.palette[idx % this.palette.length];
    });
  }

  private createPieChart(labels: string[], data: number[], backgroundColor: string[]) {
    this.pieChartData = {
      labels,
      datasets: [{ data, backgroundColor, hoverOffset: 8 } as any]
    };
  }

  private createBarChart(labels: string[], data: number[], backgroundColor: string[]) {
    this.barChartData = {
      labels,
      datasets: [{
        label: 'Amount',
        data,
        backgroundColor,
        borderColor: backgroundColor,
        borderWidth: 1
      }]
    };
  }

  /** re-read CSS variables and apply to options + datasets, then request chart redraw */
  refreshColors() {
    const text = getCssVar('--text') || '#E6EEF8';
    const muted = getCssVar('--muted') || '#6B7280';
    const surface = getCssVar('--surface') || '#111827';
    const gridColor = hexToRgba(surface, 0.06);

    // update options (legend/axes colors)
    this.lineChartOptions = {
      ...(this.lineChartOptions || {}),
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: text } },
      },
      scales: {
        x: { ticks: { color: muted, maxRotation: 0, autoSkip: true }, grid: { color: gridColor } },
        y: { ticks: { color: muted }, grid: { color: gridColor } }
      }
    };

    this.pieChartOptions = {
      ...(this.pieChartOptions || {}),
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: text } } }
    };

    this.barChartOptions = {
      ...(this.barChartOptions || {}),
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: text } } },
      scales: {
        x: { ticks: { color: muted, autoSkip: false }, grid: { color: gridColor } },
        y: { ticks: { color: muted }, grid: { color: gridColor } }
      }
    };

    // apply dataset colors where applicable (some datasets are re-created in rebuild methods)
    // safe update: update existing dataset color properties if present
    if (this.lineChartData.datasets) {
      this.lineChartData.datasets.forEach(ds => {
        // if dataset borderColor/backgroundColor are functionally set earlier, keep them;
        // otherwise try to map using dataset label heuristics
        const label = (ds.label || '').toString().toLowerCase();
        if (label.includes('income')) {
          const c = getCssVar('--success') || '#4caf50';
          ds.borderColor = c;
          ds.backgroundColor = hexToRgba(c, 0.08) as any;
        } else if (label.includes('expense')) {
          const c = getCssVar('--warn') || '#f44336';
          ds.borderColor = c;
          ds.backgroundColor = hexToRgba(c, 0.06) as any;
        } else if (label.includes('goal')) {
          const c = getCssVar('--primary') || '#2196f3';
          ds.borderColor = c;
          ds.backgroundColor = hexToRgba(c, 0.06) as any;
        }
      });
    }

    if (this.pieChartData.datasets?.[0]) {
      // try to remap pie colors from CSS vars or fallback to current palette
      const accent = getCssVar('--accent');
      const warn = getCssVar('--warn');
      const primary = getCssVar('--primary');
      const cssColors = [accent, warn, primary].filter(Boolean);
      if (cssColors.length) {
        // rotate through cssColors to match items length
        this.pieChartData.datasets[0].backgroundColor = (this.pieChartData.labels || []).map((_, i) =>
          cssColors[i % cssColors.length]
        ) as any;
      }
    }

    if (this.barChartData.datasets?.[0]) {
      const accent = getCssVar('--accent');
      const warn = getCssVar('--warn');
      const cssColors = [accent, warn].filter(Boolean);
      if (cssColors.length) {
        this.barChartData.datasets.forEach((ds, i) => {
          ds.backgroundColor = cssColors[i % cssColors.length] as any;
          ds.borderColor = cssColors[i % cssColors.length] as any;
        });
      }
    }

    // Chart updates are handled automatically by Angular change detection
  }
}

/* helpers */
function getCssVar(name: string) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch {
    return '';
  }
}

function hexToRgba(input: string, alpha = 1) {
  if (!input) return `rgba(0,0,0,${alpha})`;
  const s = input.trim();
  if (s.startsWith('rgb(') || s.startsWith('rgba(')) {
    const inner = s.replace(/^rgba?\(|\)$/g, '').split(',').map(p => p.trim());
    return `rgba(${inner[0]}, ${inner[1]}, ${inner[2]}, ${alpha})`;
  }
  const hex = s.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (hex.length === 6) {
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return s;
}
