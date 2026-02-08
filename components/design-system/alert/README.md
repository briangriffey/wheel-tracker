# Alert Component

A flexible and accessible alert component for displaying contextual feedback messages with different severity levels.

## Features

- 🎨 **Four variants**: `info`, `success`, `warning`, `error`
- 🎯 **Semantic colors**: Automatically styled using the design system
- ✨ **Icons**: Each variant includes an appropriate icon
- ✅ **Dismissible**: Optional close button with callback
- ♿ **Accessible**: Includes proper ARIA attributes (`role="alert"`, `aria-live="polite"`)
- 🧩 **Composable**: Use `AlertTitle` and `AlertDescription` sub-components

## Usage

### Basic Alert

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/design-system/alert'

<Alert variant="info">
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>This is an informational message.</AlertDescription>
</Alert>
```

### Success Alert

```tsx
<Alert variant="success">
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>Your changes have been saved successfully.</AlertDescription>
</Alert>
```

### Warning Alert

```tsx
<Alert variant="warning">
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>Please review your settings before continuing.</AlertDescription>
</Alert>
```

### Error Alert

```tsx
<Alert variant="error">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Failed to save changes. Please try again.</AlertDescription>
</Alert>
```

### Dismissible Alert

```tsx
<Alert variant="success" dismissible onDismiss={() => console.log('Alert dismissed')}>
  <AlertTitle>Success!</AlertTitle>
  <AlertDescription>Your trade has been created.</AlertDescription>
</Alert>
```

### Alert with Only Title

```tsx
<Alert variant="info">
  <AlertTitle>Quick update available</AlertTitle>
</Alert>
```

### Alert with Custom Content

```tsx
<Alert variant="warning">
  <AlertTitle>Expiring Soon</AlertTitle>
  <AlertDescription>
    <p>You have 3 options expiring this week:</p>
    <ul className="mt-2 list-disc list-inside">
      <li>AAPL $150 Call - expires 2024-03-15</li>
      <li>MSFT $300 Put - expires 2024-03-16</li>
      <li>TSLA $200 Call - expires 2024-03-17</li>
    </ul>
  </AlertDescription>
</Alert>
```

## API Reference

### Alert

The main alert container component.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | The alert variant determining color scheme and icon |
| `dismissible` | `boolean` | `false` | Whether the alert can be dismissed |
| `onDismiss` | `() => void` | - | Callback function called when alert is dismissed |
| `className` | `string` | `''` | Additional CSS classes to apply |
| `children` | `ReactNode` | - | Alert content (typically `AlertTitle` and `AlertDescription`) |

### AlertTitle

Renders the title/heading of an alert.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes to apply |
| `children` | `ReactNode` | - | Title content |

### AlertDescription

Renders the description/body text of an alert.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes to apply |
| `children` | `ReactNode` | - | Description content |

## Accessibility

The Alert component includes proper accessibility attributes:

- `role="alert"`: Identifies the element as an alert
- `aria-live="polite"`: Announces changes to screen readers without interrupting
- `aria-hidden="true"`: Hides decorative icons from screen readers
- Screen reader text for dismiss button

## Design Tokens

The Alert component uses semantic colors from the design system:

- **Info**: Blue color scheme (`--color-info`)
- **Success**: Green color scheme (`--color-success`)
- **Warning**: Yellow color scheme (`--color-warning`)
- **Error**: Red color scheme (`--color-error`)

Colors are applied using the `getSemanticColor()` utility from `@/lib/design/colors`.

## Examples

### Form Validation

```tsx
const [error, setError] = useState<string | null>(null)

return (
  <form onSubmit={handleSubmit}>
    {error && (
      <Alert variant="error" dismissible onDismiss={() => setError(null)}>
        <AlertTitle>Validation Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}
    {/* form fields */}
  </form>
)
```

### Temporary Success Message

```tsx
const [showSuccess, setShowSuccess] = useState(false)

useEffect(() => {
  if (showSuccess) {
    const timer = setTimeout(() => setShowSuccess(false), 5000)
    return () => clearTimeout(timer)
  }
}, [showSuccess])

return (
  <>
    {showSuccess && (
      <Alert variant="success" dismissible onDismiss={() => setShowSuccess(false)}>
        <AlertTitle>Trade Created</AlertTitle>
        <AlertDescription>Your trade has been successfully recorded.</AlertDescription>
      </Alert>
    )}
  </>
)
```

## Testing

The Alert component includes comprehensive test coverage for:

- All variants rendering with correct styling
- Icons displaying for each variant
- Dismissible functionality
- Accessibility attributes
- Component composition
- Edge cases

Run tests with:

```bash
pnpm test components/design-system/alert
```
