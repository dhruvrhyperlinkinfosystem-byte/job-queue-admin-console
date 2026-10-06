import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "./App";

it("renders the app shell", () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: /job queue admin/i })).toBeInTheDocument();
});
