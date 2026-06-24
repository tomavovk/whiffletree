# State & Data Management

These prototypes behave like real apps — full CRUD, filters, selections, form state — but with no backend. All data lives in memory and resets on page reload. That's fine.

## The Store

Use this vanilla JS store (Zustand-like pattern, no dependencies):

```js
function createStore(initialState) {
    let state = structuredClone(initialState);
    const listeners = new Set();
    return {
        get: () => state,
        set(updater) {
            state = typeof updater === 'function'
                ? updater(state)
                : { ...state, ...updater };
            listeners.forEach(fn => fn(state));
        },
        subscribe(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        }
    };
}
```

## Rules

- **In-memory only.** No `localStorage`, `sessionStorage`, or cookies. Data resets on reload — this is intentional.
- **One store per app.** Define it once at the top of the `<script>` block with all initial data (seed/mock data).
- **Store survives SPA navigation.** Since views are just toggled divs, the store stays alive across all views — no need to persist or restore state between pages.
- **Seed with realistic mock data.** Pre-populate the store with enough entries to make the UI look real (e.g., 5–10 users, a few products, etc.).
- **Full CRUD should work.** If the design shows a user list with add/edit/delete — all of those actions should actually work against the store and the UI should update.
- **Subscribe to re-render.** After mutating the store, the UI must reflect the change. Use `store.subscribe()` to trigger render functions.

## Example Usage

```js
// Define store with seed data
const store = createStore({
    users: [
        { id: 1, name: 'Anna Lee', email: 'anna@example.com' },
        { id: 2, name: 'Mark Chen', email: 'mark@example.com' },
    ],
    selectedUserId: null,
});

// Create
function addUser(name, email) {
    store.set(s => ({
        users: [...s.users, { id: Date.now(), name, email }]
    }));
}

// Update
function updateUser(id, updates) {
    store.set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, ...updates } : u)
    }));
}

// Delete
function deleteUser(id) {
    store.set(s => ({
        users: s.users.filter(u => u.id !== id),
        selectedUserId: s.selectedUserId === id ? null : s.selectedUserId
    }));
}

// UI sync
function renderUsers() {
    const { users } = store.get();
    document.querySelector('[data-comment="users-list"]').innerHTML =
        users.map(u => `<div data-comment="users-item-${u.id}">${u.name}</div>`).join('');
}

store.subscribe(renderUsers);
renderUsers(); // initial render
```

## What Belongs in the Store

| Data type | In store? | Example |
| --- | --- | --- |
| Entity collections (CRUD) | ✅ Yes | `users`, `products`, `orders` |
| UI selection state | ✅ Yes | `selectedUserId`, `activeTab` |
| Form drafts | ✅ Yes | `editingUser: { name: '...' }` |
| Filters / search query | ✅ Yes | `searchTerm`, `filterStatus` |
| SPA current page | ❌ No | Handled by `navigate()` |
| Pure visual toggles | ❌ No | Modal open/close — use class toggles |

---

# UI States

Every data-driven view should account for all possible states — not just the "happy path" with data. These are real design decisions that carry over to the React build.

## Required States

For any view that displays data from the store, implement these four states:

**1. Loading state** — shown briefly on initial render or when navigating to a view. Use CSS skeleton placeholders:

```css
.skeleton {
    background: linear-gradient(90deg, var(--color-border) 25%, transparent 50%, var(--color-border) 75%);
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border-radius: 4px;
}

@keyframes skeleton-pulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
```

```js
// Simulate loading on view navigation
function navigate(page, params = {}) {
    // ... existing logic ...
    showLoadingState(page);
    setTimeout(() => renderView(page), 300); // brief fake delay
}

function showLoadingState(page) {
    const container = document.getElementById('view-' + page);
    container.innerHTML = getSkeletonHTML(page);
}
```

Create skeleton layouts that roughly match the real content shape — a few rectangular bars for text, larger blocks for cards/images. Maps directly to shadcn's `skeleton` component later.

**2. Empty state** — shown when a collection has zero items. Always include a message and an action:

```html
<div data-comment="users-empty-state" data-component="card" class="empty-state">
    <div data-comment="users-empty-icon" class="empty-state-icon">👤</div>
    <h3 data-comment="users-empty-heading">No users yet</h3>
    <p data-comment="users-empty-text">Get started by adding your first user.</p>
    <button data-comment="users-empty-cta" data-component="button" onclick="openAddUserForm()">
        Add User
    </button>
</div>
```

```css
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
    color: var(--color-muted);
}

.empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
}
```

**3. Data state** — the normal view with data. This is what you'd build anyway.

**4. Error state** — shown when an action fails. Since we have no real API, use this for form validation errors:

```html
<div data-comment="users-form-error" data-component="alert" class="error-message" style="display: none;">
    <span data-comment="users-form-error-text">Please fill in all required fields.</span>
</div>
```

```css
.error-message {
    padding: 12px 16px;
    background: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid var(--color-error);
    border-radius: 6px;
    color: var(--color-error);
    font-size: 14px;
}
```

## Render Pattern

Structure render functions to handle all states:

```js
function renderUserList() {
    const { users, isLoading } = store.get();
    const container = document.querySelector('[data-comment="users-list-container"]');

    if (isLoading) {
        container.innerHTML = renderUserListSkeleton();
        return;
    }

    if (users.length === 0) {
        container.innerHTML = renderUserListEmpty();
        return;
    }

    container.innerHTML = users.map(u => renderUserCard(u)).join('');
}
```

## Form Validation

Validate before store actions. Show inline errors next to fields:

```js
function validateUserForm(data) {
    const errors = {};
    if (!data.name.trim()) errors.name = 'Name is required';
    if (!data.email.trim()) errors.email = 'Email is required';
    else if (!data.email.includes('@')) errors.email = 'Invalid email address';
    return { valid: Object.keys(errors).length === 0, errors };
}

function handleAddUser() {
    const data = getFormData();
    const { valid, errors } = validateUserForm(data);

    clearFormErrors();
    if (!valid) {
        showFormErrors(errors); // display inline error messages
        return;
    }

    addUser(data);
    closeForm();
}
```

This maps directly to react-hook-form + zod validation in the final React build.
