# Component Workflow Context

Handles modular and reusable UI logic creation within front-end frameworks (e.g., React).

## Purpose

To build and maintain well-structured, reusable, and testable components.

## Guidelines

1. Every component must be **pure**, predictable, and follow React’s best practices.
2. Use **functional components** with hooks; avoid mixing patterns.
3. Prop types and interfaces must be documented within the file.
4. Minimize prop drilling; use context or state stores where applicable.
5. Enforce consistent naming (PascalCase for components, camelCase for props).
6. Keep render logic, effects, and side effects separated logically.
7. Before refactoring, explain reasoning and expected outcome.
8. Verify each component’s interaction within the global UI hierarchy.
