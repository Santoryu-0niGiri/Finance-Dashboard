import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
private snack = inject(MatSnackBar);

  success(message: string, duration = 3000) {
    this.snack.open(message, '✓', { duration, panelClass: ['snack-success'], horizontalPosition: 'center', verticalPosition: 'top' });
  }

  error(message: string, duration = 4000) {
    this.snack.open(message, '✕', { duration, panelClass: ['snack-error'], horizontalPosition: 'center', verticalPosition: 'top' });
  }

  info(message: string, duration = 3000) {
    this.snack.open(message, 'OK', { duration, panelClass: ['snack-info'], horizontalPosition: 'center', verticalPosition: 'top' });
  }

}
