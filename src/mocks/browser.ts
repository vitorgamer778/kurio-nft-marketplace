import { setupWorker } from "msw/browser";
import { handlers, tick } from "./handlers";
import { initialize } from "./db";
export async function startMocks() {
  await initialize();
  const worker = setupWorker(...handlers);
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  setInterval(tick, 300);
  return worker;
}
