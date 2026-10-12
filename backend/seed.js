/**
 * GeoNetra Multi-Hazard Telemetry Database Fixture Seeder
 * Member 4 Deliverable: Populates realistic coastal cyclone, flood, and earthquake fixtures.
 * Run directly via: node seed.js OR npm run seed
 */

const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("./db");

dotenv.config({ path: path.join(__dirname, ".env") });

const DEMO_HAZARDS = [
  {
    id: "haz_odisha_cyclone_2026",
    type: "cyclone",
    location: "Puri Sea Beach, Swargadwar, Odisha",
    phone: "+91 9437012345",
    observerPhone: "9437012345",
    countryCode: "+91",
    latitude: 19.8135,
    longitude: 85.8312,
    severity: "critical",
    status: "open",
    pinned: true,
    votes: 42,
    deleted: false,
    rawText: "Extremely severe cyclonic storm approaching Puri coast. Wind gusts exceeding 135 km/h with 4-meter storm surge inundating coastal fishing settlements near Swargadwar. Immediate Level-4 evacuation underway.",
    summaryOriginal: "Extremely severe cyclonic storm approaching Puri coast with 135 km/h gusts and 4m tidal surge. Immediate Level-4 evacuation underway for coastal settlements.",
    summaryEnglish: "Extremely severe cyclonic storm approaching Puri coast with 135 km/h gusts and 4m tidal surge. Immediate Level-4 evacuation underway for coastal settlements.",
    summaryHindi: "पुरी तट की ओर 135 किमी/घंटा की गति से भीषण चक्रवाती तूफान बढ़ रहा है। तटीय बस्तियों के लिए तत्काल स्तर-4 निकासी अभियान शुरू किया गया है।",
    summaryBengali: "পুরী উপকূলের দিকে ১৩৫ কিমি বেগে অতি তীব্র ঘূর্ণিঝড় ধেয়ে আসছে। উপকূলীয় এলাকার জন্য জরুরি স্তর-৪ উচ্ছেদ শুরু হয়েছে।",
    summaryMarathi: "पुरी किनारपट्टीकडे १३५ किमी वेगाने तीव्र चक्रीवादळ येत आहे. किनारपट्टी भागासाठी त्वरित स्थलांतर सुरू आहे.",
    summaryTamil: "பூரி கடற்கரையை நோக்கி 135 கிமீ வேகத்தில் அதி தீவிர புயல் நெருங்குகிறது. உடனடி வெளியேற்றம் தொடங்கப்பட்டுள்ளது.",
    sourceLanguage: "en",
    photoUrl: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=800&q=80",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "haz_chennai_waterlogging_2026",
    type: "flood",
    location: "Velachery Main Road & Lake Basin, Chennai, Tamil Nadu",
    phone: "+91 9840012345",
    observerPhone: "9840012345",
    countryCode: "+91",
    latitude: 12.9815,
    longitude: 80.2180,
    severity: "high",
    status: "open",
    pinned: true,
    votes: 31,
    deleted: false,
    rawText: "Intense torrential downpour causing 3.5 feet severe waterlogging along Velachery 100 Feet Road. Power transformers submerged and switched off. Emergency boats deployed for ground floor residents.",
    summaryOriginal: "Intense downpour causing 3.5ft waterlogging on Velachery Main Road. Transformers submerged; rescue boats deployed for residents.",
    summaryEnglish: "Intense downpour causing 3.5ft waterlogging on Velachery Main Road. Transformers submerged; rescue boats deployed for residents.",
    summaryHindi: "चेन्नई के वेलाचेरी में भारी बारिश से 3.5 फीट जलभराव हुआ। बिजली के ट्रांसफार्मर डूबे, निवासियों के लिए नाव तैनात की गईं।",
    summaryTamil: "வேளச்சேரி மெயின் ரோட்டில் 3.5 அடி வெள்ளநீர் தேங்கியுள்ளது. மின்சாரம் துண்டிக்கப்பட்டு படகுகள் மூலம் மீட்புப்பணி நடக்கிறது.",
    summaryBengali: "চেন্নাইয়ের ভেলাচেরিতে প্রবল বর্ষণে সাড়ে তিন ফুট জলমগ্নতা। উদ্ধারকারী নৌকা মোতায়েন করা হয়েছে।",
    summaryMarathi: "चेन्नईच्या वेलाचेरीमध्ये मुसळधार पावसामुळे ३.५ फूट पाणी साचले आहे. बचाव नौका तैनात करण्यात आल्या आहेत.",
    sourceLanguage: "en",
    photoUrl: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "haz_mumbai_high_tide_2026",
    type: "storm",
    location: "Marine Drive Promenade & Colaba, Mumbai, Maharashtra",
    phone: "+91 9820012345",
    observerPhone: "9820012345",
    countryCode: "+91",
    latitude: 18.9438,
    longitude: 72.8232,
    severity: "high",
    status: "open",
    pinned: true,
    votes: 27,
    deleted: false,
    rawText: "Spring high tide measuring 4.9 meters combined with gale winds splashing heavy seawater over Marine Drive tetrapods. Southbound carriageway traffic diverted. Citizens advised to avoid promenade.",
    summaryOriginal: "4.9-meter spring high tide splashing seawater over Marine Drive promenade. Traffic diverted; public access restricted.",
    summaryEnglish: "4.9-meter spring high tide splashing seawater over Marine Drive promenade. Traffic diverted; public access restricted.",
    summaryHindi: "मरीन ड्राइव पर 4.9 मीटर ऊंची ज्वार की लहरें सड़क पर आ रही हैं। यातायात डायवर्ट किया गया और सैरगाह पर प्रतिबंध लगाया गया।",
    summaryMarathi: "मरीन ड्राइव्हवर ४.९ मीटर उंचीच्या भरतीच्या लाटा उसळत आहेत. वाहतूक वळवण्यात आली असून नागरिकांना सावध राहण्याचा इशारा देण्यात आला आहे.",
    summaryTamil: "மும்பை மரைன் டிரைவில் 4.9 மீட்டர் உயர அலைகள் எழுகின்றன. போக்குவரத்து மாற்றி அமைக்கப்பட்டுள்ளது.",
    summaryBengali: "মুম্বাইয়ের মেরিন ড্রাইভে ৪.৯ মিটার উচ্চ জোয়ারের ঢেউ উঠছে। যান চলাচল নিয়ন্ত্রণ করা হয়েছে।",
    sourceLanguage: "en",
    photoUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
    timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "haz_wayanad_landslide_2026",
    type: "landslide",
    location: "Meppadi Hill Slopes, Wayanad, Kerala",
    phone: "+91 9447012345",
    observerPhone: "9447012345",
    countryCode: "+91",
    latitude: 11.5512,
    longitude: 76.1264,
    severity: "critical",
    status: "open",
    pinned: false,
    votes: 19,
    deleted: false,
    rawText: "Major mudslide and debris flow triggered by continuous 48-hour monsoon downpour. Ghat road blocked by fallen trees and boulders. NDRF team dispatched with earth-moving equipment.",
    summaryOriginal: "Major mudslide triggered by 48h torrential rain in Wayanad. Ghat road blocked; NDRF deployed for clearance.",
    summaryEnglish: "Major mudslide triggered by 48h torrential rain in Wayanad. Ghat road blocked; NDRF deployed for clearance.",
    summaryHindi: "वायनाड में 48 घंटे की मूसलाधार बारिश से बड़ा भूस्खलन। घाट सड़क अवरुद्ध, एनडीआरएफ की टीमें तैनात।",
    summaryTamil: "வயநாட்டில் நிலச்சரிவு காரணமாக மலைப்பாதை துண்டிக்கப்பட்டது. மீட்புப்படையினர் விரைந்துள்ளனர்.",
    summaryMarathi: "वायनाडमध्ये ४८ तासांच्या पावसामुळे दरड कोसळली. घाट रस्ता बंद असून एनडीआरएफ तैनात आहे.",
    summaryBengali: "ওয়ায়নাডে ভারী বৃষ্টির কারণে ভূমিধস। পাহাড়ের রাস্তা অবরুদ্ধ, এনডিআরএফ মোতায়েন।",
    sourceLanguage: "en",
    photoUrl: "https://images.unsplash.com/photo-1546874177-9e664107314e?auto=format&fit=crop&w=800&q=80",
    timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "haz_joshimath_subsidence_2026",
    type: "earthquake",
    location: "Joshimath Upper Ward, Chamoli, Uttarakhand",
    phone: "+91 9412012345",
    observerPhone: "9412012345",
    countryCode: "+91",
    latitude: 30.5574,
    longitude: 79.5658,
    severity: "high",
    status: "open",
    pinned: false,
    votes: 14,
    deleted: false,
    rawText: "Seismic tremor followed by widening structural fissures on 12 residential dwellings and pedestrian paths in Upper Ward. SDMA geological assessment team conducting laser crack telemetry.",
    summaryOriginal: "Seismic tremor and widening structural fissures detected in Joshimath Upper Ward. SDMA geological team conducting survey.",
    summaryEnglish: "Seismic tremor and widening structural fissures detected in Joshimath Upper Ward. SDMA geological team conducting survey.",
    summaryHindi: "जोशीमठ में भूकंपीय झटकों के बाद मकानों में दरारें चौड़ी हुईं। एसडीएमए भूगर्भीय टीम जांच में जुटी।",
    summaryTamil: "ஜோஷிமத்தில் நில அதிர்வுக்குப் பின் கட்டடங்களில் விரிசல்கள் கண்டறியப்பட்டு ஆய்வுகள் நடக்கின்றன.",
    summaryMarathi: "जोशीमठमध्ये भूकंपाच्या धक्क्यानंतर भेगा रुंदावल्या. एसडीएमए पथक पाहणी करत आहे.",
    summaryBengali: "যোশীমঠে কম্পনের পর ফাটল বৃদ্ধি পেয়েছে। ভূতাত্ত্বিক দল সমীক্ষা চালাচ্ছে।",
    sourceLanguage: "en",
    photoUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "haz_vizag_chemical_2026",
    type: "chemical",
    location: "Gajuwaka Industrial Belt, Visakhapatnam, Andhra Pradesh",
    phone: "+91 9440012345",
    observerPhone: "9440012345",
    countryCode: "+91",
    latitude: 17.6904,
    longitude: 83.2185,
    severity: "critical",
    status: "open",
    pinned: true,
    votes: 38,
    deleted: false,
    rawText: "Ammonia valve rupture at commercial refrigeration warehouse. Dense pungent vapor cloud dispersing southwest. Fire department deploying water mist neutralization curtains. Citizens instructed to shelter in place.",
    summaryOriginal: "Industrial ammonia leak in Gajuwaka belt. Water curtains deployed; nearby citizens ordered to seal windows and shelter in place.",
    summaryEnglish: "Industrial ammonia leak in Gajuwaka belt. Water curtains deployed; nearby citizens ordered to seal windows and shelter in place.",
    summaryHindi: "विशाखापट्टनम के गाजुवाका में अमोनिया गैस रिसाव। पानी के पर्दों से न्यूट्रलाइजेशन जारी, नागरिकों को घरों में रहने के निर्देश।",
    summaryTamil: "விசாகப்பட்டினம் தொழிற்பேட்டையில் அமோனியா வாயு கசிவு. பொதுமக்கள் உள்ளேயே இருக்குமாறு அறிவுறுத்தப்பட்டுள்ளனர்.",
    summaryMarathi: "विशाखापट्टणम येथे अमोनिया वायू गळती. नागरिकांना घरात सुरक्षित राहण्याचे आवाहन.",
    summaryBengali: "বিশাখাপত্তনমে অ্যামোনিয়া গ্যাস লিক। বাসিন্দাদের ঘরের ভেতরে থাকার নির্দেশ।",
    sourceLanguage: "en",
    photoUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const SEED_USERS = [
  {
    username: "admin",
    email: "admin@geonetra.gov.in",
    phone: "9112345678",
    countryCode: "+91",
    password: "AdminPassword@2026",
    role: "admin"
  },
  {
    username: "field_commander",
    email: "commander@geonetra.gov.in",
    phone: "9118765432",
    countryCode: "+91",
    password: "CommanderPassword@2026",
    role: "Field Monitor"
  }
];

const SEED_REPORTERS = [
  { email: "ndma.operations@nic.in", verifiedBy: "System Administrator" },
  { email: "sdma.odisha@gov.in", verifiedBy: "System Administrator" },
  { email: "sdma.maharashtra@gov.in", verifiedBy: "System Administrator" },
  { email: "tnsdma.chennai@tn.gov.in", verifiedBy: "System Administrator" }
];

async function seedDatabase() {
  console.log(`\n\x1b[36m=================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[35mGEONETRA MULTI-HAZARD TELEMETRY FIXTURE SEEDER\x1b[0m`);
  console.log(`\x1b[90mInitializing production-grade disaster scenarios across India...\x1b[0m`);
  console.log(`\x1b[36m=================================================================\x1b[0m\n`);

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    console.log(`📡 Connecting to MongoDB Atlas: ${mongoUri.replace(/:[^:]*@/, ":****@")}`);
    await db.connectMongoDB(mongoUri);
  } else {
    console.log(`📂 No MONGODB_URI detected. Seeding high-availability local JSON store.`);
  }

  // 1. Seed Hazards
  console.log(`\n\x1b[33m[1/4] Seeding Emergency Hazards...\x1b[0m`);
  const existingHazards = await db.readHazards({});
  const existingHazardIds = new Set(existingHazards.map((h) => h.id));
  let hazardsSeeded = 0;

  for (const hazard of DEMO_HAZARDS) {
    if (!existingHazardIds.has(hazard.id)) {
      await db.createHazard(hazard);
      hazardsSeeded++;
      console.log(`  \x1b[32m✔\x1b[0m Added [${hazard.severity.toUpperCase()}] ${hazard.type} at ${hazard.location}`);
    } else {
      console.log(`  \x1b[90m- Skipped existing hazard: ${hazard.id}\x1b[0m`);
    }
  }

  // 2. Ensure Shelters
  console.log(`\n\x1b[33m[2/4] Verifying Dynamic Shelters Network...\x1b[0m`);
  const shelters = await db.readShelters();
  console.log(`  \x1b[32m✔\x1b[0m Confirmed ${shelters.length} operational relief shelters registered in catalog.`);

  // 3. Seed Users
  console.log(`\n\x1b[33m[3/4] Seeding Operational Accounts...\x1b[0m`);
  const users = await db.readUsers();
  for (const u of SEED_USERS) {
    const exists = users.find((existing) => existing.email === u.email || existing.username === u.username);
    if (!exists) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await db.createUser({
        username: u.username,
        email: u.email,
        phone: u.phone,
        countryCode: u.countryCode,
        passwordHash,
        role: u.role
      });
      console.log(`  \x1b[32m✔\x1b[0m Created account: ${u.username} (${u.role})`);
    } else {
      console.log(`  \x1b[90m- Skipped existing user: ${u.username}\x1b[0m`);
    }
  }

  // 4. Seed Verified Reporters
  console.log(`\n\x1b[33m[4/4] Seeding Verified Institutional Reporters...\x1b[0m`);
  for (const r of SEED_REPORTERS) {
    try {
      await db.addVerifiedReporter(r.email, r.verifiedBy);
      console.log(`  \x1b[32m✔\x1b[0m Credentialed reporter: ${r.email}`);
    } catch {
      console.log(`  \x1b[90m- Skipped reporter: ${r.email}\x1b[0m`);
    }
  }

  console.log(`\n\x1b[36m=================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m✔ SEEDING COMPLETED SUCCESSFULLY!\x1b[0m`);
  console.log(`  New Hazards Seeded:     ${hazardsSeeded}`);
  console.log(`  Total Active Shelters:  ${shelters.length}`);
  console.log(`  Admin Credentials:      admin@geonetra.gov.in / AdminPassword@2026`);
  console.log(`\x1b[36m=================================================================\x1b[0m\n`);

  process.exit(0);
}

seedDatabase().catch((err) => {
  console.error("Fatal seeder error:", err);
  process.exit(1);
});
