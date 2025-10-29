import { Component, inject, signal } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SnackbarService } from '../../shared/services/snackbar.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    RouterLink
],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snackbar = inject(SnackbarService) as any;

  // ✅ signal for loading state
  loading = signal(false);

  // ✅ FormGroup using FormBuilder
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  onLogin() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      this.loading.set(true); // show loading

      this.auth.login(email!, password!).subscribe({
        next: (user: any) => {
          this.loading.set(false);
          if (user?.id) {
            this.router.navigate(['/dashboard']);
              return;
            }
            this.showSnackbar('⚠️ Invalid email or password. Please try again.');
        },
        error: (err: any) => {
          this.loading.set(false);
          const message = err?.message || err?.code || 'Failed to connect to server. Please check your connection.';
            this.showSnackbar('⚠️ ' + message);
        }
      });
    } else {
        this.showSnackbar('⚠️ Please fill out all required fields correctly.');
    }
  }
  onCreateAccountClick() {
  this.router.navigate(['/register']);
}

  // helper to show snackbar (tolerant to .show() or .open())
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
