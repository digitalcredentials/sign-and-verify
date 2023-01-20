// NOTE: The operations in this file are specific to MongoDB
// You may modify the methods for DatabaseClient in order to
// suit your organization's DBMS deployment infrastructure

import { MongoClient } from 'mongodb';
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_HOST = process.env.DB_HOST;
const DB_NAME = process.env.DB_NAME as string || 'sign-and-verify';
const DB_COLLECTION = process.env.DB_COLLECTION as string || 'credential-recipients';
const DB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@${DB_HOST}`;

export class DatabaseClient {
  private client: any;
  private database: any;
  private dbServerUri: string;
  private dbName: string;
  private dbCollection: string;

  constructor(dbServerUri: string, dbName: string, dbCollection: string) {
    this.client = {};
    this.database = {};
    this.dbServerUri = dbServerUri;
    this.dbName = dbName;
    this.dbCollection = dbCollection;
  }

  async open() {
    await this.connectServer(this.dbServerUri);
    this.connectDatabase(this.dbName);
    return this.connectCollection(this.dbCollection);
  }

  async close() {
    await this.client.close();
  }

  async connectServer(dbServerUri: string) {
    this.client = new MongoClient(dbServerUri);
    await this.client.connect();
  }

  connectDatabase(dbName: string) {
    this.database = this.client.db(dbName);
  }

  connectCollection(dbCollection: string) {
    return this.database.collection(dbCollection);
  }
}

export const dbCredClient = new DatabaseClient(DB_URI, DB_NAME, DB_COLLECTION);
