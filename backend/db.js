const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const bcrypt = require("bcryptjs");

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const HAZARDS_FILE = path.join(DATA_DIR, "hazards.json");
const VERIFIED_FILE = path.join(DATA_DIR, "verified_reporters.json");

let isMongoConnected = false;
let isLocalInitialized = false;

// ═════════════════════════════════════════════════════════════════════
// MONGOOSE SCHEMAS (MongoDB Atlas)
// ═════════════════════════════════════════════════════════════════════

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    countryCode: { type: String, default: "+91" },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "Field Monitor" }
  },
  { timestamps: true }
);

const hazardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    location: { type: String, required: true },
    phone: { type: String, default: "" },
    observerPhone: { type: String, default: "" },
    countryCode: { type: String, default: "+91" },
    latitude: { type: Number, default: 20.5937 },
    longitude: { type: Number, default: 78.9629 },
    severity: { type: String, enum: ["low", "medium", "high", "severe"], default: "medium" },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    pinned: { type: Boolean, default: false },
    votes: { type: Number, default: 1 },
    deleted: { type: Boolean, default: false },
    rawText: { type: String, default: "" },
    summaryOriginal: { type: String, default: null },
    summaryEnglish: { type: String, default: null },
    summaryHindi: { type: String, default: null },
    summaryMarathi: { type: String, default: null },
    summaryTamil: { type: String, default: null },
    summaryBengali: { type: String, default: null },
    sourceLanguage: { type: String, default: null },
    photoUrl: { type: String, default: null },
    userEmail: { type: String, default: null },
    userName: { type: String, default: null },
    verified: { type: Boolean, default: false },
    isVerifiedReporter: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
const HazardModel = mongoose.models.Hazard || mongoose.model("Hazard", hazardSchema);

function cleanMongoDoc(doc) {
  if (!doc) return null;
  const { _id, __v, ...clean } = doc;
  return clean;
}

// ═════════════════════════════════════════════════════════════════════
// LOCAL JSON BACKUP HANDLERS
// ═════════════════════════════════════════════════════════════════════

async function ensureLocalDatabase() {
  if (isLocalInitialized) return;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
      await fs.access(USERS_FILE);
    } catch {
      const defaultPasswordHash = await bcrypt.hash("Password@123", 10);
      const adminPasswordHash = await bcrypt.hash("Admin@1234", 10);
      const initialUsers = [
        {
          id: "usr_root_admin_001",
          username: "admin",
          email: "admin@geonetra.com",
          phone: "9999999999",
          countryCode: "+91",
          passwordHash: adminPasswordHash,
          role: "admin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "usr_default_admin_001",
          username: "observeradmin",
          email: "observer@geonetra.gov.in",
          phone: "9876543210",
          countryCode: "+91",
          passwordHash: defaultPasswordHash,
          role: "Field Monitor",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2), "utf8");
    }

    try {
      await fs.access(HAZARDS_FILE);
    } catch {
      const initialHazards = [
        {
          id: "haz_init_001",
          type: "flood",
          location: "Marine Drive Promenade, Mumbai, Maharashtra",
          phone: "+91 9876543210",
          observerPhone: "9876543210",
          countryCode: "+91",
          latitude: 18.9438,
          longitude: 72.8234,
          severity: "high",
          status: "open",
          pinned: true,
          votes: 14,
          deleted: false,
          rawText: "Extreme high tidal swell and coastal water ingress over seawall promenade.",
          summaryOriginal: "Marine Drive is experiencing severe tidal surge and coastal flooding.",
          summaryEnglish: "Marine Drive is experiencing severe tidal surge and coastal flooding.",
          summaryHindi: "मरीन ड्राइव पर भारी समुद्री लहरों और तटीय जलभराव का सामना करना पड़ रहा है।",
          summaryMarathi: "मरीन ड्राईव्हवर जोरदार लाटा आणि किनारी भागात पाणी साचल्याचा सामना करावा लागत आहे.",
          summaryTamil: "மெரைன் டிரைவில் கடுமையான அலை எழுச்சியும் கடலோர வெள்ளப்பெருக்கும் ஏற்பட்டுள்ளது.",
          summaryBengali: "মেরিন ড্রাইভে প্রবল সামুদ্রিক জলোচ্ছ্বাস ও উপকূলীয় প্লাবন দেখা দিয়েছে।",
          sourceLanguage: "en",
          photoUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600",
          timestamp: new Date(Date.now() - 35 * 60000).toISOString()
        }
      ];
      await fs.writeFile(HAZARDS_FILE, JSON.stringify(initialHazards, null, 2), "utf8");
    }

    isLocalInitialized = true;
  } catch (error) {
    console.error("Local database init notice:", error);
  }
}

async function readLocalUsers() {
  await ensureLocalDatabase();
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeLocalUsers(users) {
  await ensureLocalDatabase();
  const tempFile = `${USERS_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(users, null, 2), "utf8");
  await fs.rename(tempFile, USERS_FILE);
}

async function readLocalHazards() {
  await ensureLocalDatabase();
  try {
    const raw = await fs.readFile(HAZARDS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeLocalHazards(hazards) {
  await ensureLocalDatabase();
  const tempFile = `${HAZARDS_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(hazards, null, 2), "utf8");
  await fs.rename(tempFile, HAZARDS_FILE);
}

// ═════════════════════════════════════════════════════════════════════
// MIGRATION TO MONGODB ATLAS
// ═════════════════════════════════════════════════════════════════════

async function migrateToMongo() {
  if (!isMongoConnected) return;

  try {
    // 1. Migrate Users
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log("Migrating users from local JSON to MongoDB Atlas...");
      const localUsers = await readLocalUsers();
      for (const u of localUsers) {
        await UserModel.findOneAndUpdate({ id: u.id }, u, { upsert: true, new: true });
      }
      console.log(`Migrated ${localUsers.length} users into MongoDB Atlas.`);
    }

    // 2. Migrate Hazards
    const hazardCount = await HazardModel.countDocuments();
    if (hazardCount === 0) {
      console.log("Migrating hazards from local JSON to MongoDB Atlas...");
      const localHazards = await readLocalHazards();
      for (const h of localHazards) {
        await HazardModel.findOneAndUpdate({ id: h.id }, h, { upsert: true, new: true });
      }
      console.log(`Migrated ${localHazards.length} hazards into MongoDB Atlas.`);
    }
  } catch (err) {
    console.warn("MongoDB migration notice:", err.message || err);
  }
}

async function connectMongoDB(uri) {
  if (isMongoConnected) return true;
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000
    });
    isMongoConnected = true;
    console.log("Connected to MongoDB Atlas: GeoNetra cluster (database: geonetra_db).");
    await migrateToMongo();
    return true;
  } catch (error) {
    console.warn("MongoDB Atlas connection failed. Operating in local database mode:", error.message || error);
    isMongoConnected = false;
    await ensureLocalDatabase();
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════
// USER SERVICE OPERATIONS
// ═════════════════════════════════════════════════════════════════════

async function readUsers() {
  if (isMongoConnected) {
    try {
      const users = await UserModel.find({}).lean();
      return users.map(cleanMongoDoc);
    } catch (err) {
      console.warn("MongoDB readUsers error, falling back to local:", err.message);
    }
  }
  return await readLocalUsers();
}

async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const cleanPhone = clean.replace(/[\s+-]/g, "");

  if (isMongoConnected) {
    try {
      const user = await UserModel.findOne({
        $or: [
          { email: clean },
          { username: clean },
          { phone: cleanPhone }
        ]
      }).lean();
      return user ? cleanMongoDoc(user) : null;
    } catch (err) {
      console.warn("MongoDB findUserByIdentifier error, falling back to local:", err.message);
    }
  }

  const users = await readLocalUsers();
  return users.find((u) => {
    const userPhoneClean = (u.phone || "").replace(/[\s-]/g, "");
    return (
      (u.email && u.email.toLowerCase() === clean) ||
      (u.username && u.username.toLowerCase() === clean) ||
      (userPhoneClean && userPhoneClean === cleanPhone)
    );
  }) || null;
}

async function findUserById(id) {
  if (!id) return null;
  if (isMongoConnected) {
    try {
      const user = await UserModel.findOne({ id }).lean();
      return user ? cleanMongoDoc(user) : null;
    } catch (err) {
      console.warn("MongoDB findUserById error, falling back to local:", err.message);
    }
  }
  const users = await readLocalUsers();
  return users.find((u) => u.id === id) || null;
}

async function createUser({ username, email, phone, countryCode = "+91", passwordHash, role = "Field Monitor" }) {
  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    username: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    phone: phone.replace(/[\s-]/g, ""),
    countryCode,
    passwordHash,
    role
  };

  if (isMongoConnected) {
    try {
      const created = await UserModel.create(newUser);
      // Keep local in sync
      try {
        const local = await readLocalUsers();
        local.push(cleanMongoDoc(created.toObject()));
        await writeLocalUsers(local);
      } catch {}
      return cleanMongoDoc(created.toObject());
    } catch (err) {
      console.warn("MongoDB createUser error, falling back to local:", err.message);
    }
  }

  const users = await readLocalUsers();
  users.push(newUser);
  await writeLocalUsers(users);
  return newUser;
}

async function updateUser(id, updates) {
  const updateObj = {};
  if (updates.username) updateObj.username = updates.username.trim().toLowerCase();
  if (updates.email) updateObj.email = updates.email.trim().toLowerCase();
  if (updates.phone) updateObj.phone = updates.phone.replace(/[\s-]/g, "");
  if (updates.countryCode) updateObj.countryCode = updates.countryCode;
  if (updates.password) {
    updateObj.passwordHash = await bcrypt.hash(updates.password, 10);
  }

  if (isMongoConnected) {
    try {
      const updated = await UserModel.findOneAndUpdate({ id }, { $set: updateObj }, { new: true }).lean();
      if (updated) {
        try {
          const local = await readLocalUsers();
          const idx = local.findIndex((u) => u.id === id);
          if (idx !== -1) {
            local[idx] = { ...local[idx], ...updateObj };
            await writeLocalUsers(local);
          }
        } catch {}
        return cleanMongoDoc(updated);
      }
    } catch (err) {
      console.warn("MongoDB updateUser error, falling back to local:", err.message);
    }
  }

  const users = await readLocalUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;

  users[idx] = { ...users[idx], ...updateObj, updatedAt: new Date().toISOString() };
  await writeLocalUsers(users);
  return users[idx];
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, _id, __v, ...safe } = user;
  return safe;
}

// ═════════════════════════════════════════════════════════════════════
// HAZARD SERVICE OPERATIONS
// ═════════════════════════════════════════════════════════════════════

async function readHazards() {
  if (isMongoConnected) {
    try {
      const hazards = await HazardModel.find({ deleted: { $ne: true } })
        .sort({ timestamp: -1 })
        .lean();
      return hazards.map(cleanMongoDoc);
    } catch (err) {
      console.warn("MongoDB readHazards error, falling back to local:", err.message);
    }
  }
  const local = await readLocalHazards();
  return local.filter((h) => !h.deleted);
}

async function createHazard(hazardData) {
  const newHazard = {
    id: `haz_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: hazardData.type || "other",
    location: hazardData.location || "Unknown Location",
    phone: hazardData.phone || "+91 9999999999",
    observerPhone: hazardData.observerPhone || "9999999999",
    countryCode: hazardData.countryCode || "+91",
    latitude: typeof hazardData.latitude === "number" ? hazardData.latitude : parseFloat(hazardData.latitude) || 20.5937,
    longitude: typeof hazardData.longitude === "number" ? hazardData.longitude : parseFloat(hazardData.longitude) || 78.9629,
    severity: hazardData.severity || "medium",
    status: hazardData.status || "open",
    pinned: Boolean(hazardData.pinned),
    votes: typeof hazardData.votes === "number" ? hazardData.votes : 1,
    deleted: false,
    rawText: hazardData.rawText || "",
    summaryOriginal: hazardData.summaryOriginal || null,
    summaryEnglish: hazardData.summaryEnglish || null,
    summaryHindi: hazardData.summaryHindi || null,
    summaryMarathi: hazardData.summaryMarathi || null,
    summaryTamil: hazardData.summaryTamil || null,
    summaryBengali: hazardData.summaryBengali || null,
    sourceLanguage: hazardData.sourceLanguage || null,
    photoUrl: hazardData.photoUrl || null,
    userEmail: hazardData.userEmail || null,
    userName: hazardData.userName || null,
    verified: Boolean(hazardData.verified || hazardData.isVerifiedReporter),
    isVerifiedReporter: Boolean(hazardData.verified || hazardData.isVerifiedReporter),
    timestamp: new Date()
  };

  if (isMongoConnected) {
    try {
      const created = await HazardModel.create(newHazard);
      try {
        const local = await readLocalHazards();
        local.unshift(cleanMongoDoc(created.toObject()));
        await writeLocalHazards(local);
      } catch {}
      return cleanMongoDoc(created.toObject());
    } catch (err) {
      console.warn("MongoDB createHazard error, falling back to local:", err.message);
    }
  }

  const hazards = await readLocalHazards();
  hazards.unshift(newHazard);
  await writeLocalHazards(hazards);
  return newHazard;
}

async function updateHazard(id, updates) {
  const updateObj = {};
  if (updates.status !== undefined) updateObj.status = updates.status;
  if (updates.pinned !== undefined) updateObj.pinned = Boolean(updates.pinned);
  if (updates.deleted !== undefined) updateObj.deleted = Boolean(updates.deleted);
  if (updates.votes !== undefined) updateObj.votes = updates.votes;
  if (updates.verified !== undefined) updateObj.verified = Boolean(updates.verified);
  if (updates.isVerifiedReporter !== undefined) updateObj.isVerifiedReporter = Boolean(updates.isVerifiedReporter);

  if (isMongoConnected) {
    try {
      let updated;
      if (updates.voteDelta !== undefined) {
        updated = await HazardModel.findOneAndUpdate(
          { id },
          { $inc: { votes: updates.voteDelta }, $set: updateObj },
          { new: true }
        ).lean();
      } else {
        updated = await HazardModel.findOneAndUpdate({ id }, { $set: updateObj }, { new: true }).lean();
      }

      if (updated) {
        try {
          const local = await readLocalHazards();
          const idx = local.findIndex((h) => h.id === id);
          if (idx !== -1) {
            local[idx] = cleanMongoDoc(updated);
            await writeLocalHazards(local);
          }
        } catch {}
        return cleanMongoDoc(updated);
      }
    } catch (err) {
      console.warn("MongoDB updateHazard error, falling back to local:", err.message);
    }
  }

  const hazards = await readLocalHazards();
  const idx = hazards.findIndex((h) => h.id === id);
  if (idx === -1) return null;

  const current = hazards[idx];
  if (updates.status !== undefined) current.status = updates.status;
  if (updates.pinned !== undefined) current.pinned = Boolean(updates.pinned);
  if (updates.deleted !== undefined) current.deleted = Boolean(updates.deleted);
  if (updates.votes !== undefined) current.votes = updates.votes;
  if (updates.voteDelta !== undefined) current.votes = (current.votes || 0) + updates.voteDelta;
  if (updates.verified !== undefined) current.verified = Boolean(updates.verified);
  if (updates.isVerifiedReporter !== undefined) current.isVerifiedReporter = Boolean(updates.isVerifiedReporter);

  hazards[idx] = current;
  await writeLocalHazards(hazards);
  return current;
}

async function deleteHazard(id) {
  return await updateHazard(id, { deleted: true });
}

// ═════════════════════════════════════════════════════════════════════
// VERIFIED REPORTERS METHODS
// ═════════════════════════════════════════════════════════════════════

async function readVerifiedReporters() {
  try {
    const raw = await fs.readFile(VERIFIED_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const initial = [
      { email: "admin@geonetra.com", verifiedAt: new Date().toISOString(), verifiedBy: "System Admin" }
    ];
    try {
      await fs.writeFile(VERIFIED_FILE, JSON.stringify(initial, null, 2), "utf-8");
    } catch {}
    return initial;
  }
}

async function addVerifiedReporter(email, verifiedBy = "Admin") {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) throw new Error("Email is required");
  const list = await readVerifiedReporters();
  const exists = list.some((item) => (typeof item === "string" ? item.toLowerCase() : item.email?.toLowerCase()) === clean);
  if (exists) {
    throw new Error("Reporter email is already verified.");
  }
  const entry = {
    email: clean,
    verifiedAt: new Date().toISOString(),
    verifiedBy
  };
  list.unshift(entry);
  await fs.writeFile(VERIFIED_FILE, JSON.stringify(list, null, 2), "utf-8");
  return entry;
}

async function removeVerifiedReporter(email) {
  const clean = String(email || "").trim().toLowerCase();
  let list = await readVerifiedReporters();
  list = list.filter((item) => (typeof item === "string" ? item.toLowerCase() : item.email?.toLowerCase()) !== clean);
  await fs.writeFile(VERIFIED_FILE, JSON.stringify(list, null, 2), "utf-8");
  return true;
}

module.exports = {
  connectMongoDB,
  isMongoConnected: () => isMongoConnected,
  readUsers,
  findUserByIdentifier,
  findUserById,
  createUser,
  updateUser,
  sanitizeUser,
  readHazards,
  createHazard,
  updateHazard,
  deleteHazard,
  readVerifiedReporters,
  addVerifiedReporter,
  removeVerifiedReporter
};
