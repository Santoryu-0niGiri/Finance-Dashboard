import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { delay, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/users';

  // 🔹 Signal to hold the current user
  private currentUser = signal<any | null>(null);

  // expose a readonly signal for components
  user = this.currentUser.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    // restore user from localStorage if available
    const stored = localStorage.getItem('user');
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
    }
  }

  register(user: any): Observable<any> {
    return this.http.post(this.apiUrl, user);
  }

  login(email: string, password: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}?email=${email}&password=${password}`)
      .pipe(
    delay(500),
        tap(users => {
          if (users.length > 0) {
            this.saveUser(users[0]);
          }
        })
      );
  }

  saveUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user); // 🔹 update signal
  }

  getUser() {
    return this.currentUser();
  }

  logout() {
    localStorage.removeItem('user');
    this.currentUser.set(null); // 🔹 clear signal
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }
}
