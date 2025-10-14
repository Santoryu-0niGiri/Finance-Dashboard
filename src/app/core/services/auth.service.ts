import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { delay, Observable, tap } from 'rxjs';
import { User } from '../../shared/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/users';

  private currentUser = signal<User | null>(null);
  user = this.currentUser.asReadonly();

  constructor(private http: HttpClient, private router: Router) {
    // restore user from localStorage if available
    const stored = localStorage.getItem('user');
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
    }
  }

  register(user: Partial<User>): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  login(email: string, password: string): Observable<User[]> {
    return this.http
      .get<User[]>(`${this.apiUrl}?email=${email}&password=${password}`)
      .pipe(
        delay(500),
        tap(users => {
          if (users.length > 0) {
            this.saveUser(users[0]);
          }
        })
      );
  }

  saveUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  getUser() {
    return this.currentUser();
  }

  logout() {
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }
}
