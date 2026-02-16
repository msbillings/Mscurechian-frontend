# Dark/Light Mode Implementation

## Overview

A comprehensive dark/light mode theme system has been implemented across all dashboards using a centralized theme store and reusable components.

## Features

### ✅ Theme Toggle Button

- Animated sun/moon icon toggle
- Smooth transitions
- Tooltip on hover
- Positioned in navbar of all dashboards

### ✅ Theme Persistence

- User preference saved to localStorage
- Automatically restored on page reload
- Synced across all dashboard pages

### ✅ Updated Dashboards

1. **Admin Dashboard** (`/admin`)
2. **Hospital Admin Dashboard** (`/hospital-admin`)
3. **Doctor Dashboard** (`/doctor`)
4. **Helpdesk Dashboard** (`/helpdesk`)

## Technical Implementation

### Theme Store (`stores/themeStore.ts`)

- Built with Zustand for state management
- Persists theme preference using `zustand/middleware/persist`
- Automatically applies theme to `document.documentElement`

### ThemeToggle Component (`components/ThemeToggle.tsx`)

- Reusable component with animated icons
- Uses Lucide React icons (Sun/Moon)
- Smooth CSS transitions

### CSS Variables (`app/globals.css`)

Theme variables that automatically switch:

- `--bg-color`: Page background
- `--card-bg`: Card backgrounds
- `--text-color`: Primary text color
- `--secondary-color`: Secondary text color
- `--border-color`: Border colors
- `--navbar-bg`: Navbar background
- `--sidebar-bg`: Sidebar background
- `--hover-bg`: Hover states
- `--accent-color`: Accent/primary color

## Color Palette

### Light Mode

- Background: `#f8fafc`
- Cards: `#ffffff`
- Text: `#0f172a`
- Borders: `#e2e8f0`

### Dark Mode

- Background: `#0a0a0a`
- Cards: `#111111`
- Text: `#f1f5f9`
- Borders: `#1e293b`

## Usage

Users can toggle between light and dark mode by:

1. Clicking the sun/moon icon in the navbar
2. Theme preference is instantly applied
3. Preference is saved and persists across sessions

## Development

To add theme support to new components:

```tsx
// Use CSS variables for colors
style={{
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  borderColor: 'var(--border-color)'
}}

// Or use Tailwind's dark: modifier
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
```

## Future Enhancements

- System preference detection
- Custom color themes
- Theme-specific icons/images
