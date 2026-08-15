import { Queue, Worker, type JobsOptions } from "bullmq";
import puppeteer from "puppeteer";
import { env } from "./env";
import { redis } from "./cache";

export interface PdfJobData {
  tripId: string;
  targetUrl: string;
}

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port || 6379),
};

export const pdfQueue = new Queue<PdfJobData>("pdf-export", { connection });

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
        await page.goto(job.data.targetUrl, { waitUntil: "networkidle0", timeout: 60000 });
        const pdf = await page.pdf({ format: "A4", printBackground: true });
        await redis.set(`pdf:${job.id}`, pdf.toString("base64"), "EX", 60 * 10);
      } finally {
        await browser.close();
      }
    },
    { connection },
  );
}

export async function enqueuePdfExport(data: PdfJobData, opts?: JobsOptions): Promise<string> {
  const job = await pdfQueue.add("render", data, opts);
  return String(job.id);
}

export async function getPdfResult(jobId: string): Promise<Buffer | null> {
  const encoded = await redis.get(`pdf:${jobId}`);
  if (!encoded) return null;
  return Buffer.from(encoded, "base64");
}
