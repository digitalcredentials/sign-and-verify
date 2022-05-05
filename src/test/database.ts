import { connect, connection, model, Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const dbCreate = async (dbOpts: any = {}) => {
  return MongoMemoryServer.create(dbOpts);
};

export const dbConnect = async (dbUri: string) => {
  await connect(dbUri);
};

export const dbDisconnect = async (dbServer: any) => {
  await connection.dropDatabase();
  await connection.close();
  await dbServer.stop();
};

const credentialSchema = new Schema({
  name: { type: String },
  description: { type: String },
  issuer: { type: Object },
  credentialSubject: { type: Object },
  issuanceDate: { type: String },
  expirationDate: { type: String },
  challenge: { type: String }
});

export const Credential = model('Credential', credentialSchema);