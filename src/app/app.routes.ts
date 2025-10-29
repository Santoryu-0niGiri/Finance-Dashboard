import { Routes } from '@angular/router';
import { LoginGuard, AuthGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    pathMatch: 'full',
    loadComponent: () =>
      import('./auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [LoginGuard],
  },
  {
    path: 'register',
    pathMatch: 'full',
    loadComponent: () =>
      import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'reset-password',
    pathMatch: 'full',
    loadComponent: () =>
      import('./auth/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
  path: 'dashboard',
  loadChildren: () =>
      import('./dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  canActivate: [AuthGuard],
},
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
