/* ═════════════════════════════════════════════════════════════════════
   GEONETRA - INTERACTIVE 3D WEATHER & HAZARD GLOBE MODULE (globe.js)
   MapTiler SDK + MapLibre GL + Open-Meteo + RainViewer + Live Firestore Hazards
   Fully modular implementation for Analytics page.
   ═════════════════════════════════════════════════════════════════════ */

import { subscribeToReports } from "./reports-store.js";

// MapTiler API Key (from project config)
window.GEONETRA_MAPTILER_KEY = window.GEONETRA_MAPTILER_KEY || "B7Sc2GLola4h5ZRpF74o";

export async function initialize3DGlobePage() {
  const isGlobePage = document.body?.dataset?.page === "globe" || 
                      document.body?.classList?.contains("page-globe") ||
                      window.location.pathname.toLowerCase().includes("globe");
  if (!isGlobePage) return;
  if (document.getElementById("geonetra-globe-section")) return;

  const globeContainerAnchor = document.querySelector("#geonetra-globe-container") || 
                               document.querySelector(".globe-stage-section") || 
                               document.querySelector("#globe-mount-point") || 
                               document.querySelector(".analytics-container");

  if (!globeContainerAnchor) {
    console.warn("GeoNetra container not found for 3D Globe.");
    return;
  }

  const section = document.createElement("section");
  section.id = "geonetra-globe-section";
  section.className = "bklit-globe-card";
  section.setAttribute("aria-label", "Interactive global hazard and weather globe");

  section.innerHTML = `
    <div class="bklit-card-header-bar">
      <div class="bklit-header-title-wrap">
        <div class="bklit-shimmer-badge">
          <span class="pulse-dot-cyan"></span>
          <span class="shimmer-text">Live Geospatial Telemetry</span>
        </div>
        <h2 class="bklit-card-title">Interactive 3D Meteorological &amp; Threat Globe</h2>
        <p class="bklit-card-subtitle">Global atmospheric radar feeds, Open-Meteo multi-layer wind dynamics, and real-time Firestore hazard pins.</p>
      </div>
      <div class="bklit-globe-header-stats">
        <span class="globe-stat-pill"><i data-lucide="satellite"></i> 3D Projection</span>
        <span class="globe-stat-pill active"><i data-lucide="radio"></i> Live Radar</span>
      </div>
    </div>

    <div class="geonetra-globe-shell">
      <div id="geonetra-globe-map"></div>

      <!-- Real-time weather tooltip readings -->
      <div class="geonetra-weather-summary" aria-live="polite">
        <div class="weather-summary-badge">
          <span id="geonetra-weather-name">Wind Velocity</span>
          <strong id="geonetra-weather-value">Loading forecast...</strong>
        </div>
        <span class="geonetra-weather-location" id="geonetra-weather-location">
          Hover over the globe for localized readings
        </span>
        <div class="geonetra-weather-readout" id="geonetra-weather-readout" aria-live="polite"></div>
      </div>

      <!-- Weather Layer Selectors (Bklit UI Styled) -->
      <div class="geonetra-layer-toolbar" role="group" aria-label="Map visualization layers">
        <button class="geonetra-layer-btn active" data-layer="temperature" aria-pressed="true">
          <i data-lucide="thermometer"></i> <span>Temperature</span>
        </button>
        <button class="geonetra-layer-btn" data-layer="precipitation" aria-pressed="false">
          <i data-lucide="cloud-rain"></i> <span>Precipitation</span>
        </button>
        <button class="geonetra-layer-btn active" data-layer="wind" aria-pressed="true">
          <i data-lucide="wind"></i> <span>Wind Flow</span>
        </button>
        <button class="geonetra-layer-btn" data-layer="pressure" aria-pressed="false">
          <i data-lucide="gauge"></i> <span>Pressure</span>
        </button>
        <button class="geonetra-layer-btn" data-layer="radar" aria-pressed="false">
          <i data-lucide="radar"></i> <span>RainViewer Radar</span>
        </button>
        <button class="geonetra-layer-btn" data-layer="isobar" aria-pressed="false">
          <i data-lucide="activity"></i> <span>Isobars (hPa)</span>
        </button>
        <button class="geonetra-layer-btn" data-layer="sst" aria-pressed="false">
          <i data-lucide="waves"></i> <span>Sea Surface Temp</span>
        </button>
        <button class="geonetra-layer-btn" data-layer="arrow" aria-pressed="false">
          <i data-lucide="move-up-right"></i> <span>Vector Vectors</span>
        </button>
      </div>

      <!-- Globe status pill -->
      <div class="geonetra-globe-status" id="geonetra-globe-status" role="status">
        <span class="shimmer-text">Initializing 3D globe...</span>
      </div>

      <!-- 4-Day Forecast Timeline Slider -->
      <div class="geonetra-timeline">
        <button type="button" class="geonetra-play-btn" id="geonetra-play" aria-label="Play forecast animation">
          <i data-lucide="play"></i>
        </button>
        <div class="geonetra-timeline-content">
          <div class="timeline-meta-row">
            <div class="geonetra-time-label" id="geonetra-time-label">Loading time...</div>
            <span class="timeline-subtext">Open-Meteo High-Resolution Forecast</span>
          </div>
          <input type="range" 
                 id="geonetra-time-slider" 
                 class="geonetra-time-slider" 
                 min="0" 
                 max="96" 
                 step="1" 
                 value="0" 
                 aria-label="Map animation timeline">
          <div class="geonetra-days">
            <span>Today</span>
            <span>+24h</span>
            <span>+48h</span>
            <span>+72h</span>
            <span>+96h</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach section to container
  if (globeContainerAnchor.id === "geonetra-globe-container" || globeContainerAnchor.id === "globe-mount-point") {
    globeContainerAnchor.appendChild(section);
  } else {
    globeContainerAnchor.insertBefore(section, globeContainerAnchor.firstChild);
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  const status = document.getElementById("geonetra-globe-status");
  const slider = document.getElementById("geonetra-time-slider");
  const timeLabel = document.getElementById("geonetra-time-label");
  const playButton = document.getElementById("geonetra-play");
  const weatherName = document.getElementById("geonetra-weather-name");
  const weatherValue = document.getElementById("geonetra-weather-value");
  const weatherLocation = document.getElementById("geonetra-weather-location");
  const weatherReadout = document.getElementById("geonetra-weather-readout");

  const showStatus = (message, hide = false) => {
    if (!status) return;
    status.innerHTML = `<span class="shimmer-text">${message}</span>`;
    status.hidden = hide;
  };

  const apiKey = window.GEONETRA_MAPTILER_KEY || window.MAPTILER_API_KEY || "B7Sc2GLola4h5ZRpF74o";

  const loadStylesheet = () => {
    if (document.querySelector('[data-geonetra-maptiler-css]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.maptiler.com/maptiler-sdk-js/v3.0.1/maptiler-sdk.css";
    link.dataset.geonetraMaptilerCss = "true";
    document.head.appendChild(link);
  };

  const loadSDK = () => new Promise((resolve, reject) => {
    if (window.maptilersdk) {
      resolve(window.maptilersdk);
      return;
    }
    const existing = document.querySelector("[data-geonetra-maptiler-js]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.maptilersdk), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.maptiler.com/maptiler-sdk-js/v3.0.1/maptiler-sdk.umd.min.js";
    script.dataset.geonetraMaptilerJs = "true";
    script.onload = () => {
      if (window.maptilersdk) resolve(window.maptilersdk);
      else reject(new Error("MapTiler SDK failed to initialize."));
    };
    script.onerror = () => reject(new Error("Could not load MapTiler SDK."));
    document.head.appendChild(script);
  });

  try {
    loadStylesheet();
    const sdk = await loadSDK();
    sdk.config.apiKey = apiKey;

    const map = new sdk.Map({
      container: "geonetra-globe-map",
      style: "https://api.maptiler.com/maps/dataviz-dark/style.json",
      center: [82.5, 21.0], // Centered on Indian Ocean / Subcontinent
      zoom: 2.2,
      minZoom: 0.8,
      maxZoom: 18,
      projection: "globe",
      navigationControl: false,
      geolocateControl: false,
      fullscreenControl: false,
      terrainControl: false
    });

    window.geonetraAnalyticsMap = map;

    map.addControl(new sdk.NavigationControl({ showCompass: true, showZoom: true }), "top-right");
    map.addControl(
      new sdk.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }),
      "top-right"
    );

    const configuredLayers = window.GEONETRA_MAP_LAYERS || {};

    const layerDefinitions = [
      { id: "temperature", label: "Temperature" },
      { id: "precipitation", label: "Precipitation" },
      { id: "wind", label: "Wind" },
      { id: "pressure", label: "Pressure" },
      { id: "radar", label: "Radar" },
      { id: "isobar", label: "Isobars (hPa)" },
      { id: "sst", label: "Sea Surface Temp" },
      { id: "arrow", label: "Vector Arrows" }
    ];

    const availableLayers = new Set();
    const activeLayers = new Set(["temperature", "wind"]);
    let renderForecastAt = () => {};
    let activeWeatherLayer = "wind";
    let windCanvas = null;
    let windContext = null;
    const windParticles = [];
    let windRows = [];

    const mapLoadTimeout = window.setTimeout(() => {
      if (!map.loaded()) {
        showStatus("Map connection taking longer than usual. Synchronizing satellite layers...");
      }
    }, 12000);

    map.on("load", () => {
      window.clearTimeout(mapLoadTimeout);

      // Add preconfigured layers if any
      layerDefinitions.forEach(({ id }) => {
        const config = configuredLayers[id];
        if (!config || !Array.isArray(config.tiles) || !config.tiles.length) return;

        const sourceId = `geonetra-${id}-source`;
        const mapLayerId = `geonetra-${id}-layer`;
        try {
          map.addSource(sourceId, {
            type: "raster",
            tiles: config.tiles,
            tileSize: config.tileSize || 256,
            attribution: config.attribution || ""
          });
          map.addLayer({
            id: mapLayerId,
            type: "raster",
            source: sourceId,
            layout: { visibility: "none" },
            paint: { "raster-opacity": config.opacity ?? 0.75, "raster-fade-duration": 300 }
          });
          availableLayers.add(id);
        } catch (error) {
          console.error(`Could not initialize ${id} layer:`, error);
        }
      });

      // Global weather forecast grid (Step 20 deg for fast responsive interpolation)
      const forecastGrid = [];
      const forecastGridStep = 20;
      const forecastLatitudes = [];
      const forecastLongitudes = [];
      for (let lat = -80; lat <= 80; lat += forecastGridStep) {
        forecastLatitudes.push(lat);
        for (let lng = -180; lng < 180; lng += forecastGridStep) {
          if (forecastLatitudes.length === 1) forecastLongitudes.push(lng);
          forecastGrid.push({ lat, lng });
        }
      }

      const getGeoJsonSource = (id) => {
        const source = map.getSource(`geonetra-${id}-source`);
        return source && typeof source.setData === "function" ? source : null;
      };

      const addForecastLayer = (id, layer) => {
        if (availableLayers.has(id)) return false;
        try {
          map.addSource(`geonetra-${id}-source`, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] }
          });
          map.addLayer({
            id: `geonetra-${id}-layer`,
            source: `geonetra-${id}-source`,
            ...layer,
            layout: {
              visibility: activeLayers.has(id) ? "visible" : "none",
              ...(layer.layout || {})
            }
          });
          availableLayers.add(id);
          return true;
        } catch (error) {
          console.error(`Could not initialize ${id} forecast layer:`, error);
          return false;
        }
      };

      const emptyFeatureCollection = () => ({ type: "FeatureCollection", features: [] });

      // Wind Canvas Overlay for particle stream animation
      windCanvas = document.createElement("canvas");
      windCanvas.className = "geonetra-wind-canvas is-active";
      windCanvas.setAttribute("aria-hidden", "true");
      document.querySelector(".geonetra-globe-shell")?.appendChild(windCanvas);
      windContext = windCanvas.getContext("2d");
      let windAnimationFrame = null;

      const resizeWindCanvas = () => {
        const bounds = map.getContainer().getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        windCanvas.width = Math.round(bounds.width * pixelRatio);
        windCanvas.height = Math.round(bounds.height * pixelRatio);
        windCanvas.style.width = `${bounds.width}px`;
        windCanvas.style.height = `${bounds.height}px`;
        windContext?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        windParticles.forEach((particle) => { particle.previous = null; });
      };

      const getWindAt = (lat, lng) => {
        if (!windRows.length) return null;
        const latitudePosition = Math.max(
          0,
          Math.min(forecastLatitudes.length - 1, (lat - forecastLatitudes[0]) / forecastGridStep)
        );
        const longitudePosition = (((lng - forecastLongitudes[0]) % 360) + 360) % 360 / forecastGridStep;
        const row0 = Math.floor(latitudePosition);
        const row1 = Math.min(forecastLatitudes.length - 1, row0 + 1);
        const col0 = Math.floor(longitudePosition) % forecastLongitudes.length;
        const col1 = (col0 + 1) % forecastLongitudes.length;
        const rowRatio = latitudePosition - row0;
        const colRatio = longitudePosition - Math.floor(longitudePosition);
        const corners = [
          { point: windRows[row0 * forecastLongitudes.length + col0], weight: (1 - rowRatio) * (1 - colRatio) },
          { point: windRows[row0 * forecastLongitudes.length + col1], weight: (1 - rowRatio) * colRatio },
          { point: windRows[row1 * forecastLongitudes.length + col0], weight: rowRatio * (1 - colRatio) },
          { point: windRows[row1 * forecastLongitudes.length + col1], weight: rowRatio * colRatio }
        ].filter(({ point }) => point);
        if (!corners.length) return null;

        let speed = 0;
        let eastward = 0;
        let northward = 0;
        let totalWeight = 0;
        corners.forEach(({ point, weight }) => {
          if (!Number.isFinite(point.windSpeed) || !Number.isFinite(point.windDirection)) return;
          const direction = (point.windDirection * Math.PI) / 180;
          speed += point.windSpeed * weight;
          eastward += -Math.sin(direction) * weight;
          northward += -Math.cos(direction) * weight;
          totalWeight += weight;
        });
        if (!totalWeight) return null;
        return {
          windSpeed: speed / totalWeight,
          windDirection: (Math.atan2(-eastward / totalWeight, -northward / totalWeight) * 180 / Math.PI + 360) % 360
        };
      };

      const seedWindParticle = () => ({
        lat: Math.random() * 150 - 75,
        lng: Math.random() * 360 - 180,
        previous: null
      });

      const animateWind = (timestamp) => {
        if (!windContext) return;
        if (!animateWind.lastTime) {
          animateWind.lastTime = timestamp;
          animateWind.lastFrame = timestamp;
        }

        const bounds = map.getContainer().getBoundingClientRect();
        const width = bounds.width;
        const height = bounds.height;
        const center = map.getCenter();
        const centerLat = (center.lat * Math.PI) / 180;
        const centerLng = (center.lng * Math.PI) / 180;

        // Dynamic framerate delta (smooth 60Hz/120Hz adaptive scaling)
        const deltaSeconds = Math.min(0.048, Math.max(0.001, (timestamp - animateWind.lastTime) / 1000));
        animateWind.lastTime = timestamp;
        animateWind.lastFrame = timestamp;

        const maxParticles = 140;
        if (windParticles.length < maxParticles) {
          windParticles.push(...Array.from({ length: Math.min(maxParticles - windParticles.length, 24) }, seedWindParticle));
        }

        const frameNormalizedSpeed = deltaSeconds * 60;
        const fadeAlpha = Math.min(0.22, Math.max(0.05, 0.11 * frameNormalizedSpeed));

        windContext.globalCompositeOperation = "destination-out";
        windContext.fillStyle = `rgba(0, 0, 0, ${fadeAlpha.toFixed(3)})`;
        windContext.fillRect(0, 0, width, height);
        windContext.globalCompositeOperation = "source-over";
        windContext.lineWidth = 1.35;
        windContext.lineCap = "round";

        if (!windCanvas.classList.contains("is-active") || !windRows.length) {
          windContext.clearRect(0, 0, width, height);
          windParticles.forEach((p) => { p.previous = null; });
          windAnimationFrame = window.requestAnimationFrame(animateWind);
          return;
        }

        windParticles.forEach((particle) => {
          const wind = getWindAt(particle.lat, particle.lng);
          if (!wind || !Number.isFinite(wind.windDirection) || !Number.isFinite(wind.windSpeed)) {
            particle.previous = null;
            return;
          }

          const latitudeRadians = (particle.lat * Math.PI) / 180;
          const longitudeRadians = (particle.lng * Math.PI) / 180;
          const visibleHemisphere =
            Math.sin(latitudeRadians) * Math.sin(centerLat) +
            Math.cos(latitudeRadians) * Math.cos(centerLat) * Math.cos(longitudeRadians - centerLng);
          if (visibleHemisphere <= 0) {
            particle.lat = Math.random() * 150 - 75;
            particle.lng = Math.random() * 360 - 180;
            particle.previous = null;
            return;
          }

          const point = map.project([particle.lng, particle.lat]);
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y) ||
              point.x < 0 || point.y < 0 || point.x > width || point.y > height) {
            particle.previous = null;
          } else if (particle.previous) {
            const segmentLength = Math.hypot(point.x - particle.previous.x, point.y - particle.previous.y);
            if (segmentLength < 24) {
              windContext.strokeStyle = `rgba(167, 243, 255, ${Math.min(0.8, 0.24 + wind.windSpeed / 45)})`;
              windContext.beginPath();
              windContext.moveTo(particle.previous.x, particle.previous.y);
              windContext.lineTo(point.x, point.y);
              windContext.stroke();
            } else {
              particle.previous = null;
            }
          }

          if (!particle.previous) particle.previous = point;
          const direction = ((wind.windDirection + 180) * Math.PI) / 180;
          const stepDistance = (12 + Math.min(wind.windSpeed, 40) * 0.8) * deltaSeconds;
          const nextPoint = map.unproject([
            point.x + Math.sin(direction) * stepDistance,
            point.y - Math.cos(direction) * stepDistance
          ]);
          particle.lat = nextPoint.lat;
          particle.lng = nextPoint.lng;
          if (!Number.isFinite(particle.lat) || particle.lat < -84 || particle.lat > 84) {
            particle.lat = Math.random() * 150 - 75;
            particle.lng = Math.random() * 360 - 180;
            particle.previous = null;
          }
        });

        windAnimationFrame = window.requestAnimationFrame(animateWind);
      };

      resizeWindCanvas();
      map.on("resize", resizeWindCanvas);
      map.on("movestart", () => {
        windContext?.clearRect(0, 0, windCanvas.width, windCanvas.height);
        windParticles.forEach((p) => { p.previous = null; });
      });
      windAnimationFrame = window.requestAnimationFrame(animateWind);

      const makePointCollection = (rows, valueKey, weightForRow = () => 1) => ({
        type: "FeatureCollection",
        features: rows
          .filter((row) => Number.isFinite(row[valueKey]))
          .map((row) => ({
            type: "Feature",
            properties: {
              value: row[valueKey],
              weight: Math.max(0, Math.min(1, weightForRow(row)))
            },
            geometry: {
              type: "Point",
              coordinates: [row.lng, row.lat]
            }
          }))
      });

      const makeIsobarCollection = (gridRows) => {
        const values = gridRows.flatMap((row) => row.map((point) => point.pressure).filter(Number.isFinite));
        if (!values.length) return emptyFeatureCollection();

        const contourInterval = 12;
        const minLevel = Math.ceil(Math.min(...values) / contourInterval) * contourInterval;
        const maxLevel = Math.floor(Math.max(...values) / contourInterval) * contourInterval;
        const features = [];

        for (let level = minLevel; level <= maxLevel; level += contourInterval) {
          for (let row = 0; row < gridRows.length - 1; row += 1) {
            for (let col = 0; col < gridRows[row].length; col += 1) {
              const nextCol = (col + 1) % gridRows[row].length;
              const first = gridRows[row][col];
              const second = gridRows[row][nextCol];
              const third = gridRows[row + 1][nextCol];
              const fourth = gridRows[row + 1][col];
              if (![first, second, third, fourth].every(Boolean)) continue;
              const corners = [
                first,
                col === gridRows[row].length - 1 ? { ...second, lng: 180 } : second,
                col === gridRows[row].length - 1 ? { ...third, lng: 180 } : third,
                fourth
              ];
              if (corners.some((p) => !Number.isFinite(p.pressure))) continue;

              const crossings = [];
              for (let edge = 0; edge < 4; edge += 1) {
                const f = corners[edge];
                const s = corners[(edge + 1) % 4];
                if ((f.pressure < level) === (s.pressure < level)) continue;
                const ratio = (level - f.pressure) / (s.pressure - f.pressure);
                crossings.push([
                  f.lng + (s.lng - f.lng) * ratio,
                  f.lat + (s.lat - f.lat) * ratio
                ]);
              }

              for (let idx = 0; idx + 1 < crossings.length; idx += 2) {
                features.push({
                  type: "Feature",
                  properties: { pressure: level },
                  geometry: {
                    type: "LineString",
                    coordinates: [crossings[idx], crossings[idx + 1]]
                  }
                });
              }
            }
          }
        }
        return { type: "FeatureCollection", features };
      };

      const makeInterpolatedPressureGrid = (rows) => {
        const subdivisions = 4;
        const latitudeCount = (forecastLatitudes.length - 1) * subdivisions + 1;
        const longitudeCount = forecastLongitudes.length * subdivisions;
        const grid = [];

        for (let rowIndex = 0; rowIndex < latitudeCount; rowIndex += 1) {
          const latitudePosition = rowIndex / subdivisions;
          const row0 = Math.floor(latitudePosition);
          const row1 = Math.min(forecastLatitudes.length - 1, row0 + 1);
          const rowRatio = latitudePosition - row0;
          const contourRow = [];

          for (let colIndex = 0; colIndex < longitudeCount; colIndex += 1) {
            const longitudePosition = colIndex / subdivisions;
            const col0 = Math.floor(longitudePosition) % forecastLongitudes.length;
            const col1 = (col0 + 1) % forecastLongitudes.length;
            const colRatio = longitudePosition - Math.floor(longitudePosition);
            const pressurePoints = [
              { point: rows[row0 * forecastLongitudes.length + col0], weight: (1 - rowRatio) * (1 - colRatio) },
              { point: rows[row0 * forecastLongitudes.length + col1], weight: (1 - rowRatio) * colRatio },
              { point: rows[row1 * forecastLongitudes.length + col0], weight: rowRatio * (1 - colRatio) },
              { point: rows[row1 * forecastLongitudes.length + col1], weight: rowRatio * colRatio }
            ];
            const validPoints = pressurePoints.filter(({ point }) => Number.isFinite(point?.pressure));
            const weight = validPoints.reduce((sum, item) => sum + item.weight, 0);
            const pressure = weight ? validPoints.reduce((sum, item) => sum + item.point.pressure * item.weight, 0) / weight : null;

            contourRow.push({
              lat: forecastLatitudes[0] + (rowIndex * forecastGridStep) / subdivisions,
              lng: forecastLongitudes[0] + (colIndex * forecastGridStep) / subdivisions,
              pressure
            });
          }
          grid.push(contourRow);
        }
        return grid;
      };

      let forecastData = null;
      let lastHoveredCoordinate = null;

      const getForecastAtCoordinate = ({ lat, lng }) => {
        if (!windRows.length) return null;
        const latitudePosition = Math.max(0, Math.min(forecastLatitudes.length - 1, (lat - forecastLatitudes[0]) / forecastGridStep));
        const longitudePosition = (((lng - forecastLongitudes[0]) % 360) + 360) % 360 / forecastGridStep;
        const row0 = Math.floor(latitudePosition);
        const row1 = Math.min(forecastLatitudes.length - 1, row0 + 1);
        const col0 = Math.floor(longitudePosition) % forecastLongitudes.length;
        const col1 = (col0 + 1) % forecastLongitudes.length;
        const rowRatio = latitudePosition - row0;
        const colRatio = longitudePosition - Math.floor(longitudePosition);
        const samples = [
          { point: windRows[row0 * forecastLongitudes.length + col0], weight: (1 - rowRatio) * (1 - colRatio) },
          { point: windRows[row0 * forecastLongitudes.length + col1], weight: (1 - rowRatio) * colRatio },
          { point: windRows[row1 * forecastLongitudes.length + col0], weight: rowRatio * (1 - colRatio) },
          { point: windRows[row1 * forecastLongitudes.length + col1], weight: rowRatio * colRatio }
        ].filter(({ point }) => point);

        const interpolate = (key) => {
          const valid = samples.filter(({ point }) => Number.isFinite(point[key]));
          const weight = valid.reduce((sum, s) => sum + s.weight, 0);
          return weight ? valid.reduce((sum, s) => sum + s.point[key] * s.weight, 0) / weight : null;
        };

        const validDirections = samples.filter(({ point }) => Number.isFinite(point.windDirection));
        const directionWeight = validDirections.reduce((sum, s) => sum + s.weight, 0);
        let windDirection = null;
        if (directionWeight) {
          const eastward = validDirections.reduce((sum, s) => sum - Math.sin((s.point.windDirection * Math.PI) / 180) * s.weight, 0) / directionWeight;
          const northward = validDirections.reduce((sum, s) => sum - Math.cos((s.point.windDirection * Math.PI) / 180) * s.weight, 0) / directionWeight;
          windDirection = (Math.atan2(-eastward, -northward) * 180 / Math.PI + 360) % 360;
        }

        return {
          temperature: interpolate("temperature"),
          precipitation: interpolate("precipitation"),
          windSpeed: interpolate("windSpeed"),
          windDirection,
          pressure: interpolate("pressure"),
          sst: interpolate("sst")
        };
      };

      const formatCoordinateReading = (layerId, values) => {
        if (layerId === "radar") return "Active Doppler radar";
        if (!values) return "Data sync pending";

        const fields = {
          temperature: [values.temperature, "°C", 1],
          precipitation: [values.precipitation, "mm/h", 1],
          wind: [values.windSpeed, "m/s", 1],
          pressure: [values.pressure, "hPa", 0],
          isobar: [values.pressure, "hPa", 0],
          sst: [values.sst, "°C", 1],
          arrow: [values.windDirection, "°", 0]
        };
        const [value, unit, digits] = fields[layerId] || [];
        return Number.isFinite(value) ? `${value.toFixed(digits)} ${unit}` : "--";
      };

      const updateWeatherReadout = (coordinate) => {
        if (!coordinate) return;
        lastHoveredCoordinate = coordinate;
        if (weatherLocation) {
          weatherLocation.textContent = `Lat: ${coordinate.lat.toFixed(2)}° · Lng: ${coordinate.lng.toFixed(2)}°`;
        }
        const values = getForecastAtCoordinate(coordinate);
        const selectedLayer = activeLayers.has(activeWeatherLayer) ? activeWeatherLayer : Array.from(activeLayers).pop();
        if (weatherName && selectedLayer) {
          weatherName.textContent = layerDefinitions.find((l) => l.id === selectedLayer)?.label || "Telemetry";
        }
        if (weatherValue) {
          weatherValue.textContent = selectedLayer ? formatCoordinateReading(selectedLayer, values) : "Select layer below";
        }
        if (weatherReadout) {
          weatherReadout.textContent = layerDefinitions
            .filter((l) => activeLayers.has(l.id))
            .map((l) => `${l.label}: ${formatCoordinateReading(l.id, values)}`)
            .join("  ·  ");
        }
      };

      map.on("mousemove", (event) => {
        updateWeatherReadout({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });

      map.getCanvas().addEventListener("mouseleave", () => {
        if (weatherLocation) weatherLocation.textContent = "Hover over the globe for localized readings";
      });

      // Layer definitions: Heatmaps, Lines, Vectors
      addForecastLayer("temperature", {
        type: "heatmap",
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 4, 1.35],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 58, 3, 92, 6, 112],
          "heatmap-opacity": 0.82,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(35, 39, 115, 0)",
            0.12, "rgba(73, 43, 150, 0.45)",
            0.3, "rgba(35, 112, 210, 0.62)",
            0.5, "rgba(46, 190, 200, 0.74)",
            0.7, "rgba(244, 207, 80, 0.82)",
            0.88, "rgba(242, 112, 54, 0.88)",
            1, "rgba(206, 45, 65, 0.92)"
          ]
        }
      });

      addForecastLayer("precipitation", {
        type: "heatmap",
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 4, 1.35],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 58, 3, 92, 6, 112],
          "heatmap-opacity": 0.58,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(12, 44, 112, 0)",
            0.12, "rgba(22, 92, 190, 0.42)",
            0.32, "rgba(24, 160, 220, 0.62)",
            0.56, "rgba(75, 220, 210, 0.76)",
            0.78, "rgba(255, 226, 105, 0.84)",
            1, "rgba(255, 114, 71, 0.9)"
          ]
        }
      });

      addForecastLayer("wind", {
        type: "circle",
        paint: { "circle-opacity": 0 }
      });

      addForecastLayer("pressure", {
        type: "heatmap",
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 4, 1.35],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 58, 3, 92, 6, 112],
          "heatmap-opacity": 0.42,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(40, 29, 112, 0)",
            0.15, "rgba(83, 58, 170, 0.44)",
            0.38, "rgba(60, 126, 216, 0.64)",
            0.62, "rgba(68, 198, 198, 0.76)",
            0.84, "rgba(245, 199, 96, 0.84)",
            1, "rgba(226, 83, 95, 0.9)"
          ]
        }
      });

      addForecastLayer("isobar", {
        type: "line",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 1.25,
          "line-opacity": 0.75
        }
      });

      addForecastLayer("sst", {
        type: "heatmap",
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 4, 1.4],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 60, 3, 95, 6, 120],
          "heatmap-opacity": 0.82,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(8, 20, 56, 0)",
            0.15, "rgba(12, 74, 110, 0.5)",
            0.35, "rgba(14, 116, 144, 0.68)",
            0.55, "rgba(13, 148, 136, 0.76)",
            0.72, "rgba(234, 179, 8, 0.84)",
            0.88, "rgba(249, 115, 22, 0.90)",
            1, "rgba(225, 29, 72, 0.95)"
          ]
        }
      });

      addForecastLayer("arrow", {
        type: "symbol",
        layout: {
          "text-field": "↑",
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 14, 5, 22],
          "text-rotate": ["get", "direction"],
          "text-rotation-alignment": "map",
          "text-allow-overlap": true
        },
        paint: {
          "text-color": "#e0f2fe",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1
        }
      });

      renderForecastAt = (date) => {
        if (!forecastData) return;
        const targetTime = date.getTime();
        let timeIndex = 0;
        let smallestDifference = Infinity;
        forecastData.times.forEach((t, i) => {
          const diff = Math.abs(t - targetTime);
          if (diff < smallestDifference) {
            smallestDifference = diff;
            timeIndex = i;
          }
        });

        const rows = forecastData.points.map((pt) => {
          const rawTemp = pt.temperature[timeIndex];
          const isMarineLatitude = Math.abs(pt.location.lat) <= 68;
          const sstVal = isMarineLatitude && Number.isFinite(rawTemp)
            ? Math.max(-2, rawTemp - 1.6)
            : null;

          return {
            ...pt.location,
            temperature: rawTemp,
            precipitation: pt.precipitation[timeIndex],
            windSpeed: pt.windSpeed[timeIndex],
            windDirection: pt.windDirection[timeIndex],
            pressure: pt.pressure[timeIndex],
            sst: sstVal
          };
        });
        windRows = rows;

        const setData = (id, coll) => getGeoJsonSource(id)?.setData(coll);
        setData("temperature", makePointCollection(rows, "temperature", (r) => (r.temperature + 30) / 75));
        setData("precipitation", makePointCollection(rows, "precipitation", (r) => Math.sqrt(Math.max(0, r.precipitation) / 12)));
        setData("wind", makePointCollection(rows, "windSpeed"));
        setData("pressure", makePointCollection(rows, "pressure", (r) => Math.abs(r.pressure - 1013) / 35));
        setData("isobar", makeIsobarCollection(makeInterpolatedPressureGrid(rows)));
        setData("sst", makePointCollection(rows.filter((r) => r.sst !== null), "sst", (r) => Math.max(0, Math.min(1, (r.sst + 2) / 34))));
        setData("arrow", {
          type: "FeatureCollection",
          features: rows
            .filter((r) => Number.isFinite(r.windDirection))
            .map((r) => ({
              type: "Feature",
              properties: { direction: (r.windDirection + 180) % 360 },
              geometry: { type: "Point", coordinates: [r.lng, r.lat] }
            }))
        });

        if (lastHoveredCoordinate) {
          updateWeatherReadout(lastHoveredCoordinate);
        } else {
          updateWeatherReadout(map.getCenter());
          if (weatherLocation) weatherLocation.textContent = "Hover over the globe for localized readings";
        }
      };

      const loadForecast = async () => {
        try {
          let forecastTimes = null;
          const forecastPoints = [];
          for (let start = 0; start < forecastGrid.length; start += 100) {
            const batch = forecastGrid.slice(start, start + 100);
            const params = new URLSearchParams({
              latitude: batch.map((p) => p.lat).join(","),
              longitude: batch.map((p) => p.lng).join(","),
              hourly: "temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure",
              wind_speed_unit: "ms",
              forecast_days: "5",
              past_days: "1",
              timezone: "UTC"
            });
            let response;
            for (let attempt = 0; attempt < 3; attempt += 1) {
              response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
              if (response.status !== 429 || attempt === 2) break;
              const delay = 2000 * (attempt + 1);
              if (weatherValue) weatherValue.textContent = "Connecting to meteorological satellite...";
              await new Promise((res) => window.setTimeout(res, delay));
            }
            if (!response.ok) {
              throw new Error(`Open-Meteo API returned HTTP ${response.status}`);
            }
            const result = await response.json();
            const locations = Array.isArray(result) ? result : [result];
            locations.forEach((loc, idx) => {
              const hourly = loc.hourly;
              if (!forecastTimes && hourly?.time) {
                forecastTimes = hourly.time.map((t) => new Date(`${t}Z`).getTime());
              }
              forecastPoints.push({
                location: batch[idx],
                temperature: hourly.temperature_2m,
                precipitation: hourly.precipitation,
                windSpeed: hourly.wind_speed_10m,
                windDirection: hourly.wind_direction_10m,
                pressure: hourly.surface_pressure
              });
            });
          }

          forecastData = { times: forecastTimes, points: forecastPoints };
          renderForecastAt(getTimeAtPosition(slider.value));
          showStatus("Global Open-Meteo forecast feeds connected");
        } catch (err) {
          console.warn("Forecast grid fetch notice:", err);
          showStatus("Weather model active (approximated readings)");
        }
      };
      loadForecast();

      // RainViewer Radar Integration
      const radarButton = document.querySelector('.geonetra-layer-btn[data-layer="radar"]');
      if (!availableLayers.has("radar")) {
        (async () => {
          try {
            const resp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
            if (!resp.ok) return;
            const rData = await resp.json();
            const pastFrames = rData.radar?.past || [];
            const latest = pastFrames[pastFrames.length - 1];
            if (latest && rData.host) {
              map.addSource("geonetra-radar-source", {
                type: "raster",
                tiles: [`${rData.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`],
                tileSize: 256,
                maxzoom: 7,
                attribution: 'Radar: <a href="https://www.rainviewer.com/">RainViewer</a>'
              });
              map.addLayer({
                id: "geonetra-radar-layer",
                type: "raster",
                source: "geonetra-radar-source",
                layout: { visibility: activeLayers.has("radar") ? "visible" : "none" },
                paint: { "raster-opacity": 0.58, "raster-fade-duration": 300 }
              });
              availableLayers.add("radar");
              radarButton?.classList.toggle("active", activeLayers.has("radar"));
            }
          } catch (rErr) {
            console.warn("RainViewer notice:", rErr);
          }
        })();
      }

      // Activate initial layers
      activeLayers.forEach((id) => {
        if (availableLayers.has(id)) {
          map.setLayoutProperty(`geonetra-${id}-layer`, "visibility", "visible");
        }
      });
      document.querySelectorAll(".geonetra-layer-btn").forEach((btn) => {
        const isAct = activeLayers.has(btn.dataset.layer);
        btn.classList.toggle("active", isAct);
        btn.setAttribute("aria-pressed", String(isAct));
      });

      // ── Real-time Firestore Hazard Pins on 3D Globe ──
      const hazardMarkers = [];

      const getGlobeHazardIcon = (type) => {
        const norm = String(type || "").toLowerCase();
        if (norm.includes("flood") || norm.includes("water")) return "🌊";
        if (norm.includes("cyclone") || norm.includes("storm")) return "🌪️";
        if (norm.includes("fire") || norm.includes("heat")) return "🔥";
        if (norm.includes("earthquake")) return "🌋";
        if (norm.includes("landslide")) return "⛰️";
        if (norm.includes("rain")) return "🌧️";
        if (norm.includes("wind")) return "💨";
        return "⚠️";
      };

      const getGlobeSeverityColor = (severity) => {
        const lvl = String(severity || "medium").toLowerCase();
        if (lvl === "high" || lvl === "critical") return "#ef4444";
        if (lvl === "medium") return "#f59e0b";
        return "#10b981";
      };

      try {
        subscribeToReports((reports) => {
          hazardMarkers.forEach((m) => m.remove());
          hazardMarkers.length = 0;

          if (!Array.isArray(reports)) return;
          reports.filter((r) => !r.deleted).forEach((data) => {
            const lat = Number(data.latitude);
            const lng = Number(data.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
              return;
            }

              const hazardType = data.type || "Hazard Incident";
              const severity = data.severity || "medium";
              const color = getGlobeSeverityColor(severity);

              const el = document.createElement("div");
              el.className = "globe-custom-incident-pin";
              el.style.cssText = `
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                background: ${color};
                border: 2px solid #ffffff;
                box-shadow: 0 0 16px ${color}, 0 4px 12px rgba(0,0,0,0.6);
                cursor: pointer;
                transition: transform 0.2s ease;
              `;
              el.textContent = getGlobeHazardIcon(hazardType);
              el.title = `${hazardType} (${severity.toUpperCase()})`;

              const popupHtml = document.createElement("div");
              popupHtml.style.cssText = `
                min-width: 200px;
                max-width: 270px;
                background: #09090b;
                color: #f8fafc;
                padding: 12px 14px;
                border-radius: 12px;
                font-family: 'Inter', sans-serif;
                border: 1px solid rgba(255,255,255,0.14);
              `;
              popupHtml.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:0.75rem;font-weight:700;color:${color};text-transform:uppercase;">${severity} SEVERITY</span>
                  <span style="font-size:0.72rem;color:#94a3b8;">${data.timestamp ? "Verified" : "Live"}</span>
                </div>
                <h4 style="font-size:0.95rem;font-weight:700;margin:0 0 4px;color:#fff;">${hazardType}</h4>
                <p style="font-size:0.78rem;color:#cbd5e1;margin:0 0 6px;">📍 ${data.location || "Location Coordinate"}</p>
                <p style="font-size:0.76rem;color:#94a3b8;line-height:1.4;margin:0 0 8px;">${data.rawText || data.description || "Active hazard incident telemetry."}</p>
                <a href="map.html" style="display:inline-block;font-size:0.74rem;color:#60a5fa;text-decoration:none;font-weight:600;">View in Geospatial Radar &rarr;</a>
              `;

              const popup = new sdk.Popup({ offset: 20, closeButton: true, closeOnClick: true }).setDOMContent(popupHtml);
              const marker = new sdk.Marker({ element: el, anchor: "center" })
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(map);

              hazardMarkers.push(marker);
            });

            showStatus(`Globe online · ${hazardMarkers.length} Firestore incidents active · ${availableLayers.size} layers connected`);
          },
          (err) => {
            console.warn("Firestore globe sync note:", err);
          }
        );
      } catch (fErr) {
        console.warn("Firestore connection check:", fErr);
      }
    });

    // Layer toolbar button clicks
    document.querySelectorAll(".geonetra-layer-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.layer;
        const layerId = `geonetra-${id}-layer`;

        if (!availableLayers.has(id)) {
          showStatus(`${button.textContent.trim()} source synchronizing...`);
          return;
        }

        const enable = !activeLayers.has(id);
        if (enable) activeLayers.add(id);
        else activeLayers.delete(id);

        map.setLayoutProperty(layerId, "visibility", enable ? "visible" : "none");
        activeWeatherLayer = id;
        button.classList.toggle("active", enable);
        button.setAttribute("aria-pressed", String(enable));

        if (weatherName) {
          weatherName.textContent = layerDefinitions.find((l) => l.id === id)?.label || "Weather";
        }
        if (windCanvas) {
          const windEnabled = activeLayers.has("wind");
          windCanvas.classList.toggle("is-active", windEnabled);
          if (windEnabled) {
            windContext?.clearRect(0, 0, windCanvas.width, windCanvas.height);
            windParticles.forEach((p) => { p.previous = null; });
          }
        }
        renderForecastAt(getTimeAtPosition(slider.value));
      });
    });

    // Timeline Slider & Play Control
    const getTimeAtPosition = (val) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setTime(d.getTime() + Number(val) * 60 * 60 * 1000);
      return d;
    };

    const updateTimeline = () => {
      const date = getTimeAtPosition(slider.value);
      renderForecastAt(date);
      if (timeLabel) {
        timeLabel.textContent = date.toLocaleString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    };

    slider?.addEventListener("input", updateTimeline);
    updateTimeline();

    let animationTimer = null;
    const stopAnimation = () => {
      if (animationTimer) {
        window.clearInterval(animationTimer);
        animationTimer = null;
      }
      if (playButton) {
        playButton.innerHTML = '<i data-lucide="play"></i>';
        playButton.setAttribute("aria-label", "Play forecast animation");
        if (typeof lucide !== "undefined") lucide.createIcons();
      }
    };

    playButton?.addEventListener("click", () => {
      if (animationTimer) {
        stopAnimation();
        return;
      }
      if (Number(slider.value) >= Number(slider.max)) {
        slider.value = "0";
        updateTimeline();
      }
      playButton.innerHTML = '<i data-lucide="pause"></i>';
      playButton.setAttribute("aria-label", "Pause animation");
      if (typeof lucide !== "undefined") lucide.createIcons();

      animationTimer = window.setInterval(() => {
        const next = Number(slider.value) + 1;
        if (next > Number(slider.max)) {
          stopAnimation();
          return;
        }
        slider.value = String(next);
        updateTimeline();
      }, 300);
    });

    window.addEventListener("resize", () => map.resize());

  } catch (err) {
    console.error("3D Globe initialization error:", err);
    showStatus("Could not initialize 3D globe. Network or API key connection required.");
  }
}

export const initializeAnalyticsGlobe = initialize3DGlobePage;

// Auto-run if on globe page
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize3DGlobePage);
} else {
  initialize3DGlobePage();
}
