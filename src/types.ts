// Type definitions for verifiable credentials

type IssuerURI = string;
type IssuerObject = {
  readonly id: IssuerURI;
  readonly type?: string;
  readonly name?: string;
  readonly url?: string;
  readonly image?: string;
}
type Issuer = IssuerURI | IssuerObject;

type CreditValue = {
  readonly value?: string;
}

type CourseInstance = {
  readonly type?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

type CompletionDocument = {
  readonly type?: string | string[];
  readonly identifier?: string;
  readonly courseCode?: string;
  readonly name?: string;
  readonly description?: string;
  readonly numberOfCredits?: CreditValue;
  readonly hasCourseInstance?: CourseInstance;
  readonly startDate?: string;
  readonly endDate?: string;
}

type EducationalOperationalCredentialExtensions = {
  readonly type?: string | string[];
  readonly awardedOnCompletionOf?: CompletionDocument;
}
// https://schema.org/EducationalOccupationalCredential (this doesn't really conform)
type EducationalOperationalCredential = EducationalOperationalCredentialExtensions & {
  readonly id?: string;
  readonly name?: string;
  readonly description?: string;
  readonly competencyRequired?: string;
  readonly credentialCategory?: string;
}

type DegreeCompletion = {
  readonly type: string;
  readonly name: string;
}

type StudentId = {
  readonly id: string;
  readonly image: string;
}

type SubjectExtensions = {
  readonly type?: string;
  readonly name?: string;
  readonly hasCredential?: EducationalOperationalCredential; // https://schema.org/hasCredential
  readonly degree?: DegreeCompletion;
  readonly studentId?: StudentId;
  // Open Badges v3
  readonly achievement?: EducationalOperationalCredential | EducationalOperationalCredential[];
  // Status List 2021
  readonly encodedList?: string;
  readonly statusPurpose?: string;
}
type Subject = SubjectExtensions & {
  readonly id?: string;
}

type CredentialStatusSubjectExtensions = {
  // Status List 2021
  readonly statusPurpose?: string;
  readonly statusListIndex?: string;
  readonly statusListCredential?: string;
}
// https://w3c-ccg.github.io/vc-status-list-2021
type CredentialStatus = CredentialStatusSubjectExtensions & {
  readonly id: string;
  readonly type: string | string[];
}

type Proof = {
  readonly type: string;
  readonly created: string;
  readonly verificationMethod: string;
  readonly proofPurpose: string;
  readonly proofValue: string;
  readonly challenge?: string;
  readonly jws?: string;
}

// https://digitalcredentials.github.io/dcc/v1/dcc-context-v1.json
export type Credential = {
  readonly '@context': string[];                  // https://w3c.github.io/vc-data-model/#contexts
  readonly id: string;                            // https://w3c.github.io/vc-data-model/#identifiers
  readonly type: string | string[];               // https://w3c.github.io/vc-data-model/#types
  readonly issuer: Issuer;                        // https://w3c.github.io/vc-data-model/#issuer
  readonly issuanceDate: string;                  // https://w3c.github.io/vc-data-model/#issuance-date
  readonly expirationDate?: string;               // https://w3c.github.io/vc-data-model/#expiration
  readonly credentialSubject: Subject;            // https://w3c.github.io/vc-data-model/#credential-subject
  readonly credentialStatus?: CredentialStatus;   // https://w3c.github.io/vc-data-model/#status
  readonly proof?: Proof;                         // https://w3c.github.io/vc-data-model/#proofs-signatures
}

// https://digitalcredentials.github.io/dcc/v1/dcc-context-v1.json
export type VerifiableCredential = {
  readonly '@context': string[];                  // https://w3c.github.io/vc-data-model/#contexts
  readonly id: string;                            // https://w3c.github.io/vc-data-model/#identifiers
  readonly type: string | string[];               // https://w3c.github.io/vc-data-model/#types
  readonly issuer: Issuer;                        // https://w3c.github.io/vc-data-model/#issuer
  readonly issuanceDate: string;                  // https://w3c.github.io/vc-data-model/#issuance-date
  readonly expirationDate?: string;               // https://w3c.github.io/vc-data-model/#expiration
  readonly credentialSubject: Subject;            // https://w3c.github.io/vc-data-model/#credential-subject
  readonly credentialStatus?: CredentialStatus;   // https://w3c.github.io/vc-data-model/#status
  readonly proof: Proof;                          // https://w3c.github.io/vc-data-model/#proofs-signatures
}

export type Presentation = {
  readonly '@context': string[];
  readonly issuer: Issuer;
  readonly type: string | string[];
  readonly holder?: string;
  readonly verifiableCredential: Credential | Credential[];
  readonly proof?: Proof;
}

export type VerifiablePresentation = {
  readonly '@context': string[];
  readonly issuer: Issuer;
  readonly type: string | string[];
  readonly holder?: string;
  readonly verifiableCredential: Credential | Credential[];
  readonly proof: Proof;
}
