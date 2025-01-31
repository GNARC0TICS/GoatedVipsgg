# Contributing Guidelines

## Code Style Guide

### TypeScript/JavaScript

1. **File Extensions**
   - Use `.tsx` for React components
   - Use `.ts` for non-React TypeScript files
   - Avoid using `.js` or `.jsx`

2. **Imports**
   - Use absolute imports with `@` alias for internal modules
   - Group imports in the following order:
     1. React and external libraries
     2. Internal components/hooks (@/components, @/hooks)
     3. Types and utilities (@/types, @/utils)
     4. Styles and assets

3. **TypeScript**
   - Always define proper types for props and state
   - Use interface for object types that can be implemented or extended
   - Use type for unions, intersections, and mapped types
   - Avoid using `any` type; use `unknown` if type is truly unknown

4. **React Components**
   - Use function components with TypeScript
   - Use proper prop typing with interface
   - Use hooks for state management
   - Always destructure props
   - Use proper key props in lists

5. **State Management**
   - Use React Query for server state
   - Use React Context for global UI state
   - Keep component state minimal and lifted as high as needed

### API and Backend

1. **Routes**
   - Use REST conventions for endpoints
   - Group related endpoints in separate route files
   - Use proper HTTP methods (GET, POST, PUT, DELETE)

2. **Database**
   - Use Drizzle ORM for database operations
   - Define clear schemas with proper types
   - Never write raw SQL queries

### Component Structure
```typescript
import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

interface Props {
  title: string
  onAction: () => void
}

export const ComponentName: FC<Props> = ({ title, onAction }) => {
  // hooks first
  const [state, setState] = useState<string>('')
  
  // queries next
  const { data } = useQuery({ ... })
  
  // effects after queries
  useEffect(() => {
    // effect content
  }, [])
  
  // handlers before render
  const handleClick = () => {
    onAction()
  }
  
  // render last
  return (
    <div>
      {/* JSX content */}
    </div>
  )
}
```

## Development Workflow

1. **Git Workflow**
   - Write descriptive commit messages
   - Keep commits atomic and focused
   - Follow conventional commits format

2. **Code Review**
   - All code changes must pass ESLint checks
   - Ensure proper type safety
   - Follow the component structure guide
   - Write and update tests when needed

3. **Documentation**
   - Document complex business logic
   - Add JSDoc comments for utilities and hooks
   - Keep README updated
   - Document API endpoints

## Pre-commit Hooks
The project uses husky and lint-staged to ensure code quality:
- ESLint runs on staged files
- Prettier formats code automatically
- TypeScript type checking runs before commit

## VS Code Setup
Install these extensions for the best development experience:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

Configure VS Code settings:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```
