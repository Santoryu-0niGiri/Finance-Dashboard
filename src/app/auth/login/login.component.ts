import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  // ✅ use inject() instead of constructor
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

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
        next: users => {
          this.loading.set(false);
          if (users.length > 0) {
            this.auth.saveUser(users[0]);
            this.router.navigate(['/dashboard']);
          } else {
            alert('Invalid credentials');
          }
        },
        error: () => {
          this.loading.set(false);
          alert('Error connecting to server');
        }
      });
    } else {
      alert('Please fill in all required fields correctly.');
    }
  }
  onCreateAccountClick() {
  this.router.navigate(['/register']);
}
}
