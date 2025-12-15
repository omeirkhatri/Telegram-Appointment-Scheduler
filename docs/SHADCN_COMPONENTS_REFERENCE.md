# Shadcn Components Reference

## Quick Reference for All Installed Components

This document provides a quick reference for all Shadcn UI components installed in the MediCare Scheduler application.

## Core Components

### Alert
**File:** `src/components/ui/alert.tsx`
**Exports:** `Alert`, `AlertDescription`, `AlertTitle`
**Required Props:** None
**Optional Props:** `className`, `variant`
**Example Import:**
```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';
```

### Alert Dialog
**File:** `src/components/ui/alert-dialog.tsx`
**Exports:** `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger`
**Required Props:** `open`, `onOpenChange`
**Optional Props:** `className`, `defaultOpen`
**Example Import:**
```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui';
```

### Avatar
**File:** `src/components/ui/avatar.tsx`
**Exports:** `Avatar`, `AvatarFallback`, `AvatarImage`
**Required Props:** None
**Optional Props:** `className`, `src`, `alt`, `fallback`
**Example Import:**
```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui';
```

### Badge
**File:** `src/components/ui/Badge.tsx`
**Exports:** `Badge`
**Required Props:** None
**Optional Props:** `variant`, `className`
**Example Import:**
```tsx
import { Badge } from '@/components/ui';
```

### Button
**File:** `src/components/ui/Button.tsx`
**Exports:** `Button`, `ButtonProps`
**Required Props:** None
**Optional Props:** `variant`, `size`, `disabled`, `className`
**Example Import:**
```tsx
import { Button } from '@/components/ui';
```

### Calendar
**File:** `src/components/ui/calendar.tsx`
**Exports:** `Calendar`
**Required Props:** None
**Optional Props:** `mode`, `selected`, `onSelect`, `className`
**Example Import:**
```tsx
import { Calendar } from '@/components/ui';
```

### Card
**File:** `src/components/ui/Card.tsx`
**Exports:** `Card`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`
**Required Props:** None
**Optional Props:** `className`
**Example Import:**
```tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui';
```

### Checkbox
**File:** `src/components/ui/checkbox.tsx`
**Exports:** `Checkbox`
**Required Props:** None
**Optional Props:** `checked`, `onCheckedChange`, `disabled`, `className`
**Example Import:**
```tsx
import { Checkbox } from '@/components/ui';
```

### Dialog
**File:** `src/components/ui/dialog.tsx`
**Exports:** `Dialog`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger`
**Required Props:** `open`, `onOpenChange`
**Optional Props:** `className`, `defaultOpen`
**Example Import:**
```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui';
```

### Dropdown Menu
**File:** `src/components/ui/dropdown-menu.tsx`
**Exports:** `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuTrigger`
**Required Props:** None
**Optional Props:** `open`, `onOpenChange`, `defaultOpen`
**Example Import:**
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui';
```

### Input
**File:** `src/components/ui/input.tsx`
**Exports:** `Input`, `InputProps`
**Required Props:** None
**Optional Props:** `type`, `placeholder`, `disabled`, `className`
**Example Import:**
```tsx
import { Input } from '@/components/ui';
```

### Label
**File:** `src/components/ui/label.tsx`
**Exports:** `Label`
**Required Props:** None
**Optional Props:** `htmlFor`, `className`
**Example Import:**
```tsx
import { Label } from '@/components/ui';
```

### Popover
**File:** `src/components/ui/popover.tsx`
**Exports:** `Popover`, `PopoverContent`, `PopoverTrigger`
**Required Props:** None
**Optional Props:** `open`, `onOpenChange`, `defaultOpen`
**Example Import:**
```tsx
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
```

### Radio Group
**File:** `src/components/ui/radio-group.tsx`
**Exports:** `RadioGroup`, `RadioGroupItem`
**Required Props:** None
**Optional Props:** `value`, `onValueChange`, `defaultValue`, `disabled`
**Example Import:**
```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui';
```

### Scroll Area
**File:** `src/components/ui/scroll-area.tsx`
**Exports:** `ScrollArea`, `ScrollBar`
**Required Props:** None
**Optional Props:** `className`, `orientation`
**Example Import:**
```tsx
import { ScrollArea, ScrollBar } from '@/components/ui';
```

### Select
**File:** `src/components/ui/select.tsx`
**Exports:** `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
**Required Props:** None
**Optional Props:** `value`, `onValueChange`, `defaultValue`, `disabled`
**Example Import:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
```

### Separator
**File:** `src/components/ui/separator.tsx`
**Exports:** `Separator`
**Required Props:** None
**Optional Props:** `orientation`, `className`
**Example Import:**
```tsx
import { Separator } from '@/components/ui';
```

### Sheet
**File:** `src/components/ui/sheet.tsx`
**Exports:** `Sheet`, `SheetClose`, `SheetContent`, `SheetDescription`, `SheetFooter`, `SheetHeader`, `SheetOverlay`, `SheetPortal`, `SheetTitle`, `SheetTrigger`
**Required Props:** `open`, `onOpenChange`
**Optional Props:** `className`, `defaultOpen`
**Example Import:**
```tsx
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui';
```

### Switch
**File:** `src/components/ui/switch.tsx`
**Exports:** `Switch`
**Required Props:** None
**Optional Props:** `checked`, `onCheckedChange`, `disabled`, `className`
**Example Import:**
```tsx
import { Switch } from '@/components/ui';
```

### Table
**File:** `src/components/ui/table.tsx`
**Exports:** `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`
**Required Props:** None
**Optional Props:** `className`
**Example Import:**
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
```

### Tabs
**File:** `src/components/ui/tabs.tsx`
**Exports:** `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
**Required Props:** `defaultValue` or `value`
**Optional Props:** `onValueChange`, `orientation`, `className`
**Example Import:**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
```

### Textarea
**File:** `src/components/ui/textarea.tsx`
**Exports:** `Textarea`
**Required Props:** None
**Optional Props:** `placeholder`, `disabled`, `className`, `rows`
**Example Import:**
```tsx
import { Textarea } from '@/components/ui';
```

### Tooltip
**File:** `src/components/ui/tooltip.tsx`
**Exports:** `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger`
**Required Props:** None
**Optional Props:** `delayDuration`, `skipDelayDuration`, `disableHoverableContent`
**Example Import:**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
```

## Custom Components

### Filter Button
**File:** `src/components/ui/FilterButton.tsx`
**Exports:** `FilterButton`
**Required Props:** `onClick`, `isActive`
**Optional Props:** `count`, `className`
**Example Import:**
```tsx
import { FilterButton } from '@/components/ui';
```

### Filter Panel
**File:** `src/components/ui/FilterPanel.tsx`
**Exports:** `FilterPanel`, `FilterSection`
**Required Props:** `isOpen`, `onClose`
**Optional Props:** `className`
**Example Import:**
```tsx
import { FilterPanel, FilterSection } from '@/components/ui';
```

### View Toggle
**File:** `src/components/ui/ViewToggle.tsx`
**Exports:** `ViewToggle`, `ViewMode`
**Required Props:** `currentView`, `onViewChange`
**Optional Props:** `views`, `className`
**Example Import:**
```tsx
import { ViewToggle, ViewMode } from '@/components/ui';
```

## Layout Components

### App Layout
**File:** `src/components/layout/AppLayout.tsx`
**Exports:** `AppLayout`
**Required Props:** `children`
**Optional Props:** `className`
**Example Import:**
```tsx
import { AppLayout } from '@/components/layout';
```

### New Sidebar
**File:** `src/components/layout/NewSidebar.tsx`
**Exports:** `NewSidebar`
**Required Props:** None
**Optional Props:** None
**Example Import:**
```tsx
import { NewSidebar } from '@/components/layout';
```

### Page Header
**File:** `src/components/layout/PageHeader.tsx`
**Exports:** `PageHeader`
**Required Props:** `title`
**Optional Props:** `description`, `actions`, `className`
**Example Import:**
```tsx
import { PageHeader } from '@/components/layout';
```

## Utility Components

### Error Message
**File:** `src/components/ui/ErrorMessage.tsx`
**Exports:** `ErrorMessage`
**Required Props:** `error`
**Optional Props:** `variant`, `className`
**Example Import:**
```tsx
import { ErrorMessage } from '@/components/ui';
```

### Loading Overlay
**File:** `src/components/ui/LoadingOverlay.tsx`
**Exports:** `LoadingOverlay`
**Required Props:** `isLoading`
**Optional Props:** `message`, `className`
**Example Import:**
```tsx
import { LoadingOverlay } from '@/components/ui';
```

### Loading Button
**File:** `src/components/ui/LoadingButton.tsx`
**Exports:** `LoadingButton`
**Required Props:** `isLoading`
**Optional Props:** `children`, `onClick`, `className`
**Example Import:**
```tsx
import { LoadingButton } from '@/components/ui';
```

### Loading Spinner
**File:** `src/components/ui/LoadingSpinner.tsx`
**Exports:** `LoadingSpinner`
**Required Props:** None
**Optional Props:** `size`, `className`
**Example Import:**
```tsx
import { LoadingSpinner } from '@/components/ui';
```

### Loading Page
**File:** `src/components/ui/LoadingPage.tsx`
**Exports:** `LoadingPage`
**Required Props:** None
**Optional Props:** `message`, `className`
**Example Import:**
```tsx
import { LoadingPage } from '@/components/ui';
```

### Skeleton Loader
**File:** `src/components/ui/SkeletonLoader.tsx`
**Exports:** `SkeletonCard`, `SkeletonForm`, `SkeletonList`, `SkeletonLoader`, `SkeletonTable`
**Required Props:** None
**Optional Props:** `className`
**Example Import:**
```tsx
import { SkeletonCard, SkeletonForm, SkeletonList, SkeletonLoader, SkeletonTable } from '@/components/ui';
```

### Time Display
**File:** `src/components/ui/TimeDisplay.tsx`
**Exports:** `TimeDisplay`
**Required Props:** `time`
**Optional Props:** `format`, `timezone`, `className`
**Example Import:**
```tsx
import { TimeDisplay } from '@/components/ui';
```

### Time Picker
**File:** `src/components/ui/TimePicker.tsx`
**Exports:** `TimePicker`
**Required Props:** `value`, `onChange`
**Optional Props:** `disabled`, `className`
**Example Import:**
```tsx
import { TimePicker } from '@/components/ui';
```

### Virtualized Table
**File:** `src/components/ui/VirtualizedTable.tsx`
**Exports:** `VirtualizedTable`, `VirtualizedTableWithRef`, `VirtualizedTableColumn`, `VirtualizedTableProps`
**Required Props:** `data`, `columns`
**Optional Props:** `height`, `className`
**Example Import:**
```tsx
import { VirtualizedTable, VirtualizedTableWithRef } from '@/components/ui';
import type { VirtualizedTableColumn, VirtualizedTableProps } from '@/components/ui';
```

## Toast Components

### Toast
**File:** `src/components/ui/Toast.tsx`
**Exports:** `Toast`
**Required Props:** None
**Optional Props:** `variant`, `title`, `description`, `className`
**Example Import:**
```tsx
import { Toast } from '@/components/ui';
```

### Toast Container
**File:** `src/components/ui/ToastContainer.tsx`
**Exports:** `ToastProvider`, `useToastContext`
**Required Props:** None
**Optional Props:** None
**Example Import:**
```tsx
import { ToastProvider, useToastContext } from '@/components/ui';
```

## Error Handling

### Error Boundary
**File:** `src/components/ui/ErrorBoundary.tsx`
**Exports:** `ErrorBoundary`
**Required Props:** `children`
**Optional Props:** `fallback`, `onError`
**Example Import:**
```tsx
import { ErrorBoundary } from '@/components/ui';
```

## Keyboard Shortcuts

### Keyboard Shortcuts Help
**File:** `src/components/ui/KeyboardShortcutsHelp.tsx`
**Exports:** `KeyboardShortcutsHelp`, `useKeyboardShortcutsHelp`
**Required Props:** None
**Optional Props:** `shortcuts`, `className`
**Example Import:**
```tsx
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from '@/components/ui';
```

## Component Categories

### Form Components
- `Input` - Text input fields
- `Textarea` - Multi-line text input
- `Select` - Dropdown selection
- `Checkbox` - Boolean selection
- `RadioGroup` - Single selection from multiple options
- `Switch` - Toggle control
- `Label` - Form field labels
- `Button` - Form submission and actions

### Layout Components
- `Card` - Content containers
- `Separator` - Visual dividers
- `Sheet` - Side panels and drawers
- `Dialog` - Modal dialogs
- `AlertDialog` - Confirmation dialogs
- `Tabs` - Content organization
- `ScrollArea` - Custom scrollbars

### Display Components
- `Badge` - Status indicators
- `Alert` - Important messages
- `Avatar` - User profile images
- `Table` - Data display
- `Calendar` - Date selection
- `Tooltip` - Hover information
- `Popover` - Floating content

### Navigation Components
- `DropdownMenu` - Action menus
- `Tabs` - Content navigation
- `Button` - Action triggers

### Feedback Components
- `Toast` - Notifications
- `Alert` - Important messages
- `LoadingOverlay` - Loading states
- `LoadingSpinner` - Loading indicators
- `SkeletonLoader` - Loading placeholders

## Usage Patterns

### Form Pattern
```tsx
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Button } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Form Title</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="field">Field Label</Label>
      <Input id="field" type="text" />
    </div>
    <Button type="submit">Submit</Button>
  </CardContent>
</Card>
```

### Modal Pattern
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
      <DialogDescription>Modal description</DialogDescription>
    </DialogHeader>
    {/* Modal content */}
  </DialogContent>
</Dialog>
```

### Confirmation Pattern
```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui';

<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Action</AlertDialogTitle>
      <AlertDialogDescription>Are you sure?</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Confirm</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Drawer Pattern
```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui';

<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Drawer Title</SheetTitle>
      <SheetDescription>Drawer description</SheetDescription>
    </SheetHeader>
    {/* Drawer content */}
  </SheetContent>
</Sheet>
```

## Dependencies

### Required Packages
- `@radix-ui/react-*` - Core component primitives
- `class-variance-authority` - Component variant management
- `clsx` - Conditional class names
- `tailwind-merge` - Tailwind class merging
- `lucide-react` - Icon library

### CSS Dependencies
- Tailwind CSS - Utility-first CSS framework
- CSS custom properties for theming
- Shadcn base styles

## Installation Commands

All components were installed using:
```bash
npx shadcn@latest add [component-name] --yes
```

## File Structure

```
src/components/ui/
├── alert.tsx
├── alert-dialog.tsx
├── avatar.tsx
├── Badge.tsx
├── Button.tsx
├── calendar.tsx
├── Card.tsx
├── checkbox.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── input.tsx
├── label.tsx
├── popover.tsx
├── radio-group.tsx
├── scroll-area.tsx
├── select.tsx
├── separator.tsx
├── sheet.tsx
├── switch.tsx
├── table.tsx
├── tabs.tsx
├── textarea.tsx
├── tooltip.tsx
└── index.ts (exports all components)
```

---

*This reference is automatically maintained. Please update when adding new components.*
