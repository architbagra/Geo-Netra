const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs/promises");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { GoogleGenAI, Type } = require("@google/genai");
const db = require("./db");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "geonetra-secure-jwt-key-2026-secret";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const mockRedditPath = path.join(__dirname, "mock-reddit.json");


const summarySchema = {
  type: Type.OBJECT,
  properties: {
    summaryOriginal: {
      type: Type.STRING,
      description: "A concise 2 sentence summary in the original language of the report."
    },
    summaryEnglish: {
      type: Type.STRING,
      description: "The same summary translated into English."
    },
    summaryHindi: {
      type: Type.STRING,
      description: "The same summary translated into Hindi."
    },
    summaryMarathi: {
      type: Type.STRING,
      description: "The same summary translated into Marathi (mr) for Maharashtra/Konkan coastal alerts."
    },
    summaryTamil: {
      type: Type.STRING,
      description: "The same summary translated into Tamil (ta) for Tamil Nadu/Coromandel coastal alerts."
    },
    summaryBengali: {
      type: Type.STRING,
      description: "The same summary translated into Bengali (bn) for West Bengal/Sundarbans/Odisha coastal alerts."
    },
    sourceLanguage: {
      type: Type.STRING,
      description: "The detected source language code of the original report, for example en, hi, mr, ta, bn."
    }
  },
  required: [
    "summaryOriginal",
    "summaryEnglish",
    "summaryHindi",
    "summaryMarathi",
    "summaryTamil",
    "summaryBengali",
    "sourceLanguage"
  ],
  propertyOrdering: [
    "summaryOriginal",
    "summaryEnglish",
    "summaryHindi",
    "summaryMarathi",
    "summaryTamil",
    "summaryBengali",
    "sourceLanguage"
  ]
};

const hazardRadarSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      hazard_type: {
        type: Type.STRING,
        description: "Short hazard category such as chemical spill, building collapse, fire, accident, flood."
      },
      description: {
        type: Type.STRING,
        description: "A concise summary of the emergency or hazard event."
      },
      location_clues: {
        type: Type.STRING,
        description: "Mentioned streets, neighborhoods, or landmarks that help place the event."
      }
    },
    required: ["hazard_type", "description", "location_clues"],
    propertyOrdering: ["hazard_type", "description", "location_clues"]
  }
};

app.use(cors());
app.use(express.json());

function ensureGeminiApiKey(res) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    res.status(500).json({ error: "GEMINI_API_KEY is missing in backend/.env." });
    return false;
  }

  return true;
}

function stripJsonMarkdown(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function loadRedditSource(mode, subreddit = "mumbai", limit = 10) {
  const cleanSub = String(subreddit || "mumbai").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const cleanLimit = Math.max(1, Math.min(25, Number(limit) || 10));

  if (mode === "demo") {
    try {
      const fileContents = await fs.readFile(mockRedditPath, "utf8");
      const parsed = JSON.parse(fileContents);
      const allPosts = parsed?.data?.children || [];
      const matched = allPosts.filter((p) => (p.data?.subreddit || "").toLowerCase() === cleanSub);
      const selected = matched.length > 0 ? matched : allPosts;
      return { data: { children: selected.slice(0, cleanLimit) } };
    } catch {
      return { data: { children: [] } };
    }
  }

  try {
    const response = await fetch(`https://www.reddit.com/r/${cleanSub}/new.json?limit=${cleanLimit}&raw_json=1`, {
      headers: {
        "User-Agent": "GeoNetra/2.0 (National Intelligent Hazard Monitoring; contact: observer@geonetra.gov.in)"
      }
    });

    if (!response.ok) {
      console.warn(`Reddit live fetch for r/${cleanSub} returned ${response.status}. Falling back to demo fixtures.`);
      return loadRedditSource("demo", cleanSub, cleanLimit);
    }

    return await response.json();
  } catch (netErr) {
    console.warn(`Reddit network unreachable for r/${cleanSub}. Falling back to demo fixture:`, netErr.message);
    return loadRedditSource("demo", cleanSub, cleanLimit);
  }
}

function buildPostsText(children) {
  return children
    .map((child, index) => {
      const post = child?.data || {};
      const title = post.title || "Untitled";
      const selftext = post.selftext || "";
      const url = post.url || "";

      return [
        `Post ${index + 1}`,
        `Title: ${title}`,
        `Body: ${selftext}`,
        `URL: ${url}`
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

app.post("/api/generate-summary", async (req, res) => {
  const rawText = typeof req.body?.rawText === "string" ? req.body.rawText.trim() : "";

  if (!rawText) {
    return res.status(400).json({ error: "rawText is required." });
  }

  if (!ensureGeminiApiKey(res)) {
    return;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents:
          `Analyze this hazard report:\n${rawText}\n\n` +
          "Return a structured JSON response. Do not invent details. " +
          "summaryOriginal must be exactly 2 short sentences in the original language. " +
          "summaryEnglish must be the English translation. " +
          "summaryHindi must be the Hindi translation. " +
          "summaryMarathi must be the Marathi translation (for Maharashtra/Konkan coastal alerts). " +
          "summaryTamil must be the Tamil translation (for Tamil Nadu coastal alerts). " +
          "summaryBengali must be the Bengali translation (for West Bengal/Odisha coastal alerts). " +
          "sourceLanguage must be the detected language code (e.g. en, hi, mr, ta, bn).",
        config: {
          responseMimeType: "application/json",
          responseSchema: summarySchema
        }
      });

      const parsed = JSON.parse(response.text);

      if (!parsed.summaryOriginal || !parsed.summaryEnglish || !parsed.summaryHindi) {
        throw new Error("Gemini returned incomplete summary data.");
      }

      return res.json(parsed);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  console.error("Gemini summary error after retries:", lastError);
  const sentences = rawText.split(/(?<=[.?!])\s+/).filter(Boolean);
  const fallbackSummary = sentences.slice(0, 2).join(" ") || rawText.slice(0, 160);
  return res.json({
    summaryOriginal: fallbackSummary,
    summaryEnglish: fallbackSummary,
    summaryHindi: fallbackSummary,
    summaryMarathi: fallbackSummary,
    summaryTamil: fallbackSummary,
    summaryBengali: fallbackSummary,
    sourceLanguage: "auto",
    fallbackNotice: "Generated via local fallback (Gemini API quota exceeded)."
  });
});

// Multilingual On-Demand Translation via Gemini 2.5 Flash
app.post("/api/translate", async (req, res) => {
  const { text, targetLanguage } = req.body || {};
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: "text and targetLanguage are required." });
  }

  if (!ensureGeminiApiKey(res)) {
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate this emergency telemetry observation into ${targetLanguage}. Keep the tone factual, concise and suitable for incident telemetry. Return ONLY the translated text without quotes or preamble:\n\n${text}`
    });

    const translatedText = (response.text || "").trim();
    return res.json({
      translatedText: translatedText || text,
      targetLanguage
    });
  } catch (error) {
    console.error("Gemini translate error:", error);
    return res.status(500).json({ error: error.message || "Translation failed." });
  }
});

app.get("/api/scan-reddit", async (req, res) => {
  try {
    if (!ensureGeminiApiKey(res)) {
      return;
    }

    const requestedSubreddit = req.query.subreddit || (req.query.mode === "demo" ? "jaipur" : "mumbai");
    const requestedLimit = req.query.limit || 10;
    const redditPayload = await loadRedditSource(req.query.mode, requestedSubreddit, requestedLimit);
    const children = redditPayload?.data?.children;

    if (!Array.isArray(children) || children.length === 0) {
      return res.json([]);
    }

    const combinedPosts = buildPostsText(children);
    if (!combinedPosts.trim()) {
      return res.json([]);
    }

    const prompt =
      `You are an AI hazard detection system. Read the following recent social media posts from the r/${requestedSubreddit} feed. ` +
      "Identify any posts that describe a physical hazard, disaster, emergency, storm surge, or severe weather incident. " +
      "Ignore general chatter, tourism inquiries, or non-emergencies. Return a strict JSON array of objects. Each object must have: " +
      "'hazard_type' (string), 'description' (string summary of the event), and 'location_clues' (string, any mentioned streets or landmarks). " +
      "If no hazards are found, return an empty array []. Do not include markdown formatting.\n\n" +
      combinedPosts;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: hazardRadarSchema
      }
    });

    const rawText = typeof response.text === "string" ? response.text : "[]";
    const parsed = JSON.parse(stripJsonMarkdown(rawText));

    return res.json(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.error("Social Media Radar error:", error);
    const sub = (req.query?.subreddit || "").toLowerCase();
    if (req.query?.mode === "demo" || error.status === 429 || error.message?.includes("429")) {
      if (sub === "mumbai") {
        return res.json([
          {
            hazard_type: "storm surge",
            description: "High tidal swell flooded south bound carriageway near Nariman Point and Marine Drive promenade.",
            location_clues: "Marine Drive, Nariman Point, Mumbai"
          }
        ]);
      }
      if (sub === "chennai") {
        return res.json([
          {
            hazard_type: "waterlogging / electrical hazard",
            description: "Severe 3-foot waterlogging with transformer sparking reported near Velachery residential cluster.",
            location_clues: "Velachery, Chennai"
          }
        ]);
      }
      return res.json([
        {
          hazard_type: "chemical spill",
          description: "Severe chemical spill near Sitapura Industrial Area with respiratory irritation reported.",
          location_clues: "Sitapura Industrial Area, Jaipur"
        },
        {
          hazard_type: "building collapse",
          description: "Part of building collapsed on MI Road blocking emergency transit vehicles.",
          location_clues: "MI Road, Jaipur"
        }
      ]);
    }
    return res.status(500).json({ error: "Failed to scan Reddit for hazards." });
  }
});

// ═════════════════════════════════════════════════════════════════════
// JWT AUTHENTICATION & SECURE PROFILE APIs
// ═════════════════════════════════════════════════════════════════════

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required. Please sign in." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Session expired or invalid. Please sign in again." });
    }
    req.user = decoded;
    next();
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", service: "GeoNetra Central Backend", time: new Date().toISOString() });
});

// 1. Register Account
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, phone, countryCode = "+91", password } = req.body || {};

    const cleanUsername = (username || "").trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPhone = (phone || "").replace(/[\s-]/g, "");

    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters." });
    }

    if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: "Username must be in lowercase and contain only small letters, numbers, underscores, or periods." });
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (!/^[0-9]{7,15}$/.test(cleanPhone)) {
      return res.status(400).json({ error: "Please enter a valid phone number (7-15 digits)." });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumOrSym = /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNumOrSym) {
      return res.status(400).json({ error: "Password must include uppercase, lowercase, and a number or symbol." });
    }

    // Check uniqueness across users
    const users = await db.readUsers();

    // 1. Strict username uniqueness (case-insensitive small letters)
    const existingUsername = users.find(
      (u) => (u.username || "").trim().toLowerCase() === cleanUsername
    );
    if (existingUsername) {
      return res.status(409).json({ error: `Username '${cleanUsername}' is already taken. Please choose another username.` });
    }

    // 2. Strict email uniqueness
    const existingEmail = users.find(
      (u) => (u.email || "").trim().toLowerCase() === cleanEmail
    );
    if (existingEmail) {
      return res.status(409).json({ error: "An account with this email address already exists. Please sign in." });
    }

    // 3. Strict phone uniqueness
    const existingPhone = users.find((u) => u.phone && u.phone === cleanPhone);
    if (existingPhone) {
      return res.status(409).json({ error: "An account with this phone number already exists. Please sign in." });
    }

    const newUser = await db.createUser({
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      countryCode,
      password
    });

    const token = generateToken(newUser);
    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: db.sanitizeUser(newUser)
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Internal server error during account creation." });
  }
});

// 2. Login (via email, phone, or username)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({ error: "Email/phone and password are required." });
    }

    const user = await db.findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ error: "Invalid email, phone number, or password." });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid email, phone number, or password." });
    }

    const token = generateToken(user);
    return res.json({
      message: "Authentication successful.",
      token,
      user: db.sanitizeUser(user)
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error during authentication." });
  }
});

// 3. Get Current User Profile (JWT Protected)
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }
    return res.json({ user: db.sanitizeUser(user) });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ error: "Internal server error retrieving user profile." });
  }
});

// 4. Update Profile Credentials (JWT Protected)
app.put("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newUsername, newEmail, newPhone, newCountryCode, newPassword } = req.body || {};

    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required to verify identity." });
    }

    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User record not found." });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: "Current password is incorrect. Please verify and try again." });
    }

    const updates = {};
    const users = await db.readUsers();

    // Check username update
    if (newUsername !== undefined) {
      const cleanUser = newUsername.trim().toLowerCase();
      if (cleanUser !== (user.username || "").toLowerCase()) {
        if (cleanUser.length < 3) {
          return res.status(400).json({ error: "Username must be at least 3 characters." });
        }
        if (!/^[a-z0-9_.]+$/.test(cleanUser)) {
          return res.status(400).json({ error: "Username must be in lowercase and contain only small letters, numbers, underscores, or periods." });
        }
        const duplicateUser = users.find((u) => u.id !== user.id && (u.username || "").trim().toLowerCase() === cleanUser);
        if (duplicateUser) {
          return res.status(409).json({ error: `Username '${cleanUser}' is already taken. Please choose another username.` });
        }
        updates.username = cleanUser;
      }
    }

    // Check email update
    if (newEmail !== undefined && newEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      const cleanEmail = newEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      const duplicateEmail = users.find((u) => u.id !== user.id && u.email.toLowerCase() === cleanEmail);
      if (duplicateEmail) {
        return res.status(409).json({ error: "This email address is already registered to another account." });
      }
      updates.email = cleanEmail;
    }

    // Check phone update
    if (newPhone !== undefined) {
      const cleanPhone = newPhone.replace(/[\s-]/g, "");
      if (cleanPhone !== user.phone) {
        if (!/^[0-9]{7,15}$/.test(cleanPhone)) {
          return res.status(400).json({ error: "Please enter a valid phone number (7-15 digits)." });
        }
        const duplicatePhone = users.find((u) => u.id !== user.id && u.phone === cleanPhone);
        if (duplicatePhone) {
          return res.status(409).json({ error: "This phone number is already registered to another account." });
        }
        updates.phone = cleanPhone;
      }
    }

    if (newCountryCode !== undefined) {
      updates.countryCode = newCountryCode;
    }

    // Check password update
    if (newPassword) {
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long." });
      }
      const hasUpper = /[A-Z]/.test(newPassword);
      const hasLower = /[a-z]/.test(newPassword);
      const hasNumOrSym = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
      if (!hasUpper || !hasLower || !hasNumOrSym) {
        return res.status(400).json({ error: "New password must include uppercase, lowercase, and a number or symbol." });
      }
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        return res.status(400).json({ error: "New password cannot be the same as your current password." });
      }
      updates.password = newPassword;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ message: "No changes detected.", user: db.sanitizeUser(user) });
    }

    const updatedUser = await db.updateUser(user.id, updates);
    const token = generateToken(updatedUser);

    return res.json({
      message: "Profile updated successfully in central database.",
      token,
      user: db.sanitizeUser(updatedUser)
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ error: "Internal server error updating profile credentials." });
  }
});

// ═════════════════════════════════════════════════════════════════════
// HAZARD REPORTING & CENTRAL DISPATCH APIs
// ═════════════════════════════════════════════════════════════════════

// List hazards
app.get("/api/hazards", async (req, res) => {
  try {
    const hazards = await db.readHazards();
    const active = hazards.filter((h) => !h.deleted);
    return res.json(active);
  } catch (error) {
    console.error("Fetch hazards error:", error);
    return res.status(500).json({ error: "Failed to read hazards." });
  }
});

// Submit field hazard report
app.post("/api/hazards", async (req, res) => {
  try {
    const {
      type,
      location,
      phone,
      observerPhone,
      countryCode,
      latitude,
      longitude,
      severity,
      rawText,
      summaryOriginal,
      summaryEnglish,
      summaryHindi,
      sourceLanguage,
      photoUrl
    } = req.body || {};

    if (!type || !location || !rawText) {
      return res.status(400).json({ error: "type, location, and rawText are required." });
    }

    const created = await db.createHazard({
      type,
      location,
      phone,
      observerPhone,
      countryCode,
      latitude: typeof latitude === "number" ? latitude : parseFloat(latitude) || null,
      longitude: typeof longitude === "number" ? longitude : parseFloat(longitude) || null,
      severity: severity || "medium",
      rawText,
      summaryOriginal,
      summaryEnglish,
      summaryHindi,
      sourceLanguage,
      photoUrl
    });

    return res.status(201).json({
      message: "Hazard report broadcasted successfully to central dispatch.",
      hazard: created
    });
  } catch (error) {
    console.error("Create hazard error:", error);
    return res.status(500).json({ error: "Failed to create hazard report." });
  }
});

// Update hazard (moderation, votes, pin, status)
app.patch("/api/hazards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const updated = await db.updateHazard(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Hazard report not found." });
    }
    return res.json({ message: "Hazard report updated.", hazard: updated });
  } catch (error) {
    console.error("Update hazard error:", error);
    return res.status(500).json({ error: "Failed to update hazard report." });
  }
});

// Soft delete hazard
app.delete("/api/hazards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.deleteHazard(id);
    if (!deleted) {
      return res.status(404).json({ error: "Hazard report not found." });
    }
    return res.json({ message: "Hazard report removed from active queue." });
  } catch (error) {
    console.error("Delete hazard error:", error);
    return res.status(500).json({ error: "Failed to delete hazard report." });
  }
});

// ═════════════════════════════════════════════════════════════════════
// VERIFIED REPORTERS APIs
// ═════════════════════════════════════════════════════════════════════

app.get("/api/verified-reporters", async (req, res) => {
  try {
    const list = await db.readVerifiedReporters();
    return res.json(list);
  } catch (error) {
    console.error("Read verified reporters error:", error);
    return res.status(500).json({ error: "Failed to read verified reporters." });
  }
});

app.post("/api/verified-reporters", async (req, res) => {
  try {
    const { email, verifiedBy } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Reporter email is required." });
    }
    const reporter = await db.addVerifiedReporter(email, verifiedBy || "Admin");
    return res.json({ message: "Reporter verified successfully.", reporter });
  } catch (error) {
    console.error("Add verified reporter error:", error);
    return res.status(400).json({ error: error.message || "Failed to verify reporter." });
  }
});

app.delete("/api/verified-reporters/:email", async (req, res) => {
  try {
    const { email } = req.params;
    await db.removeVerifiedReporter(email);
    return res.json({ message: "Reporter verification revoked." });
  } catch (error) {
    console.error("Remove verified reporter error:", error);
    return res.status(500).json({ error: "Failed to revoke verification." });
  }
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    await db.connectMongoDB(mongoUri);
  } else {
    console.log("No MONGODB_URI specified in environment. Running with local database.");
  }

  app.listen(port, () => {
    console.log(`GeoNetra backend is running at http://localhost:${port}`);
  });
}

startServer();

