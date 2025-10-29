export type SummaryDetail = {
  iso: string;
  txCount: number;
  goalCount: number;
  txs: any[];
  goals: any[];
};

export type SummaryDialogData = {
  scope: 'week' | 'month' | 'year';
  year?: number;
  month?: number;
  monthTitle?: string;
  selectedDate?: string | null;
  details: SummaryDetail[];
};
