// src/app/services/login.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const LoginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already logged in, redirect to dashboard
  if (authService.isLoggedIn()) {
    router.navigate(['/dashboard']);
    return false;
  }

  // Otherwise, allow access to login
  return true;
};
