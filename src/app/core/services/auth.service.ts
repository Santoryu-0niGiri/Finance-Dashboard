import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, delay, tap, map } from 'rxjs';
import { User } from '../../shared/interfaces';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebase = inject(FirebaseService);
  private router = inject(Router);

  private currentUser = signal<User | null>(null);
  user = this.currentUser.asReadonly();

  constructor() {
    const stored = localStorage.getItem('user');
    if (stored) {
      this.currentUser.set(JSON.parse(stored));
    }
  }

  register(user: Partial<User>): Observable<User> {
    return this.firebase.addUser(user).pipe(
      map(id => ({ ...user, id } as User))
    );
  }

  login(email: string, password: string): Observable<User[]> {
    return this.firebase.getUsers().pipe(
      map(users => users.filter(u => u.email === email && u.password === password)),
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
