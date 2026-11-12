import { useStore } from '../store';

const getHeaders = () => {
  const token = useStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/** A server request for identity confirmation (403 REAUTH_REQUIRED / REAUTH_UNAVAILABLE). */
export interface StepUpChallenge {
  action: string;
  methods: string[];
  reason: 'required' | 'invalid' | 'unavailable';
  message: string;
}
export type StepUpAnswer = { confirmPassword?: string; confirmCode?: string } | null;
type StepUpPrompt = (challenge: StepUpChallenge) => Promise<StepUpAnswer>;

let stepUpPrompt: StepUpPrompt | null = null;
/** Registered by <StepUpHost />; when absent, challenges surface as normal errors. */
export function setStepUpPrompt(fn: StepUpPrompt | null) {
  stepUpPrompt = fn;
}

class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorText = await res.text();
    let message = 'API Error';
    let data: any = null;
    try {
      data = JSON.parse(errorText);
      message = data.error || data.message || message;
    } catch { /* ignore */ }
    throw new ApiError(message, res.status, data);
  }
  return { data: await res.json() };
};

function challengeOf(err: unknown): StepUpChallenge | null {
  const e = err as ApiError;
  const code = e?.data?.code;
  if (e?.status !== 403 || (code !== 'REAUTH_REQUIRED' && code !== 'REAUTH_UNAVAILABLE')) return null;
  const r = e.data?.reauth || {};
  return {
    action: typeof r.action === 'string' ? r.action : '',
    methods: Array.isArray(r.methods) ? r.methods : [],
    reason: r.reason === 'invalid' || r.reason === 'unavailable' ? r.reason : 'required',
    message: e.message,
  };
}

async function send(method: string, url: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return handleResponse(res);
}

/**
 * Sends a request; if the server asks for step-up confirmation and a prompt host
 * is mounted, asks the user and retries with the credential (up to 3 tries so a
 * mistyped password re-prompts with the server's "invalid" message).
 */
async function request(method: string, url: string, body?: any) {
  let attempt = 0;
  let extra: StepUpAnswer = null;
  for (;;) {
    try {
      const payload = extra ? { ...(body || {}), ...extra } : body;
      return await send(method, url, payload);
    } catch (err) {
      const challenge = challengeOf(err);
      if (!challenge || !stepUpPrompt || attempt >= 3 || challenge.reason === 'unavailable') throw err;
      attempt += 1;
      extra = await stepUpPrompt(challenge);
      if (!extra) throw new Error('Confirmation cancelled');
    }
  }
}

export default {
  get: async (url: string) => {
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res);
  },
  post: (url: string, body?: any) => request('POST', url, body),
  /** Multipart upload — no Content-Type header so the browser sets the boundary. */
  postForm: async (url: string, form: FormData) => {
    const token = useStore.getState().token;
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    return handleResponse(res);
  },
  put: (url: string, body?: any) => request('PUT', url, body),
  delete: (url: string, body?: any) => request('DELETE', url, body),
};