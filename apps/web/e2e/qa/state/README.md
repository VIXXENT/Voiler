# QA Test State

This file explains the schema of `test-state.json`, which is written by the crawler and read
by the analyzer. It persists credentials and entity IDs across crawl runs so flows can be
replayed or extended without re-registering from scratch.

## Schema

```json
{
  "accounts": [
    {
      "email": "qa-run-1234567890@taskforge-qa.test",
      "password": "QaPass_1234567890!",
      "userId": "usr_abc123",
      "role": "owner",
      "notes": "Created in run 2026-04-15T10:00:00Z — primary QA account"
    }
  ],
  "projects": [
    {
      "id": "proj_xyz789",
      "name": "QA Test Project",
      "ownerId": "usr_abc123",
      "createdInRun": "2026-04-15T10:00:00Z",
      "notes": "Used for task and member crawl flows"
    }
  ],
  "tasks": [
    {
      "id": "task_def456",
      "title": "QA Test Task",
      "projectId": "proj_xyz789",
      "status": "todo",
      "createdInRun": "2026-04-15T10:00:00Z"
    }
  ],
  "lastUpdated": "2026-04-15T10:05:00Z"
}
```

## Field Descriptions

### accounts

Each entry represents a registered test user created during a crawl run.

| Field    | Type   | Description                                                   |
| -------- | ------ | ------------------------------------------------------------- |
| email    | string | Email address used to register                                |
| password | string | Plain-text password (QA only — never use real passwords here) |
| userId   | string | User ID returned by the API after registration                |
| role     | string | Role relative to the test project: "owner" or "member"        |
| notes    | string | Human-readable context about this account                     |

### projects

Each entry represents a project created during a crawl run.

| Field        | Type   | Description                                      |
| ------------ | ------ | ------------------------------------------------ |
| id           | string | Project ID as returned by the API                |
| name         | string | Project name used when creating it               |
| ownerId      | string | userId of the account that owns this project     |
| createdInRun | string | ISO timestamp of the crawl run that created this |
| notes        | string | Human-readable context                           |

### tasks

Each entry represents a task created during a crawl run.

| Field        | Type   | Description                                         |
| ------------ | ------ | --------------------------------------------------- |
| id           | string | Task ID as returned by the API                      |
| title        | string | Task title used when creating it                    |
| projectId    | string | ID of the project this task belongs to              |
| status       | string | Last known status: "todo", "in_progress", or "done" |
| createdInRun | string | ISO timestamp of the crawl run that created this    |

## Notes

- `test-state.json` is committed as an empty schema but populated entries are gitignored
  (the file itself is tracked; the populated version is overwritten locally on each run)
- If a run fails mid-way, partial state may be written — the next run will attempt to reuse
  existing accounts/projects before creating new ones
- The crawler overwrites `lastUpdated` on every run
