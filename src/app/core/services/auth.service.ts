import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, switchMap, tap, catchError, throwError } from 'rxjs';
import { User } from '../../shared/interfaces';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User as FirebaseUser, sendPasswordResetEmail } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { SnackbarService } from '../../shared/services/snackbar.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  // tolerant snackbar injection: many projects use show() or open()
  private snackbar = inject(SnackbarService) as any;
  private currentUser = signal<User | null>(null);
  user = this.currentUser.asReadonly();

  constructor() {

  // Diagnostics: initialized

    this.auth.onAuthStateChanged(async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        localStorage.removeItem('user');
        this.currentUser.set(null);
        return;
      }

      try {
        const userDoc = await getDoc(doc(this.firestore, `users/${fbUser.uid}`));
        const profileData = userDoc.exists() ? userDoc.data() : null;

        const userObj: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: profileData?.['name'] || fbUser.displayName || ''
        };

        localStorage.setItem('user', JSON.stringify(userObj));
        this.currentUser.set(userObj);
      } catch (err) {
        const userObj: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || ''
        };
        localStorage.setItem('user', JSON.stringify(userObj));
        this.currentUser.set(userObj);
      }
    });
  }

  // Register a new user (email/password) and optionally create a profile doc
  register(payload: { email: string; password: string; name?: string }) {
    return from(createUserWithEmailAndPassword(this.auth, payload.email, payload.password)).pipe(
      switchMap(async (cred) => {
        const uid = cred.user.uid;
        const profile = {
          uid,
          email: payload.email,
          name: payload.name || ''
        };
        await setDoc(doc(this.firestore, `users/${uid}`), profile, { merge: true });
        const userObj: User = { id: uid, email: payload.email, name: profile.name };
        localStorage.setItem('user', JSON.stringify(userObj));
        this.currentUser.set(userObj);
        return userObj;
      }),
      catchError(err => {
        // Registration error
        const errorMessage = err?.code === 'auth/email-already-in-use'
          ? 'This email is already registered. Please login instead.'
          : err?.message || 'Registration failed. Please try again.';
        // show snackbar if available using project SnackbarService API
        try {
          if (err?.code === 'auth/user-not-found') {
            if (this.snackbar?.info) this.snackbar.info(errorMessage);
            else if (this.snackbar?.error) this.snackbar.error(errorMessage);
          } else if (this.snackbar?.error) {
            this.snackbar.error(errorMessage);
          } else if (this.snackbar?.info) {
            this.snackbar.info(errorMessage);
          } else if (this.snackbar?.open) {
            this.snackbar.open(errorMessage, 'OK', { duration: 3500 });
          }
        } catch (e) {
          // Snackbar error
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }

  // Login with email/password
  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async (cred) => {
        const uid = cred.user.uid;
        const userDoc = await getDoc(doc(this.firestore, `users/${uid}`));

        // Read existing profile data (if any). If missing, attempt to create a
        // minimal profile doc so users whose Firestore was cleared can still login.
        let profileData = userDoc.exists() ? userDoc.data() : null;

        if (!profileData) {
          try {
            const profile = {
              uid,
              email: cred.user.email || email,
              name: ''
            };
            await setDoc(doc(this.firestore, `users/${uid}`), profile, { merge: true });
            profileData = profile;

            // Inform the user the profile was recreated (best-effort).
            try {
              const infoMsg = 'Account profile recreated. Welcome back!';
              if (this.snackbar?.info) this.snackbar.info(infoMsg);
              else if (this.snackbar?.open) this.snackbar.open(infoMsg, 'OK', { duration: 3500 });
            } catch (e) {
              // ignore snackbar errors
            }
          } catch (e) {
            // If we couldn't recreate the profile, sign out and surface an error
            try { await signOut(this.auth); } catch (er) { /* ignore */ }
            const msg = 'Account exists but profile missing and could not be recreated. Please contact support.';
            try {
              if (this.snackbar?.error) this.snackbar.error(msg);
            } catch (er) { /* ignore */ }
            throw new Error(msg);
          }
        }
        const userObj: User = {
          id: uid,
          email: cred.user.email || email,
          name: profileData?.['name'] || cred.user.displayName || ''
        };
        localStorage.setItem('user', JSON.stringify(userObj));
        this.currentUser.set(userObj);
        return userObj;
      }),
      catchError((err: any) => {
  // Login error
        // If the Auth user doesn't exist, prompt the user to register instead
        const errorMessage = err?.code === 'auth/user-not-found'
          ? 'No account found for this email. Please register.'
          : err?.code === 'auth/invalid-credential'
            ? 'Invalid email or password. Please check your credentials.'
            : err?.message || 'Login failed. Please try again.';

        // show snackbar if available
        try {
          if (this.snackbar?.show) this.snackbar.show(errorMessage);
          else if (this.snackbar?.open) this.snackbar.open(errorMessage);
        } catch (e) {
          // Snackbar error
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }



  resetPassword(email: string) {
    return from(sendPasswordResetEmail(this.auth, email)).pipe(
      catchError(err => {
        const errorMessage = err?.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : err?.message || 'Failed to send reset email.';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  logout() {
    return from(signOut(this.auth)).pipe(
      tap(() => {
        localStorage.removeItem('user');
        this.currentUser.set(null);
        this.router.navigate(['/']);
      })
    );
  }

  getUser(): User | null {
    return this.currentUser();
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;

  }
}
