import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { configureApi } from "./api/client";
import { wireApi } from "./app/wireApi";
import "./index.css";

wireApi();

// There is no real backend: the API is always served by MSW, including in the static build.
async function enableMocking() {
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
  const { restartMockWorkerIfNeeded, watchMockWorker } = await import("./mocks/recovery");
  configureApi({ recover: restartMockWorkerIfNeeded });
  watchMockWorker();
}

void enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
