# MediCare Scheduler - Source Code Structure

This document describes the organization and structure of the MediCare Scheduler source code.

## Folder Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Authentication pages (grouped)
│   ├── dashboard/         # Dashboard pages
│   ├── patients/          # Patient management pages
│   ├── staff/             # Staff management pages
│   ├── appointments/      # Appointment management pages
│   ├── payments/          # Payment pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable React components
│   ├── ui/               # Base UI components (buttons, inputs, etc.)
│   ├── layout/           # Layout components (header, sidebar, footer)
│   ├── forms/            # Form components
│   ├── modals/           # Modal and dialog components
│   └── calendar/         # Calendar-specific components
├── features/             # Feature-based components and logic
│   ├── patients/         # Patient feature components
│   ├── staff/            # Staff feature components
│   └── appointments/     # Appointment feature components
├── hooks/                # Custom React hooks
├── services/             # Business logic and external service integrations
├── lib/                  # Third-party library configurations
├── utils/                # Utility functions and helpers
├── types/                # TypeScript type definitions
├── constants/            # Application constants
├── styles/               # Additional CSS styles
└── api/                  # API route handlers (Next.js)
    ├── patients/         # Patient API routes
    ├── staff/            # Staff API routes
    ├── appointments/     # Appointment API routes
    └── webhooks/         # Webhook handlers
```

## Organization Principles

### 1. Feature-Based Organization
- Each major feature (patients, staff, appointments) has its own directory
- Feature directories contain components, hooks, and utilities specific to that feature
- This promotes modularity and makes the codebase easier to navigate

### 2. Separation of Concerns
- **Components**: Reusable UI components
- **Services**: Business logic and external integrations
- **Hooks**: Custom React hooks for state management
- **Utils**: Pure utility functions
- **Types**: TypeScript type definitions
- **Constants**: Application-wide constants

### 3. Clean Code Conventions
- Use descriptive, meaningful names for files and directories
- Group related functionality together
- Keep components small and focused
- Use index files for clean imports
- Follow consistent naming conventions

### 4. Scalability
- Structure supports easy addition of new features
- Clear separation makes it easy to find and modify code
- Modular design allows for independent development of features

## File Naming Conventions

- **Components**: PascalCase (e.g., `PatientForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `usePatients.ts`)
- **Utilities**: camelCase (e.g., `dateUtils.ts`)
- **Types**: PascalCase (e.g., `Patient.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Services**: camelCase (e.g., `patientService.ts`)

## Import Organization

1. React and Next.js imports
2. Third-party library imports
3. Internal component imports
4. Utility and service imports
5. Type imports

## Testing

- Test files are placed alongside the code they test
- Use `.test.ts` or `.test.tsx` extensions
- Follow the same directory structure as the source code

## Best Practices

1. **Keep components small and focused**
2. **Use TypeScript for type safety**
3. **Follow the single responsibility principle**
4. **Use meaningful variable and function names**
5. **Add comments for complex logic**
6. **Write tests for critical functionality**
7. **Use consistent formatting (ESLint + Prettier)**
