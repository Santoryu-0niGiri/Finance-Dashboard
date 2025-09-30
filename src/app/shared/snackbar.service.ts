import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
private snack = inject(MatSnackBar);

  success(message: string, duration = 2500) {
    this.snack.open(message, 'OK', { duration, panelClass: ['snack-success'] });
  }

  error(message: string, duration = 3500) {
    this.snack.open(message, 'Dismiss', { duration, panelClass: ['snack-error'] });
  }

  info(message: string, duration = 2500) {
    this.snack.open(message, 'OK', { duration, panelClass: ['snack-info'] });
  }

}
