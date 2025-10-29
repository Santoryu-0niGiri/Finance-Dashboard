export interface Goal {
  id?: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface GoalSummary {
  id: string;
  title: string;
  currentAmount?: number;
}
