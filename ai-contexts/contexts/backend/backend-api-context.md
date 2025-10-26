# Backend API Workflow Context

For handling API routes, schema design, and backend integration.

## Purpose

To ensure API endpoints and data models remain secure, consistent, and high-quality.

## Guidelines

1. Use REST naming conventions (`GET /items`, `POST /items`).
2. Validate all inputs with schema definitions or middleware.
3. Add meaningful error handling (400, 404, 500 classification).
4. Avoid returning unnecessary fields to the client.
5. Confirm schema compatibility with frontend and database layers.
6. Document endpoints in API specs or OpenAPI files.
7. Ensure backwards compatibility on schema evolution.
8. Review route impacts before applying changes.

---
