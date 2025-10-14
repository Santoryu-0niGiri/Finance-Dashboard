import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { Goal } from '../../shared/interfaces';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.scss']
})
export class GoalsComponent implements OnDestroy {
  goalForm: FormGroup;
  goals: Goal[] = [];
  apiUrl = 'http://localhost:3000/goals';
  private queryParamsSubscription?: Subscription;
  
  // Edit mode properties
  isEditMode = false;
  editingGoalId: any = null;

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

  // Handle form submission (add or update)
  onSubmit() {
    if (!this.goalForm.valid) {
      alert('⚠️ Fill out all fields correctly.');
      return;
    }

    const user = this.getCurrentUser();
    if (!user) {
      alert('⚠️ You must be logged in.');
      return;
    }

    if (this.isEditMode) {
      this.updateGoal();
    } else {
      this.addGoal();
    }
  }
  
  // Add new goal
  private addGoal() {
    const user = this.getCurrentUser();
    const payload = { ...this.goalForm.value, userId: user!.id };

    this.http.post<any>(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.goals = [...this.goals, res];
        this.resetForm();
        alert('✅ Goal added successfully!');
      },
      error: () => alert('⚠️ Error saving goal')
    });
  }
  
  // Update existing goal
  private updateGoal() {
    const payload = { ...this.goalForm.value };

    this.http.put<any>(`${this.apiUrl}/${this.editingGoalId}`, payload).subscribe({
      next: (res) => {
        const index = this.goals.findIndex(g => g.id === this.editingGoalId);
        if (index !== -1) {
          this.goals[index] = res;
        }
        this.cancelEdit();
        alert('✅ Goal updated successfully!');
      },
      error: () => alert('⚠️ Error updating goal')
    });
  }

  // ✅ Back button
  goBack() {
    this.router.navigate(['/dashboard/overview']);
  }

  ngOnDestroy() {
    this.queryParamsSubscription?.unsubscribe();
  }

  // New methods for the modernized UI
  getTotalSaved(): number {
    return this.goals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
  }

  getOverallProgress(): number {
    if (!this.goals.length) return 0;
    const totalTarget = this.goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalSaved = this.getTotalSaved();
    return totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  }

  getGoalProgress(goal: Goal): number {
    return goal.targetAmount > 0 ? Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100) : 0;
  }

  getRemainingAmount(goal: Goal): number {
    return Math.max(0, goal.targetAmount - (goal.currentAmount || 0));
  }

  trackByGoal(index: number, goal: Goal): any {
    return goal.id || index;
  }

  resetForm(): void {
    this.goalForm.reset({ currentAmount: 0 });
    this.isEditMode = false;
    this.editingGoalId = null;
  }
  
  cancelEdit(): void {
    this.resetForm();
  }

  editGoal(goal: Goal): void {
    this.isEditMode = true;
    this.editingGoalId = goal.id;
    this.goalForm.patchValue({
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount || 0,
      targetDate: goal.targetDate
    });
    this.scrollToForm();
  }

  deleteGoal(goalId: any): void {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    this.http.delete(`${this.apiUrl}/${goalId}`).subscribe({
      next: () => {
        this.goals = this.goals.filter(g => g.id !== goalId);
        alert('✅ Goal deleted successfully!');
      },
      error: () => alert('⚠️ Error deleting goal')
    });
  }

  scrollToForm(): void {
    const formElement = document.querySelector('.form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
