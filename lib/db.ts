import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI as string; // your mongodb connection string
const options = {
  useUnifiedTopology: true,
  minPoolSize: 5,  // Minimum number of connections in the pool
  maxPoolSize: 70, // Maximum number of connections in the pool
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
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
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

export async function disconnectFromDatabase() {
  /*if (cachedClient && !isConnecting) {
    await cachedClient.close();
    console.log('MongoDB connection closed');
    cachedClient = null;
    cachedDb = null;
  } else {
    console.log('No active MongoDB connection to close or connection is in the process of connecting');
  }*/
}
