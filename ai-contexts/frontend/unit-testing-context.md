# Unit Testing Workflow Context

Defines how tests should be written, named, and maintained, ensuring predictable coverage.

## Purpose
To ensure new features and bug fixes are always validated through automated tests.

## Guidelines
1. Use either Jest + React Testing Library or the project’s standard testing framework.
2. Follow naming conventions: `<ComponentName>.test.js` or similar.
3. For every fix or feature, add or update corresponding tests.
4. Write atomic tests: one expectation per case.
5. Use descriptive test names reflecting user behavior, not implementation.
6. Avoid testing internal states; test what the user would observe.
7. Mock external calls and isolate DOM interactions properly.
8. Generate test coverage reports and flag untested logic.

***