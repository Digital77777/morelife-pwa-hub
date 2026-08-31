/**
 * Offline outbox. Actions taken without a connection are stored locally and
 * replayed automatically as soon as the device comes back online.
 */
export type OutboxKind = "analytics" | "order";

export type OutboxItem = {
  id: string;
  kind: OutboxKind;
  payload: unknown;
  createdAt: number;
  attempts: number;
};

const KEY = "morelife.outbox.v1";
const MAX_ATTEMPTS = 8;

type Listener = (items: OutboxItem[]) => void;
const listeners = new Set<Listener>();

function read(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l(items));
}

export function outboxItems() {
  return read();
}

export function subscribeToOutbox(listener: Listener) {
  listeners.add(listener);
  listener(read());
  return () => listeners.delete(listener);
}

export function enqueue(kind: OutboxKind, payload: unknown) {
  const item: OutboxItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  write([...read(), item]);
  return item;
}

export type OutboxHandlers = Partial<Record<OutboxKind, (payload: unknown) => Promise<void>>>;

let handlers: OutboxHandlers = {};
let flushing = false;

export function setOutboxHandlers(next: OutboxHandlers) {
  handlers = next;
}

export async function flushOutbox() {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  const queue = read();
  if (queue.length === 0) return;

  flushing = true;
  const remaining: OutboxItem[] = [];

  try {
    for (const item of queue) {
      const handler = handlers[item.kind];
      if (!handler) {
        remaining.push(item);
        continue;
      }
      try {
        await handler(item.payload);
      } catch {
        const attempts = item.attempts + 1;
        if (attempts < MAX_ATTEMPTS) remaining.push({ ...item, attempts });
      }
    }
  } finally {
    flushing = false;
    write(remaining);
  }
}

/** Starts online/visibility listeners plus a slow poll. Returns a cleanup fn. */
export function startOutboxSync() {
  if (typeof window === "undefined") return () => {};

  const attempt = () => void flushOutbox();
  window.addEventListener("online", attempt);
  document.addEventListener("visibilitychange", attempt);
  const timer = window.setInterval(attempt, 60_000);
  attempt();

  return () => {
    window.removeEventListener("online", attempt);
    document.removeEventListener("visibilitychange", attempt);
    window.clearInterval(timer);
  };
}
