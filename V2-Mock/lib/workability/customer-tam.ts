import type { AccountType, TamStatus } from "@/lib/salesforce/types";

export type CustomerStatus = "PASS" | "WARNING" | "BLOCKED";
export type TamValidationStatus = "PASS" | "WARNING";

export interface CustomerTamResult {
  customerStatus: CustomerStatus;
  tamStatus: TamValidationStatus;
  reasonCodes: string[];
}

export const CUSTOMER_TAM_BLANK = "CUSTOMER_TAM_BLANK";
export const CUSTOMER_EXPIRED_TAM = "CUSTOMER_EXPIRED_TAM";
/** Existing customer with an active TAM — actively managed, not workable. */
export const CUSTOMER_EXISTING = "CUSTOMER_EXISTING";
export const TAM_EXPIRED = "TAM_EXPIRED";

/** An expired TAM of any product line, e.g. "Expired Intacct TAM", "Expired X3 TAM". */
export function isExpiredTam(tam: TamStatus): boolean {
  return tam !== null && tam.startsWith("Expired ");
}

export function evaluateCustomerTam(type: AccountType, tam: TamStatus): CustomerTamResult {
  const isCustomer = type === "Customer";

  if (isCustomer && tam === null) {
    return {
      customerStatus: "BLOCKED",
      tamStatus: "WARNING",
      reasonCodes: [CUSTOMER_TAM_BLANK],
    };
  }

  if (isCustomer && isExpiredTam(tam)) {
    return {
      customerStatus: "WARNING",
      tamStatus: "WARNING",
      reasonCodes: [CUSTOMER_EXPIRED_TAM],
    };
  }

  if (!isCustomer && tam === null) {
    return {
      customerStatus: "PASS",
      tamStatus: "PASS",
      reasonCodes: [],
    };
  }

  if (!isCustomer && isExpiredTam(tam)) {
    return {
      customerStatus: "PASS",
      tamStatus: "WARNING",
      reasonCodes: [TAM_EXPIRED],
    };
  }

  // Existing customer with an active TAM (blank and expired handled above): the
  // account is actively managed, so it is not workable.
  if (isCustomer) {
    return {
      customerStatus: "BLOCKED",
      tamStatus: "PASS",
      reasonCodes: [CUSTOMER_EXISTING],
    };
  }

  return {
    customerStatus: "PASS",
    tamStatus: "PASS",
    reasonCodes: [],
  };
}
