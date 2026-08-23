import { Queue, Worker, type JobsOptions } from "bullmq";
import Redis from "ioredis";
import puppeteer from "puppeteer";
import { env } from "./env";
import { redis } from "./cache";

export interface PdfJobData {
  tripId: string;
  targetUrl: string;
  // A1: render token forwarded as an HTTP header so Puppeteer can authenticate
  // without embedding credentials in the URL (which would appear in logs).
  renderToken: string;
}

// Two separate connections, per BullMQ's own production guidance: a Worker should retry
// patiently through transient Redis blips so in-flight jobs don't die, but an HTTP-triggered
// producer call (enqueuePdfExport, called from the export route) shouldn't hang indefinitely
// if Redis happens to be down when the caller is waiting on the request — it should fail fast
// so the route can return a clean error instead of stalling.
//
// Both are still built from the full REDIS_URL (not manually parsed host/port), so any
// username/password embedded in it survives — the original bug this fix is for.
const workerConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const queueConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
});

export const pdfQueue = new Queue<PdfJobData>("pdf-export", { connection: queueConnection });

const workerKey = "__safar_pdf_worker_started__";
const globalStore = globalThis as unknown as Record<string, boolean>;

if (!globalStore[workerKey]) {
  globalStore[workerKey] = true;
  new Worker<PdfJobData>(
    "pdf-export",
    async (job) => {
      const browser = await puppeteer.launch({ headless: true });
      try {
        const page = await browser.newPage();
        // A1: Inject the render token as an Authorization header so the trip page and
        // chat/history route can authenticate via requireAuthOrRenderToken().
        await page.setExtraHTTPHeaders({
          Authorization: `Bearer ${job.data.renderToken}`,
        });
        await page.goto(job.data.targetUrl, { waitUntil: "networkidle0", timeout: 60000 });
        const pdf = await page.pdf({ format: "A4", printBackground: true });
        await redis.set(pdfResultKey(job.data.tripId, String(job.id)), Buffer.from(pdf).toString("base64"), "EX", 60 * 10);
      } finally {
        await browser.close();
      }
    },
    { connection: workerConnection },
  );
}

// A3: Default retention policy so completed/failed jobs don't accumulate indefinitely.
const DEFAULT_JOB_OPTS: JobsOptions = {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 3600 },
};

export async function enqueuePdfExport(data: PdfJobData, opts?: JobsOptions): Promise<string> {
  const job = await pdfQueue.add("render", data, { ...DEFAULT_JOB_OPTS, ...opts });
  return String(job.id);
}

// Results are namespaced by trip so a job id alone can never be redeemed: the caller has to
// already be authorized on the trip the job was enqueued for.
function pdfResultKey(tripId: string, jobId: string): string {
  return `pdf:${tripId}:${jobId}`;
}

export async function getPdfResult(tripId: string, jobId: string): Promise<Buffer | null> {
  const encoded = await redis.get(pdfResultKey(tripId, jobId));
  if (!encoded) return null;
  return Buffer.from(encoded, "base64");
}