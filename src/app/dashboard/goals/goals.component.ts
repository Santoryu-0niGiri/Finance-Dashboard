import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { Goal } from '../../shared/interfaces';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.scss']
})
export class GoalsComponent implements OnDestroy {
  goalForm: FormGroup;
  goals: Goal[] = [];
  apiUrl = 'http://localhost:3000/goals';
  private queryParamsSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.goalForm = this.fb.group({
      title: ['', Validators.required],
      targetAmount: [null, [Validators.required, Validators.min(1)]],
      currentAmount: [0, [Validators.required, Validators.min(0)]],
      targetDate: ['', Validators.required]
    });

    // check for date query parameter and set it
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.goalForm.patchValue({ targetDate: params['date'] });
      }
    });

    this.loadGoals();
  }

  // ✅ Load only current user's goals
  loadGoals() {
    const user = this.getCurrentUser();
    if (!user) {
      this.goals = [];
      alert('⚠️ Please log in again.');
      return;
    }

    this.http.get<any[]>(`${this.apiUrl}?userId=${user.id}`).subscribe({
      next: (data) => (this.goals = data),
      error: () => alert('⚠️ Error loading goals')
    });
  }

  // ✅ Add a new goal
  onSubmit() {
    if (!this.goalForm.valid) {
      alert('⚠️ Fill out all fields correctly.');
      return;
    }

    const user = this.getCurrentUser();
    if (!user) {
      alert('⚠️ You must be logged in to add a goal.');
      return;
    }

    const payload = { ...this.goalForm.value, userId: user.id };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.goals = [...this.goals, res];
        this.goalForm.reset({ currentAmount: 0 });
        alert('✅ Goal added successfully!');
      },
      error: () => alert('⚠️ Error saving goal')
    });
  }

  // ✅ Back button
  goBack() {
    this.router.navigate(['/dashboard/overview']);
  }

  ngOnDestroy() {
    this.queryParamsSubscription?.unsubscribe();
  }

  // helper
  private getCurrentUser(): any | null {
    try {
      const anyAuth: any = this.auth as any;
      if (typeof anyAuth.user === 'function') return anyAuth.user();
    } catch {}
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }
}
