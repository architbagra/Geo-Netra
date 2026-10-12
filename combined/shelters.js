/* ═════════════════════════════════════════════════════════════════════
   GEONETRA - EMERGENCY SHELTERS & RELIEF CAMPS MODULE (shelters.js)
   Standalone, fully modular and conflict-free implementation.
   ═════════════════════════════════════════════════════════════════════ */

// ── Master Shelters Dataset ──
const SHELTERS_DATA = [
  // ── Mumbai Coastal & Inland Flood Relief Hubs ──
  {
    id: "mum-01",
    name: "Bandra West Municipal Relief Centre & High School",
    type: "School Evacuation Shelter",
    region: "mumbai",
    regionLabel: "Mumbai Coastal Belt",
    lat: 19.0596,
    lng: 72.8295,
    address: "St. Martin Road, Bandra West, Mumbai 400050",
    totalCapacity: 650,
    occupied: 280,
    authority: "Brihanmumbai Municipal Corp (BMC) & NDRF",
    phone: "+91 22 2642 2255",
    amenities: ["24/7 Medical Post", "Clean Drinking Water", "Backup Generator", "Hot Meals Kitchen", "Wheelchair Accessible", "Sanitation Kits"],
    verified: true
  },
  {
    id: "mum-02",
    name: "Versova Koliwada Cyclone & Surge Evacuation Camp",
    type: "Cyclone Evacuation Center",
    region: "mumbai",
    regionLabel: "Mumbai Coastal Belt",
    lat: 19.1351,
    lng: 72.8143,
    address: "Fish Market Road, Versova Village, Andheri West, Mumbai",
    totalCapacity: 450,
    occupied: 395,
    authority: "Maharashtra State Disaster Management Authority",
    phone: "+91 22 2631 8720",
    amenities: ["Emergency Food Ration", "Clean Drinking Water", "Life Jackets & Dinghies", "First Aid Kit", "Backup Generator"],
    verified: true
  },
  {
    id: "mum-03",
    name: "Marine Lines Community Relief & Evacuation Hall",
    type: "Community Hall Shelter",
    region: "mumbai",
    regionLabel: "Mumbai Coastal Belt",
    lat: 18.9438,
    lng: 72.8288,
    address: "Maharshi Karve Road, Churchgate / Marine Lines, Mumbai",
    totalCapacity: 500,
    occupied: 140,
    authority: "South Mumbai Ward Disaster Operations",
    phone: "+91 22 2201 4433",
    amenities: ["Clean Drinking Water", "24/7 Medical Post", "Hot Meals Kitchen", "Sanitation Kits", "Mobile Charging Desk"],
    verified: true
  },
  {
    id: "mum-04",
    name: "Kurla Central Flood Emergency Refuge",
    type: "Flood Relief Camp",
    region: "mumbai",
    regionLabel: "Mumbai Coastal Belt",
    lat: 19.0726,
    lng: 72.8845,
    address: "LBS Marg near Mithi River Outfall, Kurla West, Mumbai",
    totalCapacity: 800,
    occupied: 780,
    authority: "NDRF 5th Battalion Field Unit",
    phone: "+91 22 2650 9100",
    amenities: ["Inflatable Rafts", "High-Water Pumping Unit", "24/7 Medical Post", "Clean Drinking Water", "Hot Meals Kitchen"],
    verified: true
  },
  {
    id: "mum-05",
    name: "Dadar Shivaji Park Multi-Purpose Sports Pavilion",
    type: "Multi-Purpose Safehouse",
    region: "mumbai",
    regionLabel: "Mumbai Coastal Belt",
    lat: 19.0269,
    lng: 72.8378,
    address: "Keluskar Road, Shivaji Park, Dadar West, Mumbai",
    totalCapacity: 950,
    occupied: 310,
    authority: "BMC Zone 2 Emergency Cell",
    phone: "+91 22 2445 1200",
    amenities: ["Clean Drinking Water", "24/7 Medical Post", "Baby Care Station", "Backup Generator", "Wheelchair Accessible"],
    verified: true
  },

  // ── Odisha Coastal Belt (Super Cyclone & Storm Surge Sanctuary) ──
  {
    id: "od-01",
    name: "Puri Marine Drive Multi-Purpose Cyclone Shelter #4",
    type: "Cyclone Evacuation Center",
    region: "odisha",
    regionLabel: "Odisha Cyclone Belt",
    lat: 19.7983,
    lng: 85.8249,
    address: "Chakratirtha Road, Puri Coastal Zone, Odisha",
    totalCapacity: 1200,
    occupied: 420,
    authority: "ODRAF & District Collectorate Puri",
    phone: "+91 6752 222 034",
    amenities: ["Reinforced Storm Bunker", "Clean Drinking Water", "24/7 Medical Post", "Backup Generator", "Community Kitchen", "Satellite Phone Desk"],
    verified: true
  },
  {
    id: "od-02",
    name: "Paradip Port High-Tide Emergency Evacuation Depot",
    type: "Maritime Emergency Center",
    region: "odisha",
    regionLabel: "Odisha Cyclone Belt",
    lat: 20.3165,
    lng: 86.6114,
    address: "Port Township, Paradip, Jagatsinghpur, Odisha",
    totalCapacity: 900,
    occupied: 580,
    authority: "Paradip Port Disaster Management Wing & Coast Guard",
    phone: "+91 6722 222 144",
    amenities: ["24/7 Medical Post", "Clean Drinking Water", "Backup Generator", "Emergency Blankets", "Rescue Boats Base"],
    verified: true
  },
  {
    id: "od-03",
    name: "Cuttack Netaji Indoor Emergency Flood Sanctuary",
    type: "Flood Relief Camp",
    region: "odisha",
    regionLabel: "Odisha Cyclone Belt",
    lat: 20.4625,
    lng: 85.8830,
    address: "Near Barabati Fort, Cuttack, Odisha",
    totalCapacity: 1500,
    occupied: 620,
    authority: "Cuttack Municipal Corp & State Relief Commissioner",
    phone: "+91 671 230 4455",
    amenities: ["Clean Drinking Water", "24/7 Medical Post", "Family Dormitories", "Hot Meals Kitchen", "Wheelchair Accessible"],
    verified: true
  },

  // ── Kerala Waterways & Lowland Flood Plain ──
  {
    id: "ker-01",
    name: "Aluva Municipal Flood Relief Camp & Town Hall",
    type: "Flood Relief Camp",
    region: "kerala",
    regionLabel: "Kerala Waterways",
    lat: 10.1076,
    lng: 76.3516,
    address: "Near Periyar River Embankment, Aluva, Ernakulam, Kerala",
    totalCapacity: 750,
    occupied: 230,
    authority: "Kerala Disaster Management Authority (KSDMA) & Fire Force",
    phone: "+91 484 262 3344",
    amenities: ["24/7 Medical Post", "Water Purification Units", "Hot Meals Kitchen", "Inflatable Rescue Dinghies", "Sanitation Kits"],
    verified: true
  },
  {
    id: "ker-02",
    name: "Kochi Willingdon Island Coastal Relief Safehouse",
    type: "Coastal Refuge",
    region: "kerala",
    regionLabel: "Kerala Waterways",
    lat: 9.9602,
    lng: 76.2731,
    address: "Bristow Road, Willingdon Island, Kochi, Kerala",
    totalCapacity: 600,
    occupied: 180,
    authority: "Cochin Port Trust Emergency Cell & Indian Navy Liaison",
    phone: "+91 484 258 2000",
    amenities: ["Clean Drinking Water", "Backup Generator", "First Aid Kit", "Emergency Blankets", "Satellite Comms"],
    verified: true
  },
  {
    id: "ker-03",
    name: "Chengannur Central Kuttanad Water Evacuation Hub",
    type: "Flood Relief Camp",
    region: "kerala",
    regionLabel: "Kerala Waterways",
    lat: 9.3175,
    lng: 76.6148,
    address: "Government Boys Higher Secondary Campus, Chengannur, Alappuzha",
    totalCapacity: 1100,
    occupied: 850,
    authority: "NDRF 4th Battalion & Local Fishermen Rescue Fleet",
    phone: "+91 479 245 2200",
    amenities: ["24/7 Medical Post", "Clean Drinking Water", "Hot Meals Kitchen", "Water Ambulance Dock", "Backup Generator"],
    verified: true
  },

  // ── Chennai Metro & Bay of Bengal Coast ──
  {
    id: "chn-01",
    name: "Marina Beach Coastal Safety & Cyclone Safehouse",
    type: "Cyclone Evacuation Center",
    region: "chennai",
    regionLabel: "Chennai Coastal Belt",
    lat: 13.0500,
    lng: 80.2824,
    address: "Kamarajar Salai near Marina Lighthouse, Chennai 600004",
    totalCapacity: 850,
    occupied: 310,
    authority: "Greater Chennai Corporation (GCC) Disaster Wing",
    phone: "+91 44 2538 4520",
    amenities: ["24/7 Medical Post", "Clean Drinking Water", "Backup Generator", "Hot Meals Kitchen", "Lifebuoys & Rescue Ropes"],
    verified: true
  },
  {
    id: "chn-02",
    name: "Ennore Creek Industrial & Coastal Emergency Hub",
    type: "Multi-Purpose Safehouse",
    region: "chennai",
    regionLabel: "Chennai Coastal Belt",
    lat: 13.2125,
    lng: 80.3235,
    address: "Ennore High Road, Thiruvottiyur / Ennore, Chennai",
    totalCapacity: 600,
    occupied: 220,
    authority: "Tamil Nadu State Emergency Operations Centre",
    phone: "+91 44 2573 1188",
    amenities: ["Chemical Incident Respirators", "Clean Drinking Water", "24/7 Medical Post", "Backup Generator"],
    verified: true
  },

  // ── Gujarat Shore & Gulf ──
  {
    id: "guj-01",
    name: "Surat Hazira Coastal Community Cyclone Shelter",
    type: "Cyclone Evacuation Center",
    region: "gujarat",
    regionLabel: "Gujarat Shore & Gulf",
    lat: 21.1167,
    lng: 72.6333,
    address: "Hazira Port Coastal Road, Surat, Gujarat",
    totalCapacity: 800,
    occupied: 350,
    authority: "Gujarat State Disaster Management Authority (GSDMA)",
    phone: "+91 261 242 3751",
    amenities: ["Clean Drinking Water", "24/7 Medical Post", "Backup Generator", "Heavy-Duty Food Storage", "Wheelchair Accessible"],
    verified: true
  },
  {
    id: "guj-02",
    name: "Dwarka Coastal Storm Refuge & Pilgrim Relief Centre",
    type: "Multi-Purpose Safehouse",
    region: "gujarat",
    regionLabel: "Gujarat Shore & Gulf",
    lat: 22.2442,
    lng: 68.9685,
    address: "Near Gomti Ghat, Dwarka, Devbhumi Dwarka, Gujarat",
    totalCapacity: 700,
    occupied: 290,
    authority: "District Collectorate & Indian Coast Guard Station Dwarka",
    phone: "+91 2892 234 244",
    amenities: ["Clean Drinking Water", "First Aid Kit", "Community Kitchen", "Backup Generator", "Emergency Blankets"],
    verified: true
  },

  // ── West Bengal & Sundarbans Delta ──
  {
    id: "wb-01",
    name: "Diamond Harbour Gangasagar Evacuation Safe Zone",
    type: "Cyclone Evacuation Center",
    region: "bengal",
    regionLabel: "Bengal & Sundarbans",
    lat: 22.1896,
    lng: 88.2014,
    address: "Riverfront Road, Diamond Harbour, South 24 Parganas, West Bengal",
    totalCapacity: 1300,
    occupied: 540,
    authority: "West Bengal Disaster Management & Civil Defence",
    phone: "+91 3174 255 221",
    amenities: ["Elevated Flood Stilt Structure", "24/7 Medical Post", "Clean Drinking Water", "Hot Meals Kitchen", "Solar Battery Banks"],
    verified: true
  },
  {
    id: "wb-02",
    name: "Digha Sea Beach Multi-Tier Storm Sanctuary",
    type: "Cyclone Evacuation Center",
    region: "bengal",
    regionLabel: "Bengal & Sundarbans",
    lat: 21.6266,
    lng: 87.5074,
    address: "New Digha Coastal Ring, Purba Medinipur, West Bengal",
    totalCapacity: 950,
    occupied: 410,
    authority: "Digha Sankarpur Development Authority & NDRF Unit",
    phone: "+91 3220 266 222",
    amenities: ["Reinforced Storm Bunker", "Clean Drinking Water", "24/7 Medical Post", "Backup Generator", "Rescue Dinghies"],
    verified: true
  }
];

// Helper: Haversine distance in kilometers
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// ── State Management ──
class SheltersManager {
  constructor() {
    this.shelters = [...SHELTERS_DATA];
    this.map = null;
    this.markers = new Map();
    this.userLocation = null;
    this.userMarker = null;
    this.userRadiusCircle = null;
    this.activeShelterId = null;

    // Filters
    this.searchQuery = "";
    this.selectedRegion = "all";
    this.selectedPill = "all"; // 'all', 'available', 'high-capacity', 'medical'
    this.sortBy = "nearest"; // 'nearest', 'available-beds', 'capacity'

    this.init();
  }

  init() {
    this.ensureHeaderNavigation();
    this.initMap();
    this.bindDOMEvents();
    this.updateKpis();
    this.renderSheltersList();
    this.renderMapMarkers();
    this.refreshIcons();

    // Task 3.4: Dynamic Shelters API Synchronization from MongoDB Atlas
    this.loadSheltersFromApi();
  }

  async loadSheltersFromApi() {
    try {
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const backendBase = isLocal ? "http://localhost:3000" : "https://geo-netra-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/shelters`);
      if (res.ok) {
        const liveData = await res.json();
        if (Array.isArray(liveData) && liveData.length > 0) {
          this.shelters = liveData;
          this.updateKpis();
          this.renderSheltersList();
          this.renderMapMarkers();
          this.refreshIcons();
        }
      }
    } catch (err) {
      console.warn("Dynamic shelters fetch notice (operating with local master fallback):", err.message || err);
    }
  }

  // Ensures "Shelters" appears on the right of Map Events in header if script.js didn't inject it
  ensureHeaderNavigation() {
    const navContainer = document.querySelector(".single-nav-links");
    if (!navContainer) return;

    if (!navContainer.querySelector('[data-nav="shelters"]')) {
      const isHtmlFolder = window.location.pathname.toLowerCase().includes("/html/");
      const shelterHref = isHtmlFolder ? "shelters.html" : "HTML/shelters.html";
      const navItem = document.createElement("a");
      navItem.href = shelterHref;
      navItem.className = "nav-text-link active";
      navItem.setAttribute("data-nav", "shelters");
      navItem.innerHTML = `<span>Shelters</span>`;
      navContainer.appendChild(navItem);
    }
  }

  // Initialize Leaflet Map
  initMap() {
    const mapEl = document.getElementById("shelters-map");
    if (!mapEl || typeof L === "undefined") return;

    // Default view: Center of India or Mumbai
    this.map = L.map("shelters-map", {
      maxBoundsViscosity: 0.9,
      minZoom: 4,
      maxZoom: 19
    }).setView([19.0760, 72.8777], 11);

    // OpenStreetMap CartoDB Dark Matter / OSM Tile Layer
    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | GeoNetra Rescue GIS',
      maxZoom: 19
    });
    tileLayer.addTo(this.map);
  }

  // Bind DOM controls
  bindDOMEvents() {
    // Search input
    const searchInput = document.getElementById("shelter-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.applyFilters();
      });
    }

    // Region dropdown
    const regionSelect = document.getElementById("region-select");
    if (regionSelect) {
      regionSelect.addEventListener("change", (e) => {
        this.selectedRegion = e.target.value;
        this.applyFilters();
        this.zoomToRegion(this.selectedRegion);
      });
    }

    // Filter pills
    const pillButtons = document.querySelectorAll(".filter-pill-btn");
    pillButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        pillButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedPill = btn.dataset.filter || "all";
        this.applyFilters();
      });
    });

    // Sort dropdown
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        this.sortBy = e.target.value;
        this.applyFilters();
      });
    }

    // Locate Me GPS button
    const locateBtn = document.getElementById("btn-gps-locate");
    if (locateBtn) {
      locateBtn.addEventListener("click", () => this.requestUserLocation());
    }

    // Floating map controls
    const btnCenterUser = document.getElementById("btn-map-my-location");
    if (btnCenterUser) {
      btnCenterUser.addEventListener("click", () => {
        if (this.userLocation) {
          this.map.flyTo([this.userLocation.lat, this.userLocation.lng], 13, { duration: 1.2 });
        } else {
          this.requestUserLocation();
        }
      });
    }

    const btnFitAll = document.getElementById("btn-map-fit-all");
    if (btnFitAll) {
      btnFitAll.addEventListener("click", () => this.fitMapToFiltered());
    }
  }

  // Request browser geolocation
  requestUserLocation() {
    const locateBtn = document.getElementById("btn-gps-locate");
    if (locateBtn) {
      locateBtn.classList.add("locating");
      locateBtn.querySelector("span").textContent = "Locating GPS...";
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      if (locateBtn) {
        locateBtn.classList.remove("locating");
        locateBtn.querySelector("span").textContent = "Find Shelters Near Me";
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.userLocation = { lat: latitude, lng: longitude };

        // Compute distance for all shelters
        this.shelters.forEach((shelter) => {
          shelter.distanceKm = calculateHaversineDistance(latitude, longitude, shelter.lat, shelter.lng);
        });

        // Add user marker on Leaflet map
        this.updateUserMapMarker(latitude, longitude);

        if (locateBtn) {
          locateBtn.classList.remove("locating");
          locateBtn.innerHTML = `<i data-lucide="check-circle-2"></i><span>Located Near You</span>`;
        }

        // Apply filters & resort
        this.applyFilters();
        this.fitMapToUserAndShelters();
        this.refreshIcons();
      },
      (error) => {
        console.warn("Geolocation failed or denied:", error);
        // Fallback default: Mumbai
        const defaultLat = 19.0760;
        const defaultLng = 72.8777;
        this.userLocation = { lat: defaultLat, lng: defaultLng };

        this.shelters.forEach((shelter) => {
          shelter.distanceKm = calculateHaversineDistance(defaultLat, defaultLng, shelter.lat, shelter.lng);
        });

        this.updateUserMapMarker(defaultLat, defaultLng);

        if (locateBtn) {
          locateBtn.classList.remove("locating");
          locateBtn.innerHTML = `<i data-lucide="crosshair"></i><span>Using Regional Center</span>`;
        }

        this.applyFilters();
        this.refreshIcons();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  updateUserMapMarker(lat, lng) {
    if (!this.map) return;

    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }
    if (this.userRadiusCircle) {
      this.map.removeLayer(this.userRadiusCircle);
    }

    // User pulsating pin
    const userIcon = L.divIcon({
      className: "user-gps-marker-wrap",
      html: `<div class="user-gps-marker"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    this.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 2000 })
      .addTo(this.map)
      .bindPopup(`<strong style="font-size:0.85rem;color:#60a5fa;">📍 Your Current Location</strong><p style="font-size:0.75rem;margin:0.2rem 0 0;color:#cbd5e1;">Live GPS position for proximity dispatch.</p>`);

    // Radius circle (15 km)
    this.userRadiusCircle = L.circle([lat, lng], {
      radius: 15000,
      color: "#3b82f6",
      fillColor: "#3b82f6",
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: "6, 6"
    }).addTo(this.map);
  }

  fitMapToUserAndShelters() {
    if (!this.map) return;
    const filtered = this.getFilteredShelters();
    const points = [];
    if (this.userLocation) points.push([this.userLocation.lat, this.userLocation.lng]);
    filtered.slice(0, 6).forEach((s) => points.push([s.lat, s.lng]));

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }

  zoomToRegion(region) {
    if (!this.map) return;
    const regionCenters = {
      all: { coords: [20.5937, 78.9629], zoom: 5 },
      mumbai: { coords: [19.0760, 72.8777], zoom: 12 },
      odisha: { coords: [20.2961, 85.8245], zoom: 8 },
      kerala: { coords: [9.9312, 76.2673], zoom: 9 },
      chennai: { coords: [13.0827, 80.2707], zoom: 11 },
      gujarat: { coords: [21.7645, 72.1519], zoom: 8 },
      bengal: { coords: [22.0, 88.0], zoom: 8 }
    };

    const target = regionCenters[region] || regionCenters.all;
    this.map.flyTo(target.coords, target.zoom, { duration: 1.2 });
  }

  // Filter & Sort Logic
  getFilteredShelters() {
    return this.shelters
      .filter((shelter) => {
        // Region filter
        if (this.selectedRegion !== "all" && shelter.region !== this.selectedRegion) {
          return false;
        }

        // Status / Pill filter
        const availableBeds = shelter.totalCapacity - shelter.occupied;
        const occupancyRate = shelter.occupied / shelter.totalCapacity;
        if (this.selectedPill === "available") {
          if (occupancyRate >= 0.95 || availableBeds <= 0) return false;
        } else if (this.selectedPill === "high-capacity") {
          if (shelter.totalCapacity < 800) return false;
        } else if (this.selectedPill === "medical") {
          const hasMedical = shelter.amenities.some((a) => a.toLowerCase().includes("medical"));
          if (!hasMedical) return false;
        }

        // Search Query
        if (this.searchQuery) {
          const haystack = `${shelter.name} ${shelter.address} ${shelter.regionLabel} ${shelter.authority} ${shelter.amenities.join(" ")}`.toLowerCase();
          if (!haystack.includes(this.searchQuery)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (this.sortBy === "nearest") {
          const distA = a.distanceKm !== undefined ? a.distanceKm : 99999;
          const distB = b.distanceKm !== undefined ? b.distanceKm : 99999;
          return distA - distB;
        } else if (this.sortBy === "available-beds") {
          const bedsA = a.totalCapacity - a.occupied;
          const bedsB = b.totalCapacity - b.occupied;
          return bedsB - bedsA;
        } else if (this.sortBy === "capacity") {
          return b.totalCapacity - a.totalCapacity;
        }
        return 0;
      });
  }

  applyFilters() {
    const filtered = this.getFilteredShelters();
    this.renderSheltersList(filtered);
    this.renderMapMarkers(filtered);
    this.updateKpis(filtered);
    this.refreshIcons();
  }

  // Update top KPI cards
  updateKpis(filteredList = this.shelters) {
    const totalCount = filteredList.length;
    const totalCapacity = filteredList.reduce((acc, s) => acc + s.totalCapacity, 0);
    const totalOccupied = filteredList.reduce((acc, s) => acc + s.occupied, 0);
    const availableBeds = Math.max(0, totalCapacity - totalOccupied);
    const medicalShelters = filteredList.filter((s) => s.amenities.some((a) => a.toLowerCase().includes("medical"))).length;

    const elCount = document.getElementById("kpi-shelters-count");
    const elCapacity = document.getElementById("kpi-total-capacity");
    const elAvailable = document.getElementById("kpi-available-beds");
    const elMedical = document.getElementById("kpi-medical-shelters");

    if (elCount) elCount.textContent = totalCount.toLocaleString();
    if (elCapacity) elCapacity.textContent = totalCapacity.toLocaleString();
    if (elAvailable) elAvailable.textContent = availableBeds.toLocaleString();
    if (elMedical) elMedical.textContent = medicalShelters.toLocaleString();

    const countPill = document.getElementById("list-count-badge");
    if (countPill) countPill.textContent = totalCount;
  }

  // Render Left Shelters List
  renderSheltersList(shelters = this.getFilteredShelters()) {
    const container = document.getElementById("shelters-scroll-list");
    if (!container) return;

    if (shelters.length === 0) {
      container.innerHTML = `
        <div class="shelters-empty-state">
          <div class="empty-icon-wrap">
            <i data-lucide="shield-alert"></i>
          </div>
          <h3>No Shelters Found</h3>
          <p>No emergency shelters match your current search and filter criteria.</p>
          <button type="button" class="btn-primary" id="btn-reset-filters" style="font-size:0.84rem;padding:0.5rem 1.1rem;">
            <i data-lucide="rotate-ccw"></i>
            <span>Reset All Filters</span>
          </button>
        </div>
      `;
      const resetBtn = document.getElementById("btn-reset-filters");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          this.searchQuery = "";
          this.selectedRegion = "all";
          this.selectedPill = "all";
          this.sortBy = "nearest";
          const sInput = document.getElementById("shelter-search");
          if (sInput) sInput.value = "";
          const rSelect = document.getElementById("region-select");
          if (rSelect) rSelect.value = "all";
          const pills = document.querySelectorAll(".filter-pill-btn");
          pills.forEach((p) => p.classList.toggle("active", p.dataset.filter === "all"));
          this.applyFilters();
        });
      }
      this.refreshIcons();
      return;
    }

    container.innerHTML = shelters
      .map((shelter) => {
        const availableBeds = Math.max(0, shelter.totalCapacity - shelter.occupied);
        const occupancyPct = Math.min(100, Math.round((shelter.occupied / shelter.totalCapacity) * 100));

        let statusClass = "available";
        let statusLabel = "Available";
        let progressClass = "green";

        if (occupancyPct >= 95) {
          statusClass = "full";
          statusLabel = "At Capacity";
          progressClass = "red";
        } else if (occupancyPct >= 70) {
          statusClass = "limited";
          statusLabel = "Limited Space";
          progressClass = "amber";
        }

        const distanceHtml = shelter.distanceKm !== undefined
          ? `<span class="distance-badge"><i data-lucide="navigation"></i> ${shelter.distanceKm} km away</span>`
          : `<span class="distance-badge" style="background:rgba(255,255,255,0.06);color:#94a3b8;"><i data-lucide="map-pin"></i> ${shelter.regionLabel}</span>`;

        const isSelected = this.activeShelterId === shelter.id;

        return `
          <article class="shelter-card${isSelected ? ' active-selected' : ''}" 
                   id="card-${shelter.id}" 
                   data-shelter-id="${shelter.id}">
            <div class="shelter-card-top">
              <div class="shelter-title-box">
                <span class="shelter-type-tag">${shelter.type}</span>
                <h3 class="shelter-name">${shelter.name}</h3>
                <div class="shelter-address">
                  <i data-lucide="map-pin"></i>
                  <span>${shelter.address}</span>
                </div>
              </div>
              <div class="shelter-badges-col">
                <span class="status-badge ${statusClass}">
                  <span style="width:6px;height:6px;border-radius:50%;background:currentColor;"></span>
                  ${statusLabel}
                </span>
                ${distanceHtml}
              </div>
            </div>

            <!-- Capacity Progress -->
            <div class="shelter-capacity-section">
              <div class="capacity-labels">
                <span>Occupancy: <strong>${shelter.occupied} / ${shelter.totalCapacity} beds</strong> (${occupancyPct}%)</span>
                <span><strong>${availableBeds}</strong> vacant</span>
              </div>
              <div class="capacity-progress-track">
                <div class="capacity-progress-bar ${progressClass}" style="width: ${occupancyPct}%"></div>
              </div>
            </div>

            <!-- Amenities Chips -->
            <div class="shelter-amenities-row">
              ${shelter.amenities.slice(0, 4).map((a) => `
                <span class="amenity-chip">
                  <i data-lucide="check"></i>
                  <span>${a}</span>
                </span>
              `).join('')}
              ${shelter.amenities.length > 4 ? `
                <span class="amenity-chip" style="color:#60a5fa;border-color:rgba(59,130,246,0.3);">
                  +${shelter.amenities.length - 4} more
                </span>
              ` : ''}
            </div>

            <!-- Authority & Phone Line -->
            <div class="shelter-meta-row">
              <div class="shelter-authority">
                <i data-lucide="shield-check"></i>
                <span>${shelter.authority}</span>
              </div>
              <a href="tel:${shelter.phone.replace(/[^+\d]/g, '')}" class="shelter-phone-link">
                <i data-lucide="phone-call" style="width:13px;height:13px;"></i>
                <span>${shelter.phone}</span>
              </a>
            </div>

            <!-- Actions Row -->
            <div class="shelter-actions-row">
              <button type="button" 
                      class="btn-locate-shelter" 
                      data-locate-id="${shelter.id}">
                <i data-lucide="crosshair"></i>
                <span>Locate on Map</span>
              </button>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 class="btn-directions-shelter" 
                 title="Navigate via Google Maps">
                <i data-lucide="external-link"></i>
                <span>Directions</span>
              </a>
              <a href="tel:${shelter.phone.replace(/[^+\d]/g, '')}" 
                 class="btn-call-shelter" 
                 title="Call Shelter Emergency Desk">
                <i data-lucide="phone"></i>
              </a>
            </div>
          </article>
        `;
      })
      .join('');

    // Attach click listeners to cards and locate buttons
    container.querySelectorAll(".shelter-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        // If clicking anchor or button, let their handlers work
        if (e.target.closest("a") || e.target.closest(".btn-locate-shelter")) return;
        const id = card.dataset.shelterId;
        this.selectShelter(id, true);
      });
    });

    container.querySelectorAll(".btn-locate-shelter").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.locateId;
        this.selectShelter(id, true);
      });
    });

    this.refreshIcons();
  }

  // Render Leaflet Markers on Map
  renderMapMarkers(shelters = this.getFilteredShelters()) {
    if (!this.map) return;

    // Remove existing markers
    this.markers.forEach((marker) => this.map.removeLayer(marker));
    this.markers.clear();

    shelters.forEach((shelter) => {
      const occupancyPct = (shelter.occupied / shelter.totalCapacity) * 100;
      let statusClass = "available";
      let iconSymbol = "🛡️";

      if (occupancyPct >= 95) {
        statusClass = "full";
        iconSymbol = "⛔";
      } else if (occupancyPct >= 70) {
        statusClass = "limited";
        iconSymbol = "⚠️";
      }

      const isSelected = this.activeShelterId === shelter.id;

      const markerHtml = `
        <div class="shelter-marker-pin ${statusClass}${isSelected ? ' selected-pulse' : ''}">
          <span>${iconSymbol}</span>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: "shelter-leaflet-marker",
        html: markerHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -20]
      });

      const marker = L.marker([shelter.lat, shelter.lng], { icon: markerIcon }).addTo(this.map);

      // Popup Content
      const availableBeds = Math.max(0, shelter.totalCapacity - shelter.occupied);
      const popupHtml = `
        <div class="shelter-popup-card">
          <div class="shelter-popup-header">
            <div>
              <span class="shelter-type-tag" style="margin-bottom:0.2rem;">${shelter.type}</span>
              <h4>${shelter.name}</h4>
              <div class="shelter-popup-address">📍 ${shelter.address}</div>
            </div>
          </div>
          <div class="shelter-popup-capacity-metric">
            <span>Occupied: <strong>${shelter.occupied}/${shelter.totalCapacity}</strong></span>
            <span style="color:#34d399;font-weight:700;">${availableBeds} Vacant</span>
          </div>
          <div style="font-size:0.75rem;color:#cbd5e1;">
            📞 <strong>Helpline:</strong> <a href="tel:${shelter.phone.replace(/[^+\d]/g, '')}" style="color:#60a5fa;text-decoration:none;">${shelter.phone}</a>
          </div>
          <div class="shelter-popup-actions">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="shelter-popup-btn primary">
              🧭 Directions
            </a>
            <a href="tel:${shelter.phone.replace(/[^+\d]/g, '')}" class="shelter-popup-btn secondary">
              📞 Call Desk
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      // Marker click event
      marker.on("click", () => {
        this.selectShelter(shelter.id, false);
      });

      this.markers.set(shelter.id, marker);
    });
  }

  // Select shelter (two-way synchronization between list and map)
  selectShelter(shelterId, flyMap = true) {
    this.activeShelterId = shelterId;
    const shelter = this.shelters.find((s) => s.id === shelterId);
    if (!shelter) return;

    // Update active style on cards
    document.querySelectorAll(".shelter-card").forEach((card) => {
      card.classList.toggle("active-selected", card.dataset.shelterId === shelterId);
    });

    // Scroll card into view
    const activeCard = document.getElementById(`card-${shelterId}`);
    if (activeCard) {
      activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // Refresh markers with pulse state
    this.renderMapMarkers(this.getFilteredShelters());

    // Map fly to & open popup
    const marker = this.markers.get(shelterId);
    if (marker && this.map) {
      if (flyMap) {
        this.map.flyTo([shelter.lat, shelter.lng], 15, { duration: 1.1 });
      }
      setTimeout(() => {
        marker.openPopup();
      }, flyMap ? 800 : 50);
    }
  }

  fitMapToFiltered() {
    if (!this.map) return;
    const filtered = this.getFilteredShelters();
    if (filtered.length === 0) return;

    const points = filtered.map((s) => [s.lat, s.lng]);
    const bounds = L.latLngBounds(points);
    this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }

  refreshIcons() {
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }
}

// Instantiate on DOM load
document.addEventListener("DOMContentLoaded", () => {
  window.sheltersManager = new SheltersManager();
});
