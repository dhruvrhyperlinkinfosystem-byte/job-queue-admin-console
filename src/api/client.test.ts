import { http, HttpResponse } from "msw";
import { api } from "./endpoints";
import { configureApi } from "./client";
import { ApiError } from "./errors";
import { server } from "../mocks/server";

afterEach(() => configureApi({ recover: undefined }));

const htmlNotFound = () => new HttpResponse("<html>Not Found</html>", { status: 404 });

describe("recovery when the mock backend is bypassed", () => {
  it("restarts the backend and retries once when a request never reached it", async () => {
    const recover = vi.fn(async () => true);
    configureApi({ recover });
    server.use(http.get("/api/v1/queues", htmlNotFound, { once: true }));

    const { items } = await api.listQueues();

    expect(items).toHaveLength(4);
    expect(recover).toHaveBeenCalledTimes(1);
  });

  it("retries a POST too, since a bypassed request was never applied", async () => {
    configureApi({ recover: async () => true });
    const { items } = await api.listJobs({ status: ["failed"], page_size: 1 });
    server.use(http.post("/api/v1/jobs/:id/retry", htmlNotFound, { once: true }));
    await expect(api.retryJob(items[0]!.id)).resolves.toMatchObject({ status: "pending" });
  });

  it("does not treat a genuine API 404 as a lost backend", async () => {
    const recover = vi.fn(async () => true);
    configureApi({ recover });
    await expect(api.getJob("job_missing")).rejects.toMatchObject({
      status: 404,
      code: "not_found",
    });
    expect(recover).not.toHaveBeenCalled();
  });

  it("gives up cleanly if nothing could be repaired", async () => {
    const recover = vi.fn(async () => false);
    configureApi({ recover });
    server.use(http.get("/api/v1/queues", htmlNotFound));
    await expect(api.listQueues()).rejects.toBeInstanceOf(ApiError);
    expect(recover).toHaveBeenCalledTimes(1);
  });

  it("retries only once, even if the backend is still bypassed", async () => {
    const recover = vi.fn(async () => true);
    configureApi({ recover });
    let calls = 0;
    server.use(
      http.get("/api/v1/queues", () => {
        calls += 1;
        return htmlNotFound();
      }),
    );
    await expect(api.listQueues()).rejects.toMatchObject({ status: 404, code: "http_error" });
    expect(calls).toBe(2);
    expect(recover).toHaveBeenCalledTimes(1);
  });
});
