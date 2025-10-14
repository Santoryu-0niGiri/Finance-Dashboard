import { Category } from '../interfaces';
import { CategoryType } from '../enums';

export class CategoryUtils {
  static readonly CATEGORY_OPTIONS: { [key: string]: Category[] } = {
    income: [
      { id: CategoryType.SALARY, name: 'Salary' },
      { id: CategoryType.ALLOWANCE, name: 'Allowance' }
    ],
    expense: [
      { id: CategoryType.FOOD, name: 'Food' },
      { id: CategoryType.RENT, name: 'Rent' },
      { id: CategoryType.TRANSPORT, name: 'Transport' },
      { id: CategoryType.UTILITIES, name: 'Utilities' },
      { id: CategoryType.OTHERS, name: 'Others' }
    ]
  };

  static getCategoriesForType(type: string): Category[] {
    return this.CATEGORY_OPTIONS[type] || [];
  }
}