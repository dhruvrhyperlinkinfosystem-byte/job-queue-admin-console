import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { attemptCounts, renderAt, rowIds, seed, seedWhere, tableRows } from "../test/utils";

const search = () => window.location.search;

describe("jobs list: loading and paging", () => {
  it("shows a loading state, then the first page", async () => {
    renderAt("/jobs");
    expect(screen.getByRole("status")).toHaveTextContent(/loading jobs/i);
    expect(await screen.findByText("Showing 1–25 of 250 jobs")).toBeInTheDocument();
    expect(tableRows()).toHaveLength(25);
  });

  it("moves between pages and keeps the page in the URL", async () => {
    const user = userEvent.setup();
    renderAt("/jobs");
    await screen.findByText("Showing 1–25 of 250 jobs");
    const firstPage = rowIds();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText("Showing 26–50 of 250 jobs")).toBeInTheDocument();
    expect(search()).toBe("?page=2");
    expect(screen.getByText("Page 2 of 10")).toBeInTheDocument();
    expect(rowIds()).not.toEqual(firstPage);

    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(await screen.findByText("Showing 1–25 of 250 jobs")).toBeInTheDocument();
    expect(search()).toBe("");
    expect(rowIds()).toEqual(firstPage);
  });

  it("changes the page size and resets to the first page", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?page=3");
    await screen.findByText("Showing 51–75 of 250 jobs");
    await user.selectOptions(screen.getByLabelText(/rows per page/i), "50");
    expect(await screen.findByText("Showing 1–50 of 250 jobs")).toBeInTheDocument();
    expect(search()).toBe("?page_size=50");
    expect(tableRows()).toHaveLength(50);
  });

  it("offers a way back when the page is past the end", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?page=99");
    expect(await screen.findByRole("heading", { name: /past the end/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /first page/i }));
    expect(await screen.findByText("Showing 1–25 of 250 jobs")).toBeInTheDocument();
  });
});

describe("jobs list: filtering", () => {
  it("filters by one or more statuses", async () => {
    const user = userEvent.setup();
    renderAt("/jobs");
    await screen.findByText("Showing 1–25 of 250 jobs");

    await user.click(screen.getByRole("checkbox", { name: "Dead" }));
    const dead = seedWhere((j) => j.status === "dead").length;
    expect(
      await screen.findByText(`Showing 1–${Math.min(25, dead)} of ${dead} jobs`),
    ).toBeVisible();
    expect(search()).toBe("?status=dead");
    const table = within(screen.getByRole("table"));
    expect(table.getAllByText("Dead")).toHaveLength(Math.min(25, dead));
    expect(table.queryByText("Failed")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Failed" }));
    const both = seedWhere((j) => j.status === "dead" || j.status === "failed").length;
    expect(await screen.findByText(`Showing 1–25 of ${both} jobs`)).toBeVisible();
    expect(search()).toBe("?status=failed&status=dead");
  });

  it("filters by queue", async () => {
    const user = userEvent.setup();
    renderAt("/jobs");
    await screen.findByText("Showing 1–25 of 250 jobs");
    await user.selectOptions(await screen.findByLabelText("Queue"), "webhooks");
    const total = seedWhere((j) => j.queue === "webhooks").length;
    expect(await screen.findByText(`Showing 1–25 of ${total} jobs`)).toBeVisible();
    expect(search()).toBe("?queue=webhooks");
    expect(within(screen.getByRole("table")).getAllByText("webhooks")).toHaveLength(25);
  });

  it("searches by id prefix", async () => {
    const user = userEvent.setup();
    const target = seed[7]!;
    const prefix = target.id.slice(0, 12);
    renderAt("/jobs");
    await screen.findByText("Showing 1–25 of 250 jobs");
    await user.type(screen.getByRole("searchbox", { name: /id prefix/i }), prefix);
    await waitFor(() => expect(search()).toBe(`?q=${prefix}`));
    expect(await screen.findByText(/Showing 1–1 of 1 jobs/)).toBeInTheDocument();
    expect(rowIds()).toEqual([target.id]);
  });

  it("resets to page 1 when a filter changes", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?page=4");
    await screen.findByText("Showing 76–100 of 250 jobs");
    await user.click(screen.getByRole("checkbox", { name: "Succeeded" }));
    await waitFor(() => expect(search()).toBe("?status=succeeded"));
  });

  it("explains when no job matches, and clears the filters", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?q=zzzz&status=dead");
    const heading = await screen.findByRole("heading", { name: /no jobs match these filters/i });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await user.click(
      within(heading.parentElement!).getByRole("button", { name: /clear filters/i }),
    );
    expect(await screen.findByText("Showing 1–25 of 250 jobs")).toBeInTheDocument();
    expect(search()).toBe("");
  });

  it("tells a genuinely empty system apart from a filtered-out one", async () => {
    server.use(
      http.get("/api/v1/jobs", () =>
        HttpResponse.json({ items: [], page: 1, page_size: 25, total: 0 }),
      ),
    );
    renderAt("/jobs");
    expect(await screen.findByRole("heading", { name: /no jobs yet/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });
});

describe("jobs list: sorting", () => {
  it("sorts by attempts, descending first, then ascending", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?page_size=100");
    await screen.findByText(/Showing 1–100/);
    const header = screen.getByRole("columnheader", { name: /attempts/i });
    expect(header).toHaveAttribute("aria-sort", "none");

    await user.click(within(header).getByRole("button"));
    await waitFor(() => expect(header).toHaveAttribute("aria-sort", "descending"));
    expect(search()).toBe("?sort=attempts&page_size=100");
    let counts = attemptCounts();
    expect(counts).toEqual([...counts].sort((a, b) => b - a));

    await user.click(within(header).getByRole("button"));
    await waitFor(() => expect(header).toHaveAttribute("aria-sort", "ascending"));
    expect(search()).toBe("?sort=attempts&order=asc&page_size=100");
    counts = attemptCounts();
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  });

  it("marks created date as the default descending sort", async () => {
    renderAt("/jobs");
    await screen.findByText("Showing 1–25 of 250 jobs");
    expect(screen.getByRole("columnheader", { name: /created/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });
});

describe("jobs list: URL state", () => {
  const url = "/jobs?status=failed&status=dead&queue=email&sort=attempts&order=asc";
  const expectedTotal = () =>
    seedWhere((j) => j.queue === "email" && (j.status === "failed" || j.status === "dead")).length;

  async function expectRestoredView() {
    await screen.findByText(new RegExp(`of ${expectedTotal()} jobs`));
    expect(screen.getByRole("checkbox", { name: "Failed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Dead" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pending" })).not.toBeChecked();
    expect(screen.getByLabelText("Queue")).toHaveValue("email");
    expect(screen.getByRole("columnheader", { name: /attempts/i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    const counts = attemptCounts();
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
  }

  it("restores the view from a shared link", async () => {
    renderAt(url);
    await expectRestoredView();
  });

  it("restores the same view after a reload", async () => {
    const first = renderAt(url);
    await expectRestoredView();
    first.unmount();
    renderAt(window.location.pathname + window.location.search);
    await expectRestoredView();
  });

  it("restores the previous view with the back button", async () => {
    const user = userEvent.setup();
    renderAt("/jobs");
    await screen.findByText("Showing 1–25 of 250 jobs");
    await user.click(screen.getByRole("checkbox", { name: "Dead" }));
    await waitFor(() => expect(search()).toBe("?status=dead"));
    await user.click(screen.getByRole("checkbox", { name: "Failed" }));
    await waitFor(() => expect(search()).toBe("?status=failed&status=dead"));

    window.history.back();
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Failed" })).not.toBeChecked());
    expect(screen.getByRole("checkbox", { name: "Dead" })).toBeChecked();

    window.history.back();
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Dead" })).not.toBeChecked());
    expect(await screen.findByText("Showing 1–25 of 250 jobs")).toBeInTheDocument();
  });

  it("ignores junk in the URL and falls back to defaults", async () => {
    renderAt("/jobs?sort=nope&order=sideways&page=-3&page_size=7&status=bogus");
    expect(await screen.findByText("Showing 1–25 of 250 jobs")).toBeInTheDocument();
  });

  it("keeps the mock mode param when filters change", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?mock=normal");
    await screen.findByText("Showing 1–25 of 250 jobs");
    await user.click(screen.getByRole("checkbox", { name: "Dead" }));
    await waitFor(() => expect(search()).toBe("?mock=normal&status=dead"));
  });
});
