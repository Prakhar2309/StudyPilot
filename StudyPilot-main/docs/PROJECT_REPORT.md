# 🎓 StudyPilot AI — College Project Report

## Course / Assignment: AI Agent Development
**Project Title**: StudyPilot AI — Autonomous Study Planning Agent  
**Submission Date**: October 2026  
**Status**: Completed, Fully Functional, and Tested  

---

## 1. Abstract
Balancing multiple academic courses, assignments, and exam deadlines presents a major organizational challenge for college students. Conventional scheduling tools remain static and require cumbersome manual maintenance. When students fall behind or miss a deadline, static schedules break down.

**StudyPilot AI** solves this problem by introducing an **Autonomous Agentic AI Architecture**. By combining large language models (Google Gemini) with a ReAct (Reasoning and Acting) execution loop and seven deterministic tools, the agent evaluates real-time task urgency, constructs conflict-free study schedules aligned with daily cognitive limits, and autonomously reschedules missed sessions when academic realities shift.

---

## 2. Key Objectives & Deliverables Met
- **Agentic Decision Making**: Agent actively queries context, runs mathematical urgency ranking, checks timetable availability, schedules sessions, and generates analytical reasoning.
- **Explainable Reasoning Traces**: Every tool invocation records inputs, outputs, status, and execution order displayed cleanly in the web UI.
- **Fail-Safe Autonomous Mode**: If no Gemini API key is supplied, a built-in deterministic heuristic engine takes over seamlessly, allowing full offline evaluation.
- **Modern Full-Stack Implementation**:
  - React 18 + Vite frontend with Tailwind CSS and responsive dark-theme design.
  - Express.js backend with JSON persistence, Zod schema validation, and health checks.
- **Rigorous Testing**: Unit test suite verifying all 7 agent tools, edge cases, and fallback mechanisms (100% pass rate).

---

## 3. Agent Toolset Summary

| # | Tool | Operational Role |
|---|---|---|
| 1 | `get_student_context` | Ingests current student preferences, active course list, and impending deadlines. |
| 2 | `prioritize_tasks` | Computes dynamic priority scores: `Score = BasePriority + DeadlineUrgency + DifficultyWeight`. |
| 3 | `create_study_plan` | Generates non-overlapping study blocks based on student daily hour limits and preferred study times. |
| 4 | `create_task` | Allows natural language task ingestion (e.g., "Add a Calculus homework due Friday"). |
| 5 | `update_task_status` | Natural language status updates (e.g., "I just finished my Operating Systems lab"). |
| 6 | `get_progress_summary` | Computes aggregate metrics, completion rates, and subject-specific coverage. |
| 7 | `revise_study_plan` | Recalibrates active schedules without overwriting previously completed sessions. |

---

## 4. Evaluation and Verification
- **Test Suite**: 16/16 Jest tests passed across all core modules.
- **Build Verification**: Vite production build succeeded with zero errors.
- **End-to-End Validation**: Tested via browser automation verifying dashboard stats, interactive agent chat, tool trace expansion, and task management.

---

## 5. Conclusion
StudyPilot AI demonstrates how agentic systems with access to deterministic tools bridge the gap between static productivity applications and conversational LLMs, offering a robust, responsive academic companion for modern students.
