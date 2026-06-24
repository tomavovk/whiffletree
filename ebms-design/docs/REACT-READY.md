# React-Ready Conventions

These prototypes will eventually be implemented as React apps (Vite + React Query + TanStack Router + shadcn/ui + Tailwind). The rules below make that conversion straightforward — follow them now so the HTML prototypes map cleanly to the final stack.

## Render Functions = Future Components

Every distinct UI piece should have its own render function. Name them like React components — `PascalCase` with a `render` prefix:

```js
function renderUserCard(user) { ... }
function renderUserList() { ... }
function renderUserForm() { ... }
function renderSidebar() { ... }
function renderDashboardStats() { ... }
```

Each render function should be self-contained: it receives data (or reads from the store) and returns/injects HTML. One render function = one future React component.

## Views = Future Routes

SPA views map directly to TanStack Router routes. Name and structure them accordingly:

| SPA view ID | Future route |
| --- | --- |
| `view-dashboard` | `/dashboard` |
| `view-users` | `/users` |
| `view-user-detail` | `/users/$userId` |
| `view-settings` | `/settings` |

If a view needs a parameter (like a user ID), pass it through the `navigate()` function and store it in the store:

```js
function navigate(page, params = {}) {
    // ... existing navigation logic ...
    if (params.id) store.set({ selectedId: params.id });
}

// Usage
navigate('user-detail', { id: 42 });
```

## Store Shape = Future API Cache

Structure store data as if it came from a REST API — this maps directly to React Query cache keys later:

```js
const store = createStore({
    // Each key = a future React Query query key
    // Arrays of objects with `id` — like API responses
    users: [
        { id: 1, name: 'Anna Lee', email: 'anna@example.com', role: 'admin' },
        { id: 2, name: 'Mark Chen', email: 'mark@example.com', role: 'user' },
    ],
    products: [
        { id: 1, title: 'Widget', price: 29.99, status: 'active' },
    ],

    // UI state — this becomes Zustand/local state in React, not React Query
    selectedUserId: null,
    searchTerm: '',
    filterStatus: 'all',
});
```

**Rules for store data shape:**
- Every entity has a numeric or string `id`
- Collections are always arrays (not objects/maps)
- Nest related data only when it's always fetched together (e.g., `user.address`), otherwise keep flat
- Separate server-like data (entities) from UI-only state (selections, filters)

## Action Functions = Future Mutations

CRUD action functions map to React Query mutations. Keep them separate from render logic:

```js
// These become useMutation hooks in React
function addUser(data) { store.set(s => ({ users: [...s.users, { id: Date.now(), ...data }] })); }
function updateUser(id, data) { store.set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...data } : u) })); }
function deleteUser(id) { store.set(s => ({ users: s.users.filter(u => u.id !== id) })); }
```

Group actions by entity at the top of the script, before render functions:

```
1. createStore() definition
2. Store initialization with seed data
3. Action functions (grouped by entity: user actions, product actions, etc.)
4. Render functions (grouped by view/component)
5. Event handlers and listeners
6. store.subscribe() calls
7. Initial render calls
8. navigate() and SPA logic
```

## shadcn/ui Component Hints

When building UI elements that have a direct shadcn equivalent, add a `data-component` attribute as a hint for the future implementation:

```html
<div data-comment="users-dialog" data-component="dialog">...</div>
<button data-comment="users-add-btn" data-component="button">Add User</button>
<table data-comment="users-table" data-component="table">...</table>
<input data-comment="users-search" data-component="input" />
<div data-comment="users-card-1" data-component="card">...</div>
<select data-comment="users-filter" data-component="select">...</select>
<div data-comment="users-tabs" data-component="tabs">...</div>
```

Common shadcn components to reference: `button`, `input`, `select`, `checkbox`, `radio-group`, `switch`, `slider`, `textarea`, `dialog`, `sheet`, `dropdown-menu`, `popover`, `tooltip`, `table`, `card`, `tabs`, `accordion`, `badge`, `avatar`, `alert`, `toast`, `separator`, `skeleton`, `pagination`, `breadcrumb`, `command`, `calendar`, `date-picker`, `form`.

Only add `data-component` when there's a clear 1:1 match. Don't force it on custom layouts.
