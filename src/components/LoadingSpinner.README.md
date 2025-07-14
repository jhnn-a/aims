# LoadingSpinner Component Usage Guide

## Overview
The `LoadingSpinner` component provides a customizable animated loading indicator that can be used across different pages and components in the application.

## Import
```javascript
import LoadingSpinner, { 
  TableLoadingSpinner, 
  FullPageLoadingSpinner, 
  ButtonLoadingSpinner, 
  CardLoadingSpinner 
} from "../components/LoadingSpinner";
```

## Basic Usage

### Default Loading Spinner
```javascript
<LoadingSpinner />
```

### Custom Loading Spinner
```javascript
<LoadingSpinner 
  size="large" 
  color="#2563eb" 
  text="Loading data..." 
  showText={true}
  backgroundColor="rgba(255, 255, 255, 0.9)"
/>
```

## Pre-built Variants

### Table Loading Spinner
Perfect for loading states in tables and data grids:
```javascript
<TableLoadingSpinner text="Loading employees..." />
```

### Full Page Loading Spinner
For full-page loading states:
```javascript
<FullPageLoadingSpinner text="Loading application..." />
```

### Button Loading Spinner
For loading states inside buttons:
```javascript
<ButtonLoadingSpinner size="small" color="#ffffff" />
```

### Card Loading Spinner
For loading states in cards and smaller components:
```javascript
<CardLoadingSpinner text="Loading content..." />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `string` | `'medium'` | Size of the spinner: `'small'`, `'medium'`, `'large'`, `'xlarge'` |
| `color` | `string` | `'#2563eb'` | Color of the spinner (hex, rgb, or css color) |
| `text` | `string` | `'Loading...'` | Text to display below the spinner |
| `showText` | `boolean` | `true` | Whether to show the loading text |
| `fullPage` | `boolean` | `false` | Whether to render as a full-page overlay |
| `backgroundColor` | `string` | `'transparent'` | Background color of the loading container |

## Size Configurations

- **Small**: 24px spinner, 14px text, 20px padding
- **Medium**: 48px spinner, 16px text, 40px padding  
- **Large**: 64px spinner, 18px text, 60px padding
- **XLarge**: 80px spinner, 20px text, 80px padding

## Usage Examples in Different Pages

### Assets Page
```javascript
// In table loading state
{loading ? (
  <TableLoadingSpinner text="Loading assets..." />
) : (
  <AssetsTable data={assets} />
)}
```

### Dashboard Page
```javascript
// In card loading state
{loadingStats ? (
  <CardLoadingSpinner text="Loading statistics..." />
) : (
  <StatisticsCard data={stats} />
)}
```

### Inventory Page
```javascript
// In full page loading state
{initializing ? (
  <FullPageLoadingSpinner text="Initializing inventory..." />
) : (
  <InventoryContent />
)}
```

### Button States
```javascript
<button disabled={saving}>
  {saving ? (
    <>
      <ButtonLoadingSpinner size="small" color="#ffffff" />
      <span style={{ marginLeft: 8 }}>Saving...</span>
    </>
  ) : (
    'Save Changes'
  )}
</button>
```

## Animation Features

- **Smooth Rotation**: CSS keyframe animation for spinner rotation
- **Pulsing Dots**: Animated dots after loading text
- **Fade In**: Smooth fade-in animation when component appears
- **Responsive**: Adapts to different screen sizes and containers

## Accessibility

- Uses proper color contrast ratios
- Semantic HTML structure
- Keyboard navigation friendly
- Screen reader compatible text

## Performance

- Lightweight CSS-only animations
- Minimal DOM manipulation
- Efficient re-rendering
- Lazy-loaded animations (injected only when needed)

## Customization

You can easily extend the component by:
1. Adding new size configurations
2. Creating custom color schemes
3. Adding new animation variants
4. Implementing theme support

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Internet Explorer 11+ (with polyfills)

## Tips

1. Use `TableLoadingSpinner` for consistent table loading states
2. Use `FullPageLoadingSpinner` for route transitions
3. Use `ButtonLoadingSpinner` for form submissions
4. Use `CardLoadingSpinner` for component-level loading
5. Always provide meaningful loading text for better UX
