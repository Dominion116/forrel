/**
 * ForrelRegistry custom errors (PRD §12.1), with plain-language explanations for the UI.
 * The mock registry throws these; the live client decodes reverts into them.
 */
export const REGISTRY_ERRORS = {
  InvalidSlug: "The project name must be 3–40 characters: lowercase letters, digits and dashes.",
  SlugTaken: "That project name is already registered.",
  BadKeyLength: "A public key must be exactly 2,592 bytes (ML-DSA-87).",
  BadSigLength: "A signature must be exactly 4,627 bytes (ML-DSA-87).",
  UnknownProject: "No project with that ID exists in the registry.",
  VersionExists: "This project already has a release with that version.",
  SignatureInvalid: "pqcVerify rejected the signature. It was not made by the project's current key, or a signed field changed.",
  PrecompileUnavailable: "The pqcVerify precompile returned nothing. It may be disabled on this network.",
  AlreadyRevoked: "That release is already revoked.",
  NotOwner: "Only the project owner can do that.",
  OwnerNotPQRegistered: "Your account has no registered, possession-proven ML-DSA-87 key on QoreChain.",
  SameKey: "The new key must differ from the current signing key and the recovery key.",
} as const;

export type RegistryErrorCode = keyof typeof REGISTRY_ERRORS;

export class RegistryError extends Error {
  readonly code: RegistryErrorCode;
  constructor(code: RegistryErrorCode, detail?: string) {
    super(detail ? `${REGISTRY_ERRORS[code]} (${detail})` : REGISTRY_ERRORS[code]);
    this.name = "RegistryError";
    this.code = code;
  }
}

export function isRegistryError(err: unknown): err is RegistryError {
  return err instanceof Error && err.name === "RegistryError" && "code" in err;
}
