import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SnackbarService } from '../../shared';

@Component({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, RouterModule],
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackbar = inject(SnackbarService) as any;


  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  loading = signal(false);
  message = signal('');
  error = signal('');

  onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.message.set('');
    this.error.set('');

    this.authService.resetPassword(this.form.value.email!).subscribe({
      next: () => {
        this.showSnackbar('Password reset email sent! Check your inbox.');
        this.form.reset();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to send reset email.');
        this.showSnackbar('⚠️ ' + this.error());
        this.loading.set(false);
      }
    });
  }
  private showSnackbar(message: string) {
    try {
      const s: any = this.snackbar;
      // use project SnackbarService API: success/error/info
      if (s?.success && message.startsWith('✅')) s.success(message);
      else if (s?.error && (message.startsWith('⚠️') || /error|failed|invalid/i.test(message))) s.error(message);
      else if (s?.info) s.info(message);
      else {
        // fallback to MatSnackBar open directly if available
        if (s?.open) s.open(message, 'OK', { duration: 3000 });
    else /* no snackbar implementation available */;
      }
    } catch (e) {
      /* snackbar show failed */
    }
  }
}
