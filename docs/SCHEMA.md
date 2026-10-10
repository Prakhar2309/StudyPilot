# 📐 StudyPilot AI — System Architecture & Data Schema

This document details the architectural layout, data dictionary, entity-relationship diagrams, and agent tool execution contracts for **StudyPilot AI**.

---

## 1. System Architecture

```mermaid
graph TB
    subgraph "Client Layer (React 18 + Vite)"
        UI["Tailwind & CSS Modern Dark UI"]
        Pages["Dashboard | Agent Chat | Tasks | Planner | Progress | Activity"]
        APIClient["Axios API Client"]
        UI --> Pages
        Pages --> APIClient
    end

    subgraph "Server Layer (Node.js + Express)"
        Router["Express Router"]
        ZodVal["Zod Schema Validation Middleware"]
        ErrorHandler["Central Error Handling"]
        Router --> ZodVal
        Router --> ErrorHandler
    end

    subgraph "Agentic Decision Engine"
        AgentCore["ReAct Agent Loop"]
        Gemini["Google Gemini LLM"]
        Heuristic["Deterministic Rule Engine (Demo Mode)"]
        ToolRegistry["7 Validated Agent Tools"]
        
        AgentCore --> Gemini
        AgentCore --> Heuristic
        AgentCore <--> ToolRegistry
    end

    subgraph "Persistence Engine"
        JSONDB[("JSON File-Based Store / Disk Sync")]
        Seed["Auto Seeder"]
        JSONDB --> Seed
    end

    APIClient -->|HTTP REST| Router
    Router -->|Agent Queries| AgentCore
    ToolRegistry -->|Read/Write Operations| JSONDB
    Router -->|Direct CRUD| JSONDB
```

---

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    STUDENT_SETTINGS {
        string id PK
        number daily_hours
        string study_start_time
        string study_end_time
        number break_duration
        timestamp created_at
        timestamp updated_at
    }

    SUBJECTS ||--o{ TOPICS : contains
    SUBJECTS ||--o{ TASKS : assigns

    SUBJECTS {
        string id PK
        string name
        string color
        number target_hours_per_week
        timestamp created_at
    }

    TOPICS {
        string id PK
        string subject_id FK
        string title
        boolean completed
        timestamp created_at
    }

    TASKS ||--o{ STUDY_SESSIONS : generates

    TASKS {
        string id PK
        string subject_id FK
        string topic_id FK
        string title
        string deadline
        enum priority
        number estimated_hours
        enum status
        timestamp created_at
    }

    STUDY_SESSIONS {
        string id PK
        string task_id FK
        string title
        string date
        string start_time
        string end_time
        number duration_minutes
        enum status
        timestamp created_at
    }

    AGENT_RUNS ||--o{ AGENT_TOOL_CALLS : records

    AGENT_RUNS {
        string id PK
        string prompt
        string model
        string response
        boolean is_demo
        number tool_calls_count
        timestamp created_at
    }

    AGENT_TOOL_CALLS {
        string id PK
        string run_id FK
        string tool_name
        json input_args
        json output_result
        string status
        timestamp executed_at
    }
```

---

## 3. Data Dictionary

### `subjects`
- `id` (String, UUID) — Unique identifier for subject.
- `name` (String, 1-100 chars) — Academic course name (e.g., "Data Structures").
- `color` (String, Hex) — UI badge color (e.g., `#6366f1`).
- `target_hours_per_week` (Number) — Weekly target hours allocated.

### `topics`
- `id` (String, UUID) — Unique identifier for syllabus subtopic.
- `subject_id` (String, UUID) — Foreign key pointing to `subjects.id`.
- `title` (String, 1-150 chars) — Topic heading.
- `completed` (Boolean) — Whether topic mastery is complete.

### `tasks`
- `id` (String, UUID) — Unique task ID.
- `subject_id` (String, UUID) — Associated subject.
- `title` (String, 1-200 chars) — Task assignment name.
- `deadline` (String, YYYY-MM-DD) — Submission deadline date.
- `priority` (Enum) — `low` | `medium` | `high` | `critical`.
- `estimated_hours` (Number, 0.5-50) — Predicted study hours needed.
- `status` (Enum) — `pending` | `in_progress` | `completed`.

### `study_sessions`
- `id` (String, UUID) — Unique session identifier.
- `task_id` (String, UUID, optional) — Linked task.
- `title` (String) — Session description.
- `date` (String, YYYY-MM-DD) — Scheduled date.
- `start_time` (String, HH:MM) — Start time in 24hr format.
- `end_time` (String, HH:MM) — End time in 24hr format.
- `duration_minutes` (Number) — Length in minutes.
- `status` (Enum) — `scheduled` | `completed` | `missed`.

### `agent_runs` & `agent_tool_calls`
Tracks every query processed by the AI agent, capturing prompts, token usage, tool invocations, intermediate observations, and user-facing answers for full auditability.
