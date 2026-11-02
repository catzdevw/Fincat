export type EntryType = 'INCOME' | 'EXPENSE';

export interface FinanceEntry {
  id: number;
  date: string;
  type: EntryType;
  category: string;
  subcategory: string | null;
  description: string;
  amount: number;
  createdAt: string;
}

export type EntryPayload = Pick<FinanceEntry, 'date' | 'type' | 'category' | 'subcategory' | 'description' | 'amount'>;

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface MonthSummary {
  month: number;
  income: number;
  expenses: number;
  balance: number;
}

export interface FinancialSummary {
  year: number;
  month: number | null;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;
  expenseCategories: CategoryTotal[];
  monthlyTotals: MonthSummary[];
}
