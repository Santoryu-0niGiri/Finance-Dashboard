# Finance Dashboard - Clean Architecture

## Project Structure

The project has been restructured following clean architecture principles with clear separation of concerns:

### Core Structure

```
src/app/
├── core/                    # Singleton services, guards, interceptors
│   ├── guards/             # Route guards
│   │   ├── auth.guard.ts
│   │   ├── login.guard.ts
│   │   └── index.ts
│   ├── services/           # Core singleton services
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   └── index.ts
│   └── index.ts
├── shared/                 # Reusable components, services, utilities
│   ├── enums/             # All enums
│   │   ├── selection-mode.enum.ts
│   │   ├── transaction-type.enum.ts
│   │   └── index.ts
│   ├── interfaces/        # TypeScript interfaces
│   │   ├── user.interface.ts
│   │   ├── transaction.interface.ts
│   │   ├── goal.interface.ts
│   │   ├── calendar.interface.ts
│   │   └── index.ts
│   ├── utils/             # Utility functions and helpers
│   │   ├── date.utils.ts
│   │   ├── category.utils.ts
│   │   └── index.ts
│   ├── services/          # Shared services
│   │   ├── snackbar.service.ts
│   │   ├── overview-store.service.ts
│   │   ├── theme.service.ts
│   │   └── index.ts
│   └── index.ts
├── auth/                   # Authentication components
├── dashboard/              # Dashboard feature components
└── app.routes.ts
```

## Key Improvements

### 1. **Enums & Types**
- `SelectionMode`: Calendar selection modes
- `TransactionType`: Income, expense, goals
- `CategoryType`: Predefined categories

### 2. **Interfaces**
- `User`: User data structure
- `Transaction`: Transaction data with proper typing
- `Goal`: Goal data structure
- `Category`: Category structure
- `CalendarDateEntry`: Calendar-specific interfaces

### 3. **Utilities**
- `DateUtils`: Date manipulation functions
- `CategoryUtils`: Category management utilities

### 4. **Services Organization**
- **Core Services**: `ApiService`, `AuthService` (singletons)
- **Shared Services**: `SnackbarService`, `OverviewStoreService`, `ThemeService`
- **Guards**: `AuthGuard`, `LoginGuard`

### 5. **Barrel Exports**
Easy imports with index files:
```typescript
// Instead of multiple imports
import { ApiService } from './core/services/api.service';
import { AuthService } from './core/services/auth.service';

// Use barrel exports
import { ApiService, AuthService } from './core';
```

## Benefits

1. **Maintainability**: Clear separation of concerns
2. **Reusability**: Shared utilities and services
3. **Type Safety**: Proper TypeScript interfaces
4. **Scalability**: Easy to add new features
5. **Clean Imports**: Barrel exports for cleaner code

## Usage Examples

### Importing Shared Resources
```typescript
import { Transaction, Goal, User } from '../shared/interfaces';
import { TransactionType, CategoryType } from '../shared/enums';
import { DateUtils, CategoryUtils } from '../shared/utils';
import { SnackbarService, ThemeService } from '../shared/services';
```

### Importing Core Resources
```typescript
import { ApiService, AuthService } from '../core/services';
import { AuthGuard, LoginGuard } from '../core/guards';
```

This architecture provides a solid foundation for the Finance Dashboard application with clean, maintainable, and scalable code structure.