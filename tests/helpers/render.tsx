import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";

// Custom render that can be extended with providers
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { ...options });
}

export * from "@testing-library/react";
export { customRender as render };
