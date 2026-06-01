export const ANALYZE_WARM_EXPECTED_SECONDS = 15;

export type BoardGameDetection = { title: string; bgg_id: number };

export type AnalyzeImageRequest = {
  imageBase64: string;
  mimeType: string;
  analyzerBaseUrl: string;
  onRetry?: () => void;
  signal?: AbortSignal;
};

export type AnalyzeImageResult = {
  boardGames: BoardGameDetection[];
};

class AnalyzeHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AnalyzeHttpError';
    this.status = status;
  }
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 45_000;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'TypeError') return true;
  const message = error.message.toLowerCase();
  return message.includes('network') || message.includes('failed to fetch');
}

function mapAnalyzeError(status: number, serverMessage?: string): string {
  if (status === 413) {
    return serverMessage || 'Photo is too large. Try a closer crop or retake.';
  }
  if (status === 429) {
    return serverMessage || 'Analysis service is busy. Please retry.';
  }
  if (status === 504 || status === 502 || status === 503) {
    return 'Analysis timed out. Please retry.';
  }
  if (status >= 500) {
    return serverMessage || 'OpenAI service is temporarily unavailable. Please try again in a few minutes.';
  }
  return serverMessage || 'Failed to analyze image';
}

async function postAnalyze(
  req: AnalyzeImageRequest,
  attemptSignal: AbortSignal,
): Promise<AnalyzeImageResult> {
  const functionURL = `${req.analyzerBaseUrl}/.netlify/functions/analyze`;

  const res = await fetch(functionURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: req.imageBase64,
      mimeType: req.mimeType,
    }),
    signal: attemptSignal,
  });

  let payload: { error?: string; boardGames?: BoardGameDetection[] } = {};
  try {
    payload = await res.json();
  } catch {
    if (!res.ok) {
      throw new AnalyzeHttpError(mapAnalyzeError(res.status, res.statusText), res.status);
    }
    throw new Error('Invalid response from server. Please try again.');
  }

  if (!res.ok) {
    throw new AnalyzeHttpError(mapAnalyzeError(res.status, payload.error), res.status);
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  return {
    boardGames: Array.isArray(payload.boardGames) ? payload.boardGames : [],
  };
}

export async function analyzeImage(req: AnalyzeImageRequest): Promise<AnalyzeImageResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (req.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const attemptController = new AbortController();
    const timeoutId = setTimeout(() => attemptController.abort(), REQUEST_TIMEOUT_MS);

    const abortFromParent = () => attemptController.abort();
    req.signal?.addEventListener('abort', abortFromParent, { once: true });

    try {
      return await postAnalyze(req, attemptController.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (req.signal?.aborted) {
          throw error;
        }
        lastError = new Error('Analysis timed out. Please retry.');
      } else if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error('Failed to analyze image');
      }

      const isAttemptTimeout =
        error instanceof DOMException
        && error.name === 'AbortError'
        && !req.signal?.aborted;
      const isRetryableStatus =
        error instanceof AnalyzeHttpError && RETRYABLE_STATUS.has(error.status);
      const shouldRetry =
        attempt < MAX_ATTEMPTS - 1
        && (isRetryableStatus || isNetworkError(error) || isAttemptTimeout);

      if (!shouldRetry) {
        throw lastError;
      }

      req.onRetry?.();
      await delay(RETRY_DELAY_MS, req.signal);
    } finally {
      clearTimeout(timeoutId);
      req.signal?.removeEventListener('abort', abortFromParent);
    }
  }

  throw lastError ?? new Error('Failed to analyze image');
}
