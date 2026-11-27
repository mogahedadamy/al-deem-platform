export const destinations = {
  www: process.env.E2E_BASE_URL ?? "https://alameedtraining.com",
  learn: process.env.E2E_LEARN_BASE_URL ?? "https://learn.alameedtraining.com",
  erp: process.env.E2E_ERP_BASE_URL ?? "https://erp.alameedtraining.com",
  api: process.env.E2E_API_BASE_URL ?? "https://api.alameedtraining.com/v1",
} as const;

export function destinationUrl(origin: string, path = "/") {
  return new URL(path, origin).href;
}
