# Blankspace Codex Instructions

## Project Snapshot
- **Product**: Blankspace – a highly customizable Farcaster client funded by Nouns DAO.
- **Core Concepts**: Spaces (customizable hubs), Tabs (layout blocks), Themes (visual skins), and Fidgets (mini-apps that augment a space).
- **Tech Stack**: Next.js (App Router), TypeScript, React, Tailwind CSS, Zustand (with mutative middleware), React Query, Axios, Supabase, Privy-based auth, and Wagmi/Viem for blockchain integrations.

## How to Work Effectively in This Repo
1. **Start with Research**
   - Use semantic/code search to find similar components, hooks, or Zustand stores before writing new code.
   - Review related tests to understand expected behaviour and data flow.
   - Reuse utilities from `src/common/lib`, constants, and hooks whenever possible.
2. **Maintain Established Patterns**
   - Follow the atomic design hierarchy for UI (`atoms`, `molecules`, `organisms`, `templates`, `pages`).
   - Keep fidgets self-contained under `src/fidgets/<category>/<name>` and implement the `FidgetModule` contract.
   - Model Zustand stores with clearly typed `StoreState` + `StoreActions`, default state objects, and mutative updates inside `set` callbacks.
   - Use React Query hooks for remote data access, ensuring loading/error/success states are surfaced in the UI.
3. **Coding Standards**
   - Write strict TypeScript with explicit interfaces/types; avoid `any`.
   - Prefer async/await for asynchronous flows and add meaningful error handling.
   - Compose Tailwind classes via established helpers like `mergeClasses` and respect theme tokens.
   - Keep naming consistent with existing modules and export types/functions that match surrounding conventions.
4. **Quality Checks**
   - Run `npm run lint` and `npm run check-types` before finalising work. If commands fail due to environment issues, document the failure in your summary.
   - Add or update tests where behaviour changes; colocate component tests in the relevant directory under `tests` when possible.
5. **Documentation Awareness**
   - Consult the documentation directory below when working on related features to align with architectural intentions.

## Documentation Directory
- **MINI_APP_DISCOVERY_SYSTEM.md** – Summarises how the mini-app discovery flow surfaces, installs, and manages Fidgets, including data sources, permission rules, and the lifecycle for discovery surfaces. Review when altering discovery UX, app catalogues, or Fidget onboarding logic.
- **PUBLIC_SPACES_PATTERN.md** – Details the pattern for public space composition, including space templates, access control, publishing workflows, and shared state between public viewers and owners. Use this when touching shared/public space layouts, publishing tools, or visibility rules.
- **SPACE_ARCHITECTURE.md** – Explains the overall space architecture: how spaces are structured, composed from Tabs and Fidgets, synchronised with Supabase, and rendered across devices. Reference this for any work on space loading, persistence, layout editing, or cross-device behaviours.

## Key Architectural Principles
- Keep business logic inside domain-specific modules (stores, services, hooks) rather than UI components.
- Guard blockchain interactions with thorough validation and error handling; mock providers in tests.
- Preserve responsiveness and performance by memoising expensive computations (`useMemo`, `useCallback`) and using list virtualisation when rendering large collections.
- Ensure authentication state follows the `SetupStep` lifecycle and integrate with the authenticator manager for platform-specific flows.
- Provide accessible UI: apply ARIA attributes, keyboard interactions, and semantic HTML across components.

## Boilerplate References
### Async/Await Pattern
```typescript
async function fetchData() {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}
```

### Component Skeleton
```typescript
import React from "react";
import { someUtility } from "@/common/lib/utils";

type ComponentProps = {
  prop1: string;
  prop2: number;
  onAction: () => void;
};

export function ComponentName({ prop1, prop2, onAction }: ComponentProps) {
  // Component logic here

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### Zustand Store Pattern
```typescript
interface StoreState {
  // State properties
}

interface StoreActions {
  // Action methods
}

type StoreType = StoreState & StoreActions;

const defaults: StoreState = {
  // Default values
};

export const createStore = (
  set: StoreSet<AppStore>,
  get: StoreGet<AppStore>,
): StoreType => ({
  ...defaults,
  // Implement actions with set((draft) => { ... }, "actionName")
});
```

## Workflow Checklist
1. Understand the feature/bug scope and review relevant docs.
2. Audit existing code paths for similar behaviour and reuse patterns.
3. Plan the change, identifying affected stores, hooks, or components.
4. Implement with strong types, clear separation of concerns, and consistent naming.
5. Update tests/docs as needed and run quality checks.
6. Prepare concise commits and PR descriptions explaining user impact and testing.

Keeping these guidelines current ensures Codex can efficiently ship high-quality features while respecting the established architecture.
