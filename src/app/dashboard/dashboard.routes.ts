import { Routes } from '@angular/router';
import { OverviewComponent } from './overview/overview.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { GoalsComponent } from './goals/goals.component';
import { AuthGuard } from '../services/auth.guard';
import { CalendarDashboardComponent } from './calendar-dashboard/calendar-dashboard.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard], // 👈 Protect entire dashboard
    children: [
      { path: 'overview', component: OverviewComponent },
      { path: 'transactions', component: TransactionsComponent },
      { path: 'goals', component: GoalsComponent },
      { path: 'calendar', component: CalendarDashboardComponent },
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  }
];
