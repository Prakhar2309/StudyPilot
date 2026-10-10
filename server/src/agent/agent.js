import { GoogleGenerativeAI } from '@google/generative-ai';
import { toolRegistry, executeTool, toolNames } from './tools.js';

const MAX_TOOL_CALLS = 8;
const MODEL_NAME = 'gemini-1.5-flash';

/**
 * Build Gemini function declarations from tool registry.
 */
function buildFunctionDeclarations() {
  return Object.values(toolRegistry).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'OBJECT',
      properties: buildProperties(tool.inputSchema),
      required: getRequired(tool.inputSchema),
    },
  }));
}

function buildProperties(schema) {
  const shape = schema._def?.shape?.() || {};
  const props = {};
  for (const [key, field] of Object.entries(shape)) {
    const typeName = field._def?.typeName || '';
    if (typeName === 'ZodString') props[key] = { type: 'STRING', description: field.description || key };
    else if (typeName === 'ZodNumber') props[key] = { type: 'NUMBER', description: field.description || key };
    else if (typeName === 'ZodBoolean') props[key] = { type: 'BOOLEAN', description: field.description || key };
    else if (typeName === 'ZodEnum') props[key] = { type: 'STRING', enum: field._def.values, description: field.description || key };
    else if (typeName === 'ZodOptional' || typeName === 'ZodDefault') {
      const inner = field._def?.innerType || field._def?.type;
      if (inner) {
        const innerName = inner._def?.typeName || '';
        if (innerName === 'ZodString') props[key] = { type: 'STRING', description: field.description || key };
        else if (innerName === 'ZodNumber') props[key] = { type: 'NUMBER', description: field.description || key };
        else if (innerName === 'ZodBoolean') props[key] = { type: 'BOOLEAN', description: field.description || key };
        else if (innerName === 'ZodEnum') props[key] = { type: 'STRING', enum: inner._def.values };
        else props[key] = { type: 'STRING' };
      }
    } else {
      props[key] = { type: 'STRING' };
    }
  }
  return props;
}

function getRequired(schema) {
  const shape = schema._def?.shape?.() || {};
  return Object.entries(shape)
    .filter(([, field]) => {
      const t = field._def?.typeName;
      return t !== 'ZodOptional' && t !== 'ZodDefault';
    })
    .map(([k]) => k);
}

/**
 * AI-powered agent execution loop using Gemini function calling.
 */
export async function runAiAgent(db, userRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set — use demo mode instead');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    tools: [{ functionDeclarations: buildFunctionDeclarations() }],
    systemInstruction: `You are StudyPilot AI, an autonomous study planning assistant for college students.
Your role is to help students manage their academic workload by:
- Analyzing their subjects, topics, tasks, and deadlines
- Creating and revising personalized study schedules
- Tracking academic progress
- Prioritizing work based on urgency and difficulty

Always start by retrieving context before making plans.
Use tools to make actual changes to the student's data.
Provide clear, actionable advice. Be concise and encouraging.
Today's date: ${new Date().toISOString().split('T')[0]}`,
  });

  const trace = [];
  const messages = [{ role: 'user', parts: [{ text: userRequest }] }];

  let toolCallCount = 0;
  let finalResponse = '';

  const chat = model.startChat({ history: [] });

  let response = await chat.sendMessage(userRequest);
  let result = response.response;

  while (toolCallCount < MAX_TOOL_CALLS) {
    const functionCalls = result.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      finalResponse = result.text() || 'I have completed the requested actions.';
      break;
    }

    const toolResults = [];
    for (const call of functionCalls) {
      toolCallCount++;
      const toolName = call.name;
      const toolArgs = call.args || {};

      trace.push({ step: toolCallCount, tool: toolName, input: toolArgs, status: 'running' });

      if (!toolNames.includes(toolName)) {
        const errResult = { success: false, error: `Unknown tool: ${toolName}` };
        trace[trace.length - 1].status = 'error';
        trace[trace.length - 1].output = errResult;
        toolResults.push({ functionResponse: { name: toolName, response: errResult } });
        continue;
      }

      const execResult = await executeTool(db, toolName, toolArgs);
      trace[trace.length - 1].status = execResult.success ? 'success' : 'error';
      trace[trace.length - 1].output = execResult.result || execResult.error;

      toolResults.push({
        functionResponse: {
          name: toolName,
          response: execResult.success ? execResult.result : { error: execResult.error },
        },
      });
    }

    response = await chat.sendMessage(toolResults);
    result = response.response;
  }

  if (!finalResponse && toolCallCount >= MAX_TOOL_CALLS) {
    finalResponse = result.text() || 'Maximum tool calls reached. Here is what was accomplished so far.';
    trace.push({ step: toolCallCount + 1, tool: 'LIMIT_REACHED', input: {}, status: 'warning', output: 'Max tool calls reached' });
  }

  return { response: finalResponse, trace, tool_calls_made: toolCallCount, model: MODEL_NAME };
}

/**
 * Demo mode agent — deterministic scheduling without Gemini API.
 * Clearly labelled — never pretends to be AI-generated.
 */
export async function runDemoAgent(db, userRequest) {
  const request = userRequest.toLowerCase();
  const trace = [];
  let response = '';

  // Determine what the user wants
  if (request.includes('progress') || request.includes('summary') || request.includes('how am i doing')) {
    trace.push({ step: 1, tool: 'get_progress_summary', input: {}, status: 'running' });
    const result = await executeTool(db, 'get_progress_summary', {});
    trace[0].status = result.success ? 'success' : 'error';
    trace[0].output = result.result;

    if (result.success) {
      const d = result.result;
      response = `📊 **Academic Progress Summary** *(Demo Mode)*\n\n`
        + `**Tasks:** ${d.tasks.completed}/${d.tasks.total} completed (${d.tasks.completion_percentage}%)\n`
        + `**Topics:** ${d.topics.completed}/${d.topics.total} covered (${d.topics.completion_percentage}%)\n`
        + `**Study Hours:** ${d.study_hours}h logged\n`
        + `**Overdue Tasks:** ${d.tasks.overdue}\n\n`
        + (d.upcoming_deadlines.length > 0
          ? `**Upcoming Deadlines:**\n${d.upcoming_deadlines.map(t => `• ${t.title} (${t.subject}) — ${t.deadline}`).join('\n')}`
          : '');
    }
  } else if (request.includes('priorit') || request.includes('first') || request.includes('urgent') || request.includes('important')) {
    trace.push({ step: 1, tool: 'get_student_context', input: {}, status: 'running' });
    const ctx = await executeTool(db, 'get_student_context', {});
    trace[0].status = 'success'; trace[0].output = ctx.result;

    trace.push({ step: 2, tool: 'prioritize_tasks', input: { include_completed: false }, status: 'running' });
    const result = await executeTool(db, 'prioritize_tasks', { include_completed: false });
    trace[1].status = result.success ? 'success' : 'error';
    trace[1].output = result.result;

    if (result.success) {
      const top5 = result.result.ranked_tasks.slice(0, 5);
      response = `🎯 **Task Priority Ranking** *(Demo Mode)*\n\n`
        + top5.map((t, i) => `**${i + 1}. ${t.title}**\n   • Subject: ${t.subject_name} | Priority: ${t.priority.toUpperCase()} | Urgency: ${t.urgency}\n   • Deadline: ${t.deadline} (${t.days_until_deadline} days) | Est: ${t.estimated_hours}h`).join('\n\n')
        + `\n\n${result.result.summary}`;
    }
  } else if (request.includes('plan') || request.includes('schedule') || request.includes('tomorrow') || request.includes('session')) {
    const days = request.includes('week') ? 7 : request.includes('tomorrow') ? 2 : 3;
    const replace = request.includes('revise') || request.includes('redo') || request.includes('rebuild');

    trace.push({ step: 1, tool: 'get_student_context', input: {}, status: 'running' });
    await executeTool(db, 'get_student_context', {});
    trace[0].status = 'success';

    trace.push({ step: 2, tool: 'create_study_plan', input: { days_ahead: days, replace_existing: replace }, status: 'running' });
    const result = await executeTool(db, 'create_study_plan', { days_ahead: days, replace_existing: replace });
    trace[1].status = result.success ? 'success' : 'error';
    trace[1].output = result.result;

    if (result.success) {
      const sessions = result.result.sessions || [];
      response = `📅 **Study Plan Generated** *(Demo Mode)*\n\n`
        + `Created **${result.result.sessions_created} sessions** over the next ${days} days.\n\n`
        + (sessions.length > 0
          ? sessions.map(s => `• **${s.date}** ${s.start_time} — ${s.title} (${Math.round(s.duration_minutes / 60 * 10) / 10}h)`).join('\n')
          : 'No sessions could be scheduled — check your available time or pending tasks.');
    }
  } else if (request.includes('missed') || request.includes('revise') || request.includes('reschedule')) {
    trace.push({ step: 1, tool: 'revise_study_plan', input: { reason: userRequest, days_ahead: 3 }, status: 'running' });
    const result = await executeTool(db, 'revise_study_plan', { reason: userRequest, days_ahead: 3 });
    trace[0].status = result.success ? 'success' : 'error';
    trace[0].output = result.result;

    if (result.success) {
      const r = result.result;
      response = `🔄 **Study Plan Revised** *(Demo Mode)*\n\n`
        + `${r.message}\n\n`
        + `• Preserved: ${r.preserved_completed} completed sessions\n`
        + `• Cleared: ${r.cleared_scheduled} old scheduled sessions\n`
        + `• New sessions: ${r.sessions_created}`;
    }
  } else if (request.includes('mark') || request.includes('complete') || request.includes('done') || request.includes('finish')) {
    // Extract task name
    const match = userRequest.match(/(?:mark|complete|done|finished?)\s+(?:my\s+)?(.+?)(?:\s+as\s+(?:completed?|done))?$/i);
    const taskTitle = match?.[1]?.trim() || '';

    trace.push({ step: 1, tool: 'update_task_status', input: { task_title: taskTitle, status: 'completed' }, status: 'running' });
    const result = await executeTool(db, 'update_task_status', { task_title: taskTitle, status: 'completed' });
    trace[0].status = result.success ? 'success' : 'error';
    trace[0].output = result.result;

    if (result.success && result.result.success) {
      response = `✅ **Task Completed** *(Demo Mode)*\n\n${result.result.message}`;
    } else {
      response = `❌ *(Demo Mode)* Could not find task matching "${taskTitle}". Please check the task name and try again.`;
    }
  } else {
    // Default: show context + suggest actions
    trace.push({ step: 1, tool: 'get_student_context', input: {}, status: 'running' });
    const ctx = await executeTool(db, 'get_student_context', {});
    trace[0].status = 'success'; trace[0].output = ctx.result;

    trace.push({ step: 2, tool: 'prioritize_tasks', input: { include_completed: false }, status: 'running' });
    const prio = await executeTool(db, 'prioritize_tasks', { include_completed: false });
    trace[1].status = 'success'; trace[1].output = prio.result;

    const topTask = prio.result?.ranked_tasks?.[0];
    const overdueTasks = ctx.result?.tasks?.overdue || [];

    response = `👋 **StudyPilot AI — Demo Mode**\n\n`
      + `> ⚠️ This response was generated by **deterministic demo logic**, not a live AI model. Set GEMINI_API_KEY to enable real AI.\n\n`
      + `I analyzed your study context. Here's what I found:\n\n`
      + `• **Total incomplete tasks:** ${ctx.result?.tasks?.total_incomplete || 0}\n`
      + `• **Overdue tasks:** ${overdueTasks.length}\n`
      + (topTask ? `• **Top priority:** "${topTask.title}" — ${topTask.urgency} urgency\n` : '')
      + `\n**Try these commands:**\n`
      + `• "Plan my study schedule for tomorrow"\n`
      + `• "Which assignments should I finish first?"\n`
      + `• "Show my academic progress"\n`
      + `• "Mark [task name] as completed"`;
  }

  if (!response) {
    response = `*(Demo Mode)* I understood your request but couldn't generate a specific response. Try: "plan my schedule", "show progress", or "prioritize my tasks".`;
  }

  return {
    response,
    trace,
    tool_calls_made: trace.length,
    model: 'DEMO_MODE',
    is_demo: true,
  };
}
