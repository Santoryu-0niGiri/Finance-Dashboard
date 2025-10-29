import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

export const LoginGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      if (user) {
        router.navigate(['/dashboard']);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};
