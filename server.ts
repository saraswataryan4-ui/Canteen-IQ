import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  type RawModelRecommendedItem,
  validateModelRecommendations,
} from './src/utils/validateAssistantRecommendation.ts';
import type {
  GroupParticipantOrderSummary,
  Order,
  OrderLineItem,
  OrderStatus,
} from './src/types.ts';
import {
  cloneDefaultDemoOrders,
  ORDER_STATUS_LIST,
} from './src/data/defaultOrders.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const GEMMA_MODEL_ID = 'gemma-4-26b-a4b-it';
const MAX_GEMMA_ATTEMPTS = 3; // 1 initial attempt + up to 2 transient retries
const PER_ATTEMPT_TIMEOUT_MS = 50000;
const TRANSIENT_HTTP_STATUSES = new Set([408, 500, 502, 503, 504]);

interface ClientMenuSnapshotItem {
  id: string;
  name: string;
  price: number;
  category: string;
  prepMinutes: number;
  stock: number;
  isAvailable: boolean;
  dietaryNote?: string;
}

interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

interface AssistantChatRequestBody {
  message?: string;
  history?: ChatHistoryTurn[];
  menuItems?: ClientMenuSnapshotItem[];
}

interface ParsedGemmaJson {
  reply?: string;
  recommendedItems?: RawModelRecommendedItem[];
  items?: RawModelRecommendedItem[];
  prepNote?: string;
}

interface SanitizedAttemptDiagnostic {
  requestId: string;
  timestamp: string;
  model: string;
  attemptsUsed: number;
  ok: boolean;
  upstreamStatus?: number;
  latencyMs: number;
  errorCode?: string;
  sanitizedError?: string;
}

const recentDiagnostics: SanitizedAttemptDiagnostic[] = [];

function recordDiagnostic(entry: SanitizedAttemptDiagnostic) {
  recentDiagnostics.unshift(entry);
  if (recentDiagnostics.length > 10) {
    recentDiagnostics.pop();
  }
}

// ============================================================================
// Shared In-Memory Demo Order Store (Authoritative for active server process)
// ============================================================================
const VALID_ORDER_STATUSES = new Set<string>(ORDER_STATUS_LIST);

let serverOrders: Order[] = cloneDefaultDemoOrders();

function isValidOrderStatus(val: unknown): val is OrderStatus {
  return typeof val === 'string' && VALID_ORDER_STATUSES.has(val);
}

function sanitizeOrderPayload(raw: unknown): Order | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  const token = typeof obj.token === 'string' ? obj.token.trim() : '';
  const studentName =
    typeof obj.studentName === 'string' ? obj.studentName.trim() : '';
  const rollNumber =
    typeof obj.rollNumber === 'string' ? obj.rollNumber.trim() : '';
  const createdAt =
    typeof obj.createdAt === 'string' ? obj.createdAt.trim() : '';
  const totalAmount = Number(obj.totalAmount);
  const estimatedMinutes = Number(obj.estimatedMinutes);

  if (
    !id ||
    !token ||
    !studentName ||
    !rollNumber ||
    !isValidOrderStatus(obj.status) ||
    !Array.isArray(obj.items) ||
    !Number.isFinite(totalAmount) ||
    totalAmount < 0
  ) {
    return null;
  }

  const sanitizedItems: OrderLineItem[] = [];
  for (const li of obj.items) {
    if (!li || typeof li !== 'object') continue;
    const line = li as Record<string, unknown>;
    const menuItemId =
      typeof line.menuItemId === 'string' ? line.menuItemId.trim() : '';
    const name = typeof line.name === 'string' ? line.name.trim() : '';
    const unitPrice = Number(line.unitPrice);
    const quantity = Number(line.quantity);
    if (
      !menuItemId ||
      !name ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      continue;
    }
    sanitizedItems.push({ menuItemId, name, unitPrice, quantity });
  }

  if (sanitizedItems.length === 0) return null;

  return {
    id,
    token,
    studentName,
    rollNumber,
    items: sanitizedItems,
    totalAmount,
    status: obj.status,
    createdAt: createdAt || 'Just now',
    estimatedMinutes:
      Number.isFinite(estimatedMinutes) && estimatedMinutes >= 0
        ? estimatedMinutes
        : 5,
    tableId:
      typeof obj.tableId === 'string' && obj.tableId.trim()
        ? obj.tableId.trim()
        : undefined,
    notes:
      typeof obj.notes === 'string' && obj.notes.trim()
        ? obj.notes.trim()
        : undefined,
    isUserOrder: Boolean(obj.isUserOrder),
    isGroupOrder: Boolean(obj.isGroupOrder),
    groupCode:
      typeof obj.groupCode === 'string' && obj.groupCode.trim()
        ? obj.groupCode.trim()
        : undefined,
    groupParticipants: Array.isArray(obj.groupParticipants)
      ? (obj.groupParticipants as GroupParticipantOrderSummary[])
      : undefined,
  };
}

const DEFAULT_SERVER_MENU: ClientMenuSnapshotItem[] = [
  {
    id: 'item-samosa',
    name: 'Samosa',
    price: 20,
    category: 'Snacks',
    prepMinutes: 3,
    stock: 42,
    isAvailable: true,
  },
  {
    id: 'item-veg-sandwich',
    name: 'Veg Sandwich',
    price: 40,
    category: 'Sandwiches',
    prepMinutes: 5,
    stock: 28,
    isAvailable: true,
  },
  {
    id: 'item-masala-dosa',
    name: 'Masala Dosa',
    price: 50,
    category: 'South Indian',
    prepMinutes: 7,
    stock: 24,
    isAvailable: true,
  },
  {
    id: 'item-cold-coffee',
    name: 'Cold Coffee',
    price: 30,
    category: 'Beverages',
    prepMinutes: 4,
    stock: 35,
    isAvailable: true,
  },
];

function getConfiguredApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return trimmed;
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: PER_ATTEMPT_TIMEOUT_MS,
      // Disable hidden SDK internal retries so our explicit, logged 3-attempt loop controls retries cleanly
      retryOptions: {
        attempts: 1,
      },
    },
  });
}

function scrubSecrets(message: string, apiKey: string | null): string {
  if (!message) return 'Unknown Gemini API error.';
  let cleaned = message;
  if (apiKey && apiKey.length > 4) {
    cleaned = cleaned.split(apiKey).join('[REDACTED]');
  }
  cleaned = cleaned.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]');
  cleaned = cleaned.replace(/key=[0-9A-Za-z_-]{16,}/gi, 'key=[REDACTED]');
  return cleaned;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeMenuSnapshot(
  rawMenu: ClientMenuSnapshotItem[] | undefined
): ClientMenuSnapshotItem[] {
  if (!Array.isArray(rawMenu) || rawMenu.length === 0) {
    return DEFAULT_SERVER_MENU;
  }

  const sanitized: ClientMenuSnapshotItem[] = [];
  for (const item of rawMenu.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const price = Number(item.price);
    const prepMinutes = Number(item.prepMinutes);
    const stock = Number(item.stock);
    if (!id || !name || !Number.isFinite(price) || price <= 0) continue;

    sanitized.push({
      id,
      name,
      price,
      category: typeof item.category === 'string' ? item.category : 'Menu',
      prepMinutes:
        Number.isFinite(prepMinutes) && prepMinutes > 0 ? prepMinutes : 0,
      stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0,
      isAvailable: Boolean(item.isAvailable) && stock > 0,
    });
  }

  return sanitized.length > 0 ? sanitized : DEFAULT_SERVER_MENU;
}

/**
 * Compact prompt builder (~110 tokens) tailored for gemma-4-26b-a4b-it.
 * Note: gemma-4-26b-a4b-it rejects `systemInstruction` and `responseSchema` with HTTP 500 INTERNAL,
 * and uses built-in reasoning (`thinking: true`), so keeping menu context concise minimizes latency
 * and reduces transient upstream 500 errors.
 */
function buildCompactGemmaPrompt(
  menu: ClientMenuSnapshotItem[],
  historyTurns: ChatHistoryTurn[],
  studentMessage: string
): string {
  const compactMenu = menu
    .map((m) => {
      const stockTag =
        m.isAvailable && m.stock > 0 ? `stock:${m.stock}` : 'OUT_OF_STOCK';
      const prepTag = m.prepMinutes > 0 ? `~${m.prepMinutes}m` : 'prep:est';
      return `${m.id}="${m.name}" ₹${m.price} (${prepTag}, ${stockTag})`;
    })
    .join('; ');

  const recentHistory =
    historyTurns.length > 0
      ? '\nContext:\n' +
        historyTurns
          .slice(-2)
          .map(
            (t) =>
              `${t.role === 'user' ? 'Student' : 'Assistant'}: ${t.text
                .replace(/\s+/g, ' ')
                .slice(0, 160)}`
          )
          .join('\n')
      : '';

  return [
    'You are the CanteenIQ campus food assistant. Reply in the student\'s language (English, Hindi, or Hinglish).',
    `Menu: ${compactMenu}`,
    'Rules: Recommend ONLY in-stock menu items using exact ₹ prices. Total cost must not exceed the student\'s budget, and prep time should fit their break. Never claim to place orders directly; tell them to add items to cart.',
    'Output ONLY valid JSON: {"reply":"concise 1-3 sentence answer","recommendedItems":[{"menuItemId":"item-id","quantity":1}],"prepNote":"short prep time note"}',
    recentHistory,
    `Student: ${studentMessage}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function extractJsonObject(rawText: string): ParsedGemmaJson | null {
  const trimmed = rawText.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFences) as ParsedGemmaJson;
  } catch {
    const firstBrace = withoutFences.indexOf('{');
    const lastBrace = withoutFences.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = withoutFences.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate) as ParsedGemmaJson;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function extractUpstreamStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const statusProp = (err as { status?: unknown }).status;
  if (typeof statusProp === 'number' && statusProp >= 100 && statusProp < 600) {
    return statusProp;
  }
  const codeProp = (err as { code?: unknown }).code;
  if (typeof codeProp === 'number' && codeProp >= 100 && codeProp < 600) {
    return codeProp;
  }
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/"code"\s*:\s*(4\d\d|5\d\d)/);
  if (match) {
    return Number(match[1]);
  }
  return undefined;
}

function isTransientGemmaError(
  err: unknown,
  upstreamStatus: number | undefined
): boolean {
  if (upstreamStatus !== undefined) {
    return TRANSIENT_HTTP_STATUSES.has(upstreamStatus);
  }
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('abort') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed') ||
    msg.includes('internal error') ||
    msg.includes('unavailable')
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '128kb' }));

  // ==========================================================================
  // Demo Orders API (Shared In-Memory Server State for 3s Student Polling & Staff Updates)
  // ==========================================================================
  app.get('/api/orders', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      ok: true,
      orders: serverOrders,
      updatedAt: new Date().toISOString(),
    });
  });

  app.post('/api/orders', (req: Request, res: Response) => {
    const incoming = sanitizeOrderPayload(
      (req.body as { order?: unknown } | undefined)?.order ?? req.body
    );
    if (!incoming) {
      res.status(400).json({
        ok: false,
        error: 'Invalid order payload.',
      });
      return;
    }

    const existingIdx = serverOrders.findIndex(
      (o) =>
        o.id === incoming.id ||
        o.token.toLowerCase() === incoming.token.toLowerCase()
    );

    if (existingIdx >= 0) {
      serverOrders = serverOrders.map((o, idx) =>
        idx === existingIdx ? incoming : o
      );
    } else {
      serverOrders = [incoming, ...serverOrders];
    }

    res.json({
      ok: true,
      order: incoming,
      orders: serverOrders,
      updatedAt: new Date().toISOString(),
    });
  });

  app.post('/api/orders/sync', (req: Request, res: Response) => {
    const rawList = (req.body as { orders?: unknown } | undefined)?.orders;
    if (Array.isArray(rawList)) {
      const missingClientOrders: Order[] = [];
      for (const rawItem of rawList.slice(0, 100)) {
        const sanitized = sanitizeOrderPayload(rawItem);
        if (!sanitized) continue;
        const existsOnServer = serverOrders.some(
          (o) =>
            o.id === sanitized.id ||
            o.token.toLowerCase() === sanitized.token.toLowerCase()
        );
        if (!existsOnServer) {
          missingClientOrders.push(sanitized);
        }
      }
      if (missingClientOrders.length > 0) {
        serverOrders = [...missingClientOrders, ...serverOrders];
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      orders: serverOrders,
      updatedAt: new Date().toISOString(),
    });
  });

  app.patch('/api/orders/:orderId/status', (req: Request, res: Response) => {
    const targetKey = decodeURIComponent(String(req.params.orderId || '')).trim();
    const nextStatus = (req.body as { status?: unknown } | undefined)?.status;

    if (!isValidOrderStatus(nextStatus)) {
      res.status(400).json({
        ok: false,
        error:
          'Invalid status. Allowed values: Received, Preparing, Ready, Collected.',
      });
      return;
    }

    const idx = serverOrders.findIndex(
      (o) =>
        o.id === targetKey ||
        o.token.toLowerCase() === targetKey.toLowerCase()
    );

    if (idx === -1) {
      res.status(404).json({
        ok: false,
        error: `Order "${targetKey}" not found in demo server queue.`,
      });
      return;
    }

    const updatedOrder: Order = {
      ...serverOrders[idx],
      status: nextStatus,
    };
    serverOrders = serverOrders.map((o, i) => (i === idx ? updatedOrder : o));

    res.json({
      ok: true,
      order: updatedOrder,
      orders: serverOrders,
      updatedAt: new Date().toISOString(),
    });
  });

  app.post('/api/orders/reset', (_req: Request, res: Response) => {
    serverOrders = cloneDefaultDemoOrders();
    res.json({
      ok: true,
      orders: serverOrders,
      updatedAt: new Date().toISOString(),
    });
  });

  // Check server-side Gemma 4 readiness and sanitized diagnostics (never exposes GEMINI_API_KEY)
  app.get('/api/assistant/status', (_req: Request, res: Response) => {
    const apiKey = getConfiguredApiKey();
    res.json({
      configured: Boolean(apiKey),
      model: GEMMA_MODEL_ID,
      maxAttempts: MAX_GEMMA_ATTEMPTS,
      recentDiagnostics: recentDiagnostics.slice(0, 5),
    });
  });

  // Live server-side Gemma 4 chat endpoint with compact context & bounded transient retry
  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const startedAt = Date.now();
    const apiKey = getConfiguredApiKey();

    // Note: Avoid HTTP 502/503/504 responses on /api/* because container Nginx intercepts 502/503/504 with warmup.html
    if (!apiKey) {
      console.error(
        `[CanteenIQ Gemma 4] req=${requestId} error=MISSING_API_KEY (GEMINI_API_KEY is unset or placeholder)`
      );
      res.status(500).json({
        ok: false,
        requestId,
        model: GEMMA_MODEL_ID,
        errorCode: 'MISSING_API_KEY',
        error:
          'Server GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Settings > Secrets to enable live Gemma 4 responses.',
      });
      return;
    }

    const body = (req.body ?? {}) as AssistantChatRequestBody;
    const rawMessage =
      typeof body.message === 'string' ? body.message.trim() : '';

    if (!rawMessage) {
      res.status(400).json({
        ok: false,
        requestId,
        model: GEMMA_MODEL_ID,
        errorCode: 'EMPTY_MESSAGE',
        error: 'Please enter a food request before sending.',
      });
      return;
    }

    if (rawMessage.length > 350) {
      res.status(400).json({
        ok: false,
        requestId,
        model: GEMMA_MODEL_ID,
        errorCode: 'MESSAGE_TOO_LONG',
        error: 'Please keep your request concise (under 350 characters).',
      });
      return;
    }

    const menuSnapshot = sanitizeMenuSnapshot(body.menuItems);
    const historyTurns = Array.isArray(body.history)
      ? body.history
          .filter(
            (t) =>
              t &&
              (t.role === 'user' || t.role === 'model') &&
              typeof t.text === 'string' &&
              t.text.trim().length > 0
          )
          .slice(-2)
      : [];

    const compactPrompt = buildCompactGemmaPrompt(
      menuSnapshot,
      historyTurns,
      rawMessage
    );

    const ai = createGeminiClient(apiKey);

    let lastError: unknown = null;
    let lastUpstreamStatus: number | undefined;
    let attemptsUsed = 0;

    for (let attempt = 1; attempt <= MAX_GEMMA_ATTEMPTS; attempt++) {
      attemptsUsed = attempt;
      const attemptStart = Date.now();

      try {
        console.info(
          `[CanteenIQ Gemma 4] req=${requestId} attempt=${attempt}/${MAX_GEMMA_ATTEMPTS} model=${GEMMA_MODEL_ID} promptChars=${compactPrompt.length} menuItems=${menuSnapshot.length}`
        );

        const response = await ai.models.generateContent({
          model: GEMMA_MODEL_ID,
          contents: compactPrompt,
          config: {
            temperature: 0.2,
          },
        });

        const modelText = response.text ?? '';
        const modelVersion = response.modelVersion || GEMMA_MODEL_ID;
        const responseId = response.responseId;
        const totalLatencyMs = Date.now() - startedAt;

        if (!modelText.trim()) {
          throw new Error(
            'Gemini API returned HTTP 200 with empty text candidate from Gemma 4.'
          );
        }

        const parsed = extractJsonObject(modelText);
        const replyProse =
          parsed && typeof parsed.reply === 'string' && parsed.reply.trim()
            ? parsed.reply.trim()
            : modelText.trim();

        const candidateItems = parsed?.recommendedItems ?? parsed?.items;

        // Deterministic application-side validation of items, prices, stock, and totals
        const validation = validateModelRecommendations(
          candidateItems,
          menuSnapshot,
          parsed?.prepNote
        );

        console.info(
          `[CanteenIQ Gemma 4] req=${requestId} ok=true attempt=${attempt}/${MAX_GEMMA_ATTEMPTS} latencyMs=${totalLatencyMs} responseId=${
            responseId ?? 'n/a'
          } validatedItems=${validation.recommendation?.items.length ?? 0}`
        );

        recordDiagnostic({
          requestId,
          timestamp: new Date().toISOString(),
          model: modelVersion,
          attemptsUsed: attempt,
          ok: true,
          upstreamStatus: 200,
          latencyMs: totalLatencyMs,
        });

        res.json({
          ok: true,
          requestId,
          model: GEMMA_MODEL_ID,
          modelVersion,
          responseId,
          attemptsUsed: attempt,
          latencyMs: totalLatencyMs,
          reply: replyProse,
          recommendation: validation.recommendation,
          validationSummary: {
            validatedByApp: true,
            droppedInvalidItems: validation.droppedInvalidItems,
            adjustedQuantities: validation.adjustedQuantities,
          },
        });
        return;
      } catch (err: unknown) {
        lastError = err;
        lastUpstreamStatus = extractUpstreamStatus(err);
        const attemptMs = Date.now() - attemptStart;
        const safeErrText = scrubSecrets(
          err instanceof Error ? err.message : String(err),
          apiKey
        );
        const canRetry =
          attempt < MAX_GEMMA_ATTEMPTS &&
          isTransientGemmaError(err, lastUpstreamStatus);

        console.error(
          `[CanteenIQ Gemma 4 Error] req=${requestId} attempt=${attempt}/${MAX_GEMMA_ATTEMPTS} upstreamStatus=${
            lastUpstreamStatus ?? 'network/timeout'
          } attemptMs=${attemptMs} willRetry=${canRetry} detail=${safeErrText}`
        );

        if (!canRetry) {
          break;
        }

        const backoffMs =
          1200 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 350);
        await sleep(backoffMs);
      }
    }

    const totalFailedMs = Date.now() - startedAt;
    const rawFinalErr =
      lastError instanceof Error ? lastError.message : String(lastError);
    const safeDetails = scrubSecrets(rawFinalErr, apiKey);
    const upstreamCode = lastUpstreamStatus ?? 500;

    let friendlyError = `Gemma 4 (${GEMMA_MODEL_ID}) experienced a temporary upstream error on the Gemini API after ${attemptsUsed} ${
      attemptsUsed === 1 ? 'attempt' : 'attempts'
    }. Please wait a few seconds and click Retry.`;

    if (upstreamCode === 429 || safeDetails.toLowerCase().includes('quota')) {
      friendlyError =
        'The Gemini API rate limit or quota for Gemma 4 was temporarily reached. Please wait 15–30 seconds and click Retry.';
    } else if (
      upstreamCode === 401 ||
      upstreamCode === 403 ||
      safeDetails.toLowerCase().includes('api key not valid') ||
      safeDetails.toLowerCase().includes('permission_denied')
    ) {
      friendlyError =
        'The server GEMINI_API_KEY was rejected by the Gemini API. Please check your key in the Settings > Secrets panel.';
    } else if (upstreamCode === 404) {
      friendlyError = `Model "${GEMMA_MODEL_ID}" is not available for the configured API key or endpoint.`;
    } else if (upstreamCode === 400) {
      friendlyError =
        'The request could not be processed by Gemma 4 (HTTP 400 Invalid Argument). Try a shorter, simpler question.';
    }

    recordDiagnostic({
      requestId,
      timestamp: new Date().toISOString(),
      model: GEMMA_MODEL_ID,
      attemptsUsed,
      ok: false,
      upstreamStatus: upstreamCode,
      latencyMs: totalFailedMs,
      errorCode: `GEMINI_API_${upstreamCode}`,
      sanitizedError: safeDetails.slice(0, 240),
    });

    // Map 502/503/504 to 500 on Express response so container Nginx does not intercept JSON with warmup.html
    const safeExpressStatus =
      upstreamCode === 400 ||
      upstreamCode === 401 ||
      upstreamCode === 403 ||
      upstreamCode === 404 ||
      upstreamCode === 429
        ? upstreamCode
        : 500;

    res.status(safeExpressStatus).json({
      ok: false,
      requestId,
      model: GEMMA_MODEL_ID,
      attemptsUsed,
      errorCode: `GEMINI_API_${upstreamCode}`,
      error: friendlyError,
      technicalDetails: `[req=${requestId}, attempts=${attemptsUsed}, upstream=${upstreamCode}] ${safeDetails.slice(
        0,
        240
      )}`,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.info(
      `[CanteenIQ Server] Listening on http://0.0.0.0:${PORT} | model=${GEMMA_MODEL_ID} | apiKeyConfigured=${Boolean(
        getConfiguredApiKey()
      )} | maxAttempts=${MAX_GEMMA_ATTEMPTS}`
    );
  });
}

startServer();
