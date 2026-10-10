import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { runAiAgent, runDemoAgent } from '../agent/agent.js';

const router = Router();

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
});

// POST /api/agent/chat
router.post('/chat', async (req, res) => {
  const result = ChatSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ success: false, error: 'Message is required' });
  }

  const { message } = result.data;
  const db = req.db;
  const isDemo = !process.env.GEMINI_API_KEY;

  let agentResult;
  try {
    if (isDemo) {
      agentResult = await runDemoAgent(db, message);
    } else {
      agentResult = await runAiAgent(db, message);
    }
  } catch (err) {
    console.error('[Agent Error]', err.message);
    // Fallback to demo on AI failure
    try {
      agentResult = await runDemoAgent(db, message);
      agentResult.ai_error = 'AI unavailable — using demo mode';
    } catch (demoErr) {
      return res.status(500).json({ success: false, error: 'Agent execution failed' });
    }
  }

  // Persist agent run
  const runId = uuidv4();
  const toolsUsed = agentResult.trace.map(t => t.tool).join(', ');
  try {
    db.prepare(
      'INSERT INTO agent_runs (id, user_request, tools_used, outcome, status, execution_trace) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      runId,
      message,
      JSON.stringify(agentResult.trace.map(t => t.tool)),
      agentResult.response.substring(0, 500),
      agentResult.trace.some(t => t.status === 'error') ? 'partial' : 'success',
      JSON.stringify(agentResult.trace)
    );
  } catch (e) {
    console.error('[Agent Run Persist Error]', e.message);
  }

  res.json({
    success: true,
    data: {
      run_id: runId,
      response: agentResult.response,
      trace: agentResult.trace,
      tool_calls_made: agentResult.tool_calls_made,
      model: agentResult.model,
      is_demo: agentResult.is_demo || false,
      ai_error: agentResult.ai_error,
    },
  });
});

// GET /api/agent/runs — recent agent runs
router.get('/runs', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const runs = req.db.prepare(
    'SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT ?'
  ).all(limit);

  const parsed = runs.map(r => ({
    ...r,
    tools_used: JSON.parse(r.tools_used || '[]'),
    execution_trace: JSON.parse(r.execution_trace || '[]'),
  }));

  res.json({ success: true, data: parsed });
});

// GET /api/agent/runs/:id
router.get('/runs/:id', (req, res) => {
  const run = req.db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(req.params.id);
  if (!run) return res.status(404).json({ success: false, error: 'Run not found' });
  res.json({
    success: true,
    data: {
      ...run,
      tools_used: JSON.parse(run.tools_used || '[]'),
      execution_trace: JSON.parse(run.execution_trace || '[]'),
    },
  });
});

// GET /api/agent/status
router.get('/status', (_req, res) => {
  res.json({
    success: true,
    data: {
      mode: process.env.GEMINI_API_KEY ? 'AI (Gemini)' : 'Demo',
      model: process.env.GEMINI_API_KEY ? 'gemini-1.5-flash' : 'DEMO_MODE',
      is_demo: !process.env.GEMINI_API_KEY,
    },
  });
});

export default router;
