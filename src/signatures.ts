export const DefaultProofPurpose = 'assertionMethod';

export class SignatureOptions {
  public verificationMethod?: string;
  public proofPurpose?: string = DefaultProofPurpose;
  public created?: string;
  public domain?: string;
  public challenge?: string;

  public constructor(options: SignatureOptions) {
    Object.assign(this, options);
  }
}

// Added to work around confusing naming schemes. Later, there may be some layer of indirection
// but for now, it's just the verificationMethod for our use cases.
export function getSigningKeyIdentifier(options: SignatureOptions): string {
  return options.verificationMethod!;
};

export function getSigningDate(options: SignatureOptions): string {
  // TODO: double-check this is how it's being used
  return options.created ? options.created! : new Date().toISOString()
};