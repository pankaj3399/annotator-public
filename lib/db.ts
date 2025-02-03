import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI as string; // MongoDB connection string

const minimumConnections = parseInt(process.env.MIN_CONNECTION_MONGO || "5", 10);
const maximumConnections = parseInt(process.env.MAX_CONNECTION_MONGO || "70", 10);

const options = {
  minPoolSize: minimumConnections, // Minimum number of connections to maintain
  maxPoolSize: maximumConnections, // Maximum number of connections allowed
  serverSelectionTimeoutMS: 5000, // Timeout for selecting a server
  socketTimeoutMS: 45000, // Timeout for idle connections
};

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

class Singleton {
  private static _instance: Singleton;
  private _client: MongoClient;
  private _clientPromise: Promise<MongoClient>;

  private constructor() {
    this._client = new MongoClient(uri, options);
    this._clientPromise = this._client.connect();
    if (process.env.NODE_ENV === 'development') {
      global._mongoClientPromise = this._clientPromise;
    }
  }

  public static get instance() {
    if (!this._instance) {
      this._instance = new Singleton();
    }
    return this._instance;
  }

  public get clientPromise() {
    return this._clientPromise;
  }

  public get client() {
    return this._client;
  }

  public get db() {
    return this._client.db(process.env.MONGODB_DB as string);
  }
}

const singleton = Singleton.instance;

// The connectToDatabase function
export async function connectToDatabase() {
  await singleton.clientPromise;
  return { client: singleton.client, db: singleton.db };
}
