import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SummaryDialogData } from '../../shared/enums/index';

@Component({
  selector: 'app-summary-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './summary-dialog.component.html',
  styleUrls: ['./summary-dialog.component.scss']
})
export class SummaryDialogComponent {
  data: SummaryDialogData;
  scopeTitle = '';
  perDayTotals: Record<string, { income: number; expense: number }> = {};
  totalTxCount = 0;
  totalGoalCount = 0;
  totalNet = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public incomingData: SummaryDialogData,
    private ref: MatDialogRef<SummaryDialogComponent>
  ) {
    this.data = incomingData;
    const s = incomingData.scope;
    this.scopeTitle = s === 'week' ? 'Week' : s === 'month' ? 'Month' : 'Year';
    this.calculateTotals();
  }

  private calculateTotals() {
    const map: Record<string, { income: number; expense: number }> = {};
    let txCount = 0;
    let goalCount = 0;
    let net = 0;

    (this.data.details || []).forEach(d => {
      txCount += d.txCount || 0;
      goalCount += d.goalCount || 0;

      let income = 0;
      let expense = 0;
      (d.txs || []).forEach(t => {
        const amt = Number(t.amount) || 0;
        if ((t.type || '').toLowerCase() === 'income') {
          income += amt;
        } else {
          expense += amt;
        }
      });

      map[d.iso] = { income, expense };
      net += income - expense;
    });

    this.perDayTotals = map;
    this.totalTxCount = txCount;
    this.totalGoalCount = goalCount;
    this.totalNet = net;
  }

  close() {
    this.ref.close();
  }
}
