const mongoose = require('mongoose');
const { Query } = require('mingo');
const crypto = require('crypto');

// Generate MongoDB-compatible 24-character hexadecimal ObjectId
const createObjectId = (hex) => {
  if (hex && typeof hex === 'string' && hex.length === 24) return hex;
  return crypto.randomBytes(12).toString('hex');
};

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../db/mongo_store.json');

// Resilient Document Store with Disk Persistence for zero-friction local development and testing
class InMemoryCollection {
  constructor(name) {
    this.name = name;
    this.docs = [];
  }

  async insertOne(doc) {
    const newDoc = {
      _id: doc._id || createObjectId(),
      ...doc,
      createdAt: doc.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.docs.push(newDoc);
    saveDiskStore();
    return JSON.parse(JSON.stringify(newDoc));
  }

  async insertMany(docsArr) {
    const results = [];
    for (const d of docsArr) {
      results.push(await this.insertOne(d));
    }
    return results;
  }


  async find(filter = {}, options = {}) {
    const query = new Query(filter);
    let matched = this.docs.filter(d => query.test(d));

    if (options.sort) {
      const sortKeys = Object.keys(options.sort);
      matched.sort((a, b) => {
        for (const k of sortKeys) {
          const order = options.sort[k] === 1 || options.sort[k] === 'asc' ? 1 : -1;
          if (a[k] < b[k]) return -1 * order;
          if (a[k] > b[k]) return 1 * order;
        }
        return 0;
      });
    }

    if (options.skip) matched = matched.slice(options.skip);
    if (options.limit) matched = matched.slice(0, options.limit);

    return JSON.parse(JSON.stringify(matched));
  }

  async findOne(filter = {}) {
    const results = await this.find(filter, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async updateOne(filter = {}, update = {}) {
    const query = new Query(filter);
    const index = this.docs.findIndex(d => query.test(d));
    if (index === -1) return { matchedCount: 0, modifiedCount: 0 };

    const doc = this.docs[index];
    const updated = { ...doc };

    if (update.$set) {
      Object.assign(updated, update.$set);
    } else {
      Object.assign(updated, update);
    }
    updated.updatedAt = new Date();
    this.docs[index] = updated;
    saveDiskStore();

    return { matchedCount: 1, modifiedCount: 1, doc: JSON.parse(JSON.stringify(updated)) };
  }

  async findByIdAndUpdate(id, update = {}, options = { new: true }) {
    await this.updateOne({ _id: id }, update);
    return this.findById(id);
  }

  async deleteOne(filter = {}) {
    const query = new Query(filter);
    const index = this.docs.findIndex(d => query.test(d));
    if (index === -1) return { deletedCount: 0 };
    this.docs.splice(index, 1);
    saveDiskStore();
    return { deletedCount: 1 };
  }

  async deleteMany(filter = {}) {
    const query = new Query(filter);
    const initialLen = this.docs.length;
    this.docs = this.docs.filter(d => !query.test(d));
    saveDiskStore();
    return { deletedCount: initialLen - this.docs.length };
  }

  async countDocuments(filter = {}) {
    const query = new Query(filter);
    return this.docs.filter(d => query.test(d)).length;
  }
}

// Global Document Registry
const collections = {
  institutions: new InMemoryCollection('institutions'),
  users: new InMemoryCollection('users'),
  academic_years: new InMemoryCollection('academic_years'),
  departments: new InMemoryCollection('departments'),
  courses: new InMemoryCollection('courses'),
  semesters: new InMemoryCollection('semesters'),
  divisions: new InMemoryCollection('divisions'),
  audit_logs: new InMemoryCollection('audit_logs')
};

const saveDiskStore = () => {
  try {
    const data = {};
    for (const [name, col] of Object.entries(collections)) {
      data[name] = col.docs;
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // silent fallback
  }
};

const loadDiskStore = () => {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
      for (const [colName, docs] of Object.entries(data)) {
        if (!collections[colName]) {
          collections[colName] = new InMemoryCollection(colName);
        }
        collections[colName].docs = docs || [];
      }
    }
  } catch (e) {
    // silent fallback
  }
};

let isConnectedToLiveMongo = false;

// Connect Database Function
const connectDB = async () => {
  loadDiskStore();
  const uri = process.env.MONGODB_URI;
  if (uri && uri !== 'in-memory') {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
        maxPoolSize: 10
      });
      isConnectedToLiveMongo = true;
      console.log('🍃 Connected to MongoDB Cluster at:', uri.split('@')[1] || uri);
      return;
    } catch (err) {
      console.warn('⚠️ Unable to connect to live MongoDB cluster:', err.message);
      console.warn('🔄 Switching to High-Fidelity In-Memory Document Store for local development & testing.');
    }
  } else {
    console.log('📦 Using High-Fidelity In-Memory Document Store (Multi-Tenant Scoped).');
  }
};


const getCollection = (name) => {
  if (!collections[name]) {
    collections[name] = new InMemoryCollection(name);
  }
  return collections[name];
};

module.exports = {
  connectDB,
  getCollection,
  createObjectId,
  isConnectedToLiveMongo: () => isConnectedToLiveMongo,
  collections
};
