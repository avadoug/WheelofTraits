"use strict";

const TRAITS = [
  {
    id: "height",
    label: "Height",
    options: [
      { label: "Tall", key: "tall" },
      { label: "Short", key: "short" },
    ],
    colors: ["#f2c968", "#55f28a"],
    glow: "rgba(242, 201, 104, 0.28)",
  },
  {
    id: "color",
    label: "Color",
    options: [
      { label: "Purple", key: "purple" },
      { label: "Green", key: "green" },
    ],
    colors: ["#b16cff", "#55f28a"],
    glow: "rgba(177, 108, 255, 0.32)",
  },
  {
    id: "resin",
    label: "Resin",
    options: [
      { label: "Frosty", key: "frosty" },
      { label: "Not Frosty", key: "notFrosty" },
    ],
    colors: ["#e7fff7", "#9b8560"],
    glow: "rgba(231, 255, 247, 0.34)",
  },
  {
    id: "aroma",
    label: "Aroma",
    options: [
      { label: "Loud Smelling", key: "loud" },
      { label: "Soft Scent", key: "soft" },
    ],
    colors: ["#f2c968", "#8bd7ff"],
    glow: "rgba(242, 201, 104, 0.3)",
  },
  {
    id: "effect",
    label: "Effect",
    options: [
      { label: "Euphoric High", key: "euphoric" },
      { label: "Bunk High", key: "bunk" },
    ],
    colors: ["#55f28a", "#ff7b70"],
    glow: "rgba(85, 242, 138, 0.3)",
  },
];

const WORD_BANKS = {
  purple: ["Violet", "Grape", "Royal", "Nightshade", "Amethyst"],
  green: ["Lime", "Emerald", "Jungle", "Chlorophyll", "Garden"],
  frosty: ["Frost", "Ice", "Crystal", "Resin", "Snowcap"],
  notFrosty: ["Dusty", "Bare", "Lowglow", "Matte", "Dryleaf"],
  loud: ["Funk", "Gas", "Skunk", "Thunder", "Reek"],
  soft: ["Whisper", "Breeze", "Silk", "Hush", "Mist"],
  euphoric: ["Lift", "Halo", "Rocket", "Smile", "Daydream"],
  bunk: ["Couchfake", "Dud", "Brick", "Flatline", "Hayride"],
  tall: ["Tower", "Stretch", "Skyline", "Redwood", "Ladder"],
  short: ["Stump", "Squat", "Bonsai", "Nugget", "Shrub"],
};

const STORAGE_KEY = "strain-spinner-history-v1";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  spinning: false,
  mode: "serious",
  rotations: Object.fromEntries(TRAITS.map((trait) => [trait.id, 0])),
  currentProfile: null,
  history: [],
};

const elements = {
  wheelGrid: document.querySelector("#wheelGrid"),
  spinButton: document.querySelector("#spinButton"),
  spinAgainButton: document.querySelector("#spinAgainButton"),
  spinStatus: document.querySelector("#spinStatus"),
  resultsSection: document.querySelector("#resultsSection"),
  strainName: document.querySelector("#strainName"),
  strainDescription: document.querySelector("#strainDescription"),
  resultBadge: document.querySelector("#resultBadge"),
  keeperScore: document.querySelector("#keeperScore"),
  scoreFill: document.querySelector("#scoreFill"),
  traitLineup: document.querySelector("#traitLineup"),
  visualProfile: document.querySelector("#visualProfile"),
  aromaProfile: document.querySelector("#aromaProfile"),
  effectProfile: document.querySelector("#effectProfile"),
  breederNotes: document.querySelector("#breederNotes"),
  comparisonText: document.querySelector("#comparisonText"),
  copyButton: document.querySelector("#copyButton"),
  shareButton: document.querySelector("#shareButton"),
  downloadButton: document.querySelector("#downloadButton"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  historyList: document.querySelector("#historyList"),
  confettiLayer: document.querySelector("#confettiLayer"),
  toast: document.querySelector("#toast"),
  modeButtons: document.querySelectorAll(".mode-button"),
};

function init() {
  renderWheels();
  state.history = loadHistory();
  renderHistory();

  elements.spinButton.addEventListener("click", spinAllWheels);
  elements.spinAgainButton.addEventListener("click", spinAllWheels);
  elements.copyButton.addEventListener("click", copyCurrentProfile);
  elements.shareButton.addEventListener("click", shareCurrentProfile);
  elements.downloadButton.addEventListener("click", downloadCurrentCard);
  elements.clearHistoryButton.addEventListener("click", clearHistory);

  elements.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
}

function renderWheels() {
  elements.wheelGrid.innerHTML = TRAITS.map((trait) => {
    const [optionA, optionB] = trait.options;

    return `
      <article
        class="wheel-card"
        data-trait-id="${trait.id}"
        style="--option-a: ${trait.colors[0]}; --option-b: ${trait.colors[1]}; --trait-glow: ${trait.glow};"
      >
        <h3 class="wheel-title">${trait.label}</h3>
        <div class="wheel-stage" aria-label="${trait.label} wheel with ${optionA.label} and ${optionB.label}">
          <span class="wheel-pointer" aria-hidden="true"></span>
          <div class="wheel-disc" data-disc-id="${trait.id}">
            <span class="wheel-divider" aria-hidden="true"></span>
            <span class="wheel-option option-a">${optionA.label}</span>
            <span class="wheel-option option-b">${optionB.label}</span>
          </div>
        </div>
        <p class="wheel-result" data-result-id="${trait.id}">Ready</p>
      </article>
    `;
  }).join("");
}

async function spinAllWheels() {
  if (state.spinning) {
    return;
  }

  state.spinning = true;
  elements.resultsSection.hidden = true;
  elements.spinButton.disabled = true;
  elements.spinAgainButton.disabled = true;
  elements.spinButton.querySelector(".button-text").textContent = "Spinning...";
  elements.spinStatus.textContent = "All five wheels are hunting at once.";

  const rolls = TRAITS.map((trait) => prepareWheelSpin(trait));

  await Promise.all(
    rolls.map((roll) => wait(roll.duration + 130))
  );

  rolls.forEach((roll) => settleWheel(roll));

  const profile = createStrainProfile(rolls);
  state.currentProfile = profile;
  renderProfile(profile);
  saveToHistory(profile);

  state.spinning = false;
  elements.spinButton.disabled = false;
  elements.spinAgainButton.disabled = false;
  elements.spinButton.querySelector(".button-text").textContent = "Create My Strain";
  elements.spinStatus.textContent = profile.isLegendary
    ? "Legendary Keeper Found."
    : profile.isCompost
      ? "Compost Candidate Detected."
      : "Fresh profile locked in.";

  if (profile.isLegendary || profile.score >= 88) {
    burstConfetti();
  }
}

function prepareWheelSpin(trait) {
  const selectedIndex = randomBit();
  const selected = trait.options[selectedIndex];
  const landingAngle = selectedIndex === 0 ? 0 : 180;
  const currentRotation = state.rotations[trait.id] ?? 0;
  const currentMod = positiveModulo(currentRotation, 360);
  const distanceToLanding = positiveModulo(landingAngle - currentMod, 360);
  const turns = reducedMotion ? 0 : randomInteger(6, 10);
  const duration = reducedMotion ? 260 : randomInteger(2400, 3800);
  const nextRotation = currentRotation + turns * 360 + distanceToLanding;
  const card = document.querySelector(`[data-trait-id="${trait.id}"]`);
  const disc = document.querySelector(`[data-disc-id="${trait.id}"]`);
  const result = document.querySelector(`[data-result-id="${trait.id}"]`);

  card.classList.remove("selected");
  card.classList.add("spinning");
  result.textContent = "Spinning";
  disc.style.transitionDuration = `${duration}ms`;

  requestAnimationFrame(() => {
    disc.style.transform = `rotate(${nextRotation}deg)`;
  });

  state.rotations[trait.id] = nextRotation;

  return {
    trait,
    selected,
    selectedIndex,
    duration,
  };
}

function settleWheel(roll) {
  const card = document.querySelector(`[data-trait-id="${roll.trait.id}"]`);
  const result = document.querySelector(`[data-result-id="${roll.trait.id}"]`);

  card.classList.remove("spinning");
  card.classList.add("selected");
  result.textContent = roll.selected.label;
}

function createStrainProfile(rolls) {
  const traits = Object.fromEntries(
    rolls.map((roll) => [
      roll.trait.id,
      {
        category: roll.trait.label,
        label: roll.selected.label,
        key: roll.selected.key,
      },
    ])
  );

  const flags = getFlags(traits);
  const score = calculateScore(flags);
  const name = generateStrainName(traits);
  const badge = getBadge(flags, score);
  const details = generateProfileDetails(traits, flags, score);

  return {
    id: `${Date.now()}-${randomInteger(1000, 9999)}`,
    createdAt: new Date().toISOString(),
    mode: state.mode,
    traits,
    name,
    score,
    badge,
    isLegendary: flags.legendary,
    isCompost: flags.compost,
    ...details,
  };
}

function getFlags(traits) {
  const color = traits.color.key;
  const resin = traits.resin.key;
  const aroma = traits.aroma.key;
  const effect = traits.effect.key;

  return {
    tall: traits.height.key === "tall",
    short: traits.height.key === "short",
    purple: color === "purple",
    green: color === "green",
    frosty: resin === "frosty",
    notFrosty: resin === "notFrosty",
    loud: aroma === "loud",
    soft: aroma === "soft",
    euphoric: effect === "euphoric",
    bunk: effect === "bunk",
    legendary: color === "purple" && resin === "frosty" && aroma === "loud" && effect === "euphoric",
    compost: resin === "notFrosty" && aroma === "soft" && effect === "bunk",
  };
}

function calculateScore(flags) {
  let score = 45;

  score += flags.tall ? 6 : 7;
  score += flags.purple ? 8 : 6;
  score += flags.frosty ? 18 : -12;
  score += flags.loud ? 14 : 4;
  score += flags.euphoric ? 18 : -20;

  if (flags.legendary) score += 16;
  if (flags.green && flags.frosty && flags.loud && flags.euphoric) score += 10;
  if (flags.purple && flags.frosty && flags.soft) score += 5;
  if (flags.compost) score -= 18;
  if (flags.notFrosty && flags.bunk) score -= 8;

  return Math.max(0, Math.min(100, score));
}

function getBadge(flags, score) {
  if (flags.legendary) return { label: "Legendary Keeper Found", tone: "elite" };
  if (flags.compost) return { label: "Compost Candidate Detected", tone: "warning" };
  if (score >= 82) return { label: "Elite Hunt Potential", tone: "elite" };
  if (score <= 38) return { label: "Cull Warning", tone: "warning" };
  return { label: "Breeder Curiosity", tone: "standard" };
}

function generateStrainName(traits) {
  const patternPool = [
    ["color", "aroma", "effect"],
    ["resin", "aroma", "height"],
    ["height", "color", "effect"],
    ["color", "resin", "effect"],
    ["resin", "height", "effect"],
    ["height", "aroma", "effect"],
  ];
  const pattern = pick(patternPool);

  return pattern
    .map((traitId) => pick(WORD_BANKS[traits[traitId].key]))
    .join(" ");
}

function generateProfileDetails(traits, flags, score) {
  const serious = state.mode === "serious";
  const heightPhrase = flags.tall
    ? "towering stretch and a long-frame silhouette"
    : "compact stature and tight, squat architecture";
  const colorPhrase = flags.purple
    ? "violet flower expression with dark sugar-leaf contrast"
    : "bright green flower expression with classic market familiarity";
  const resinPhrase = flags.frosty
    ? "heavy resin rails and frosty white coverage"
    : "modest shine with a matte, under-frosted finish";
  const aromaPhrase = flags.loud
    ? "room-filling fruit-funk, gas, and jar-pop intensity"
    : "a softer, more discreet scent that stays close to the flower";
  const effectPhrase = flags.euphoric
    ? "the fictional effect reads bright, social, and upbeat"
    : "the fictional effect report comes in flat, sleepy, and forgettable";

  const description = buildDescription(flags, {
    serious,
    heightPhrase,
    colorPhrase,
    resinPhrase,
    aromaPhrase,
    effectPhrase,
  });

  return {
    description,
    visualProfile: buildVisualProfile(flags, heightPhrase, colorPhrase, resinPhrase),
    aromaProfile: buildAromaProfile(flags),
    effectProfile: buildEffectProfile(flags),
    breederNotes: buildBreederNotes(flags, score, serious),
    comparisonText: buildComparisonText(flags),
  };
}

function buildDescription(flags, parts) {
  if (flags.legendary) {
    return parts.serious
      ? `A showpiece keeper pheno with ${parts.heightPhrase}, ${parts.colorPhrase}, ${parts.resinPhrase}, and ${parts.aromaPhrase}. ${sentenceCase(parts.effectPhrase)} with real top-shelf simulation energy.`
      : `The lab door opens and this one walks out wearing the crown: ${parts.colorPhrase}, ${parts.resinPhrase}, ${parts.aromaPhrase}, and a pretend smoke report that actually has a pulse.`;
  }

  if (flags.compost) {
    return parts.serious
      ? `A low-priority selection with ${parts.heightPhrase}, ${parts.resinPhrase}, ${parts.aromaPhrase}, and a weak fictional effect profile. Best kept as a cautionary note in the pheno log.`
      : `A squat little garden goblin with stealthy aroma and underwhelming resin. Useful as a joke pheno, compost candidate, or cautionary tale in the breeder notes.`;
  }

  if (flags.short && flags.purple && flags.frosty && flags.loud && flags.euphoric) {
    return `A compact bag-appeal monster with dark coloration, dense frost coverage, and loud jar appeal. This would be the type of fictional pheno people argue over after the first cure sample.`;
  }

  return parts.serious
    ? `A fictional hybrid expression showing ${parts.heightPhrase}, ${parts.colorPhrase}, ${parts.resinPhrase}, and ${parts.aromaPhrase}. ${sentenceCase(parts.effectPhrase)}, making this a ${flags.bunk ? "novelty roll" : "credible keeper candidate"} in the simulator.`
    : `A breeder-board curveball with ${parts.heightPhrase}, ${parts.colorPhrase}, ${parts.resinPhrase}, and ${parts.aromaPhrase}. The imaginary tester notes call it ${flags.bunk ? "more punchline than prize" : "surprisingly charming"}.`;
}

function buildVisualProfile(flags, heightPhrase, colorPhrase, resinPhrase) {
  if (flags.legendary) {
    return `Expect the fictional plant to read like a catalog cover: ${heightPhrase}, ${colorPhrase}, and ${resinPhrase}. The contrast between dark color and frost is the visual hook.`;
  }

  if (flags.compost) {
    return `The look is more field-note than trophy shot: ${heightPhrase}, ${colorPhrase}, and ${resinPhrase}. It might be memorable, but mostly because the bar was low.`;
  }

  return `${sentenceCase(heightPhrase)} paired with ${colorPhrase} and ${resinPhrase}. The simulated bag appeal ${flags.frosty ? "leans strong" : "needs help from every other trait on the board"}.`;
}

function buildAromaProfile(flags) {
  if (flags.loud && flags.purple) {
    return "Loud purple dessert-line energy: fruit skin, sweet funk, and a sharp jar note. A loose stylistic vibe, not a real terpene claim.";
  }

  if (flags.loud && flags.green) {
    return "Brash green-flower character with gas, citrus peel, and old-school funk in the fictional nose. It is built for presence rather than subtlety.";
  }

  if (flags.soft && flags.purple) {
    return "Soft berry, floral hush, and mild sweetness. The color carries more of the personality than the aroma volume.";
  }

  return "Low-volume herbal scent with a clean, quiet finish. In a real hunt, this would need exceptional structure or resin to stay interesting.";
}

function buildEffectProfile(flags) {
  if (flags.euphoric && flags.loud) {
    return "Fictional tester notes lean bright, social, and animated, like a line selected for mood and momentum. No medical or real-world effect claim is implied.";
  }

  if (flags.euphoric) {
    return "The simulated effect is upbeat and easygoing, with more charm than raw intensity. Treat it as flavor text for the generator.";
  }

  if (flags.bunk && flags.compost) {
    return "The imaginary effect report is a shrug in paragraph form: flat, forgettable, and headed straight for the reject tray.";
  }

  return "The fictional effect reads underpowered and uneven. It may have novelty value, but the keeper argument gets difficult.";
}

function buildBreederNotes(flags, score, serious) {
  if (flags.legendary) {
    return "Tag it, photograph it, and keep the fictional lab notebook close. Purple, frost, loud aroma, and euphoric profile all hit at once, so this earns the secret keeper stamp.";
  }

  if (flags.compost) {
    return serious
      ? "Not frosty, soft-scented, and bunk is the classic low-priority trio. The breeder-minded move is to document the result and move on in this fictional simulation."
      : "The notebook entry is short, the optimism is shorter, and the compost bin is spiritually prepared.";
  }

  if (score >= 82) {
    return "Strong keeper potential. The lineup has enough resin, nose, and positive fictional effect language to justify a second look in the simulator.";
  }

  if (score <= 38) {
    return "Cull warning. One weak trait can be workable, but this profile stacks too many soft signals to feel competitive.";
  }

  return flags.frosty
    ? "Worth a closer look. Frost helps the case, but the final decision depends on whether the weaker traits are quirks or liabilities."
    : "The profile needs help. Without heavy resin, it leans on structure, color, aroma, or humor to earn its place.";
}

function buildComparisonText(flags) {
  const prefix = "Loose stylistic comparison only: ";

  if (flags.legendary) {
    return `${prefix}reminiscent of purple dessert lines, selected Gelato-style phenos, Tropicana-style purple citrus cuts, or loud exotic hybrids.`;
  }

  if (flags.green && flags.frosty && flags.loud && flags.euphoric) {
    return `${prefix}reminiscent of classic Chemdog-influenced hybrids, Sour Diesel-style loud green flower, or energetic haze-leaning keepers.`;
  }

  if (flags.purple && flags.soft && flags.euphoric) {
    return `${prefix}could resemble mild purple hybrids selected more for color and mood than raw nose.`;
  }

  if (flags.green && flags.frosty && flags.soft) {
    return `${prefix}suggests quiet green resin selections, light cookie-style bag appeal, or understated hybrid cuts.`;
  }

  if (flags.notFrosty && flags.soft && flags.bunk) {
    return "This is the pheno that gets quietly removed from the hunt.";
  }

  if (flags.purple && flags.frosty) {
    return `${prefix}brings to mind frosty purple hybrids, dessert-leaning bag appeal, and color-first exotic selections.`;
  }

  if (flags.loud && flags.bunk) {
    return `${prefix}the nose talks louder than the fictional effect, like a novelty keeper that wins the jar test and loses the follow-up meeting.`;
  }

  return `${prefix}a mixed hybrid profile with a few familiar cues but no single famous lane. The fun is in the fictional pheno hunt.`;
}

function renderProfile(profile) {
  elements.resultsSection.hidden = false;
  elements.strainName.textContent = profile.name;
  elements.strainDescription.textContent = profile.description;
  elements.resultBadge.textContent = profile.badge.label;
  elements.resultBadge.className = `badge ${profile.badge.tone}`;
  elements.keeperScore.textContent = `${profile.score}/100`;
  elements.visualProfile.textContent = profile.visualProfile;
  elements.aromaProfile.textContent = profile.aromaProfile;
  elements.effectProfile.textContent = profile.effectProfile;
  elements.breederNotes.textContent = profile.breederNotes;
  elements.comparisonText.textContent = profile.comparisonText;

  elements.traitLineup.innerHTML = TRAITS.map((trait) => {
    const selected = profile.traits[trait.id];
    return `
      <div>
        <dt>${trait.label}</dt>
        <dd>${selected.label}</dd>
      </div>
    `;
  }).join("");

  requestAnimationFrame(() => {
    elements.scoreFill.style.width = `${profile.score}%`;
  });

  elements.resultsSection.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
}

function saveToHistory(profile) {
  const entry = {
    id: profile.id,
    createdAt: profile.createdAt,
    name: profile.name,
    score: profile.score,
    badge: profile.badge.label,
    traits: Object.fromEntries(
      TRAITS.map((trait) => [trait.id, profile.traits[trait.id].label])
    ),
  };

  state.history = [entry, ...state.history.filter((item) => item.id !== entry.id)].slice(0, 10);
  persistHistory();
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = `<p class="empty-history">Your last 10 creations will appear here.</p>`;
    elements.clearHistoryButton.disabled = true;
    return;
  }

  elements.clearHistoryButton.disabled = false;
  elements.historyList.innerHTML = state.history.map((item) => {
    const traitSummary = TRAITS.map((trait) => item.traits[trait.id]).join(" / ");

    return `
      <article class="history-item">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${item.score}/100 · ${escapeHtml(item.badge)}</span>
        <span>${escapeHtml(traitSummary)}</span>
      </article>
    `;
  }).join("");
}

function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored).slice(0, 10) : [];
  } catch (error) {
    return [];
  }
}

function persistHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  } catch (error) {
    showToast("History could not be saved in this browser.");
  }
}

function clearHistory() {
  state.history = [];
  persistHistory();
  renderHistory();
  showToast("Previous creations cleared.");
}

function setMode(mode) {
  state.mode = mode === "goofy" ? "goofy" : "serious";

  elements.modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });

  if (state.currentProfile) {
    const rolls = TRAITS.map((trait) => ({
      trait,
      selected: {
        label: state.currentProfile.traits[trait.id].label,
        key: state.currentProfile.traits[trait.id].key,
      },
    }));
    const refreshed = createStrainProfile(rolls);
    refreshed.id = state.currentProfile.id;
    refreshed.createdAt = state.currentProfile.createdAt;
    refreshed.name = state.currentProfile.name;
    state.currentProfile = refreshed;
    renderProfile(refreshed);
  }
}

async function copyCurrentProfile() {
  if (!state.currentProfile) {
    showToast("Spin first, then copy the profile.");
    return;
  }

  await copyText(formatProfileText(state.currentProfile));
  showToast("Strain profile copied.");
}

async function shareCurrentProfile() {
  if (!state.currentProfile) {
    showToast("Spin first, then share the result.");
    return;
  }

  const text = formatProfileText(state.currentProfile);

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Strain Spinner: ${state.currentProfile.name}`,
        text,
      });
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    }
  }

  await copyText(text);
  showToast("Sharing is not available here, so the result was copied.");
}

function downloadCurrentCard() {
  if (!state.currentProfile) {
    showToast("Spin first, then download a card.");
    return;
  }

  const svg = buildResultCardSvg(state.currentProfile);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${slugify(state.currentProfile.name)}-strain-card.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Result card downloaded as SVG.");
}

function buildResultCardSvg(profile) {
  const width = 1200;
  const height = 720;
  const traitLines = TRAITS.map((trait) => `${trait.label}: ${profile.traits[trait.id].label}`);
  const descriptionLines = wrapText(profile.description, 78, 4);
  const comparisonLines = wrapText(profile.comparisonText, 82, 3);

  const traitSvg = traitLines.map((line, index) => {
    const x = index % 2 === 0 ? 92 : 600;
    const y = 382 + Math.floor(index / 2) * 54;
    return `<text x="${x}" y="${y}" class="trait">${escapeXml(line)}</text>`;
  }).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#07110a"/>
          <stop offset="0.5" stop-color="#11170d"/>
          <stop offset="1" stop-color="#170920"/>
        </linearGradient>
        <linearGradient id="score" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ff7b70"/>
          <stop offset="0.55" stop-color="#f2c968"/>
          <stop offset="1" stop-color="#55f28a"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="16" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <style>
          text { font-family: Inter, Arial, sans-serif; letter-spacing: 0; }
          .small { fill: #f2c968; font-size: 24px; font-weight: 800; text-transform: uppercase; }
          .title { fill: #f4fff5; font-size: 72px; font-weight: 900; }
          .body { fill: #bfd4c4; font-size: 29px; font-weight: 500; }
          .trait { fill: #f4fff5; font-size: 29px; font-weight: 800; }
          .badge { fill: #07100a; font-size: 24px; font-weight: 900; }
          .scoreText { fill: #f4fff5; font-size: 42px; font-weight: 900; }
        </style>
      </defs>
      <rect width="1200" height="720" rx="34" fill="url(#bg)"/>
      <circle cx="980" cy="150" r="220" fill="#55f28a" opacity="0.13" filter="url(#glow)"/>
      <circle cx="1040" cy="570" r="250" fill="#b16cff" opacity="0.14" filter="url(#glow)"/>
      <rect x="52" y="52" width="1096" height="616" rx="26" fill="#ffffff" fill-opacity="0.045" stroke="#e7fff7" stroke-opacity="0.22"/>
      <text x="86" y="112" class="small">Strain Spinner Fictional Profile</text>
      <text x="86" y="190" class="title">${escapeXml(profile.name)}</text>
      <rect x="86" y="222" width="390" height="48" rx="24" fill="${profile.badge.tone === "warning" ? "#ff7b70" : "#f2c968"}"/>
      <text x="110" y="255" class="badge">${escapeXml(profile.badge.label)}</text>
      ${descriptionLines.map((line, index) => `<text x="86" y="${318 + index * 38}" class="body">${escapeXml(line)}</text>`).join("")}
      ${traitSvg}
      <text x="86" y="574" class="small">Keeper Potential</text>
      <text x="352" y="582" class="scoreText">${profile.score}/100</text>
      <rect x="86" y="608" width="600" height="20" rx="10" fill="#000000" fill-opacity="0.36" stroke="#e7fff7" stroke-opacity="0.2"/>
      <rect x="86" y="608" width="${Math.round(600 * (profile.score / 100))}" height="20" rx="10" fill="url(#score)"/>
      ${comparisonLines.map((line, index) => `<text x="736" y="${552 + index * 36}" class="body">${escapeXml(line)}</text>`).join("")}
    </svg>
  `.trim();
}

function formatProfileText(profile) {
  const lines = [
    `Strain Spinner: ${profile.name}`,
    `${profile.badge.label} · Keeper Potential ${profile.score}/100`,
    "",
    "Trait Lineup:",
    ...TRAITS.map((trait) => `${trait.label}: ${profile.traits[trait.id].label}`),
    "",
    profile.description,
    "",
    `Likely Visual Appearance: ${profile.visualProfile}`,
    `Likely Aroma Profile: ${profile.aromaProfile}`,
    `Likely Effect Profile: ${profile.effectProfile}`,
    `Grower/Breeder Notes: ${profile.breederNotes}`,
    "",
    `Strains This Reminds Us Of: ${profile.comparisonText}`,
    "",
    "Fictional entertainment only. No real genetics, product, cultivation, medical, or effect claim is implied.",
  ];

  return lines.join("\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      // Fall back for file URLs and stricter browser contexts.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function burstConfetti() {
  const colors = ["#55f28a", "#b16cff", "#f2c968", "#e7fff7"];
  const count = reducedMotion ? 12 : 72;
  elements.confettiLayer.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${randomInteger(4, 96)}%`;
    piece.style.background = pick(colors);
    piece.style.animationDelay = `${randomInteger(0, 280)}ms`;
    piece.style.setProperty("--drift", `${randomInteger(-150, 150)}px`);
    piece.style.setProperty("--spin", `${randomInteger(180, 900)}deg`);
    elements.confettiLayer.appendChild(piece);
  }

  window.setTimeout(() => {
    elements.confettiLayer.innerHTML = "";
  }, 1800);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2400);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randomBit() {
  if (window.crypto?.getRandomValues) {
    const buffer = new Uint8Array(1);
    window.crypto.getRandomValues(buffer);
    return buffer[0] < 128 ? 0 : 1;
  }

  return Math.random() < 0.5 ? 0 : 1;
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(items) {
  return items[randomInteger(0, items.length - 1)];
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function sentenceCase(text) {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function wrapText(text, maxCharacters, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/[.,;:]?$/, "")}...`;
    return clipped;
  }

  return lines;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(text) {
  return escapeHtml(text);
}

init();
