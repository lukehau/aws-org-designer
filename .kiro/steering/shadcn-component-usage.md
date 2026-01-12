# shadcn Component Usage Guidelines

## Core Principle
Always work with shadcn components as they're designed rather than trying to override their styling, unless explicitly stated otherwise.

## Key Rules

### 1. Respect Built-in CSS Selectors
- shadcn components come with carefully crafted CSS selectors that handle alignment, positioning, and styling
- Do NOT override these selectors with custom styles like:
  - `[&>svg]:top-3` (overriding icon positioning)
  - `[&>svg+div]:translate-y-0` (overriding text alignment)
  - Custom padding that conflicts with component design

### 2. Use Components as Intended
- Follow the standard shadcn component patterns and structure
- Let the component's built-in selectors work (e.g., `[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4` for icon positioning)
- Use the component's intended props and variants

### 3. Example: Alert Component
**❌ Don't do this:**
```tsx
<Alert className="py-2 [&>svg]:top-3 [&>svg+div]:translate-y-0">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription className="text-sm leading-4">
    Message
  </AlertDescription>
</Alert>
```

**✅ Do this:**
```tsx
<Alert className="text-sm">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    Message
  </AlertDescription>
</Alert>
```

### 4. When Customization is Needed
- Only add custom styles that don't conflict with the component's core functionality
- Use the `cn()` utility to merge classes properly
- Prefer using the component's built-in variants and props
- If extensive customization is needed, consider if you're using the right component

### 5. Debugging Alignment Issues
- Before adding custom CSS, check if the component is being used correctly
- Verify the component structure matches the shadcn documentation
- Remove any conflicting custom styles first
- Let the component's design system work as intended

## Component Selection and Installation Process

### 6. Always Check Existing Components First
When asked to create or add UI components, follow this mandatory process:

1. **Check existing project components**: First examine what shadcn components are already installed in the project
2. **Search shadcn registry**: Use the MCP shadcn server to search for suitable components before creating anything custom
3. **Install official components**: Always prefer installing official shadcn components using the MCP server
4. **Ask before custom implementation**: If no suitable shadcn component exists, you MUST explicitly ask: "Should I create a custom component implementation?" and wait for a "Yes" response

### 7. Custom Component Creation Rules
- Custom components should only be created when:
  - No suitable shadcn component exists
  - User explicitly confirms with "Yes" to create custom implementation
  - The custom component follows shadcn design patterns and styling conventions

## Benefits
- Consistent visual alignment across the application
- Easier maintenance and updates
- Better compatibility with shadcn updates
- Reduced CSS conflicts and unexpected behavior
- Cleaner, more maintainable code
- Proper use of official components ensures design system consistency