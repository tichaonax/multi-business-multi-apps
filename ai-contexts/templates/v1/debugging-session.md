# Debugging Session Template

> **Template Type:** Bug Analysis & Resolution  
> **Version:** 1.0  
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For analyzing bugs, identifying causes, and proposing safe fixes.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents **IN THE EXACT ORDER LISTED BELOW**.

### Core Contexts (Load in this EXACT order - ONE AT A TIME)

**CRITICAL:** Read these files sequentially. Do not proceed to the next document until you have fully read and understood the previous one.

1. **FIRST:** `ai-contexts/master-context.md` - General principles and conventions
   - ⚠️ Contains critical instruction to read code-workflow.md
   - ⚠️ Defines operating principles
   - ⚠️ Contains mandatory workflow enforcement
   - ⚠️ Defines example adherence requirements

2. **SECOND:** `ai-contexts/code-workflow.md` - Standard workflow and task tracking
   - Contains MANDATORY workflow requirements
   - Requires creating project plan BEFORE any code changes
   - Defines approval checkpoint process

### Additional Core Context

- `ai-contexts/general-problem-solving-context.md` - Debugging methodology

### Module-Specific Contexts (Load based on bug location)

- `ai-contexts/frontend/component-context.md` - For UI/component bugs
- `ai-contexts/frontend/ui-context.md` - For styling/layout issues
- `ai-contexts/backend/backend-api-context.md` - For API/endpoint bugs
- `ai-contexts/backend/database-context.md` - For database-related issues
- `ai-contexts/testing/unit-testing-context.md` - For test failures

### Optional Contexts

- Domain-specific contexts for the affected module

**How to load:** Use the Read tool to load each relevant context document before beginning debugging.

---

## 🐛 Bug Report

<!-- Document the bug details before starting -->

**Ticket:** <!-- e.g., HPP-1234, or NOTKT if no ticket -->

**Bug Title:**

**Description:**

**Steps to Reproduce:**

1.
2.
3.

**Expected Behavior:**

**Actual Behavior:**

**Environment:**

- OS:
- Browser/Runtime:
- Version:

**Error Messages/Logs:**

```


```

---

## 🔍 Investigation Notes

<!-- Add debugging observations, hypotheses, or findings -->

**Potential Causes:**

**Related Code/Files:**

**Recent Changes:**

---

## 🧪 Testing Plan

<!-- Define how to verify the fix -->

**Test Cases:**

**Regression Tests:**

---

## 📝 Session Notes

<!-- Add any additional context or constraints -->

---

## ✅ Start Session

Ready to begin debugging. Please:

1. Analyze the bug report
2. Formulate hypotheses about the root cause
3. Suggest investigation steps
4. Propose potential solutions with trade-offs

---
