import { expect } from 'chai';
import 'mocha';

import { SignatureOptions, getSigningDate, getSigningKeyIdentifier, DefaultProofPurpose } from "./signatures";

describe("signatures", () => {

  describe("SignatureOptions", () => {
    it("should get default proof purpose", () => {
      const options = new SignatureOptions({});
      expect(options.proofPurpose!).to.equal(DefaultProofPurpose);
    });

    it("should parse proof purpose", () => {
      const proofPurpose = 'someProofPurpose';

      const options = new SignatureOptions({ proofPurpose: proofPurpose });
      expect(options.proofPurpose!).to.equal(proofPurpose);
    });
  });

  it("should get signing key id", () => {
    const signingKeyIdentifier = 'did:example:123#abc';

    const options = new SignatureOptions({ verificationMethod: signingKeyIdentifier });
    const id = getSigningKeyIdentifier(options);
    expect(id).to.equal(signingKeyIdentifier);
  });

  it("should get signing date", () => {
    const signingKeyIdentifier = 'did:example:123#abc';
    const created = '2020-10-12T16:35:18.531Z'

    const options = new SignatureOptions({ proofPurpose: 'someMethod', verificationMethod: signingKeyIdentifier, created: created });
    const signingDate = getSigningDate(options);
    expect(signingDate).to.equal(created);
  });
});


