# Styling Workflow Context

Guides how CSS, SCSS, or styled-components should be applied and managed.

## Purpose
To maintain consistent, manageable, and scalable styling practices across the project.

## Guidelines
1. All styles must come from centralized theme tokens unless otherwise approved.
2. Keep styles co-located with components unless it harms maintainability.
3. Prefer utility-based CSS or design system tokens when possible. When new styling is needed or updates to existing convert to or use Tailwind CSS.
4. Use semantic variable names (e.g., `--primary-color`, not `--blue1`).
5. Avoid inline styles unless used for dynamic variables.
6. Maintain light/dark-mode consistency.
7. Record any major style refactors in the design notes section.

***