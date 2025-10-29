import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { SnackbarService } from '../../shared/services/snackbar.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { Auth } from '@angular/fire/auth';
import { Goal } from '../../shared/interfaces';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../shared/services';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './goals.component.html',
  styleUrls: ['./goals.component.scss']
})
export class GoalsComponent implements OnDestroy {
  goalForm: FormGroup;
  goals: Goal[] = [];
  loading = inject(LoadingService);
  // Using Firestore via ApiService
  private queryParamsSubscription?: Subscription;
  private goalsSubscription?: Subscription;

  // Edit mode properties
  isEditMode = false;
  editingGoalId: any = null;

  // tolerant snackbar helper (tries .show() then .open())
  private showSnackbar(message: string) {
    try {
      const s: any = this.snackbar;
      if (s?.success && message.startsWith('✅')) s.success(message);
      else if (s?.error && (message.startsWith('⚠️') || /error|failed|invalid/i.test(message))) s.error(message);
      else if (s?.info) s.info(message);
      else if (s?.open) s.open(message, 'OK', { duration: 3000 });
      else console.warn('No snackbar implementation available to show message:', message);
    } catch (e) {
      /* snackbar show failed */
    }
  }

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private afAuth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private snackbar: SnackbarService
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

    this.afAuth.onAuthStateChanged((fbUser) => {
      if (fbUser?.uid) {
        this.goalsSubscription?.unsubscribe();
        this.loading.show();
        this.goalsSubscription = this.api.getGoals(fbUser.uid).subscribe({
          next: (data) => { this.goals = data || []; this.loading.hide(); },
          error: () => { this.goals = []; this.loading.hide(); }
        });
      } else {
        this.goalsSubscription?.unsubscribe();
        this.goals = [];
      }
    });
  }

  loadGoals() {
    const fbUser = this.afAuth.currentUser;
    if (fbUser?.uid) {
      this.loading.show();
      this.api.getGoals(fbUser.uid).subscribe({
        next: (data) => { this.goals = data || []; this.loading.hide(); },
        error: () => { this.goals = []; this.loading.hide(); }
      });
    }
  }

  // Handle form submission (add or update)
  onSubmit() {
    if (!this.goalForm.valid) {
      this.showSnackbar('⚠️ Please fill out all required fields correctly.');
      return;
    }

    const user = this.getCurrentUser();
    if (!user) {
      this.showSnackbar('⚠️ Authentication required. Please log in.');
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

    this.api.addGoal(payload).subscribe({
      next: (res) => {
        this.goals = [...this.goals, res];
        this.resetForm();
        this.showSnackbar('✅ Goal created successfully!');
      },
      error: () => this.showSnackbar('⚠️ Failed to create goal. Please try again.')
    });
  }

  // Update existing goal
  private updateGoal() {
    const payload = { ...this.goalForm.value };

    this.api.updateGoal(this.editingGoalId, payload).subscribe({
      next: (res) => {
        const index = this.goals.findIndex(g => g.id === this.editingGoalId);
        if (index !== -1) {
          // ApiService returns the updated partial; merge to keep id
          this.goals[index] = { ...this.goals[index], ...(res as any) };
        }
        this.cancelEdit();
        this.showSnackbar('✅ Goal updated successfully!');
      },
      error: () => this.showSnackbar('⚠️ Failed to update goal. Please try again.')
    });
  }

  // ✅ Back button
  goBack() {
    this.router.navigate(['/dashboard/overview']);
  }

  ngOnDestroy() {
    this.queryParamsSubscription?.unsubscribe();
    this.goalsSubscription?.unsubscribe();
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

    this.api.deleteGoal(goalId).subscribe({
      next: () => {
        this.goals = this.goals.filter(g => g.id !== goalId);
        this.showSnackbar('✅ Goal deleted successfully!');
      },
      error: () => this.showSnackbar('⚠️ Failed to delete goal. Please try again.')
    });
  }

  scrollToForm(): void {
    const formElement = document.querySelector('.form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private getCurrentUser(): any | null {
    return this.afAuth.currentUser ? { id: this.afAuth.currentUser.uid } : null;
  }
}
