import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderAt, seedWhere } from "../test/utils";

describe("queues overview", () => {
  it("shows one summary per queue with its counts", async () => {
    renderAt("/");
    const email = await screen.findByRole("region", { name: "email" });
    const count = (status: string) =>
      seedWhere((j) => j.queue === "email" && j.status === status).length;
    for (const status of ["pending", "running", "failed", "dead"]) {
      expect(
        within(email).getByRole("link", { name: `${count(status)} ${status} jobs in email` }),
      ).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("region", { name: /^(email|exports|webhooks|billing)$/ }),
    ).toHaveLength(4);
  });

  it("opens the jobs list filtered to that queue and status", async () => {
    const user = userEvent.setup();
    renderAt("/");
    const webhooks = await screen.findByRole("region", { name: "webhooks" });
    await user.click(within(webhooks).getByRole("link", { name: /failed jobs in webhooks/ }));

    expect(window.location.pathname + window.location.search).toBe(
      "/jobs?queue=webhooks&status=failed",
    );
    const total = seedWhere((j) => j.queue === "webhooks" && j.status === "failed").length;
    expect(await screen.findByText(new RegExp(`of ${total} jobs`))).toBeInTheDocument();
    expect(screen.getByLabelText("Queue")).toHaveValue("webhooks");
    expect(screen.getByRole("checkbox", { name: "Failed" })).toBeChecked();
  });
});
