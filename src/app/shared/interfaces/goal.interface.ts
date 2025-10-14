export interface Goal {
  id?: string | number;
  userId: string | number;
  title: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface GoalSummary {
  id: string | number;
  title: string;
  currentAmount?: number;
}
