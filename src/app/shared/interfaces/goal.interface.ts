export interface Goal {
  id?: number;
  userId: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface GoalSummary {
  id: string | number;
  title: string;
  currentAmount?: number;
}