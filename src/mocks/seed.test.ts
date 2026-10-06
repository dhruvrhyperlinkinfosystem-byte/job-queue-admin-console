import { JOB_STATUSES } from "../api/types";
import { QUEUE_NAMES, SEED_COUNT, createSeedJobs } from "./seed";

describe("seed data", () => {
  it("is deterministic", () => {
    expect(createSeedJobs()).toEqual(createSeedJobs());
  });

  it("has about 250 unique jobs covering every queue and status", () => {
    const jobs = createSeedJobs();
    expect(jobs).toHaveLength(SEED_COUNT);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(SEED_COUNT);
    for (const queue of QUEUE_NAMES) {
      for (const status of JOB_STATUSES) {
        expect(jobs.some((j) => j.queue === queue && j.status === status)).toBe(true);
      }
    }
  });

  it("keeps attempts consistent with status", () => {
    for (const job of createSeedJobs()) {
      expect(job.attempts).toBeLessThanOrEqual(job.max_attempts);
      if (job.status === "dead") expect(job.attempts).toBe(job.max_attempts);
      if (job.status === "failed") expect(job.attempts).toBeLessThan(job.max_attempts);
      if (job.status === "failed" || job.status === "dead") expect(job.last_error).not.toBeNull();
    }
  });
});
