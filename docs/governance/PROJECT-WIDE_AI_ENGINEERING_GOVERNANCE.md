# PROJECT-WIDE AI ENGINEERING GOVERNANCE

## Mandatory Instructions for Every AI Agent

This file is the permanent entry point and governing instruction for every AI agent working inside this repository.

These instructions apply to EVERY task, EVERY conversation, EVERY agent, and EVERY future modification, regardless of how simple or complex the user's request appears.

## 1. Mandatory Reference Documents

Before analyzing, planning, modifying, creating, reviewing, or implementing anything, you MUST locate and read the following documents in full:

- "AI_ENGINEERING_OPERATING_SYSTEM.md"
- "MASTER_DESIGN_SYSTEM_PLAN.md" (active repository UI/UX protocol & design system specification — designated by CTO governance decision alongside Section 3 Phase 06 of `AI_ENGINEERING_OPERATING_SYSTEM.md`; supersedes the missing `UI_UX_DESIGN_ENGINEERING_PROTOCOL.md`)

These documents are mandatory engineering references, not optional suggestions.

You MUST NOT assume that you remember their contents from previous conversations or previous tasks.

You MUST consult the actual current files in the repository.

## 2. Mandatory Pre-Task Procedure

At the beginning of EVERY new task:

- Identify the repository root.
- Locate both mandatory reference documents.
- Read their complete current contents.
- Extract the rules relevant to the requested task.
- Inspect the existing implementation and surrounding architecture before proposing changes.
- Identify affected features, dependencies, user flows, and potential regressions.
- Prepare an implementation approach consistent with both reference documents.

Do not start implementation before completing this procedure.

## 3. Task-Specific Application

Apply the Engineering Operating System to ALL software engineering tasks, including:

- Bug fixes
- New features
- Backend and API development
- Database changes
- Authentication and authorization
- Integrations
- Performance optimization
- Refactoring
- Testing
- Deployment
- Documentation

Apply the UI/UX Design Engineering Protocol whenever a task affects:

- User interfaces
- User experience
- Navigation
- Layouts
- Forms and tables
- Design systems
- Responsive behavior
- Accessibility
- Interaction patterns
- Visual consistency

For tasks involving both engineering and UI/UX, apply BOTH documents.

## 4. Missing or Inaccessible References

If either mandatory document is missing, inaccessible, empty, or unreadable:

- STOP before implementation.
- Do not silently skip the missing reference.
- Do not recreate its contents from memory.
- Report the exact missing file.
- Ask the user to restore or provide the document.

## 5. No Exceptions for Small Tasks

A request such as "change this button", "fix this page", "add a field", or "adjust this layout" does not exempt the agent from these instructions.

The depth of analysis may be proportional to the task's complexity, but the mandatory governance documents must always be consulted.

## 6. Existing Functionality Protection

Never remove, disable, replace, or simplify existing functionality merely to make implementation easier or the interface cleaner.

Preserve existing business rules, integrations, permissions, data integrity, workflows, and user capabilities unless the user explicitly authorizes a change.

## 7. No False Completion Claims

Never claim that a feature is complete, tested, working, or production-ready without appropriate verification.

Distinguish clearly between:

- Implemented
- Tested
- Verified
- Not tested
- Blocked

## 8. Required Task Acknowledgment

Before substantial implementation, briefly state:

- That both mandatory reference documents were located and read.
- Which engineering principles apply to the task.
- Whether the UI/UX protocol is relevant.
- The main existing-system areas that may be affected.

Do not unnecessarily repeat the entire documents in every response.

## 9. Governance Priority

These instructions establish the permanent project workflow.

The mandatory reference documents define the detailed engineering and UI/UX standards.

The user's explicit task defines the requested outcome.

Follow all three together. If instructions conflict, identify the conflict and seek clarification rather than silently ignoring a requirement.

### FINAL RULE: No task is exempt from project governance. Read the references first. Understand the existing system. Then act.
