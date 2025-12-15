# UI Component Guide

## Overview

This guide provides comprehensive documentation for the UI component system used in the MediCare Scheduler application. The system is built on Shadcn UI components with a consistent design language and accessibility-first approach.

## Design System

### Color Tokens

The application uses CSS custom properties for consistent theming:

```css
/* Primary Colors */
--primary: hsl(221.2 83.2% 53.3%);
--primary-foreground: hsl(210 40% 98%);

/* Secondary Colors */
--secondary: hsl(210 40% 96%);
--secondary-foreground: hsl(222.2 84% 4.9%);

/* Background Colors */
--background: hsl(0 0% 100%);
--foreground: hsl(222.2 84% 4.9%);

/* Card Colors */
--card: hsl(0 0% 100%);
--card-foreground: hsl(222.2 84% 4.9%);

/* Muted Colors */
--muted: hsl(210 40% 96%);
--muted-foreground: hsl(215.4 16.3% 46.9%);

/* Accent Colors */
--accent: hsl(210 40% 96%);
--accent-foreground: hsl(222.2 84% 4.9%);

/* Destructive Colors */
--destructive: hsl(0 84.2% 60.2%);
--destructive-foreground: hsl(210 40% 98%);

/* Border Colors */
--border: hsl(214.3 31.8% 91.4%);
--input: hsl(214.3 31.8% 91.4%);
--ring: hsl(221.2 83.2% 53.3%);
```

### Typography Scale

```css
/* Page Titles */
text-3xl font-bold           /* 30px, 700 weight */

/* Section Headings */
text-xl font-semibold        /* 20px, 600 weight */

/* Card Titles */
text-lg font-semibold        /* 18px, 600 weight */

/* Labels */
text-sm font-medium          /* 14px, 500 weight */

/* Body Text */
text-sm                      /* 14px, 400 weight */

/* Small Text */
text-xs                      /* 12px, 400 weight */
```

### Spacing System

```css
/* Card Padding */
p-6                          /* 24px padding */

/* Section Gaps */
space-y-6                    /* 24px vertical gap */
space-y-4                    /* 16px vertical gap */

/* Form Field Gaps */
space-y-2                    /* 8px vertical gap */

/* Button Spacing */
px-4 py-2                    /* 16px horizontal, 8px vertical */
px-6 py-3                    /* 24px horizontal, 12px vertical */
```

### Border Radius

```css
/* Default */
rounded-lg                   /* 8px radius */

/* Cards */
rounded-xl                   /* 12px radius */

/* Buttons */
rounded-md                   /* 6px radius */

/* Small Elements */
rounded-sm                   /* 2px radius */
```

### Shadow Levels

```css
/* Default Card Shadow */
shadow-sm                    /* Small shadow */

/* Elevated Elements */
shadow-lg                    /* Large shadow */

/* Modal/Dialog Shadows */
shadow-2xl                   /* Extra large shadow */
```

### Animation Standards

```css
/* Standard Transitions */
transition-colors duration-200
transition-all duration-300

/* Hover States */
hover:bg-[--accent]
hover:text-[--accent-foreground]

/* Focus States */
focus:outline-none focus:ring-2 focus:ring-[--ring]
```

## Component Usage Guide

### Buttons

**When to use:** Primary actions, form submissions, navigation

**Basic Example:**
```tsx
import { Button } from '@/components/ui';

<Button>Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="destructive">Delete Action</Button>
<Button variant="ghost" size="icon">
  <Icon className="h-4 w-4" />
</Button>
```

**Common Variants:**
- `default` - Primary actions
- `outline` - Secondary actions
- `destructive` - Delete/dangerous actions
- `ghost` - Subtle actions, icon buttons
- `link` - Text links

**Sizes:**
- `default` - Standard size
- `sm` - Small size
- `lg` - Large size
- `icon` - Square icon button

**Accessibility:** Buttons automatically include proper ARIA labels and keyboard navigation.

### Cards

**When to use:** Content containers, stats displays, information grouping

**Basic Example:**
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```

**Best Practices:**
- Use consistent padding (`p-6` for content)
- Include proper heading hierarchy
- Use `CardDescription` for subtitle text

### Inputs

**When to use:** Form fields, search boxes, data entry

**Basic Example:**
```tsx
import { Input, Label } from '@/components/ui';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="Enter your email" />
</div>
```

**Types:**
- `text` - Standard text input
- `email` - Email validation
- `password` - Password field
- `number` - Numeric input
- `search` - Search input

**Best Practices:**
- Always pair with `Label` component
- Use proper `id` and `htmlFor` attributes
- Include placeholder text for guidance

### Dialogs

**When to use:** Modals, forms, confirmations

**Basic Example:**
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

**Size Guidelines:**
- `max-w-sm` - Small modals (384px)
- `max-w-md` - Medium modals (448px)
- `max-w-lg` - Large modals (512px)
- `max-w-xl` - Extra large modals (576px)
- `max-w-2xl` - Very large modals (672px)
- `max-w-4xl` - Extra wide modals (896px)

### Alert Dialogs

**When to use:** Confirmations, destructive actions, important decisions

**Basic Example:**
```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui';

<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Sheets (Drawers)

**When to use:** Side panels, detail views, mobile navigation

**Basic Example:**
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

**Sides:**
- `left` - Left side drawer
- `right` - Right side drawer
- `top` - Top drawer
- `bottom` - Bottom drawer

### Selects

**When to use:** Dropdown selections, option picking

**Basic Example:**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Textareas

**When to use:** Multi-line text input, comments, descriptions

**Basic Example:**
```tsx
import { Textarea, Label } from '@/components/ui';

<div className="space-y-2">
  <Label htmlFor="description">Description</Label>
  <Textarea id="description" placeholder="Enter description" />
</div>
```

### Checkboxes

**When to use:** Boolean selections, multiple choice

**Basic Example:**
```tsx
import { Checkbox, Label } from '@/components/ui';

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>
```

### Radio Groups

**When to use:** Single selection from multiple options

**Basic Example:**
```tsx
import { RadioGroup, RadioGroupItem, Label } from '@/components/ui';

<RadioGroup defaultValue="option1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="r1" />
    <Label htmlFor="r1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="r2" />
    <Label htmlFor="r2">Option 2</Label>
  </div>
</RadioGroup>
```

### Switches

**When to use:** Toggle states, on/off controls

**Basic Example:**
```tsx
import { Switch, Label } from '@/components/ui';

<div className="flex items-center space-x-2">
  <Switch id="notifications" />
  <Label htmlFor="notifications">Enable notifications</Label>
</div>
```

### Tabs

**When to use:** Content organization, navigation within a page

**Basic Example:**
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    Overview content
  </TabsContent>
  <TabsContent value="details">
    Details content
  </TabsContent>
</Tabs>
```

### Badges

**When to use:** Status indicators, counts, labels

**Basic Example:**
```tsx
import { Badge } from '@/components/ui';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Alerts

**When to use:** Important messages, notifications, warnings

**Basic Example:**
```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui';

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>
```

## Layout Patterns

### Page Structure

```tsx
import { PageHeader } from '@/components/layout';

<>
  <PageHeader
    title="Page Title"
    description="Page description"
    actions={<Button>Action</Button>}
  />

  {/* Page content */}
  <div className="space-y-6">
    <Card>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  </div>
</>
```

### Sidebar + Content Layout

The application uses a consistent sidebar layout:

```tsx
import { AppLayout } from '@/components/layout';

<AppLayout>
  {/* Page content */}
</AppLayout>
```

### Responsive Breakpoints

```css
/* Mobile First Approach */
sm: 640px    /* Small devices */
md: 768px    /* Medium devices */
lg: 1024px   /* Large devices */
xl: 1280px   /* Extra large devices */
2xl: 1536px  /* 2X large devices */
```

## Form Patterns

### Label + Input Combination

```tsx
<div className="space-y-2">
  <Label htmlFor="field">Field Label</Label>
  <Input id="field" type="text" />
</div>
```

### Error Message Display

```tsx
import { ErrorMessage } from '@/components/ui';

{error && (
  <ErrorMessage error={error} variant="inline" />
)}
```

### Loading States

```tsx
import { LoadingOverlay } from '@/components/ui';

{isLoading && (
  <LoadingOverlay message="Loading..." isLoading={true} />
)}
```

### Submit Button Patterns

```tsx
<Button
  type="submit"
  disabled={isLoading || !isValid}
  className="w-full"
>
  {isLoading ? 'Submitting...' : 'Submit'}
</Button>
```

## Modal/Dialog Guidelines

### When to Use Each Type

- **Dialog** - Forms, content display, multi-step processes
- **AlertDialog** - Confirmations, destructive actions, important decisions
- **Sheet** - Side panels, detail views, mobile navigation

### Size Recommendations

- **Small (sm)** - Simple confirmations, quick forms
- **Medium (md)** - Standard forms, content display
- **Large (lg)** - Complex forms, data tables
- **Extra Large (xl+)** - Full-featured forms, dashboards

### Form Modal Pattern

```tsx
<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Form Title</DialogTitle>
      <DialogDescription>Form description</DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

### Confirmation Dialog Pattern

```tsx
<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Confirm Action</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to perform this action?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>
        Confirm
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Common Pitfalls

### ❌ Don't Do This

```tsx
// Don't mix custom modals with Shadcn Dialogs
<div className="fixed inset-0 bg-black/50">
  <div className="modal-content">
    {/* content */}
  </div>
</div>

// Don't use hardcoded colors
<div className="bg-blue-500 text-white">

// Don't skip labels
<input type="text" placeholder="Enter name" />

// Don't use improper semantic HTML
<div onClick={handleClick}>Click me</div>
```

### ✅ Do This Instead

```tsx
// Use Shadcn Dialog
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* content */}
  </DialogContent>
</Dialog>

// Use CSS variables
<div className="bg-[--primary] text-[--primary-foreground]">

// Always include labels
<Label htmlFor="name">Name</Label>
<Input id="name" type="text" placeholder="Enter name" />

// Use proper semantic HTML
<Button onClick={handleClick}>Click me</Button>
```

## Migration Guide

### Converting Old Components to Shadcn

1. **Identify the component type** (modal, form, button, etc.)
2. **Choose the appropriate Shadcn component**
3. **Update imports** to use Shadcn components
4. **Replace custom styling** with Shadcn classes
5. **Test functionality** and accessibility

### Checklist for New Features

- [ ] Use Shadcn components when available
- [ ] Include proper labels and ARIA attributes
- [ ] Test keyboard navigation
- [ ] Verify responsive behavior
- [ ] Check color contrast
- [ ] Test with screen readers

### Code Review Guidelines

- [ ] Components use Shadcn UI system
- [ ] Proper semantic HTML structure
- [ ] Accessibility attributes included
- [ ] Consistent spacing and typography
- [ ] Responsive design implemented
- [ ] Error states handled
- [ ] Loading states included

## Accessibility

### ARIA Labels and Roles

All Shadcn components include proper ARIA attributes:

```tsx
// Buttons automatically include proper roles
<Button aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

// Form inputs should be paired with labels
<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" aria-describedby="email-error" />
```

### Keyboard Navigation

- **Tab** - Navigate between interactive elements
- **Enter/Space** - Activate buttons and links
- **Escape** - Close modals and dialogs
- **Arrow keys** - Navigate within select components

### Screen Reader Support

- All components include proper semantic HTML
- Form inputs are properly labeled
- Status messages are announced
- Focus management is handled automatically

## Performance

### Bundle Size Optimization

- Shadcn components are tree-shakeable
- Only import components you use
- Use dynamic imports for heavy components

### Best Practices

```tsx
// ✅ Good - Import only what you need
import { Button, Dialog, DialogContent } from '@/components/ui';

// ❌ Avoid - Importing everything
import * as UI from '@/components/ui';
```

## Future Enhancements

### Planned Improvements

1. **Dark Mode Support** - Complete dark theme implementation
2. **Animation Library** - Framer Motion integration
3. **Data Table Component** - Advanced table with sorting/filtering
4. **Date Picker** - Comprehensive date selection component
5. **Rich Text Editor** - WYSIWYG editor for content creation

### Contributing

When adding new components:

1. Follow the established patterns
2. Include comprehensive documentation
3. Add accessibility features
4. Test across different screen sizes
5. Update this guide with new patterns

---

*This guide is maintained by the development team. Please update it when adding new components or patterns.*
