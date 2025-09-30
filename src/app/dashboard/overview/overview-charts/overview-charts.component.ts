// src/app/dashboard/overview/overview-charts.component.ts
import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Chart, ChartData, ChartOptions, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { OverviewStoreService } from '../overview-store.service';

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
export class OverviewChartsComponent {
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

  // bar chart options (no scales for pie, but bars need scales)
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
      // optionally add datalabels here if you want values on bars
    },
    scales: {
      x: { ticks: { autoSkip: false } },
      y: { beginAtZero: true, title: { display: true, text: 'Amount' } }
    }
  };

  hasData = false;

  // palette reused across charts
  private palette = [
    '#f44336', '#2196f3', '#ff9800', '#4caf50', '#9c27b0',
    '#00bcd4', '#795548', '#607d8b', '#e91e63', '#3f51b5',
    '#8bc34a', '#ffc107'
  ];

  constructor(private store: OverviewStoreService) {
    effect(() => {
      const tx = this.store.transactions();
      this.rebuildLineChart(tx);
      this.rebuildPieAndBarCharts(tx);
    });
  }

  private rebuildLineChart(transactions: any[]) {
    if (!transactions?.length) {
      this.lineChartData = { labels: [], datasets: [] };
      return;
    }

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

    const labels = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const incomeData = labels.map(l => grouped[l].income);
    const expenseData = labels.map(l => grouped[l].expense);
    const goalsData = labels.map(l => grouped[l].goals);

    this.lineChartData = {
      labels,
      datasets: [
        { label: 'Income', data: incomeData, borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.08)', fill: true, tension: 0.3 },
        { label: 'Expenses', data: expenseData, borderColor: '#f44336', backgroundColor: 'rgba(244,67,54,0.06)', fill: true, tension: 0.3 },
        { label: 'Goals', data: goalsData, borderColor: '#2196f3', backgroundColor: 'rgba(33,150,243,0.06)', fill: true, tension: 0.3 }
      ]
    };

    this.hasData = incomeData.some(v => v > 0) || expenseData.some(v => v > 0) || goalsData.some(v => v > 0);
  }

  /** Build both pie and bar charts from same totals */
  private rebuildPieAndBarCharts(transactions: any[]) {
    if (!transactions?.length) {
      this.pieChartData = { labels: [], datasets: [] };
      this.barChartData = { labels: [], datasets: [] };
      return;
    }

    const totals: Record<string, number> = {};

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (amt <= 0) return;
      const type = (t.type || '').toLowerCase();
      if (type === 'expense') {
        const cat = t.categoryName ?? t.category ?? 'Uncategorized';
        totals[cat] = (totals[cat] || 0) + amt;
      } else if (type === 'goals') {
        const gLabel = `Goal: ${t.goalName ?? t.goalId ?? 'Unknown'}`;
        totals[gLabel] = (totals[gLabel] || 0) + amt;
      }
    });

    const labels = Object.keys(totals);
    const data = Object.values(totals);

    if (!labels.length) {
      this.pieChartData = { labels: [], datasets: [] };
      this.barChartData = { labels: [], datasets: [] };
      return;
    }

    const backgroundColor = labels.map((_, idx) => this.palette[idx % this.palette.length]);

    // pie dataset
    this.pieChartData = {
      labels,
      datasets: [
        { data, backgroundColor, hoverOffset: 8 } as any
      ]
    };

    // bar dataset (same labels & data)
    this.barChartData = {
      labels,
      datasets: [
        {
          label: 'Amount',
          data,
          backgroundColor,
          borderColor: backgroundColor.map(c => c),
          borderWidth: 1
        }
      ]
    };

    // mark that we have data
    this.hasData = this.hasData || data.some(v => v > 0);
  }
}
