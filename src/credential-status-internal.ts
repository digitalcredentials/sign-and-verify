import fs from 'fs';
import {
  CREDENTIAL_STATUS_CONFIG_FILE,
  CREDENTIAL_STATUS_LOG_FILE,
  BaseCredentialStatusClient,
  CredentialStatusConfigData,
  CredentialStatusLogData,
} from './credential-status';
import { VerifiableCredential } from './types';

// Credential status resource location
export const CREDENTIAL_STATUS_FOLDER = 'credentials/status';
const CREDENTIAL_STATUS_DIR = `${__dirname}/../${CREDENTIAL_STATUS_FOLDER}`;

// Type definition for GitlabCredentialStatusClient constructor method
type InternalCredentialStatusClientParameters = {
  vcApiIssuerUrlHost: string;
  vcApiIssuerUrlProtocol: string;
};

// Implementation of BaseCredentialStatusClient for internal storage and authorization
export class InternalCredentialStatusClient extends BaseCredentialStatusClient {
  private vcApiIssuerUrl: string;

  constructor(config: InternalCredentialStatusClientParameters) {
    super();
    this.vcApiIssuerUrl = `${config.vcApiIssuerUrlProtocol}://${config.vcApiIssuerUrlHost}`;
  }

  // Get credential status url
  getCredentialStatusUrl(): string {
    return `${this.vcApiIssuerUrl}/${CREDENTIAL_STATUS_FOLDER}`;
  }

  // Check if status repo exists
  async statusRepoExists(): Promise<boolean> {
    return fs.existsSync(CREDENTIAL_STATUS_DIR);
  }

  // Create status repo
  async createStatusRepo(): Promise<void> {
    fs.mkdirSync(CREDENTIAL_STATUS_DIR, { recursive: true });
  }

  // Create data in config file
  async createConfigData(data: CredentialStatusConfigData): Promise<void> {
    this.updateConfigData(data);
  }

  // Retrieve data from config file
  async readConfigData(): Promise<CredentialStatusConfigData> {
    const configFile = `${CREDENTIAL_STATUS_DIR}/${CREDENTIAL_STATUS_CONFIG_FILE}`;
    return JSON.parse(fs.readFileSync(configFile, { encoding: 'utf8' }));
  }

  // Update data in config file
  async updateConfigData(data: CredentialStatusConfigData): Promise<void> {
    const configFile = `${CREDENTIAL_STATUS_DIR}/${CREDENTIAL_STATUS_CONFIG_FILE}`;
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(configFile, content);
  }

  // Create data in log file
  async createLogData(data: CredentialStatusLogData): Promise<void> {
    this.updateLogData(data);
  }

  // Retrieve data from log file
  async readLogData(): Promise<CredentialStatusLogData> {
    const logFile = `${CREDENTIAL_STATUS_DIR}/${CREDENTIAL_STATUS_LOG_FILE}`;
    return JSON.parse(fs.readFileSync(logFile, { encoding: 'utf8' }));
  }

  // Update data in log file
  async updateLogData(data: CredentialStatusLogData): Promise<void> {
    const logFile = `${CREDENTIAL_STATUS_DIR}/${CREDENTIAL_STATUS_LOG_FILE}`;
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(logFile, content);
  }

  // Create data in status file
  async createStatusData(data: VerifiableCredential): Promise<void> {
    this.updateStatusData(data);
  }

  // Retrieve data from status file
  async readStatusData(): Promise<VerifiableCredential> {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const statusFile = `${CREDENTIAL_STATUS_DIR}/${latestList}`;
    return JSON.parse(fs.readFileSync(statusFile, { encoding: 'utf8' }));
  }

  // Update data in status file
  async updateStatusData(data: VerifiableCredential): Promise<void> {
    const configData = await this.readConfigData();
    const { latestList } = configData;
    const statusFile = `${CREDENTIAL_STATUS_DIR}/${latestList}`;
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(statusFile, content);
  }
}
