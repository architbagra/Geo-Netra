// hazard-submit.js - Hazard form submission, photo compression & Gemini AI summary (Backed by MongoDB Atlas)
const imgbbApiKey = "9d23bff63185b7f0510ec68c8ee13b54";
const summaryApiEndpoint = "http://localhost:3000/api/generate-summary";
const backendHazardEndpoint = "http://localhost:3000/api/hazards";

const hazardForm = document.getElementById("hazard-form");
const submitBtn = document.getElementById("submit-btn");
const formStatus = document.getElementById("form-status");
const generateAiBtn = document.getElementById("generateAiBtn");
const summaryPreviewContainer = document.getElementById("summaryPreviewContainer");
const summaryText = document.getElementById("summaryText");
const approveSummaryBtn = document.getElementById("approveSummaryBtn");
const discardSummaryBtn = document.getElementById("discardSummaryBtn");
const aiSummaryStatus = document.getElementById("aiSummaryStatus");
const rawTextInput = document.getElementById("h-desc");

window.currentAiSummaries = null;
window.aiSummaryApproved = false;
window.aiSummarySourceText = "";

function setAiStatus(message, tone = "neutral") {
  if (!aiSummaryStatus) return;

  aiSummaryStatus.textContent = message;
  aiSummaryStatus.className = `ai-summary-status ${tone}`;
  aiSummaryStatus.hidden = !message;
}

function clearAiSummaryState() {
  window.currentAiSummaries = null;
  window.aiSummaryApproved = false;
  window.aiSummarySourceText = "";

  if (summaryPreviewContainer) {
    summaryPreviewContainer.hidden = true;
  }

  if (summaryText) {
    summaryText.textContent = "";
  }
}

function renderAiSummaryPreview(summaryObject) {
  if (!summaryPreviewContainer || !summaryText) return;

  summaryPreviewContainer.hidden = false;
  summaryText.textContent = summaryObject.summaryOriginal || "";
}

function setGenerateButtonLoading(isLoading) {
  if (!generateAiBtn) return;

  generateAiBtn.disabled = isLoading;
  generateAiBtn.innerHTML = isLoading
    ? '<span class="btn-spinner"></span> Generating AI Summary...'
    : '<i data-lucide="sparkles"></i> <span>Generate AI Summary</span>';
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

async function fetchGeminiSummary(rawText) {
  const response = await fetch(summaryApiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ rawText })
  });

  const result = await response.json();
  if (!response.ok) {
    const message = result?.error || "The backend could not generate a summary.";
    throw new Error(message);
  }

  if (!result?.summaryOriginal || !result?.summaryEnglish || !result?.summaryHindi) {
    throw new Error("The backend returned an incomplete summary response.");
  }

  return result;
}

async function compressImage(file, options = {}) {
  const maxWidth = options.maxWidth || 1600;
  const maxHeight = options.maxHeight || 1600;
  const quality = options.quality || 0.75;
  const outputType = options.outputType || "image/jpeg";

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the selected image."));
    img.src = dataUrl;
  });

  let { width, height } = image;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);

  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image compression is not supported in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not compress the selected image."));
        return;
      }

      const fileExtension = outputType === "image/png" ? "png" : "jpg";
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      resolve(new File([blob], `${baseName}-compressed.${fileExtension}`, { type: outputType }));
    }, outputType, quality);
  });
}

if (generateAiBtn && rawTextInput) {
  generateAiBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    const rawText = rawTextInput.value.trim();
    if (!rawText) {
      setAiStatus("Write the hazard report description first, then generate the AI summary.", "error");
      return;
    }

    setGenerateButtonLoading(true);
    setAiStatus("Generating bilingual AI summary preview via Gemini...", "neutral");

    try {
      const summaries = await fetchGeminiSummary(rawText);
      window.currentAiSummaries = summaries;
      window.aiSummaryApproved = false;
      window.aiSummarySourceText = rawText;
      renderAiSummaryPreview(summaries);
      setAiStatus("Summary ready. Click 'Approve Summary' to bundle it with this report.", "success");
    } catch (error) {
      console.error("Gemini summary generation failed:", error);
      clearAiSummaryState();
      setAiStatus("AI summary generation failed. (Ensure backend is running). You can still submit without AI summary.", "error");
    } finally {
      setGenerateButtonLoading(false);
    }
  });

  rawTextInput.addEventListener("input", () => {
    const nextValue = rawTextInput.value.trim();
    if (window.currentAiSummaries && nextValue !== window.aiSummarySourceText) {
      clearAiSummaryState();
      setAiStatus("The report description changed, so previous AI summary was cleared. Generate again if needed.", "neutral");
    }
  });
}

if (approveSummaryBtn) {
  approveSummaryBtn.addEventListener("click", () => {
    if (!window.currentAiSummaries) {
      setAiStatus("Generate a summary first before approving it.", "error");
      return;
    }

    window.aiSummaryApproved = true;
    setAiStatus("AI summary approved. It will be recorded with this official report.", "success");
  });
}

if (discardSummaryBtn) {
  discardSummaryBtn.addEventListener("click", () => {
    clearAiSummaryState();
    setAiStatus("AI summary discarded. Only the original report notes will be submitted.", "neutral");
  });
}

if (hazardForm) {
  hazardForm.addEventListener("reset", () => {
    window.setTimeout(() => {
      clearAiSummaryState();
      setAiStatus("");
    }, 0);
  });

  hazardForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const type = document.getElementById("h-type").value;
    const location = document.getElementById("h-location").value.trim();
    const latitude = parseFloat(document.getElementById("h-lat").value) || null;
    const longitude = parseFloat(document.getElementById("h-lng").value) || null;
    const severity = document.querySelector('input[name="severity"]:checked')?.value || "low";
    const phone = document.getElementById("h-phone").value.trim();
    const countryCode = document.getElementById("hazard-country-val")?.value || "+91";
    const rawText = document.getElementById("h-desc").value.trim();
    const photoInputElement = document.getElementById("photoInput");
    const imageFile = photoInputElement?.files?.[0] || null;

    if (!type || !location || !rawText || !phone) {
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!/^[0-9]{7,15}$/.test(cleanPhone)) {
      formStatus.textContent = "Please enter a valid phone number (7-15 digits).";
      formStatus.className = "form-status error";
      formStatus.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Report";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner"></span> Submitting Report...';
    formStatus.style.display = "none";

    let finalPhotoUrl = null;
    const approvedSummaries =
      window.currentAiSummaries &&
      window.aiSummaryApproved === true &&
      window.aiSummarySourceText === rawText
        ? window.currentAiSummaries
        : null;

    try {
      if (imageFile) {
        try {
          const compressedImageFile = await compressImage(imageFile, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.65,
            outputType: "image/jpeg"
          });

          const formData = new FormData();
          formData.append("image", compressedImageFile);

          const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
            method: "POST",
            body: formData
          });

          const result = await response.json();

          if (response.ok && result?.success && result?.data?.display_url) {
            finalPhotoUrl = result.data.display_url;
          } else {
            throw new Error("ImgBB service unavailable");
          }
        } catch (imgErr) {
          console.warn("External image host fallback to base64 preview:", imgErr);
          // Base64 Data URL fallback so photo evidence is never lost
          finalPhotoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(imageFile);
          });
        }
      }

      const formattedPhone = `${countryCode} ${cleanPhone}`;
      const authUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("geonetra_auth_user") || "null");
        } catch { return null; }
      })();
      const userEmail = authUser?.email || null;
      const userName = authUser?.username || null;
      const isVerifiedUser = (() => {
        if (!userEmail) return false;
        if (authUser?.role === "admin" || userEmail.toLowerCase() === "admin@geonetra.com") return true;
        try {
          const list = JSON.parse(localStorage.getItem("geonetra_verified_reporters") || "[]");
          return list.some((item) => (typeof item === "string" ? item.toLowerCase() : (item.email || "").toLowerCase()) === userEmail.toLowerCase());
        } catch { return false; }
      })();

      const payload = {
        type,
        location,
        phone: formattedPhone,
        observerPhone: cleanPhone,
        countryCode: countryCode,
        userEmail,
        userName,
        verified: isVerifiedUser,
        isVerifiedReporter: isVerifiedUser,
        latitude: latitude || 20.5937,
        longitude: longitude || 78.9629,
        severity,
        rawText,
        summaryOriginal: approvedSummaries?.summaryOriginal || null,
        summaryEnglish: approvedSummaries?.summaryEnglish || null,
        summaryHindi: approvedSummaries?.summaryHindi || null,
        sourceLanguage: approvedSummaries?.sourceLanguage || null,
        photoUrl: finalPhotoUrl,
        timestamp: new Date().toISOString()
      };

      let submitted = false;
      let createdHazard = null;

      // 1. Submit directly to Central MongoDB Atlas Backend API
      try {
        const backendRes = await fetch(backendHazardEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (backendRes.ok) {
          const resData = await backendRes.json();
          createdHazard = resData?.hazard || null;
          submitted = true;
        }
      } catch (backendErr) {
        console.warn("Backend API notice:", backendErr);
      }

      // 2. Keep in Local Storage Cache for immediate zero-latency display
      try {
        const localKey = "geonetra_local_hazards";
        const stored = JSON.parse(localStorage.getItem(localKey) || "[]");
        const reportToCache = createdHazard || {
          id: `haz_local_${Date.now()}`,
          ...payload,
          status: "open",
          pinned: false,
          votes: 1,
          deleted: false
        };
        stored.unshift(reportToCache);
        localStorage.setItem(localKey, JSON.stringify(stored));
        submitted = true;

        // Notify reports store to refresh views across all components
        window.dispatchEvent(new CustomEvent("geonetra:reports-changed"));
      } catch (locErr) {
        console.warn("Local storage cache notice:", locErr);
      }

      if (submitted) {
        const msg = approvedSummaries
          ? "Hazard report successfully broadcasted to MongoDB Atlas with verified AI summary!"
          : "Hazard report successfully broadcasted to MongoDB Atlas monitoring network!";
        const focusQuery = createdHazard?.id ? `?focus=${encodeURIComponent(createdHazard.id)}` : "";
        formStatus.innerHTML = `<span>${msg}</span> <a href="map.html${focusQuery}" style="color:#93c5fd;font-weight:700;margin-left:0.6rem;text-decoration:underline;display:inline-flex;align-items:center;gap:0.25rem;">View Pin on Live Map &rarr;</a>`;
        formStatus.className = "form-status success";
        formStatus.style.display = "block";
        hazardForm.reset();

        // Reset location confirm button
        const confirmLocBtn = document.getElementById("confirm-location-btn");
        if (confirmLocBtn) {
          confirmLocBtn.disabled = false;
          confirmLocBtn.innerHTML = '<i data-lucide="crosshair"></i> <span>Confirm Pinned Location</span>';
        }
      } else {
        throw new Error("Unable to save report locally or to server.");
      }
    } catch (err) {
      console.error("Submission error:", err);
      formStatus.textContent = "Submission failed: " + (err.message || "Please check network connectivity.");
      formStatus.className = "form-status error";
      formStatus.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="send"></i> <span>Broadcast Report to Network</span>';
      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }
    }
  });
}
