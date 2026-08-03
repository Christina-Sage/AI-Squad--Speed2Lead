// Reason codes shared across the workability engine and its helpers. Kept in a
// dependency-free module so helpers (e.g. abm-recommendation) can import them
// without a circular dependency on engine.ts.
export const DQ_OPP_COOLING_OFF = "DQ_OPP_COOLING_OFF";
export const PARTNER_REGISTERED = "PARTNER_REGISTERED";
export const PARTNER_RELATIONSHIP = "PARTNER_RELATIONSHIP";
export const DUPLICATE_ACCOUNT = "DUPLICATE_ACCOUNT";
