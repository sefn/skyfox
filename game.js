// --- DATA & INVENTORY SYSTEM ---
let gameData = JSON.parse(localStorage.getItem('skyFoxData')) || {
    lollies: 0,
    unlocked: { chars: ['fox'], accessories: ['none'], themes: ['forest', 'mountain', 'canyon'] },
    equipped: { char: 'fox', accessory: 'none' },
    completedLevels: []
};

const CURRENCY_ICON = '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" style="vertical-align: -0.2em; filter: drop-shadow(0px 2px 4px rgba(255,215,0,0.6));" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#FFD700" stroke="#FF8C00" stroke-width="1"/></svg>';

// Stars used to be popsicles/lollies, keep the name for backwards compatibility and nostalgia
// --- SAFEGUARDS FOR OLD SAVE FILES ---
if (!gameData.completedLevels) gameData.completedLevels = [];
if (!gameData.unlocked.themes) gameData.unlocked.themes = ['forest', 'mountain', 'canyon'];
if (typeof gameData.lollies === 'undefined') gameData.lollies = 0;

const SHOP_DATABASE = [
    { id: 'tophat', type: 'accessories', name: '🎩 Top Hat', cost: 2, desc: 'Classy.' },
{ id: 'headphones', type: 'accessories', name: '🎧 Headphones', cost: 5, desc: 'Jam out while running.' },
{ id: 'crown', type: 'accessories', name: '👑 Gold Crown', cost: 10, desc: 'King of the sky!' },

{ id: 'pinkfox', type: 'chars', name: '🦊 Pink Fox', cost: 3, desc: 'Stylish palette.' },
{ id: 'wolf', type: 'chars', name: '🐺 Grey Wolf', cost: 4, desc: 'Fierce and fast.' },
{ id: 'raccoon', type: 'chars', name: '🦝 Raccoon', cost: 6, desc: 'The bestest trash bandit.' },
{ id: 'penguin', type: 'chars', name: '🐧 Penguin', cost: 5, desc: 'Waddle waddle.' },

{ id: 'neon', type: 'themes', name: '🏙️ Neon City', cost: 4, desc: 'Synthwave vibes.' },
{ id: 'candy', type: 'themes', name: '🍭 Candy Land', cost: 8, desc: 'Sweet and sugary.' },
{ id: 'night', type: 'themes', name: '🔦 Night Road', cost: 6, desc: 'Did you bring a flashlight?' },
];

function saveData() { localStorage.setItem('skyFoxData', JSON.stringify(gameData)); }

window.previewItem = function(type, id) {
    if (type === 'chars') previewState.char = id;
    if (type === 'accessories') previewState.acc = id;

    if (type === 'themes') {
        previewState.theme = id;
        applyTheme(THEMES[id], id);
        previewLevel(); // Rebuilds the track colors immediately
    } else {
        rebuildPlayer(true); // Only rebuild player for chars/accessories
    }

    updateShopUI();
};

// --- GAME CONFIG & DIFFICULTY ---
let soundEffects = true;
let selectedLevelId = 'endless';
let highScore = localStorage.getItem('skyFoxHighScore') || 0;
document.getElementById('highscore-display').innerText = highScore;

const DIFFICULTIES = {
    easy:   { min: 0.08, max: 0.30, absMax: 0.50, accel: 0.001, brake: 0.010, mult: 0.5, density: 0.5, steer: 0.20 },
    normal: { min: 0.12, max: 0.50, absMax: 0.85, accel: 0.003, brake: 0.006, mult: 1.0, density: 1.0, steer: 0.24 },
    hard:   { min: 0.18, max: 0.75, absMax: 1.20, accel: 0.005, brake: 0.004, mult: 2.0, density: 1.5, steer: 0.28 }
};

let currentDiff = DIFFICULTIES.normal;
let currentThemeId = 'forest';

const NUM_LANES = 17, BLOCK_SIZE = 2, PARTICLE_COUNT = 80;
let TRACK_LENGTH = 500;

const FLOOR = { EMPTY: 0, BASE: 1, HIGH: 2, VHIGH: 3, ICE: 4, LAVA: 5, TUNNEL: 6, HIGH_ICE: 10, VHIGH_ICE: 11, HIGH_LAVA: 12, VHIGH_LAVA: 13, HIGH_TUNNEL: 14 };
const ITEM  = { NONE: 0, OBSTACLE: 1, SLOW: 2, SPRING: 3, GEM: 4, FOOD: 5, BOOST: 6, END: 9, BOOST_WITH_GEM: 8 };

const COLOR_SPRING = 0x00FFFF, COLOR_LAVA = 0xFF4500, COLOR_GEM = 0xFF00FF, COLOR_FOOD = 0xFF3366, COLOR_BOOST = 0xFFA500, COLOR_ICE = 0x88EEFF;

const THEMES = {
    forest: { bg: 0x87CEEB, mat1: 0x32CD32, mat2: 0x2E8B57, obstacle: 'tree', slowMat: 0xF4A460, slowParticle: 0xffddaa, tunnelCol: 0x5c4033, waterColor: 0x1E90FF, waterOpacity: 0.8 },
        mountain: { bg: 0xd8e2ec, mat1: 0x808080, mat2: 0x505050, obstacle: 'spike', slowMat: 0x94a3b8, slowParticle: 0xffffff, tunnelCol: 0x333333, waterColor: 0x93c5fd, waterOpacity: 0.5 },
        canyon: { bg: 0xeb7a34, mat1: 0xd27d2d, mat2: 0xb36522, obstacle: 'cactus', slowMat: 0xedc9af, slowParticle: 0xedc9af, tunnelCol: 0x8a3e14, waterColor: 0x8a3e14, waterOpacity: 0.6 },
        neon: { bg: 0x050510, mat1: 0x111122, mat2: 0x222244, obstacle: 'laser', slowMat: 0x440044, slowParticle: 0xff00ff, tunnelCol: 0x000000, waterColor: 0xff00ff, waterOpacity: 0.4 },
        candy: { bg: 0xFFC0CB, mat1: 0xFFC0CB, mat2: 0xFF6984, obstacle: 'lollipop', slowMat: 0xFF69B4, slowParticle: 0xFFFFFF, tunnelCol: 0x8B4513, waterColor: 0xFF1493, waterOpacity: 0.5 },
        night: { bg: 0x020205, mat1: 0x111111, mat2: 0x222222, obstacle: 'spike', slowMat: 0x550000, slowParticle: 0x880000, tunnelCol: 0x333333, waterColor: 0x000011, waterOpacity: 0.9, isNight: true }
};

const CAMPAIGN_LEVELS = [
    { stamina: false, drain: 0.1, map: ["........L........", "........G........", "........G........", "........G........", "........G........", "........G........", ".......LGL.......", ".......LGL.......", ".......LGL.......", ".......LGL.......", ".................", ".................", ".................", ".................", "........G........", "........G........", ".......GGG.......", ".......GGG.......", ".......TGT.......", ".......GGG.......", ".................", ".................", ".................", ".................", ".................", ".................", "......BBBBB......", "......GGGGG......", "......GGGGG......", "........G........", "........G........", "....GGGGGGGGG....", "....GGTGGGTGG....", "....GGGGGGGGG....", "........G........", "........G........", ".......GGG.......", ".......GGG.......", ".......GGG.......", "........G........", "........G........", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GLG.......", "......LLLLL..GG..", "......LLLLL..GG..", "......LLLLL..GG..", "......LLLLL..GG..", ".............GG..", ".............GG..", "......LLLLL..GG..", "......LLLLL..GG..", "......LLLLL..GG..", ".............GG..", ".............GG..", "....TGGGGGGGG....", "....TGGGGGGGG....", "....TGGGGGGGG....", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GGG......."] },
{ stamina: false, drain: 0.1, map: ["....T.......L....", "....G.......L....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G.......G....", "....G.......G....", "....G...S...G....", "....G...G...G....", "....G...G...G....", "....T.......L....", "....G.......L....", "....G...G...G...T", "....G...G...L...G", "....G...G...L...G", "....G...G...L...G", "....G...G...L...C", "....G.......L...C", ".G..G.......L...C", ".G..G...S...L...C", ".G..G...G...L...C", ".G..T.......L...C", ".G..G.......L....", ".G..G...G........", ".G..G...G........", ".G..G.........G..", ".G..G.........G..", ".G..G.........G..", ".G..T.........G..", ".G..G.........G..", ".G..G.........G..", ".G..G.........L..", ".G..G.........L..", ".G..G.........L..", ".G..G.........G..", ".G..G.........G..", ".G..G.........G..", ".G..G.........G..", "....G............", "....T.......L....", "....G.......L....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G.......G....", "....G.......G....", "....G...S...G....", "....G...G...G....", "....G...G...G....", "....T.......L....", "....G.......L....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G...C", "....G.......G...C", "....G.......G...C", "....G...S...G...C", "....G...G...G...C", "....G...G...G...C", "....T.......L...C", "....G.......L....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G.......G....", "....G.......G....", "....G...S...G....", "....G...G...G....", "....G...G...G....", "....T.......L....", "....G.......L....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G...G...G....", "....G.......G....", "....G.......G....", "....G...S...G....", "....G...G...G....", "....G...G...G....", "....GGGGGGGGG....", "....GGSGLGSGG....", "....GGGGGGGGG....", "........G........", ".......GGG.......", ".......GGG.......", ".......GGG.......", ".......GSG.......", ".......GGG.......", "............B....", ".......GBG..G....", "............G....", "............G....", "............G....", "....L..GLG..G....", "....L..GGG..G....", "....G...B...G....", "....G.GBBBG.G....", "....G.......G....", "....G.......G....", ".................", "....SSSLBLSSS....", "....GGSGGGSGG....", "....GGGGGGGGG....", "........G........", ".......LGL.......", ".......LGL......."] },
{ stamina: false, drain: 0.1, map: ["........G...L....", "............L....", "........B...L....", "........G...L....", "........G...L....", "........G...G....", "........G...G....", "............G....", "............G....", "........S...G....", "........G...G....", "........G...G....", "............L....", "............S....", "........G...S...T", "........G...L...G", "........G...L...G", "........G...L...G", "........G...L...C", "............L...C", ".G..........L...C", ".G......S...L...C", ".G......G...L...C", ".G..........L...C", ".G..........L....", ".G......G........", ".G......G........", ".G............G..", ".G............G..", ".G............G..", ".G............G..", ".G............G..", ".G............G..", ".G............L..", ".G............L..", ".G............L..", ".G............G..", ".G..............G", ".G............G..", ".G............G..", "............G....", "................", "............H....", "................", "............H....", "................", "............H....", "...........VH....", "........V........", ".................", "......V..........", ".................", "....V............", ".................", "..V..............", ".................", "V................", "V................", "H................", "H................", "G................", "G................", ".................", "G................", "UG...............", "UG...............", "....G............", "........G........", "........S........", "........S........", "........G........", ".................", "............G....", ".................", "............G....", "............G....", "............G....", ".................", "................", "............H....", "............H....", ".................", "............H....", "............H....", "............H....", "........G...V....", "........G...V....", "........V...V....", "........V........", "........H........", "........H........", "........G........", "........G........", "........G........", ".......GGG.......", ".......GSG.......", "........G........", "............B....", "............S....", "............S....", ".................", ".................", "....G...B...S....", "........G...S....", "........B........", "....G.......S....", "............S....", "....G.......S...", "..........B......", "........B........", "........G........", "........S........", "........S........", ".......LSL.......", ".......LSL......."] },
{ stamina: true, drain: 1.0, map: ["....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGF....", "....GFGGGGGGF....", "....GFGGGGGGA....", "....GAGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGFGGGG....", "....GGGGFGGGG....", "....GGGGAGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GFGGGGGGG....", "....GFGGGGGGA....", "....GAGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGFGGGG....", "....GGGGFGGGG....", "....GGGGAGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....FGGGGGGGF....", "....FGGGGGGGF....", "....FGGGGGGGF....", "....FGGGGGGGF....", "....G...L...G....", "....G...L...G....", "....G...L...G....", "....G...L...G....", "....G...L...F....", "....U...L...U....", "....U...L...U....", "....U...L...U....", "....U...L...U....", "....U...L...U....", "....U...L...U....", "....U...L...U....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....AGGGGGGGA....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGGGGGG....", "....GGGGFGGGG....", "....GGGGFGGGG....", "........A........", "........G........", ".......LGL.......", ".......LGL.......", ".......LGL.......", ".......LFL.......", "........G........", "........G........", "........G........", "...G....G....G...", "...G...GGG...G...", "...G...GGG...G...", "...G....A....G...", "...G....F....G...", "...G....G....G...", "...F..GGFGG..F...", "......GGGGG......", "......GGFGG......", "......GGAGG......", "......GGGGG......", "....GGGGGGGGG....", "....GGFFFFFGG..FF", ".....GGGGGGG...FF", ".......GGG.....FF", ".......GGG.....FF", "........G......FF", "........G......FF", "...............FF", ".................", "GG...............", "GG...........GG..", "GG.....L.....GF..", "GG....LLL....GG..", "GG...LLLLL...GG..", "GG..LLLLLLL..GG..", "GG..LLLLLLL..GG..", "GG..LLLLLLL..GG..", "GG..LLLLLLL..GF..", "GG..LLLLLLL..GG..", "GG..LLLLLLL..GG..", "GG...........GG..", "GG...........GG..", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGFGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG", "GGGGGGGGGGGGGGGGG"] }
];
let CUSTOM_LEVEL = { map: [], stamina: true, drain: 0.1 };

// --- VARIABLES ---
let scene, camera, renderer, audioCtx;
let playerGroup, paws = [];
let trackGroup, waterMesh, portalMesh, particleSystems = [], foxDustParticles, tailParticles, logoGroup, foxShadow, speedLines;
let foxVoxels = [], sonicRings = [], ghostTrails = [], boostChevrons = [], endBeamMesh = null;

let trackData = [], gemsList = [], foodList = [], boostRingsList = [], forceFieldsList = [];
let warpCount = 0;
let isPlaying = false, isPaused = false, isDead = false, canRestart = false, animationId, deathTimeoutId;

let speedZ = 0.3, velocityY = 0, cameraShake = 0;
const minSpeed = 0.1, maxSpeed = 0.5, absoluteMax = 0.85;
const accel = 0.003, brake = 0.006;
const gravity = 0.02, jumpStrength = 0.42;

let isGrounded = false, isGliding = false, doubleJumps = 0, runAnimTimer = 0, currentScore = 0;
let dustIdx = 0, tailIdx = 0, coyoteFrames = 0;
let gemCombo = 0, gemTimer = 0;
let stamina = 100, useStamina = false, staminaDrain = 0.1;
let dashTimer = 0, spaceWasDown = false;

const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, Space: false };
let currentTheme = THEMES.forest;

// --- GRID MOVEMENT VARIABLES ---
let isGridMovement = false;
let currentGridLane = Math.floor(NUM_LANES / 2);
let targetLaneX = 0;
let leftEdgePressed = false, rightEdgePressed = false;

// --- GYRO VARIABLES ---
let gyroActive = false;
let gyroTilt = 0;

// --- FIXED TIMESTEP VARIABLES ---
let lastTime = 0;
let accumulator = 0;
const TIME_STEP = 1000 / 60;

// --- EDITOR LOGIC ---
const TOOLS = [
    { id: '.', type: 'erase', color: '#000', label: 'Ers' },

{ id: 'G', type: 'floor', color: '#32CD32', label: 'Bas' },
{ id: 'H', type: 'floor', color: '#2E8B57', label: 'Hi' },
{ id: 'V', type: 'floor', color: '#006400', label: 'VHi' },
{ id: 'I', type: 'floor', color: '#88EEFF', label: 'Ice' },
{ id: 'L', type: 'floor', color: '#FF4500', label: 'Lav' },
{ id: 'U', type: 'floor', color: '#555555', label: 'Tun' },
// NEW TOOLS
{ id: 'HI', type: 'floor', color: '#66CCFF', label: 'HiIce' },
{ id: 'VI', type: 'floor', color: '#44AAEE', label: 'ViIce' },
{ id: 'HL', type: 'floor', color: '#CC3300', label: 'HiLav' },
{ id: 'VL', type: 'floor', color: '#992200', label: 'ViLav' },
{ id: 'HU', type: 'floor', color: '#777777', label: 'HiTun' },


{ id: 'T', type: 'item', label: 'Obs', icon: '🌲' },
{ id: 'S', type: 'item', label: 'Slw', icon: '🟨' },
{ id: 'B', type: 'item', label: 'Spr', icon: '🟦' },
{ id: 'A', type: 'item', label: 'Bst', icon: '⏩' },
{ id: 'C', type: 'item', label: 'Gem', icon: '💎' },
{ id: 'F', type: 'item', label: 'Fod', icon: '🍓' },
{ id: 'E', type: 'item', label: 'End', icon: '🏁' }
];
let currentTool = 'G', isDrawing = false;
const EDITOR_SPAWN_ROW = 149;
const EDITOR_SPAWN_COL = Math.floor(17 / 2);

// --- SHOP & PREVIEW SYSTEM ---
let previewState = { char: 'fox', acc: 'none', theme: 'forest' };
let isShopping = false;

function updateShopUI() {
    document.getElementById('menu-lolly-count').innerText = gameData.lollies;
    document.getElementById('shop-lolly-count').innerText = gameData.lollies;

    // Update Dropdown in Menu (Background sync)
    const tSel = document.getElementById('theme-select');
    const currentVal = currentThemeId;
    tSel.innerHTML = '';
    gameData.unlocked.themes.forEach(t => {
        let opt = document.createElement('option');
        opt.value = t;
        if(t==='forest') opt.innerText='🌲 Forest Clearing';
        if(t==='mountain') opt.innerText='⛰️ Snowy Mountain';
        if(t==='canyon') opt.innerText='🏜️ Sunset Canyon';
        if(t==='neon') opt.innerText='🏙️ Neon City';
        if(t==='candy') opt.innerText='🍭 Candy Land';
        if(t==='night') opt.innerText='🔦 Night Road';
        tSel.appendChild(opt);
    });

    // Sync logic
    if (isShopping) {
        tSel.value = previewState.theme; // If shopping, show preview theme
    } else {
        tSel.value = currentThemeId; // Otherwise show actual active theme
    }

    // Ensure dropdown matches current preview or equipped state
    let currentThemeVal = isShopping ? previewState.theme : tSel.value;
    if (gameData.unlocked.themes.includes(currentThemeVal)) tSel.value = currentThemeVal;

    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';

    const createShopRow = (type, id, name, desc, cost) => {
        let isUnlocked = gameData.unlocked[type].includes(id);
        let equipKey = (type === 'chars') ? 'char' : 'accessory';

        let isEquipped = false;
        if (type === 'themes') isEquipped = (document.getElementById('theme-select').value === id);
        else isEquipped = (gameData.equipped[equipKey] === id);

        let btnHtml = '';
        if (type === 'themes') {
            btnHtml = isUnlocked ?
            `<button class="btn-shop shop-btn" ${isEquipped ? 'style="opacity:0.5"' : ''} onclick="event.stopPropagation(); equipItem('${type}', '${id}')">${isEquipped ? 'Active' : 'Select'}</button>` :
            `<button class="btn-secondary shop-btn" onclick="event.stopPropagation(); buyItem('${id}')">Buy (${cost} ${CURRENCY_ICON})</button>`;
        } else {
            if (isUnlocked) {
                btnHtml = `<button class="btn-shop shop-btn" ${isEquipped ? 'style="opacity:0.5"' : ''} onclick="event.stopPropagation(); equipItem('${type}', '${id}')">${isEquipped ? 'Equipped' : 'Equip'}</button>`;
            } else {
                btnHtml = `<button class="btn-secondary shop-btn" onclick="event.stopPropagation(); buyItem('${id}')">Buy (${cost} ${CURRENCY_ICON})</button>`;
            }
        }

        // Highlight the row if it's currently being previewed
        let isPreviewing = false;
        if (type === 'chars' && previewState.char === id) isPreviewing = true;
        if (type === 'accessories' && previewState.acc === id) isPreviewing = true;
        if (type === 'themes' && previewState.theme === id) isPreviewing = true;

        let bgStyle = isPreviewing ? 'border-color: #FFD700; background: rgba(255, 215, 0, 0.1);' : '';

        container.innerHTML += `<div class="shop-item" style="cursor:pointer; ${bgStyle}" onclick="previewItem('${type}', '${id}')">
        <div><h3>${name}</h3><p>${desc}</p></div>
        <div>${btnHtml}</div>
        </div>`;
    };

    // Defaults
    createShopRow('chars', 'fox', '🦊 Normal Fox', 'The classic.', 0);
    createShopRow('accessories', 'none', '🚫 No Accessory', 'Go natural.', 0);

    SHOP_DATABASE.forEach(item => {
        createShopRow(item.type, item.id, item.name, item.desc, item.cost);
    });
}

window.previewLevel = function() {
    let mode = selectedLevelId;

    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) modeSelect.value = mode;

    useStamina = document.getElementById('stamina-toggle').checked;
    isGridMovement = document.getElementById('grid-toggle').checked;

    if (mode === 'endless') {
        generateEndless();
    } else if (mode === 'glider') {
        generateGliderMode();
    }
    else if (mode === 'custom') {
        generateCampaign(-1);
    } else if (mode.startsWith('level')) {
        const levelIdx = parseInt(mode.replace('level', ''));
        generateCampaign(levelIdx);
    }

    buildGeometryFromData();
};

window.openShop = function() {
    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('shop-screen').style.display = 'flex';

    isShopping = true;
    logoGroup.visible = false;
    playerGroup.visible = true;

    // Raise player up so they don't clip into the floor during preview
    playerGroup.position.set(0, 1.0, 0);

    previewState.char = gameData.equipped.char;
    previewState.acc = gameData.equipped.accessory;
    previewState.theme = document.getElementById('theme-select').value;

    camera.position.set(1.5, 2.0, 3.5);
    camera.lookAt(0, 1.2, 0);

    rebuildPlayer(true);
    updateShopUI();
};

window.closeShop = function() {
    document.getElementById('shop-screen').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'flex';

    isShopping = false;
    const equippedTheme = currentThemeId;

    document.getElementById('theme-select').value = equippedTheme;
    applyTheme(THEMES[equippedTheme], equippedTheme);
    previewLevel();

    logoGroup.visible = true;
    playerGroup.visible = false;

    // Reset position for gameplay/menu
    playerGroup.position.set(0, 0.5, 0);

    const actualTheme = document.getElementById('theme-select').value;
    applyTheme(THEMES[actualTheme]);
    previewLevel();

    camera.position.set(0, 6, 8);
    camera.lookAt(0, 2, -15);

    rebuildPlayer(false);
};

window.buyItem = function(id) {
    let item = SHOP_DATABASE.find(x => x.id === id);
    if (gameData.lollies >= item.cost) {
        gameData.lollies -= item.cost;
        gameData.unlocked[item.type].push(item.id);
        saveData();
        playSound('coin', 1.5);

        // Auto-equip logic on buy
        if(item.type !== 'themes') {
            equipItem(item.type, item.id);
        } else {
            // For themes, just unlock it and select it
            document.getElementById('theme-select').value = item.id;
            previewItem('themes', item.id);
        }
    } else { alert("Not enough popsicles!"); }
};

window.equipItem = function(type, id) {
    if (type === 'chars') gameData.equipped.char = id;
    if (type === 'accessories') gameData.equipped.accessory = id;
    if (type === 'themes') {
        document.getElementById('theme-select').value = id;
    }

    saveData();
    previewItem(type, id);
    updateShopUI();
};

window.changeDifficulty = function() {
    let val = document.getElementById('diff-select').value;
    currentDiff = DIFFICULTIES[val];

    // Clamp speed if changing mid-game
    if (speedZ > currentDiff.max) speedZ = currentDiff.max;
    if (speedZ < currentDiff.min) speedZ = currentDiff.min;

    // Regenerate the preview so the user sees the density change immediately
    previewLevel();
};

function showLollyNotification() {
    let popup = document.getElementById('lolly-popup');
    popup.innerHTML = `<span style="color:#FFD700">${CURRENCY_ICON} Star Found! +1</span>`;
    popup.style.display = 'block'; popup.style.opacity = '1'; popup.style.transition = 'none';
    setTimeout(() => { popup.style.transition = 'opacity 1s'; popup.style.opacity = '0'; }, 2000);
    setTimeout(() => { popup.style.display = 'none'; popup.style.transition = ''; }, 3000);
}

function initEditor() {
    const pal = document.getElementById('palette');
    TOOLS.forEach(t => {
        let btn = document.createElement('div'); btn.className = 'tool-btn' + (t.id === 'G' ? ' active' : '');
        btn.style.background = t.color || '#333'; btn.innerText = t.label; btn.title = t.label;
        btn.onclick = () => { document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); currentTool = t.id; };
        pal.appendChild(btn);
    });
    const grid = document.getElementById('editor-grid');
    grid.addEventListener(
        'touchmove',
        e => {
            if (!isDrawing) return;
            e.preventDefault();
        },
        { passive: false }
    );

    for(let r=0; r<150; r++) {
        for(let c=0; c<17; c++) {
            let cell = document.createElement('div'); cell.className = 'grid-cell';
            cell.dataset.r = r; cell.dataset.c = c; cell.dataset.f = '.'; cell.dataset.i = '.';
            cell.onmousedown = () => { isDrawing=true; paintCell(cell); };
            cell.onmouseenter = () => { if(isDrawing) paintCell(cell); };
            cell.addEventListener('touchstart', (e) => { e.preventDefault(); isDrawing=true; paintCell(cell); }, {passive: false});
            cell.addEventListener('touchmove', (e) => { e.preventDefault(); let target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY); if (target && target.classList.contains('grid-cell')) paintCell(target); }, {passive: false});
            grid.appendChild(cell);
            if (r === EDITOR_SPAWN_ROW && c === EDITOR_SPAWN_COL) {
                cell.classList.add('spawn');
            }
        }
    }
    document.body.addEventListener('mouseup', () => isDrawing = false);
    document.body.addEventListener('touchend', () => isDrawing = false);

    const gridContainer = document.getElementById('editor-grid-container');

    requestAnimationFrame(() => {
        gridContainer.scrollTop = gridContainer.scrollHeight;
    });
}

function paintCell(cell) {
    let t = TOOLS.find(x => x.id === currentTool);
    if(t.type === 'erase') { cell.dataset.f = '.'; cell.dataset.i = '.'; }
    else if(t.type === 'floor') cell.dataset.f = t.id;
    else if(t.type === 'item') {
        cell.dataset.i = t.id;
        if(cell.dataset.f === '.') cell.dataset.f = 'G'; // Auto-add base floor beneath item
    }

    let fTool = TOOLS.find(x => x.id === cell.dataset.f);
    let iTool = TOOLS.find(x => x.id === cell.dataset.i);
    cell.style.background = fTool ? fTool.color : '#000';
    cell.innerText = iTool && iTool.icon ? iTool.icon : '';
}

window.openHelp = function() { document.getElementById('ui-layer').style.display = 'none'; document.getElementById('help-screen').style.display = 'flex'; };
window.closeHelp = function() { document.getElementById('help-screen').style.display = 'none'; document.getElementById('ui-layer').style.display = 'flex'; };
window.openEditor = function() {
    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('editor-screen').style.display = 'flex';

    const gridContainer = document.getElementById('editor-grid-container');

    // iOS needs two frames after display change
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            gridContainer.scrollTop = gridContainer.scrollHeight;
        });
    });
};
window.closeEditor = function() { document.getElementById('editor-screen').style.display = 'none'; document.getElementById('ui-layer').style.display = 'flex'; };

function saveEditorToCustomLevel() {
    CUSTOM_LEVEL.map = [];
    const cells = document.querySelectorAll('.grid-cell');
    for(let r=0; r<150; r++) {
        let row = [];
        for(let c=0; c<17; c++) row.push(cells[r*17 + c].dataset.f + (cells[r*17 + c].dataset.i === '.' ? '' : cells[r*17 + c].dataset.i));
        CUSTOM_LEVEL.map.push(row);
    }
    CUSTOM_LEVEL.stamina = document.getElementById('editor-stamina-toggle').checked;
    CUSTOM_LEVEL.drain = parseFloat(document.getElementById('editor-drain').value);
}

window.playCustomLevel = function() {
    saveEditorToCustomLevel();
    selectedLevelId = 'custom';
    document.getElementById('stamina-toggle').checked = CUSTOM_LEVEL.stamina;
    closeEditor();
    startGame();
};

window.exportLevel = function() {
    saveEditorToCustomLevel();
    const dataStr = btoa(JSON.stringify(CUSTOM_LEVEL));
    prompt("Copy this level code to share:", dataStr);
};

window.importLevel = function() {
    const dataStr = prompt("Paste level code here:");
    if (dataStr) {
        try {
            const parsed = JSON.parse(atob(dataStr));
            if (parsed && parsed.map) {
                CUSTOM_LEVEL = parsed;
                document.getElementById('editor-stamina-toggle').checked = CUSTOM_LEVEL.stamina;
                document.getElementById('editor-drain').value = CUSTOM_LEVEL.drain;
                const cells = document.querySelectorAll('.grid-cell');
                for(let r=0; r<150; r++) {
                    for(let c=0; c<17; c++) {
                        let token = CUSTOM_LEVEL.map[r] ? CUSTOM_LEVEL.map[r][c] : '..';
                        let fToken, iToken;

                        // Handle old format vs new format
                        if (typeof CUSTOM_LEVEL.map[r] === 'string') {
                            let char = CUSTOM_LEVEL.map[r][c] || '.';
                            fToken = ['.','G','H','V','I','L','U'].includes(char) ? char : 'G';
                            iToken = ['.','G','H','V','I','L','U'].includes(char) ? '.' : char;
                        } else {
                            let fullStr = CUSTOM_LEVEL.map[r][c];
                            if(fullStr.startsWith('HI')) { fToken = 'HI'; iToken = fullStr.substring(2) || '.'; }
                            else if(fullStr.startsWith('VI')) { fToken = 'VI'; iToken = fullStr.substring(2) || '.'; }
                            else if(fullStr.startsWith('HL')) { fToken = 'HL'; iToken = fullStr.substring(2) || '.'; }
                            else if(fullStr.startsWith('VL')) { fToken = 'VL'; iToken = fullStr.substring(2) || '.'; }
                            else if(fullStr.startsWith('HU')) { fToken = 'HU'; iToken = fullStr.substring(2) || '.'; }
                            else { fToken = fullStr[0] || '.'; iToken = fullStr.substring(1) || '.'; }
                        }

                        let cell = cells[r*17 + c];
                        cell.dataset.f = fToken; cell.dataset.i = iToken;
                        let fT = TOOLS.find(x => x.id === cell.dataset.f);
                        let iT = TOOLS.find(x => x.id === cell.dataset.i);
                        cell.style.background = fT ? fT.color : '#000';
                        cell.innerText = iT && iT.icon ? iT.icon : '';
                    }
                }
                alert("Level imported successfully!");
            }
        } catch(e) { alert("Invalid level code!"); }
    }
};

window.toggleSound = function(cb) {
    soundEffects = cb.checked;
};

window.toggleGyro = function(cb) {
    gyroActive = cb.checked;
    if (gyroActive) {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(res => {
                if (res === 'granted') window.addEventListener('deviceorientation', handleGyro);
                else { cb.checked = false; gyroActive = false; alert("Gyro permission denied."); }
            }).catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleGyro);
        }
    } else {
        window.removeEventListener('deviceorientation', handleGyro);
        gyroTilt = 0;
    }
};

function handleGyro(e) {
    let val = e.gamma;
    // Handle basic landscape vs portrait assumptions
    if (window.innerWidth > window.innerHeight) val = e.beta;
    if (val === null || val === undefined) return;

    // Normalize tilt between -1 and +1 based on ~30 degrees max tilt
    gyroTilt = Math.max(-1, Math.min(1, val / 30));
}

// --- AUDIO ---
function initAudioEngine() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type, pitchMultiplier = 1.0) {
    if (!soundEffects) return; initAudioEngine();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'jump') { osc.type = 'square'; osc.frequency.setValueAtTime(150*pitchMultiplier, now); osc.frequency.exponentialRampToValueAtTime(400*pitchMultiplier, now + 0.15); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); }
    else if (type === 'dash') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1500, now + 0.15); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); }
    else if (type === 'spring') { osc.type = 'triangle'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.2); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
    else if (type === 'boost') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.3); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
    else if (type === 'crash') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.4); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
    else if (type === 'explode') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(50, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.8); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8); osc.start(now); osc.stop(now + 0.8); }
    else if (type === 'coin') { osc.type = 'sine'; osc.frequency.setValueAtTime(800*pitchMultiplier, now); osc.frequency.exponentialRampToValueAtTime(1200*pitchMultiplier, now + 0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
    else if (type === 'food') { osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(900, now + 0.15); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); }
}

// --- SETUP ---
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 250);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; document.body.appendChild(renderer.domElement);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    ambLight.name = "ambLight";
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.name = "dirLight";
    dirLight.position.set(-15, 40, 15); dirLight.castShadow = true;

    scene.add(dirLight);

    playerGroup = new THREE.Group(); scene.add(playerGroup);
    foxShadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false})); foxShadow.rotation.x = -Math.PI / 2; scene.add(foxShadow);

    createMenuLogo(); createSpeedLines(); setupInput(); initEditor(); updateShopUI(); rebuildPlayer(); renderLevelSelector();
    window.addEventListener('resize', onWindowResize, false);

    // Generate Particles
    let dustGeo = new THREE.BufferGeometry(), tailGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3).fill(9999), 3));
    tailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3).fill(9999), 3));
    foxDustParticles = new THREE.Points(dustGeo, new THREE.PointsMaterial({color: 0xffffff, size: 0.15, transparent: true, opacity: 0.5}));
    tailParticles = new THREE.Points(tailGeo, new THREE.PointsMaterial({color: 0xFF4500, size: 0.3, transparent: true, opacity: 0.8}));
    scene.add(foxDustParticles); scene.add(tailParticles);

    previewTheme(); previewLevel(); resetMenu(); requestAnimationFrame(animate);
}

function createMenuLogo() {
    logoGroup = new THREE.Group();
    const matFox = new THREE.MeshPhongMaterial({ color: 0xFF4500, flatShading: true });
    const matWhite = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
    const snout = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 4), new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true })); snout.rotation.x = Math.PI/2; snout.position.z = 2;
    const head = new THREE.Mesh(new THREE.OctahedronGeometry(2.5, 0), matFox);
    logoGroup.add(snout, head); scene.add(logoGroup);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 4), matFox); earL.position.set(-1.5, 2.5, -1);
    const earR = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 4), matFox); earR.position.set(1.5, 2.5, -1);
    logoGroup.add(snout, head, earL, earR); scene.add(logoGroup);
}

function createSpeedLines() {
    speedLines = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    for(let i=0; i<40; i++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
        let angle = Math.random() * Math.PI * 2, radius = 5 + Math.random() * 5; line.position.set(Math.cos(angle)*radius, Math.sin(angle)*radius, -20 - Math.random()*20);
        line.userData = { angle, radius }; speedLines.add(line);
    }
    scene.add(speedLines); speedLines.visible = false;
}

function rebuildPlayer(isPreview = false) {
    while(playerGroup.children.length > 0) { playerGroup.remove(playerGroup.children[0]); }
    paws = [];

    let cChar = isPreview ? previewState.char : gameData.equipped.char;
    let cAcc = isPreview ? previewState.acc : gameData.equipped.accessory;

    let body, head, snout, nose, earL, earR, tailGroup;
    const matBlack = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true });
    const matWhite = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
    const matGrey = new THREE.MeshPhongMaterial({ color: 0x778899, flatShading: true });

    // --- FOX / WOLF / RACCOON ---
    if (['fox', 'pinkfox', 'wolf', 'raccoon'].includes(cChar)) {
        let mainColor = 0xd95a00;
        if (cChar === 'pinkfox') mainColor = 0xFF1493;
        if (cChar === 'wolf') mainColor = 0x708090;
        if (cChar === 'raccoon') mainColor = 0x808080;

        const matBody = new THREE.MeshPhongMaterial({ color: mainColor, flatShading: true });

        body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.2), matBody); body.position.y = 0.4; body.castShadow = true;
        head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), matBody); head.position.set(0, 0.75, -0.6); head.castShadow = true;

        // Raccoon Mask Logic
        if (cChar === 'raccoon') {
            const mask = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.25, 0.4), matBlack);
            mask.position.set(0, -0.05, -0.2);
            head.add(mask);
        }

        snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.4), matWhite); snout.position.set(0, -0.15, -0.4); head.add(snout);
        nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), matBlack); nose.position.set(0, -0.05, -0.6); head.add(nose);
        earL = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), matBody); earL.position.set(-0.25, 0.4, 0.1); head.add(earL);
        earR = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), matBody); earR.position.set(0.25, 0.4, 0.1); head.add(earR);

        tailGroup = new THREE.Group(); tailGroup.position.set(0, 0.55, 0.6); tailGroup.rotation.x = 0.4;
        const tb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.6), (cChar === 'raccoon' ? matBlack : matBody)); tb.position.z = 0.3; tb.castShadow = true;
        const tt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), (cChar === 'raccoon' ? matGrey : matWhite)); tt.position.z = 0.7; tt.castShadow = true;
        tailGroup.add(tb, tt);

        const fGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
        const pawMat = (cChar === 'raccoon') ? matBlack : matBlack;
        for(let i=0; i<4; i++) paws.push(new THREE.Mesh(fGeo, pawMat));
        paws[0].position.set(-0.35, 0.075, -0.4); paws[1].position.set(0.35, 0.075, -0.4); paws[2].position.set(-0.35, 0.075, 0.4); paws[3].position.set(0.35, 0.075, 0.4);
    }
    // --- PENGUIN ---
    else if (cChar === 'penguin') {
        const matBlue = new THREE.MeshPhongMaterial({ color: 0x2C3E50, flatShading: true });
        const matOrange = new THREE.MeshPhongMaterial({ color: 0xFF8C00, flatShading: true });
        body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.8), matBlue); body.position.y = 0.6; body.castShadow = true;
        const belly = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.25), matWhite); belly.position.set(0, -0.05, -0.35); body.add(belly);
        head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), matBlue); head.position.set(0, 1.2, 0); head.castShadow = true;
        snout = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 4), matOrange); snout.rotation.x = -Math.PI/2; snout.position.set(0, 0, -0.4); head.add(snout);
        earL = new THREE.Group(); earR = new THREE.Group(); nose = new THREE.Group(); tailGroup = new THREE.Group();
        const fGeo = new THREE.BoxGeometry(0.25, 0.1, 0.4);
        paws.push(new THREE.Mesh(fGeo, matOrange)); paws[0].position.set(-0.25, 0.05, 0.2);
        paws.push(new THREE.Mesh(fGeo, matOrange)); paws[1].position.set(0.25, 0.05, 0.2);
        const flipperGeo = new THREE.BoxGeometry(0.1, 0.6, 0.3);
        paws.push(new THREE.Mesh(flipperGeo, matBlue)); paws[2].position.set(-0.5, 0.8, 0); paws[2].rotation.z = 0.5;
        paws.push(new THREE.Mesh(flipperGeo, matBlue)); paws[3].position.set(0.5, 0.8, 0); paws[3].rotation.z = -0.5;
    }

    // --- ACCESSORIES ---
    if (cAcc === 'tophat') {
        let hat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5), matBlack); hat.position.y = 0.5;
        let brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05), matBlack); brim.position.y = 0.25;
        head.add(hat, brim);
    }
    if (cAcc === 'crown') {
        let crown = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.25, 8), new THREE.MeshPhongMaterial({color:0xFFD700, shininess:100}));
        crown.position.y = 0.45;
        // Spikes
        for(let i=0; i<6; i++) {
            let sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), new THREE.MeshPhongMaterial({color:0xFFD700}));
            let angle = (i/6) * Math.PI * 2;
            sp.position.set(Math.cos(angle)*0.25, 0.6, Math.sin(angle)*0.25);
            head.add(sp);
        }
        head.add(crown);
    }
    if (cAcc === 'headphones') {
        const matGrey = new THREE.MeshPhongMaterial({color:0x333333});
        const matRed = new THREE.MeshPhongMaterial({color:0xFF0000});

        let band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24, Math.PI), matGrey);
        band.position.y = 0.1;

        let cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1), matRed);
        cupL.rotation.z = Math.PI/2;
        cupL.position.set(-0.4, 0.1, 0);

        let cupR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1), matRed);
        cupR.rotation.z = Math.PI/2;
        cupR.position.set(0.4, 0.1, 0);

        head.add(band, cupL, cupR);
    }

    const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0, 2,0,-1, 2,0,1]), 3));
    const wingMat = new THREE.MeshBasicMaterial({color: 0x00FFFF, transparent: true, opacity: 0.6, side: THREE.DoubleSide});
    const wingL = new THREE.Mesh(wingGeo, wingMat); wingL.position.set(-0.4, 0.5, 0); wingL.rotation.y = Math.PI; wingL.visible = false;
    const wingR = new THREE.Mesh(wingGeo, wingMat); wingR.position.set(0.4, 0.5, 0); wingR.visible = false;

    playerGroup.userData = { body, head, snout, nose, earL, earR, tailGroup, wingL, wingR };
    playerGroup.add(body, head, tailGroup, wingL, wingR, ...paws);
}

function setupInput() {
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();

        if (e.code === 'Space') {
            if (!isPlaying) {
                if (isDead && canRestart) {
                    startGame();
                } else if (!isDead && document.getElementById('start-screen').style.display !== 'none' && document.getElementById('ui-layer').style.display !== 'none') {
                    startGame();
                }
            }
        }

        if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });
        window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });
        const bindTouch = (id, key) => {
            const btn = document.getElementById(id);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; }, {passive: false});
            btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; }, {passive: false});
            btn.addEventListener('touchcancel', (e) => { e.preventDefault(); keys[key] = false; }, {passive: false});
        };
        bindTouch('btn-left', 'ArrowLeft'); bindTouch('btn-right', 'ArrowRight'); bindTouch('btn-up', 'ArrowUp'); bindTouch('btn-down', 'ArrowDown'); bindTouch('btn-jump', 'Space');
}

window.togglePause = function() {
    if (!isPlaying && !isPaused) return;
    isPaused = !isPaused;
    document.getElementById('pause-screen').style.display = isPaused ? 'block' : 'none';
    document.getElementById('ui-layer').style.display = isPaused ? 'flex' : 'none';

    // Toggle mobile controls visibility based on pause state
    if (window.innerWidth < 800) {
        document.getElementById('mobile-controls').style.display = isPaused ? 'none' : 'flex';
    }

    if (!isPaused) {
        lastTime = performance.now();
        requestAnimationFrame(animate);
    }
};

function applyTheme(theme, id) {
    if (!theme) {
        console.warn('Invalid theme, falling back to forest');
        theme = THEMES.forest;
        currentThemeId = 'forest';
    }
    currentTheme = theme;
    if (id) {
        currentThemeId = id;
        const dropdown = document.getElementById('theme-select');
        if(dropdown) dropdown.value = id;
    }

    scene.background = new THREE.Color(theme.bg);
    scene.fog = new THREE.Fog(theme.bg, theme.isNight ? 5 : 30, theme.isNight ? 50 : 120);

    // LIGHTING
    const amb = scene.getObjectByName("ambLight");
    const dir = scene.getObjectByName("dirLight");
    let flashlight = playerGroup.getObjectByName("flashlight");

    if (theme.isNight) {
        if(amb) amb.intensity = 0.1;
        if(dir) dir.intensity = 0.1;
        if (!flashlight) {
            flashlight = new THREE.SpotLight(0xffffff, 2.5, 40, 0.5, 0.5, 1);
            flashlight.position.set(0, 1.5, 0.5);
            flashlight.target.position.set(0, 0, -15);
            flashlight.name = "flashlight";
            playerGroup.add(flashlight); playerGroup.add(flashlight.target);
        }
    } else {
        if(amb) amb.intensity = 0.6;
        if(dir) dir.intensity = 0.8;
        if (flashlight) { playerGroup.remove(flashlight.target); playerGroup.remove(flashlight); }
    }

    // WATER
    if(waterMesh) scene.remove(waterMesh);
    waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(300, 2000), new THREE.MeshPhongMaterial({ color: theme.waterColor, transparent: true, opacity: theme.waterOpacity }));
    waterMesh.rotation.x = -Math.PI / 2; waterMesh.position.set(0, -1.5, -1000); waterMesh.receiveShadow = true; scene.add(waterMesh);

    // ATMOSPHERE
    if(scene.getObjectByName("stars")) scene.remove(scene.getObjectByName("stars"));
    if(scene.getObjectByName("atmosphere")) scene.remove(scene.getObjectByName("atmosphere"));

    if(theme === THEMES.neon) {
        const geo = new THREE.BufferGeometry(); const pos = new Float32Array(800 * 3);
        for(let i=0; i<800*3; i++) pos[i] = (Math.random() - 0.5) * 400;
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const stars = new THREE.Points(geo, new THREE.PointsMaterial({color:0xffffff, size:0.5}));
        stars.name = "stars";
        stars.frustumCulled = false;
        scene.add(stars);
    }
    else if (id === 'mountain' || id === 'canyon' || theme === THEMES.mountain || theme === THEMES.canyon) {
        let isMountain = (id === 'mountain' || theme === THEMES.mountain);
        let pColor = isMountain ? 0xffffff : 0xedc9af;
        let pSize = isMountain ? 0.4 : 0.3;

        // REDUCED DENSITY FOR CANYON
        const count = isMountain ? 1000 : 400;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);

        for(let i=0; i<count*3; i+=3) {
            pos[i] = (Math.random() - 0.5) * 150;
            pos[i+1] = Math.random() * 60;
            pos[i+2] = (Math.random() - 0.5) * 100;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const atmos = new THREE.Points(geo, new THREE.PointsMaterial({color: pColor, size: pSize, transparent: true, opacity: 0.8}));
        atmos.name = "atmosphere";
        atmos.userData = { themeId: isMountain ? 'mountain' : 'canyon' };
        atmos.frustumCulled = false;
        scene.add(atmos);
    }
}

window.previewTheme = function() {
    const val = document.getElementById('theme-select').value;
    applyTheme(THEMES[val], val);
    previewLevel();
};

function createPlayer() {
    playerGroup = new THREE.Group();
    const matFox = new THREE.MeshPhongMaterial({ color: 0xd95a00, flatShading: true });
    const matWhite = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
    const matBlack = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.2), matFox); body.position.y = 0.4; body.castShadow = true;
    const footGeo = new THREE.BoxGeometry(0.18, 0.15, 0.18);
    paws = [new THREE.Mesh(footGeo, matBlack), new THREE.Mesh(footGeo, matBlack), new THREE.Mesh(footGeo, matBlack), new THREE.Mesh(footGeo, matBlack)];
    paws[0].position.set(-0.35, 0.075, -0.4); paws[1].position.set(0.35, 0.075, -0.4); paws[2].position.set(-0.35, 0.075, 0.4); paws[3].position.set(0.35, 0.075, 0.4);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), matFox); head.position.set(0, 0.75, -0.6); head.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.4), matWhite); snout.position.set(0, 0.6, -1.0);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), matBlack); nose.position.set(0, 0.7, -1.2);

    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), matFox); earL.position.set(-0.25, 1.15, -0.5); earL.name = "earL";
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), matFox); earR.position.set(0.25, 1.15, -0.5); earR.name = "earR";

    tailGroup = new THREE.Group(); tailGroup.position.set(0, 0.55, 0.6);
    const tailBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.6), matFox); tailBase.position.z = 0.3; tailBase.castShadow = true;
    const tailTip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), matWhite); tailTip.position.z = 0.7; tailTip.castShadow = true;
    tailGroup.add(tailBase, tailTip); tailGroup.rotation.x = 0.4;

    // Glider Wings
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0, 2,0,-1, 2,0,1]), 3));
    const wingMat = new THREE.MeshBasicMaterial({color: 0x00FFFF, transparent: true, opacity: 0.6, side: THREE.DoubleSide});
    const wingL = new THREE.Mesh(wingGeo, wingMat); wingL.position.set(-0.4, 0.5, 0); wingL.rotation.y = Math.PI; wingL.visible = false;
    const wingR = new THREE.Mesh(wingGeo, wingMat); wingR.position.set(0.4, 0.5, 0); wingR.visible = false;

    playerGroup.userData = { body, head, snout, nose, earL, earR, tailGroup, wingL, wingR };
    playerGroup.add(body, ...paws, head, snout, nose, earL, earR, tailGroup, wingL, wingR); scene.add(playerGroup);

    foxShadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false}));
    foxShadow.rotation.x = -Math.PI / 2; scene.add(foxShadow);

    let dustGeo = new THREE.BufferGeometry(), tailGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3).fill(9999), 3));
    tailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3).fill(9999), 3));
    foxDustParticles = new THREE.Points(dustGeo, new THREE.PointsMaterial({color: 0xffffff, size: 0.15, transparent: true, opacity: 0.5}));
    tailParticles = new THREE.Points(tailGeo, new THREE.PointsMaterial({color: 0xFF4500, size: 0.3, transparent: true, opacity: 0.8}));
    scene.add(foxDustParticles); scene.add(tailParticles);
}

function spawnSonicRing(pos) {
    let mesh = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.1, 4, 16), new THREE.MeshBasicMaterial({color:0x00FFFF, transparent:true}));
    mesh.position.copy(pos); mesh.rotation.x = Math.PI / 2; scene.add(mesh);
    sonicRings.push(mesh);
}

function createObstacle(x, z, type) {
    const obs = new THREE.Group();
    let isRare = Math.random() < 0.05;

    if (type === 'tree') {
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.6), new THREE.MeshPhongMaterial({color:0x5c4033})); trunk.position.y = 0.75; trunk.castShadow = true;
        const leaves = new THREE.Mesh(Math.random()>0.5 ? new THREE.ConeGeometry(1.2,2.5,5) : new THREE.BoxGeometry(1.8,1.8,1.8), new THREE.MeshPhongMaterial({color: isRare ? 0xFFB7C5 : 0x228B22, flatShading:true})); leaves.position.y = 2.4; leaves.castShadow = true;
        obs.add(trunk, leaves);
    } else if (type === 'spike') {
        const rock = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 4), new THREE.MeshPhongMaterial({color: isRare ? 0x00ffff : 0x667788, flatShading:true, shininess: isRare?100:10})); rock.position.y = 1.25; rock.castShadow = true;
        obs.add(rock);
    } else if (type === 'cactus') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2), new THREE.MeshPhongMaterial({color:0x2E8B57, flatShading:true})); trunk.position.y = 1; trunk.castShadow = true;
        const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8), new THREE.MeshPhongMaterial({color:0x2E8B57, flatShading:true})); armL.rotation.z = Math.PI/2; armL.position.set(-0.4, 1.2, 0); armL.castShadow = true;
        const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8), new THREE.MeshPhongMaterial({color:0x2E8B57, flatShading:true})); armR.rotation.z = Math.PI/2; armR.position.set(0.4, 0.8, 0); armR.castShadow = true;
        obs.add(trunk, armL, armR);
        if (isRare) { const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2,0), new THREE.MeshPhongMaterial({color: 0xFF1493})); flower.position.y = 2.2; obs.add(flower); }
    } else if (type === 'laser') {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,2,8), new THREE.MeshPhongMaterial({color:0x222222})); pillar.position.y = 1; pillar.castShadow = true;
        const laser = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE, 0.1, 0.1), new THREE.MeshBasicMaterial({color: isRare ? 0xFF0000 : 0xFF00FF})); laser.position.y = 1.5; obs.add(pillar, laser);
    } else if (type === 'lollipop') {
        // Stick
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2), new THREE.MeshPhongMaterial({color: 0xFFFFFF}));
        stick.position.y = 1; stick.castShadow = true;
        // Pop
        const pop = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 16), new THREE.MeshPhongMaterial({color: isRare ? 0x00FFFF : 0xFF1493}));
        pop.rotation.x = Math.PI/2; pop.position.y = 2; pop.castShadow = true;
        // Swirl detail
        const swirl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.42, 16), new THREE.MeshPhongMaterial({color: 0xFFFFFF}));
        swirl.rotation.x = Math.PI/2; swirl.position.y = 2;
        obs.add(stick, pop, swirl);
    }
    obs.position.set(x, 0.5, z); return obs;
}

function createTunnel(x, z, theme, heightOffset=0) {
    const tGroup = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({color: theme.tunnelCol, flatShading: true});
    const spikeMat = new THREE.MeshPhongMaterial({color: 0x888888, flatShading: true});

    // Left Wall (Continuous length matching BLOCK_SIZE)
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.0, BLOCK_SIZE), mat);
    pL.position.set(-0.8, 1.0, 0); pL.castShadow = true;

    // Right Wall
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.0, BLOCK_SIZE), mat);
    pR.position.set(0.8, 1.0, 0); pR.castShadow = true;

    // Ceiling
    const beam = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE, 0.4, BLOCK_SIZE), mat);
    beam.position.set(0, 2.2, 0); beam.castShadow = true;

    // Spikes on top!
    for(let i = -1; i <= 1; i += 2) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 4), spikeMat);
        spike.position.set(i*0.4, 2.6, 0); spike.castShadow = true; tGroup.add(spike);
    }

    tGroup.add(pL, pR, beam);
    tGroup.position.set(x, 0.5 + heightOffset, z);
    return tGroup;
}

function buildGeometryFromData() {
    if (trackGroup) scene.remove(trackGroup);
    trackGroup = new THREE.Group();
    particleSystems = []; gemsList = []; foodList = [];
    sonicRings.forEach(r => scene.remove(r)); sonicRings = []; boostChevrons = []; endBeamMesh = null;
    forceFieldsList = []; movingObstaclesList = []; boostRingsList = [];

    // MATERIALS
    const matBase1 = new THREE.MeshPhongMaterial({ color: currentTheme.mat1, flatShading: true });
    const matBase2 = new THREE.MeshPhongMaterial({ color: currentTheme.mat2, flatShading: true });
    const matSlow = new THREE.MeshPhongMaterial({ color: currentTheme.slowMat, flatShading: true });
    const matSpring = new THREE.MeshPhongMaterial({ color: COLOR_SPRING, emissive: 0x004444, flatShading: true });
    const matDeath = new THREE.MeshPhongMaterial({ color: COLOR_LAVA, emissive: 0x550000, flatShading: true });
    const matGem = new THREE.MeshPhongMaterial({ color: COLOR_GEM, emissive: 0x330033, flatShading: true, shininess: 100 });
    const matFood = new THREE.MeshPhongMaterial({ color: COLOR_FOOD, flatShading: true });
    const matIce = new THREE.MeshPhongMaterial({ color: COLOR_ICE, shininess: 90, flatShading: true });

    const matLeaf = new THREE.MeshPhongMaterial({ color: 0x32CD32, flatShading: true });

    const floorGeo = new THREE.BoxGeometry(BLOCK_SIZE, 0.5, BLOCK_SIZE);
    const highGeo = new THREE.BoxGeometry(BLOCK_SIZE, 1.5, BLOCK_SIZE);
    const vHighGeo = new THREE.BoxGeometry(BLOCK_SIZE, 2.5, BLOCK_SIZE);

    for (let vz = 0; vz < TRACK_LENGTH; vz++) {
        for (let vx = 0; vx < NUM_LANES; vx++) {
            let { f, i } = trackData[vz][vx];

            if (f !== FLOOR.EMPTY || i !== ITEM.NONE) {
                const posX = (vx - Math.floor(NUM_LANES/2)) * BLOCK_SIZE; const posZ = -vz * BLOCK_SIZE;
                let floorY = 0.25;
                let mat = ((vx + vz) % 2 === 0) ? matBase1 : matBase2;

                if (f === FLOOR.ICE || f === FLOOR.HIGH_ICE || f === FLOOR.VHIGH_ICE) mat = matIce;
                if (f === FLOOR.LAVA || f === FLOOR.HIGH_LAVA || f === FLOOR.VHIGH_LAVA) {
                    mat = matDeath;
                    let partY = (f===FLOOR.HIGH_LAVA) ? 1.5 : (f===FLOOR.VHIGH_LAVA ? 2.5 : 0.5);
                    spawnTileParticles('lava', posX, posZ, partY);
                }

                let blockGeo = floorGeo;
                if (f === FLOOR.HIGH || f === FLOOR.HIGH_ICE || f === FLOOR.HIGH_LAVA || f === FLOOR.HIGH_TUNNEL) { blockGeo = highGeo; floorY = 0.75; }
                else if (f === FLOOR.VHIGH || f === FLOOR.VHIGH_ICE || f === FLOOR.VHIGH_LAVA) { blockGeo = vHighGeo; floorY = 1.25; }

                if (f !== FLOOR.EMPTY) {
                    let block = new THREE.Mesh(blockGeo, mat);
                    block.position.set(posX, floorY, posZ);
                    block.receiveShadow = true; trackGroup.add(block);
                    if (f === FLOOR.TUNNEL) trackGroup.add(createTunnel(posX, posZ, currentTheme));
                    if (f === FLOOR.HIGH_TUNNEL) trackGroup.add(createTunnel(posX, posZ, currentTheme, 1.0));
                }

                let itemY = (f === FLOOR.EMPTY) ? 2.5 + Math.sin(vz * 0.4) * 1.5 : floorY * 2;
                if (f === FLOOR.TUNNEL || f === FLOOR.HIGH_TUNNEL) itemY = (f === FLOOR.HIGH_TUNNEL ? 1.5 : 0.5);

                if (i !== ITEM.NONE) {
                    if (i === ITEM.SLOW) {
                        let slowMesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE, 0.1, BLOCK_SIZE), matSlow);
                        slowMesh.position.set(posX, itemY + 0.05, posZ); trackGroup.add(slowMesh); spawnTileParticles('slow', posX, posZ);
                    }

                    // OBSTACLES
                    if (i === ITEM.OBSTACLE) {
                        if (f === FLOOR.EMPTY) {
                            if (selectedLevelId === 'glider') {
                                // MOVING CUBE HAZARD
                                const obsGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                                const obsMat = new THREE.MeshPhongMaterial({color: 0xFF2222, shininess: 80});
                                const mesh = new THREE.Mesh(obsGeo, obsMat);
                                mesh.position.set(posX, itemY + 1.0, posZ);
                                trackGroup.add(mesh);

                                movingObstaclesList.push({
                                    mesh: mesh,
                                    baseX: posX, baseY: itemY + 1.0, baseZ: posZ,
                                    moveType: (Math.random() > 0.5 ? 'vertical' : 'horizontal'),
                                                         offset: Math.random() * 1000
                                });
                            } else {
                                // FLOATING FORCE FIELD
                                let ffGroup = new THREE.Group();
                                let ffGeo = new THREE.BoxGeometry(BLOCK_SIZE * 0.85, 12, 0.4);
                                let ffMat = new THREE.MeshBasicMaterial({color: 0xFF0000, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false});
                                let ffMesh = new THREE.Mesh(ffGeo, ffMat);
                                ffMesh.position.y = 4;
                                let coreMesh = new THREE.Mesh(new THREE.BoxGeometry(BLOCK_SIZE * 0.1, 12, 0.1), new THREE.MeshBasicMaterial({color: 0xFFFFFF}));
                                coreMesh.position.y = 4;
                                ffGroup.add(ffMesh, coreMesh);
                                ffGroup.position.set(posX, itemY, posZ);
                                trackGroup.add(ffGroup);
                                forceFieldsList.push({ mesh: ffGroup, ffMat: ffMat, x: vx, z: vz });
                            }
                        } else {
                            // Ground Obstacle
                            let obs = createObstacle(posX, posZ, currentTheme.obstacle);
                            obs.position.y = itemY;
                            trackGroup.add(obs);
                        }
                    }

                    if (i === ITEM.SPRING) {
                        const springGroup = new THREE.Group();
                        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), new THREE.MeshPhongMaterial({color: 0x444444})); pad.position.y = 0.05;
                        const coil = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 8, 16), new THREE.MeshPhongMaterial({color: COLOR_SPRING, emissive: 0x004444}));
                        coil.position.y = 0.2; coil.rotation.x = Math.PI/2;
                        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16), new THREE.MeshPhongMaterial({color: COLOR_SPRING, emissive: 0x004444})); top.position.y = 0.35;
                        springGroup.add(pad, coil, top); springGroup.position.set(posX, itemY, posZ); trackGroup.add(springGroup);
                    }

                    // BOOSTERS
                    if (i === ITEM.BOOST || i === ITEM.BOOST_WITH_GEM) {
                        if (f === FLOOR.EMPTY) {
                            // Neon Ring
                            const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.15, 8, 16), new THREE.MeshPhongMaterial({color: COLOR_BOOST, emissive: 0xFF4500}));
                            ring.position.set(posX, itemY, posZ);
                            trackGroup.add(ring);
                            boostRingsList.push({ mesh: ring, x: vx, z: vz, collected: false });

                            if (i === ITEM.BOOST_WITH_GEM) {
                                const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), matGem);
                                gemMesh.position.set(posX, itemY + 2.5, posZ);
                                trackGroup.add(gemMesh);
                                gemsList.push({ mesh: gemMesh, x: vx, z: vz, collected: false, baseY: itemY + 2.5 });
                            }
                        } else {
                            // Ground Pad
                            const chevContainer = new THREE.Group(); chevContainer.position.set(posX, itemY, posZ);
                            const arrowGroup = new THREE.Group(); const armGeo = new THREE.BoxGeometry(0.8, 0.1, 0.2);
                            const matBoostChevron = new THREE.MeshPhongMaterial({ color: 0xFFA500, emissive: 0xFF4500, flatShading: true });
                            const arm1 = new THREE.Mesh(armGeo, matBoostChevron); arm1.rotation.y = Math.PI / 4; arm1.position.set(-0.25, 0.05, 0.15);
                            const arm2 = new THREE.Mesh(armGeo, matBoostChevron); arm2.rotation.y = -Math.PI / 4; arm2.position.set(0.25, 0.05, 0.15);
                            arrowGroup.add(arm1, arm2); chevContainer.add(arrowGroup); trackGroup.add(chevContainer); boostChevrons.push(arrowGroup);
                        }
                    }

                    if (i === ITEM.GEM) {
                        const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), matGem);
                        gemMesh.position.set(posX, itemY + 1.0, posZ); trackGroup.add(gemMesh);
                        gemsList.push({ mesh: gemMesh, x: vx, z: vz, collected: false, baseY: itemY + 1.0 });
                    }

                    if (i === ITEM.FOOD) {
                        const fGroup = new THREE.Group(); const berry = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), matFood);
                        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 4), matLeaf); leaf.position.set(0, 0.35, 0);
                        fGroup.add(berry, leaf); fGroup.position.set(posX, itemY + 1.0, posZ); trackGroup.add(fGroup);
                        foodList.push({ mesh: fGroup, x: vx, z: vz, collected: false, baseY: itemY + 1.0 });
                    }
                    if (i === ITEM.END && !endBeamMesh) {
                        endBeamMesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 100, 16), new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending}));
                        endBeamMesh.position.set(0, 50, posZ); trackGroup.add(endBeamMesh); TRACK_LENGTH = vz + 3;
                    }
                }
            }
        }
    }

    if (selectedLevelId === 'endless' || selectedLevelId === 'glider') {
        portalMesh = new THREE.Mesh(new THREE.TorusGeometry(8, 0.8, 16, 32), new THREE.MeshBasicMaterial({ color: 0xFF00FF, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
        portalMesh.position.set(0, 3, -(TRACK_LENGTH - 12) * BLOCK_SIZE); trackGroup.add(portalMesh);
    } else portalMesh = null;

    scene.add(trackGroup);
}

function spawnTileParticles(typeStr, posX, posZ, heightOffset=0.5) {
    const pGroup = new THREE.Group(); pGroup.position.set(posX, heightOffset, posZ);
    const geo = new THREE.BufferGeometry(); const pos = new Float32Array((typeStr === 'lava' ? 15 : 20) * 3);
    for(let i=0; i<pos.length/3; i++) { pos[i*3] = (Math.random() - 0.5) * 1.8; pos[i*3+1] = Math.random() * 0.8; pos[i*3+2] = (Math.random() - 0.5) * 1.8; }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGroup.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: (typeStr === 'lava' ? COLOR_LAVA : currentTheme.slowParticle), size: 0.15, transparent: true, opacity: 0.7 })));
    particleSystems.push({ obj: pGroup, type: typeStr, speed: 0.01 + Math.random()*0.02 });
    trackGroup.add(pGroup);
}

function generateEndless() {
    TRACK_LENGTH = 500;
    trackData = Array.from({ length: TRACK_LENGTH }, () => Array.from({ length: NUM_LANES }, () => ({f: FLOOR.EMPTY, i: ITEM.NONE})));
    let z = 0, currentX = Math.floor(NUM_LANES / 2);

    // Start Platform
    for(let i=0; i<20; i++) {
        trackData[i][currentX] = {f: FLOOR.BASE, i: ITEM.NONE};
        trackData[i][currentX-1] = {f: FLOOR.BASE, i: ITEM.NONE};
        trackData[i][currentX+1] = {f: FLOOR.BASE, i: ITEM.NONE};
    }
    z = 20;

    while (z < TRACK_LENGTH - 15) {
        let length = Math.floor(Math.random() * 8) + 8, width = Math.floor(Math.random() * 3) + 3;
        let nextX = Math.max(3, Math.min(NUM_LANES - 4, currentX + (Math.floor(Math.random() * 5) - 2)));

        // Side Paths (Islands)
        let hasSidePath = (z > 20 && Math.random() < 0.4);
        let sideX = currentX + (Math.random() > 0.5 ? 5 : -5);
        if (sideX - 1 < 0 || sideX + 1 >= NUM_LANES) hasSidePath = false;

        // Main Road Height
        let isHighSegment = (z > 30 && Math.random() < 0.2);
        let mainHeight = isHighSegment ? FLOOR.HIGH : FLOOR.BASE;

        // Side Island Properties
        let islandTheme = Math.random();
        let islandHeight = Math.random() < 0.3 ? FLOOR.HIGH : (Math.random() < 0.2 ? FLOOR.VHIGH : FLOOR.BASE);

        for (let i = 0; i < length; i++) {
            if (z + i >= TRACK_LENGTH - 10) break;
            let startCol = currentX - Math.floor(width / 2), endCol = currentX + Math.floor(width / 2), treeCount = 0;

            // --- GENERATE MAIN ROAD ---
            for (let x = startCol; x <= endCol; x++) {
                trackData[z+i][x] = {f: mainHeight, i: ITEM.NONE};

                if (z + i > 15 && i > 2 && i < length - 2) {
                    let r = Math.random(), dens = currentDiff.density;

                    // Dynamic Probabilities
                    let pObs = 0.05 * dens;
                    let pSlow = pObs + 0.04 * dens;
                    let pSpr = pSlow + 0.03 * dens;

                    // LAVA SCALING: Increased base and scaling per warp
                    // Base 4% + (3% per warp), capped at 15% extra
                    let lavaSpan = (0.04 * dens) + Math.min(0.15, warpCount * 0.03);
                    let pLava = pSpr + lavaSpan;

                    let pGem = pLava + 0.03 * dens;
                    let pFood = pGem + (useStamina ? 0.04 * dens : 0);
                    let pBoost = pFood + 0.02 * dens;
                    // Removed Ice probability

                    if (r < pObs && treeCount < width - 1 && !isHighSegment) {
                        trackData[z+i][x].i = ITEM.OBSTACLE; treeCount++;
                    }
                    else if (r < pSlow) trackData[z+i][x].i = ITEM.SLOW;
                    else if (r < pSpr) trackData[z+i][x].i = ITEM.SPRING;
                    else if (r < pLava) {
                        // High Lava Logic: Don't flatten the floor, use High Lava
                        if (mainHeight === FLOOR.HIGH) trackData[z+i][x].f = FLOOR.HIGH_LAVA;
                        else trackData[z+i][x].f = FLOOR.LAVA;
                    }
                    else if (r < pGem) trackData[z+i][x].i = ITEM.GEM;
                    else if (useStamina && r < pFood) trackData[z+i][x].i = ITEM.FOOD;
                    else if (r < pBoost && !isHighSegment) trackData[z+i][x].i = ITEM.BOOST;
                }
            }

            // --- GENERATE SIDE ISLANDS ---
            if (hasSidePath && i > 1 && i < length - 1) {
                for(let sx = sideX - 1; sx <= sideX + 1; sx++) {
                    // Set base floor for island
                    trackData[z+i][sx] = {f: islandHeight, i: ITEM.NONE};

                    if (islandTheme < 0.15) { // Treasure
                        if (Math.random() < 0.4) trackData[z+i][sx].i = ITEM.GEM;
                        else if (Math.random() < 0.1) trackData[z+i][sx].i = ITEM.BOOST;
                    } else if (islandTheme < 0.3) { // Bouncy
                        if (Math.random() < 0.3) trackData[z+i][sx].i = ITEM.SPRING;
                    } else if (islandTheme < 0.45) { // Danger Island
                        if (islandHeight === FLOOR.HIGH) trackData[z+i][sx].f = FLOOR.HIGH_LAVA;
                        else if (islandHeight === FLOOR.VHIGH) trackData[z+i][sx].f = FLOOR.VHIGH_LAVA;
                        else trackData[z+i][sx].f = FLOOR.LAVA;

                        if (Math.random() < 0.3) trackData[z+i][sx].i = ITEM.GEM;
                    } else {
                        if (Math.random() < 0.1) trackData[z+i][sx].i = ITEM.SPRING;
                        else if (Math.random() < 0.15) trackData[z+i][sx].i = ITEM.BOOST;
                        else if (Math.random() < 0.2) trackData[z+i][sx].i = ITEM.GEM;
                        else if (useStamina && Math.random() < 0.25) trackData[z+i][sx].i = ITEM.FOOD;
                    }
                }
            }
        }
        z += length + Math.floor(Math.random() * 4) + 3; currentX = nextX;
    }

    // End funnel
    for(let endZ = TRACK_LENGTH - 15; endZ < TRACK_LENGTH; endZ++) {
        for(let x = 0; x < NUM_LANES; x++) {
            if (Math.abs(x - Math.floor(NUM_LANES/2)) <= 3) trackData[endZ][x] = {f: FLOOR.BASE, i: ITEM.NONE};
            else trackData[endZ][x] = {f: FLOOR.EMPTY, i: ITEM.NONE};
        }
    }
}

function generateGliderMode() {
    TRACK_LENGTH = 700;
    trackData = Array.from({ length: TRACK_LENGTH }, () => Array.from({ length: NUM_LANES }, () => ({f: FLOOR.EMPTY, i: ITEM.NONE})));
    let z = 0; let cx = Math.floor(NUM_LANES/2);

    // 1. Start Platform
    for(let i=0; i<20; i++) {
        for(let w = -1; w <= 1; w++) trackData[i][cx+w] = {f: FLOOR.HIGH, i: ITEM.NONE};
    }
    trackData[19][cx].i = ITEM.SPRING;
    z = 20;

    // 2. Continuous Path Generation
    while (z < TRACK_LENGTH - 20) {
        let segmentLength = 25;
        if (z + segmentLength > TRACK_LENGTH - 20) segmentLength = (TRACK_LENGTH - 20) - z;

        let targetX = Math.max(3, Math.min(NUM_LANES - 4, cx + (Math.random() > 0.5 ? 4 : -4)));

        // SIDE MISSION LOGIC
        let hasSideIsland = Math.random() < 0.4;
        let islandX = (targetX > NUM_LANES/2) ? targetX - 5 : targetX + 5;

        for (let k = 0; k < segmentLength; k++) {
            let currentZ = z + k;

            // Move current X towards target X
            if (cx < targetX) cx++; else if (cx > targetX) cx--;

            // 1. BACKBONE RINGS
            if (currentZ % 2 === 0) {
                trackData[currentZ][cx] = {f: FLOOR.EMPTY, i: ITEM.BOOST};
            }

            // 2. SIDE ISLAND GENERATION
            if (hasSideIsland && k > 5 && k < 15) {
                // Create a floating platform (VHIGH is height 2.5)
                // This allows player to land, rest, and jump back off
                trackData[currentZ][islandX] = {f: FLOOR.VHIGH, i: ITEM.NONE};
                trackData[currentZ][islandX-1] = {f: FLOOR.VHIGH, i: ITEM.NONE};
                trackData[currentZ][islandX+1] = {f: FLOOR.VHIGH, i: ITEM.NONE};

                // Gems on the island
                if (k % 2 === 0) trackData[currentZ][islandX].i = ITEM.GEM;

                // Spring at the end of island to help launch back
                if (k === 14) trackData[currentZ][islandX].i = ITEM.SPRING;
            }

            // 3. MOVING HAZARDS (The Square Blocks)
            // Place them in the air between rings to force dodging
            if (Math.random() < 0.15) {
                let hazX = cx + (Math.random()>0.5 ? 2 : -2);
                // Don't overwrite side island
                if (Math.abs(hazX - islandX) > 2 && hazX > 0 && hazX < NUM_LANES) {
                    trackData[currentZ][hazX] = {f: FLOOR.EMPTY, i: ITEM.OBSTACLE};
                }
            }

            // 4. FOOD
            if (useStamina && currentZ % 8 === 4) {
                trackData[currentZ][cx] = {f: FLOOR.EMPTY, i: ITEM.FOOD};
            }
        }
        z += segmentLength;
    }

    // Safety Path
    while(z < TRACK_LENGTH - 5) {
        if (z % 2 === 0) trackData[z][cx] = {f: FLOOR.EMPTY, i: ITEM.BOOST};
        z++;
    }

    // End Platform
    for(let i = TRACK_LENGTH - 20; i < TRACK_LENGTH; i++) {
        for(let w = -2; w <= 2; w++) {
            let col = Math.max(0, Math.min(NUM_LANES - 1, cx + w));
            trackData[i][col] = {f: FLOOR.BASE, i: ITEM.NONE};
        }
    }
}

function generateCampaign(levelIndex) {
    let data = (levelIndex === -1) ? CUSTOM_LEVEL : CAMPAIGN_LEVELS[levelIndex];
    if (!data || !data.map) return;

    useStamina = data.stamina; staminaDrain = data.drain || 0.1;
    TRACK_LENGTH = data.map.length + 10;
    trackData = Array.from({ length: TRACK_LENGTH }, () => Array.from({ length: NUM_LANES }, () => ({f: FLOOR.EMPTY, i: ITEM.NONE})));

    for(let i=0; i<data.map.length; i++) {
        let z = data.map.length - 1 - i, rowStr = data.map[i];
        let offset = Math.floor((NUM_LANES - rowStr.length) / 2);

        for(let c=0; c<rowStr.length; c++) {
            let x = c + offset;
            if(x>=0 && x<NUM_LANES) {
                let cellStr = (typeof rowStr === 'string') ? rowStr[c] : rowStr[c];
                let f = FLOOR.EMPTY, item = ITEM.NONE;
                let itemChar = '.';

                // --- 1. PARSE FLOOR TYPE ---
                if (cellStr.length >= 2 && (cellStr.startsWith('HI') || cellStr.startsWith('VI') || cellStr.startsWith('HL') || cellStr.startsWith('VL') || cellStr.startsWith('HU'))) {
                    // Handle 2-character Floor Codes
                    let fCode = cellStr.substring(0, 2);
                    itemChar = cellStr.substring(2);

                    if (fCode === 'HI') f = FLOOR.HIGH_ICE;
                    else if (fCode === 'VI') f = FLOOR.VHIGH_ICE;
                    else if (fCode === 'HL') f = FLOOR.HIGH_LAVA;
                    else if (fCode === 'VL') f = FLOOR.VHIGH_LAVA;
                    else if (fCode === 'HU') f = FLOOR.HIGH_TUNNEL;
                } else {
                    // Handle 1-character Floor Codes (Standard)
                    let fChar = cellStr[0];
                    // If it's a legacy string (e.g. "G"), item is implicit dot. If it's a generated token (e.g. "G."), take second char.
                    itemChar = (cellStr.length > 1) ? cellStr.substring(1) : '.';

                    // Backwards compatibility for single-char strings in array
                    if (cellStr.length === 1 && ['.','G','H','V','I','L','U'].includes(cellStr)) {
                        fChar = cellStr; itemChar = '.';
                    }
                    // Backwards compatibility for Item-only chars (e.g. 'T' for tree on grass)
                    else if (cellStr.length === 1 && !['.','G','H','V','I','L','U'].includes(cellStr)) {
                        fChar = 'G'; itemChar = cellStr;
                    }

                    if(fChar==='G') f = FLOOR.BASE;
                    else if(fChar==='H') f = FLOOR.HIGH;
                    else if(fChar==='V') f = FLOOR.VHIGH;
                    else if(fChar==='I') f = FLOOR.ICE;
                    else if(fChar==='L') f = FLOOR.LAVA;
                    else if(fChar==='U') f = FLOOR.TUNNEL;
                }

                // --- 2. PARSE ITEM TYPE ---
                // Clean up if itemChar is empty or just '.'
                if (!itemChar || itemChar === '') itemChar = '.';

                if(itemChar==='T') item = ITEM.OBSTACLE;
                else if(itemChar==='S') item = ITEM.SLOW;
                else if(itemChar==='B') item = ITEM.SPRING;
                else if(itemChar==='C') item = ITEM.GEM;
                else if(itemChar==='F') item = ITEM.FOOD;
                else if(itemChar==='A') item = ITEM.BOOST;
                else if(itemChar==='E') item = ITEM.END;

                trackData[z][x] = { f: f, i: item };
            }
        }
    }
    // End platform
    for(let z=data.map.length; z<TRACK_LENGTH; z++) {
        let c = Math.floor(NUM_LANES/2);
        trackData[z][c-1] = {f:FLOOR.BASE, i:ITEM.NONE}; trackData[z][c] = {f:FLOOR.BASE, i:ITEM.NONE}; trackData[z][c+1] = {f:FLOOR.BASE, i:ITEM.NONE};
    }
}

function triggerWarp() {
    warpCount++;
    playSound('boost', 0.5);
    gameData.lollies++; saveData(); showLollyNotification();
    const flash = document.getElementById('warp-flash');
    flash.style.transition = 'none'; flash.style.opacity = '1';

    setTimeout(() => { flash.style.transition = 'opacity 1.5s ease-out'; flash.style.opacity = '0'; }, 50);

    let themeKeys = gameData.unlocked.themes;
    let nextThemeId = themeKeys[Math.floor(Math.random() * themeKeys.length)];

    applyTheme(THEMES[nextThemeId], nextThemeId);

    if (selectedLevelId === 'glider') {
        generateGliderMode();
    } else {
        generateEndless();
    }
    buildGeometryFromData();

    // --- SAFETY RESET ---
    // Calculate spawn height based on the actual tile under the start position
    let startCenter = Math.floor(NUM_LANES/2);
    let startTile = trackData[0][startCenter];
    let spawnY = 0.5;

    // Check floor type for height
    if (startTile.f === FLOOR.HIGH || startTile.f === FLOOR.HIGH_ICE || startTile.f === FLOOR.HIGH_LAVA) spawnY = 1.5;
    else if (startTile.f === FLOOR.VHIGH || startTile.f === FLOOR.VHIGH_ICE || startTile.f === FLOOR.VHIGH_LAVA) spawnY = 2.5;

    // Set Player
    playerGroup.position.set(0, spawnY, 0);
    velocityY = 0;
    isGrounded = true;
    coyoteFrames = 0;
    // --------------------

    camera.position.z = 8.5;

    // Clear old elements cleanly
    sonicRings.forEach(r => scene.remove(r)); sonicRings = [];
    ghostTrails.forEach(g => scene.remove(g)); ghostTrails = [];

    const dPos = foxDustParticles.geometry.attributes.position.array, tPos = tailParticles.geometry.attributes.position.array;
    for(let i=0; i<PARTICLE_COUNT*3; i++) { dPos[i] = 9999; tPos[i] = 9999; }
    foxDustParticles.geometry.attributes.position.needsUpdate = true; tailParticles.geometry.attributes.position.needsUpdate = true;
}

function popScore(combo) {
    const el = document.getElementById('score-display'); el.style.transform = 'scale(1.5)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
    if (combo > 1) { const cel = document.getElementById('combo-text'); cel.innerText = `COMBO x${combo}!`; cel.style.display = 'block'; }
}

function checkHighScore() {
    if (currentScore > highScore) {
        highScore = Math.floor(currentScore);
        localStorage.setItem('skyFoxHighScore', highScore);
        document.getElementById('highscore-display').innerText = highScore;
    }
}

function explodeFox() {
    playSound('explode');
    foxVoxels.forEach(v => scene.remove(v.mesh)); foxVoxels = [];

    // Fetch colors based on equipped character
    let cChar = gameData.equipped.char;
    let colors = [0xd95a00, 0xffffff, 0x111111]; // Fox (Default)
    if (cChar === 'pinkfox') colors = [0xFF1493, 0xffffff, 0x111111];
    if (cChar === 'wolf') colors = [0x708090, 0xffffff, 0x111111];
    if (cChar === 'raccoon') colors = [0x808080, 0x111111, 0xffffff];
    if (cChar === 'penguin') colors = [0x2C3E50, 0xffffff, 0xFF8C00];

    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    for(let i=0; i<40; i++) {
        let mat = new THREE.MeshPhongMaterial({color: colors[Math.floor(Math.random()*colors.length)], flatShading: true});
        let mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(playerGroup.position); mesh.position.y += Math.random() * 1.5;
        scene.add(mesh);
        foxVoxels.push({ mesh: mesh, vx: (Math.random()-0.5)*0.5, vy: Math.random()*0.6, vz: (Math.random()-0.5)*0.5 - (speedZ*0.8) });
    }
    playerGroup.visible = false; foxShadow.visible = false; speedLines.visible = false;
}

function renderLevelSelector() {
    const currentMode = selectedLevelId;
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';

    // Define the buttons
    const levels = [
        { id: 'endless', name: 'Survival', sub: 'Endless Run', reward: false },
        { id: 'glider', name: 'Aero Rush', sub: 'Glider Mode', reward: false },
        { id: 'level0', name: 'Level 1', sub: 'Parkour Basics', reward: true },
        { id: 'level1', name: 'Level 2', sub: 'Traps & Roads', reward: true },
        { id: 'level2', name: 'Level 3', sub: 'Gotta go slow...', reward: true },
        { id: 'level3', name: 'Level 4', sub: 'Gotta go... quick!', reward: true }
    ];

    levels.forEach(lvl => {
        let div = document.createElement('div');
        div.className = 'level-card';
        if(currentMode === lvl.id) div.classList.add('active');

        let isDone = gameData.completedLevels.includes(lvl.id);
        if(isDone) div.classList.add('completed');

        // Badge Logic: Checkmark if done, Star/Lolly if not done (and it offers a reward)
        let badge = '';
        if (isDone && lvl.id !== 'endless') badge = '<span class="lvl-badge">✅</span>';
        else if (!isDone && lvl.reward) badge = '<span class="lvl-badge">' + CURRENCY_ICON + 'x1</span>';

        div.innerHTML = `
        <span class="lvl-title">${lvl.name}</span>
        <span class="lvl-sub">${lvl.sub}</span>
        ${badge}
        `;

        div.onclick = () => {
            selectedLevelId = lvl.id;
            renderLevelSelector();
            previewLevel();
        };
        grid.appendChild(div);
    });
}

// --- GAME LOOP ---
window.startGame = function() {
    warpCount = 0;
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    initAudioEngine();

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('ui-layer').style.display = 'none';
    document.getElementById('btn-pause').style.display = 'none';

    logoGroup.visible = false; speedLines.visible = false; playerGroup.visible = true;

    // --- CLEAR ALL OLD ENTITIES ---
    foxVoxels.forEach(v => scene.remove(v.mesh)); foxVoxels = [];
    sonicRings.forEach(r => scene.remove(r)); sonicRings = [];
    ghostTrails.forEach(g => scene.remove(g)); ghostTrails = [];
    forceFieldsList.forEach(ff => scene.remove(ff.mesh)); forceFieldsList = [];
    if (deathTimeoutId) clearTimeout(deathTimeoutId);

    const dPos = foxDustParticles.geometry.attributes.position.array, tPos = tailParticles.geometry.attributes.position.array;
    for(let i=0; i<PARTICLE_COUNT*3; i++) { dPos[i] = 9999; tPos[i] = 9999; }
    foxDustParticles.geometry.attributes.position.needsUpdate = true; tailParticles.geometry.attributes.position.needsUpdate = true;

    dustIdx = 0; tailIdx = 0; coyoteFrames = 0;
    gemCombo = 0; gemTimer = 0; document.getElementById('combo-text').style.display = 'none';
    stamina = 100; dashTimer = 0; doubleJumps = 0; spaceWasDown = false;
    leftEdgePressed = false; rightEdgePressed = false;
    velocityY = 0; speedZ = 0; currentScore = 0; runAnimTimer = 0; cameraShake = 0;

    playerGroup.scale.set(1,1,1); playerGroup.userData.body.rotation.z = 0;
    camera.fov = 70; camera.updateProjectionMatrix();
    playerGroup.userData.wingL.visible = false; playerGroup.userData.wingR.visible = false;
    paws.forEach(p => { p.rotation.x = 0; p.rotation.z = 0; });
    playerGroup.userData.head.rotation.x = 0;

    previewLevel();
    document.getElementById('stamina-wrapper').style.display = useStamina ? 'block' : 'none';

    let startX = Math.floor(NUM_LANES/2);
    let startY = 0.5;
    if (trackData[0] && trackData[0][startX]) {
        if (trackData[0][startX].f === FLOOR.HIGH) startY = 1.5;
        if (trackData[0][startX].f === FLOOR.VHIGH) startY = 2.5;
    }
    playerGroup.position.set(0, startY, 0); playerGroup.rotation.set(0,0,0);

    targetLaneX = 0;
    isGrounded = true;

    isPaused = false; isDead = false; canRestart = false;
    lastTime = performance.now();

    let count = 3;
    const countEl = document.getElementById('countdown-text');
    const countOverlay = document.getElementById('countdown-overlay');

    countOverlay.style.display = 'flex';
    countEl.innerText = "3";
    playSound('coin', 0.5);
    window.slideVelocityX = 0;

    let timer = setInterval(() => {
        count--;
        if(count > 0) {
            countEl.innerText = count; countEl.style.transform = "scale(1.2)";
            setTimeout(()=>countEl.style.transform="scale(1)", 100);
            playSound('coin', 0.5 + (3-count)*0.2);
        } else if (count === 0) {
            countEl.innerText = "GO!"; countEl.style.color = "#FFD700"; playSound('boost', 1.0);
        } else {
            clearInterval(timer); countOverlay.style.display = 'none';
            document.getElementById('btn-pause').style.display = 'block';
            if (window.innerWidth < 800) document.getElementById('mobile-controls').style.display = 'flex';
            isPlaying = true; speedZ = 0.2; window.gameStartTime = Date.now();
        }
    }, 350);
};


window.resetMenu = function() {
    isPlaying = false; isPaused = false; isDead = false; canRestart = false;
    updateShopUI(); renderLevelSelector();
    if (deathTimeoutId) clearTimeout(deathTimeoutId);

    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('ui-layer').style.display = 'flex';
    document.getElementById('btn-pause').style.display = 'none';
    document.getElementById('mobile-controls').style.display = 'none';

    playerGroup.visible = false; foxShadow.visible = false; logoGroup.visible = true; speedLines.visible = false;

    // --- CLEAR ALL OLD ENTITIES ---
    foxVoxels.forEach(v => scene.remove(v.mesh)); foxVoxels = [];
    sonicRings.forEach(r => scene.remove(r)); sonicRings = [];
    ghostTrails.forEach(g => scene.remove(g)); ghostTrails = [];
    forceFieldsList.forEach(ff => scene.remove(ff.mesh)); forceFieldsList = [];

    camera.up.set(0, 1, 0); camera.position.set(0, 6, 8); camera.lookAt(0, 2, -15); logoGroup.position.set(0, 5, -8);
};

function gameOver(reason) {
    if (isDead) return;
    isPlaying = false; isDead = true; canRestart = false; cameraShake = 1.0;
    document.getElementById('btn-pause').style.display = 'none';

    // Check if the player died by falling into the abyss
    if (playerGroup.position.y > -2) {
        explodeFox();
    } else {
        playSound('crash');
        playerGroup.visible = false;
        foxShadow.visible = false;
        speedLines.visible = false;
    }

    checkHighScore();

    document.getElementById('end-title').innerText = "GAME OVER";
    document.getElementById('end-title').style.color = "#FF4500";
    document.getElementById('end-reason').innerText = reason;

    deathTimeoutId = setTimeout(() => {
        document.getElementById('ui-layer').style.display = 'flex';
        document.getElementById('game-over-screen').style.display = 'block';
        canRestart = true;
    }, 800);
}

function gameWin() {
    isPlaying = false; foxShadow.visible = false; speedLines.visible = false;
    document.getElementById('ui-layer').style.display = 'flex';
    document.getElementById('btn-pause').style.display = 'none';
    checkHighScore();

    let mode = selectedLevelId;
    let title = "CLEARED!";
    let sub = `Final Score: ${Math.floor(currentScore)}`;
    let titleColor = "#32CD32";

    // Campaign Reward Logic
    if (mode.startsWith('level')) {
        if (!gameData.completedLevels.includes(mode)) {
            gameData.completedLevels.push(mode);
            gameData.lollies += 1;
            saveData();
            title = "LEVEL COMPLETE!";
            sub = `First clear bonus: +1 ${CURRENCY_ICON} Star!`;
            titleColor = "#FFD700";
            playSound('coin', 2.0);
        }
    }

    document.getElementById('game-over-screen').style.display = 'block';
    document.getElementById('end-title').innerText = title;
    document.getElementById('end-title').style.color = titleColor;
    document.getElementById('end-reason').innerHTML = sub;

    canRestart = true;
}

function updatePhysics() {
    if (speedZ > maxSpeed) speedZ -= brake * 0.5;
    else { if (keys.ArrowUp) speedZ += accel; if (keys.ArrowDown) speedZ -= brake; }
    if (speedZ < minSpeed) speedZ = minSpeed;

    let speedPctClamped = Math.min(100, Math.max(0, ((speedZ - minSpeed) / (maxSpeed - minSpeed)) * 100));
    document.getElementById('speed-fill').style.width = speedPctClamped + '%';
    document.getElementById('speed-fill').style.background = speedPctClamped > 80 ? '#00FFFF' : (speedPctClamped < 30 ? '#FF4500' : '#FFD700');
    document.getElementById('speed-text').innerText = Math.round(speedPctClamped * 0.2 + 5);
    document.getElementById('speed-text').style.color = speedPctClamped > 80 ? '#00FFFF' : '#FFD700';

    let multiplier = (1.0 + (speedPctClamped / 100) * 2.0) * currentDiff.mult;
    document.getElementById('multiplier-text').innerText = `x${multiplier.toFixed(1)}`;
    document.getElementById('multiplier-text').style.color = multiplier > 2.5 ? '#FF00FF' : '#00FFFF';

    if (useStamina) {
        stamina -= staminaDrain; if (stamina < 0) stamina = 0;
        document.getElementById('stamina-fill').style.width = stamina + '%';
        if (stamina === 0) return gameOver("You starved! Remember to eat your berries.");
    }

    let moveX = 0;
    let gridZCenter = Math.round(-playerGroup.position.z / BLOCK_SIZE);
    let gridXCenter = Math.round(playerGroup.position.x / BLOCK_SIZE) + Math.floor(NUM_LANES/2);
    let centerTile = (gridZCenter >= 0 && gridZCenter < TRACK_LENGTH && gridXCenter >= 0 && gridXCenter < NUM_LANES) ? trackData[gridZCenter][gridXCenter] : {f: FLOOR.EMPTY, i: ITEM.NONE};

    if (typeof window.slideVelocityX === 'undefined') window.slideVelocityX = 0;

    if ((centerTile.f === FLOOR.ICE || centerTile.f === FLOOR.HIGH_ICE || centerTile.f === FLOOR.VHIGH_ICE) && isGrounded) {
        moveX = window.slideVelocityX;
        if (keys.ArrowLeft) moveX -= currentDiff.steer * 0.05;
        if (keys.ArrowRight) moveX += currentDiff.steer * 0.05;
        window.slideVelocityX = moveX;

        if (isGridMovement) targetLaneX = Math.round(playerGroup.position.x / BLOCK_SIZE) * BLOCK_SIZE;
    } else if (isGridMovement) {
        if (keys.ArrowLeft && !leftEdgePressed) { targetLaneX -= BLOCK_SIZE; leftEdgePressed = true; }
        if (!keys.ArrowLeft) leftEdgePressed = false;
        if (keys.ArrowRight && !rightEdgePressed) { targetLaneX += BLOCK_SIZE; rightEdgePressed = true; }
        if (!keys.ArrowRight) rightEdgePressed = false;
        targetLaneX = Math.max(-Math.floor(NUM_LANES/2) * BLOCK_SIZE, Math.min(Math.floor(NUM_LANES/2) * BLOCK_SIZE, targetLaneX));
        moveX = (targetLaneX - playerGroup.position.x) * 0.3;
        window.slideVelocityX = moveX;
    } else {
        if (keys.ArrowLeft) moveX -= currentDiff.steer;
        if (keys.ArrowRight) moveX += currentDiff.steer;
        if (gyroActive && gyroTilt !== 0) moveX += gyroTilt * currentDiff.steer * 1.5;
        window.slideVelocityX = moveX;
    }

    if (Math.abs(moveX) > 0.01) {
        let proposedX = playerGroup.position.x + moveX;
        let cGridX = Math.round(playerGroup.position.x / BLOCK_SIZE) + Math.floor(NUM_LANES/2);
        let pGridX = Math.round(proposedX / BLOCK_SIZE) + Math.floor(NUM_LANES/2);
        let blocked = false;

        let gridZFront = Math.round(-(playerGroup.position.z - 0.6) / BLOCK_SIZE);
        if (gridZFront >= 0 && gridZFront < TRACK_LENGTH) {
            let cTile = trackData[gridZFront][cGridX] || {f: FLOOR.EMPTY, i: ITEM.NONE};
            if ((cTile.f === FLOOR.TUNNEL || cTile.f === FLOOR.HIGH_TUNNEL) && playerGroup.position.y < (cTile.f === FLOOR.HIGH_TUNNEL ? 3.5 : 2.5)) {
                let laneCenter = (cGridX - Math.floor(NUM_LANES/2)) * BLOCK_SIZE;
                if (proposedX < laneCenter - 0.6 || proposedX > laneCenter + 0.6) blocked = true;
            }
            if (!blocked && pGridX !== cGridX && pGridX >= 0 && pGridX < NUM_LANES) {
                let pTile = trackData[gridZFront][pGridX] || {f: FLOOR.EMPTY, i: ITEM.NONE};
                let pFloorH = (pTile.f === FLOOR.VHIGH || pTile.f === FLOOR.VHIGH_ICE || pTile.f === FLOOR.VHIGH_LAVA) ? 2.5 : ((pTile.f === FLOOR.HIGH || pTile.f === FLOOR.HIGH_ICE || pTile.f === FLOOR.HIGH_LAVA || pTile.f === FLOOR.HIGH_TUNNEL) ? 1.5 : 0.5);

                if ((pTile.f === FLOOR.TUNNEL || pTile.f === FLOOR.HIGH_TUNNEL) && playerGroup.position.y < pFloorH + 2.0) blocked = true;
                else if (pTile.f !== FLOOR.EMPTY && playerGroup.position.y < pFloorH - 0.2) blocked = true;
            }
        }
        if (!blocked) playerGroup.position.x = proposedX;
        else if (isGridMovement) targetLaneX = playerGroup.position.x;
    }

    playerGroup.position.z -= speedZ;
    let prevFeetY = playerGroup.position.y;
    if (dashTimer > 0) dashTimer--;

    if (keys.Space && !spaceWasDown) {
        if (isGrounded || coyoteFrames > 0) {
            playSound('jump'); velocityY = jumpStrength; playerGroup.scale.set(0.7, 1.4, 0.7);
            coyoteFrames = 0; isGrounded = false; doubleJumps = 0;
            const dPos = foxDustParticles.geometry.attributes.position.array;
            for(let i=0; i<10; i++) {
                dPos[dustIdx*3] = playerGroup.position.x + (Math.random()-0.5)*1.5;
                dPos[dustIdx*3+1] = playerGroup.position.y; dPos[dustIdx*3+2] = playerGroup.position.z + 0.5;
                dustIdx = (dustIdx + 1) % PARTICLE_COUNT;
            }
        }
        // Double jump logic - disabled
        // else if (!isGrounded && doubleJumps === 0) {
        //      doubleJumps = 1; velocityY = jumpStrength * 0.85; dashTimer = 15; playSound('jump', 1.5);
        // }
    }
    spaceWasDown = keys.Space;

    if (!isGrounded && !keys.Space && velocityY > 0 && dashTimer === 0) velocityY -= gravity * 2.0;
    isGliding = (!isGrounded && keys.Space && velocityY < 0);

    let targetScale = new THREE.Vector3(1, 1, 1);
    if (isGliding) {
        velocityY -= gravity * 0.35; targetScale.set(1.4, 0.7, 1.4);
        playerGroup.userData.wingL.visible = true; playerGroup.userData.wingR.visible = true;
        playerGroup.userData.wingL.rotation.z = Math.sin(Date.now() * 0.02) * 0.2;
        playerGroup.userData.wingR.rotation.z = -Math.sin(Date.now() * 0.02) * 0.2;
    } else {
        velocityY -= gravity; playerGroup.userData.wingL.visible = false; playerGroup.userData.wingR.visible = false;
    }

    playerGroup.position.y += velocityY;
    playerGroup.scale.lerp(targetScale, 0.2);

    let targetEarRotX = (speedZ - minSpeed) * 1.5;
    let tiltTurn = (keys.ArrowLeft ? 0.3 : 0) + (keys.ArrowRight ? -0.3 : 0) + (gyroActive ? gyroTilt * -0.6 : 0);
    playerGroup.userData.earL.rotation.x = -targetEarRotX; playerGroup.userData.earR.rotation.x = -targetEarRotX;
    playerGroup.userData.head.rotation.y = tiltTurn * 1.5;

    let targetRotZ = tiltTurn;
    if (isGliding) targetRotZ += Math.sin(Date.now()*0.02) * 0.1;
    playerGroup.rotation.z += (targetRotZ - playerGroup.rotation.z) * 0.15;
    playerGroup.userData.tailGroup.rotation.y = Math.sin(Date.now() * 0.015) * 0.3;

    if (isGrounded) {
        doubleJumps = 0; runAnimTimer += speedZ * 0.5;
        if(gameData.equipped.char === 'penguin' || previewState.char === 'penguin') {
            paws[0].position.z = 0.2 + Math.sin(runAnimTimer * 10) * 0.15; paws[1].position.z = 0.2 + Math.cos(runAnimTimer * 10) * 0.15;
            playerGroup.userData.body.rotation.z = Math.sin(runAnimTimer * 10) * 0.1;
        } else {
            paws[0].position.z = -0.4 + Math.sin(runAnimTimer * 10) * 0.15; paws[3].position.z =  0.4 + Math.sin(runAnimTimer * 10) * 0.15;
            paws[1].position.z = -0.4 + Math.cos(runAnimTimer * 10) * 0.15; paws[2].position.z =  0.4 + Math.cos(runAnimTimer * 10) * 0.15;
        }
        let bob = Math.abs(Math.sin(runAnimTimer * 10)) * 0.08;
        playerGroup.userData.body.position.y = 0.4 + bob; playerGroup.userData.head.position.y = (gameData.equipped.char === 'penguin' || previewState.char === 'penguin' ? 1.2 : 0.75) + bob; playerGroup.userData.tailGroup.position.y = 0.55 + bob;
    } else {
        if (dashTimer > 0) paws.forEach(p => p.position.z = 0);
        else paws.forEach((p, i) => p.position.z = (i>1) ? 0.4 : -0.4);
        playerGroup.userData.body.position.y = 0.4; playerGroup.userData.head.position.y = (gameData.equipped.char === 'penguin' || previewState.char === 'penguin' ? 1.2 : 0.75); playerGroup.userData.tailGroup.position.y = 0.55;
    }

    const pZ = playerGroup.position.z, gridZ = Math.abs(Math.round(pZ / BLOCK_SIZE));
    const gridZFront = Math.round(-(pZ - 0.6) / BLOCK_SIZE), gridZBack = Math.round(-(pZ + 0.6) / BLOCK_SIZE);
    const gridX = Math.round(playerGroup.position.x / BLOCK_SIZE) + Math.floor(NUM_LANES/2);

    currentScore += (speedZ * 2) * multiplier;
    document.getElementById('score-display').innerText = Math.floor(currentScore);
    document.getElementById('progress-display').innerText = `Prog: ${Math.floor((Math.abs(pZ)/BLOCK_SIZE / TRACK_LENGTH) * 100)}%`;

    if (endBeamMesh && pZ <= endBeamMesh.position.z + 1) { gameWin(); return; }

    let isEndlessMode = (selectedLevelId === 'endless' || selectedLevelId === 'glider');

    if (isEndlessMode) {
        if (gridZFront >= TRACK_LENGTH - 12) {
            triggerWarp(); return;
        }
    } else {
        if (!endBeamMesh && (gridZFront >= TRACK_LENGTH - 2 || gridZBack >= TRACK_LENGTH - 2)) {
            gameWin(); return;
        }
    }

    if (gemTimer > 0) gemTimer--; else { gemCombo = 0; document.getElementById('combo-text').style.display='none'; }
    let pX = playerGroup.position.x, pY = playerGroup.position.y;

    if (dashTimer > 0) {
        const magRadius = 3.5;
        gemsList.forEach(g => {
            if (!g.collected) {
                let dx = pX - g.mesh.position.x, dy = pY - g.mesh.position.y, dz = pZ - g.mesh.position.z;
                let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                if (dist < magRadius) { g.mesh.position.x += dx * 0.15; g.mesh.position.y += dy * 0.15; g.mesh.position.z += dz * 0.15; let scl = 0.5 + (dist / magRadius) * 0.5; g.mesh.scale.set(scl, scl, scl); }
            }
        });
        if (useStamina) {
            foodList.forEach(f => {
                if (!f.collected) {
                    let dx = pX - f.mesh.position.x, dy = pY - f.mesh.position.y, dz = pZ - f.mesh.position.z;
                    let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    if (dist < magRadius) { f.mesh.position.x += dx * 0.15; f.mesh.position.y += dy * 0.15; f.mesh.position.z += dz * 0.15; let scl = 0.5 + (dist / magRadius) * 0.5; f.mesh.scale.set(scl, scl, scl); }
                }
            });
        }
    }

    boostRingsList.forEach(ring => {
        if (!ring.collected && Math.abs(pZ - ring.mesh.position.z) < 1.5 && Math.abs(pX - ring.mesh.position.x) < 2.0 && Math.abs(pY - ring.mesh.position.y) < 2.5) {
            ring.collected = true;
            ring.mesh.visible = false;
            if (speedZ < absoluteMax) { playSound('boost'); spawnSonicRing(ring.mesh.position); }
            speedZ = absoluteMax;
            velocityY = jumpStrength * 0.8;
            dashTimer = 25;

            doubleJumps = 0;
        }
    });

    if (typeof movingObstaclesList !== 'undefined') {
        movingObstaclesList.forEach(obj => {
            if (Math.abs(pZ - obj.mesh.position.z) < 1.0 &&
                Math.abs(pX - obj.mesh.position.x) < 1.0 &&
                Math.abs(pY - obj.mesh.position.y) < 1.0) {
                gameOver("You hit a moving hazard!");
                }
        });
    }

    forceFieldsList.forEach(ff => {
        if (Math.abs(pZ - ff.mesh.position.z) < 0.8 && Math.abs(pX - ff.mesh.position.x) < 0.8) {
            gameOver("You vaporized in a force field!");
        }
    });

    gemsList.forEach(gem => {
        if (!gem.collected && Math.abs(pZ - gem.mesh.position.z) < 1.5 && Math.abs(pX - gem.mesh.position.x) < 1.5 && Math.abs(pY - gem.mesh.position.y) < 2.0) {
            gem.collected = true; gem.mesh.visible = false; gemCombo++; gemTimer = 120; currentScore += 100 * multiplier * gemCombo; playSound('coin', 1.0 + (gemCombo * 0.1)); popScore(gemCombo);
        }
    });

    if (useStamina) {
        foodList.forEach(f => {
            if (!f.collected && Math.abs(pZ - f.mesh.position.z) < 1.5 && Math.abs(pX - f.mesh.position.x) < 1.5 && Math.abs(pY - f.mesh.position.y) < 2.0) {
                f.collected = true; f.mesh.visible = false; stamina = Math.min(100, stamina + 30); playSound('food');
            }
        });
    }

    isGrounded = false; if (coyoteFrames > 0) coyoteFrames--;

    let tileFront = (gridZFront >= 0 && gridZFront < TRACK_LENGTH && gridX >= 0 && gridX < NUM_LANES) ? trackData[gridZFront][gridX] : {f: FLOOR.EMPTY, i: ITEM.NONE};
    let tileBack = (gridZBack >= 0 && gridZBack < TRACK_LENGTH && gridX >= 0 && gridX < NUM_LANES) ? trackData[gridZBack][gridX] : {f: FLOOR.EMPTY, i: ITEM.NONE};

    let floorHFront = -999, floorHBack = -999;
    if (tileFront.f !== FLOOR.EMPTY) floorHFront = (tileFront.f === FLOOR.VHIGH || tileFront.f === FLOOR.VHIGH_ICE || tileFront.f === FLOOR.VHIGH_LAVA) ? 2.5 : ((tileFront.f === FLOOR.HIGH || tileFront.f === FLOOR.HIGH_ICE || tileFront.f === FLOOR.HIGH_LAVA || tileFront.f === FLOOR.HIGH_TUNNEL) ? 1.5 : 0.5);
    if (tileBack.f !== FLOOR.EMPTY) floorHBack = (tileBack.f === FLOOR.VHIGH || tileBack.f === FLOOR.VHIGH_ICE || tileBack.f === FLOOR.VHIGH_LAVA) ? 2.5 : ((tileBack.f === FLOOR.HIGH || tileBack.f === FLOOR.HIGH_ICE || tileBack.f === FLOOR.HIGH_LAVA || tileBack.f === FLOOR.HIGH_TUNNEL) ? 1.5 : 0.5);

    let activeTile = {f: FLOOR.EMPTY, i: ITEM.NONE};
    let floorH = -999;
    if (floorHFront >= floorHBack) { floorH = floorHFront; activeTile = tileFront; }
    else { floorH = floorHBack; activeTile = tileBack; }
    if (pY < -0.5) activeTile = {f: FLOOR.EMPTY, i: ITEM.NONE};

    if (activeTile.f !== FLOOR.EMPTY) {
        let headY = pY + 1.0; let wasAbove = (prevFeetY >= floorH - 0.2);
        let isWall = activeTile.f === FLOOR.HIGH || activeTile.f === FLOOR.HIGH_ICE || activeTile.f === FLOOR.HIGH_LAVA || activeTile.f === FLOOR.HIGH_TUNNEL ||
        activeTile.f === FLOOR.VHIGH || activeTile.f === FLOOR.VHIGH_ICE || activeTile.f === FLOOR.VHIGH_LAVA;

        if (activeTile.f === FLOOR.TUNNEL || activeTile.f === FLOOR.HIGH_TUNNEL) {
            let tunnelBase = (activeTile.f === FLOOR.HIGH_TUNNEL) ? 1.5 : 0.5;
            let roofY = tunnelBase + 2.4;
            if (prevFeetY >= roofY - 0.2) { if (pY <= roofY + 0.1 && velocityY <= 0) return gameOver("You were impaled on tunnel spikes!"); }
            else if (prevFeetY < tunnelBase + 2.0 && headY > tunnelBase + 2.0 && velocityY > 0) { velocityY = -0.1; return gameOver("You crashed into the tunnel ceiling!"); }
        }

        if (activeTile.i === ITEM.SPRING && pY <= floorH + 0.2 && prevFeetY >= floorH - 0.2 && velocityY <= 0) {
            playSound('spring'); velocityY = jumpStrength + 0.15; playerGroup.scale.set(0.6, 1.5, 0.6); coyoteFrames = 0; isGrounded = false; dashTimer = 0; doubleJumps = 0; return;
        }

        if ((activeTile.i === ITEM.BOOST || activeTile.i === ITEM.BOOST_WITH_GEM) && pY <= floorH + 0.5 && prevFeetY >= floorH - 0.2) {
            if (speedZ < absoluteMax) { playSound('boost'); spawnSonicRing(playerGroup.position); }
            speedZ = absoluteMax;
        }

        let hitboxMargin = (currentDiff === DIFFICULTIES.easy) ? 1.2 : 1.5;

        // Wall Collision
        if (!wasAbove && isWall && pY < floorH - 0.2) {
            let laneCenter = (gridX - Math.floor(NUM_LANES/2)) * BLOCK_SIZE;
            if (Math.abs(pX - laneCenter) < 0.7) {
                return gameOver("You smashed into a wall!");
            } else {
                playerGroup.position.x += (pX > laneCenter) ? 0.15 : -0.15;
                speedZ = Math.max(minSpeed, speedZ * 0.9);
            }
        }

        // Obstacle Collision
        if (activeTile.i === ITEM.OBSTACLE && headY < floorH + hitboxMargin) {
            let laneCenter = (gridX - Math.floor(NUM_LANES/2)) * BLOCK_SIZE;
            if (Math.abs(pX - laneCenter) < 0.6) {
                return gameOver("You crashed into an obstacle!");
            } else {
                playerGroup.position.x += (pX > laneCenter) ? 0.15 : -0.15;
                speedZ = Math.max(minSpeed, speedZ * 0.9);
            }
        }

        // Floor landing mechanics
        if (pY <= floorH + 0.1 && velocityY <= 0 && wasAbove) {
            playerGroup.position.y = floorH; isGrounded = true; coyoteFrames = 8; dashTimer = 0; doubleJumps = 0; velocityY = 0;
            if (activeTile.f === FLOOR.LAVA || activeTile.f === FLOOR.HIGH_LAVA || activeTile.f === FLOOR.VHIGH_LAVA) return gameOver("You hit a deadly trap!");
            else if (activeTile.i === ITEM.SLOW) speedZ = Math.max(minSpeed, speedZ * 0.85);
        }
    }

    if (playerGroup.position.y < -10) gameOver("You fell into the abyss!");
    else if (!isGrounded && velocityY < -0.3) {
        paws.forEach((p, i) => { p.rotation.x = Math.sin(Date.now() * 0.05 + i) * 1.5; p.rotation.z = Math.cos(Date.now() * 0.05 + i) * 0.5; });
        playerGroup.userData.head.rotation.x = -0.5;
    } else {
        paws.forEach(p => { p.rotation.x = 0; p.rotation.z = 0; });
        playerGroup.userData.head.rotation.x = 0;
    }

    if (playerGroup.position.y >= 0.5) {
        let cTile = (gridZ < TRACK_LENGTH && gridX >= 0 && gridX < NUM_LANES) ? trackData[gridZ][gridX] : {f: FLOOR.EMPTY, i: ITEM.NONE};
        let shdwBase = 0.51;
        if (cTile.f === FLOOR.HIGH || cTile.f === FLOOR.HIGH_ICE || cTile.f === FLOOR.HIGH_LAVA || cTile.f === FLOOR.HIGH_TUNNEL) shdwBase = 1.51;
        if (cTile.f === FLOOR.VHIGH || cTile.f === FLOOR.VHIGH_ICE || cTile.f === FLOOR.VHIGH_LAVA) shdwBase = 2.51;

        if (cTile.f !== FLOOR.EMPTY && playerGroup.position.y >= shdwBase - 0.1) {
            foxShadow.visible = true; foxShadow.position.set(playerGroup.position.x, shdwBase, playerGroup.position.z);
            let diff = playerGroup.position.y - shdwBase; foxShadow.material.opacity = Math.max(0, 0.6 - diff * 0.15); let scaleBase = Math.max(0.1, 1.0 - diff * 0.2); foxShadow.scale.set(scaleBase, scaleBase, scaleBase);
        } else foxShadow.visible = false;
    } else foxShadow.visible = false;
}

function updateEffects() {
    if (!isPlaying && !isDead) logoGroup.rotation.y += 0.01;
    if (portalMesh) portalMesh.rotation.z += 0.02;

    // --- 1. GLOBAL ATMOSPHERE (snow, sandstorm, stars etc) ---
    let atmos = scene.getObjectByName("atmosphere");
    if (atmos) {
        const pos = atmos.geometry.attributes.position.array;
        let tId = atmos.userData.themeId;

        // Use a fixed bounding box relative to player
        let cx = playerGroup.position.x;
        let cz = playerGroup.position.z;

        // Box Dimensions
        const rangeZ = 120; // 60 in front, 60 behind
        const rangeX = 100;

        for(let i=0; i<pos.length; i+=3) {
            // Animation
            if (tId === 'mountain') {
                pos[i+1] -= 0.15;
                pos[i] += Math.sin(Date.now()*0.001 + i)*0.02;
            } else if (tId === 'canyon') {
                pos[i] -= 0.08;
                pos[i+1] += (Math.random()-0.5)*0.01;
            }

            // --- BOX WRAPPING LOGIC ---

            // Z-Axis: If behind player, wrap to front. If too far ahead, wrap behind.
            // This ensures the box travels WITH the player.
            let dz = pos[i+2] - cz;
            if (dz > rangeZ/2) pos[i+2] -= rangeZ;
            if (dz < -rangeZ/2) pos[i+2] += rangeZ;

            // X-Axis: Keep centered laterally
            let dx = pos[i] - cx;
            if (dx > rangeX/2) pos[i] -= rangeX;
            if (dx < -rangeX/2) pos[i] += rangeX;

            // Y-Axis: Reset height if it hits floor
            if (pos[i+1] < -5) pos[i+1] = 60;
        }
        atmos.geometry.attributes.position.needsUpdate = true;
    }

    // --- 2. ROTATE RINGS ---
    boostRingsList.forEach(r => {
        if (!r.collected) r.mesh.rotation.z -= 0.05;
    });

        // --- 3. ANIMATE MOVING OBSTACLES ---
        if (typeof movingObstaclesList !== 'undefined') {
            movingObstaclesList.forEach(obj => {
                if (obj.moveType === 'vertical') {
                    obj.mesh.position.y = obj.baseY + Math.sin(Date.now() * 0.003 + obj.offset) * 2.5;
                } else {
                    obj.mesh.position.x = obj.baseX + Math.sin(Date.now() * 0.002 + obj.offset) * 3.0;
                }
                obj.mesh.rotation.x += 0.02;
                obj.mesh.rotation.y += 0.02;
            });
        }

        forceFieldsList.forEach(ff => {
            ff.ffMat.opacity = 0.3 + Math.abs(Math.sin(Date.now() * 0.01 + ff.mesh.position.z)) * 0.4;
        });

        gemsList.forEach(g => { if (!g.collected) { g.mesh.rotation.y += 0.02; g.mesh.position.y = g.baseY + Math.sin(Date.now()*0.005 + g.mesh.position.z)*0.25; } });
        foodList.forEach(f => { if (!f.collected) { f.mesh.rotation.y -= 0.02; f.mesh.position.y = f.baseY + Math.sin(Date.now()*0.005 + f.mesh.position.z)*0.25; } });

        for (let i = sonicRings.length - 1; i >= 0; i--) {
            let r = sonicRings[i]; r.scale.addScalar(0.2); r.material.opacity -= 0.05;
            if (r.material.opacity <= 0) { scene.remove(r); sonicRings.splice(i, 1); }
        }

        boostChevrons.forEach(chev => {
            chev.position.z += 0.06;
            if (chev.position.z > 0.8) chev.position.z -= 1.6;
        });

            particleSystems.forEach(p => {
                if (Math.abs(p.obj.position.z - (isPlaying || isDead ? playerGroup.position.z : 0)) > 40) return;
                if (p.type.includes('lava')) {
                    p.obj.position.y += p.speed;
                    const mat = p.obj.children[0].material;
                    mat.opacity -= 0.015;
                    if (mat.opacity <= 0) { p.obj.position.y -= 1.0; mat.opacity = 1.0; }
                } else if (p.type === 'slow') { p.obj.rotation.y += p.speed; }
            });

            if (isDead) {
                foxVoxels.forEach(v => {
                    v.vy -= gravity * 0.8; v.mesh.position.x += v.vx; v.mesh.position.y += v.vy; v.mesh.position.z += v.vz;
                    v.mesh.rotation.x += v.vx; v.mesh.rotation.y += v.vy;
                    if(v.mesh.position.y < 0.2) { v.mesh.position.y = 0.2; v.vy *= -0.5; v.vx *= 0.8; v.vz *= 0.8; }
                });
            }

            if (isPlaying || isDead) {
                if (dashTimer > 0 && dashTimer % 4 === 0 && isPlaying) {
                    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
                    const ghost = new THREE.Group();
                    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.2), ghostMat);
                    body.position.copy(playerGroup.userData.body.position); body.rotation.copy(playerGroup.userData.body.rotation);
                    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), ghostMat);
                    head.position.copy(playerGroup.userData.head.position); head.rotation.copy(playerGroup.userData.head.rotation);
                    ghost.add(body, head); ghost.position.copy(playerGroup.position); ghost.rotation.copy(playerGroup.rotation); ghost.scale.copy(playerGroup.scale);
                    scene.add(ghost); ghostTrails.push(ghost);
                }
                for(let i = ghostTrails.length - 1; i >= 0; i--) {
                    let g = ghostTrails[i];
                    g.children.forEach(c => c.material.opacity -= 0.05); g.scale.addScalar(0.02);
                    if (g.children[0].material.opacity <= 0) { scene.remove(g); ghostTrails.splice(i, 1); }
                }

                const dPos = foxDustParticles.geometry.attributes.position.array, tPos = tailParticles.geometry.attributes.position.array;
                if (isPlaying && isGrounded && speedZ > 0.3) {
                    for(let i=0; i<2; i++) {
                        dPos[dustIdx*3] = playerGroup.position.x + (Math.random()-0.5)*0.6; dPos[dustIdx*3+1] = playerGroup.position.y; dPos[dustIdx*3+2] = playerGroup.position.z + 0.4;
                        dustIdx = (dustIdx + 1) % PARTICLE_COUNT;
                    }
                }
                if (isPlaying && (!isGrounded || isGliding || dashTimer > 0)) {
                    tPos[tailIdx*3] = playerGroup.position.x + (Math.random()-0.5)*0.2; tPos[tailIdx*3+1] = playerGroup.position.y + 0.3; tPos[tailIdx*3+2] = playerGroup.position.z + 1.0;
                    if (speedZ > maxSpeed + 0.05) {
                        let rgb = new THREE.Color().setHSL((Date.now() % 1000) / 1000, 1, 0.5);
                        tailParticles.material.color.copy(rgb);
                    } else {
                        tailParticles.material.color.setHex(0xFF4500);
                    }
                    tailIdx = (tailIdx + 1) % PARTICLE_COUNT;
                }
                for(let i=0; i<PARTICLE_COUNT; i++) {
                    if (dPos[i*3] !== 9999) { dPos[i*3+1] += 0.02; dPos[i*3+2] += 0.05; if (dPos[i*3+2] > playerGroup.position.z + 15) dPos[i*3] = 9999; }
                    if (tPos[i*3] !== 9999) { tPos[i*3+1] -= 0.01; tPos[i*3+2] += 0.05; if (tPos[i*3+2] > playerGroup.position.z + 15) tPos[i*3] = 9999; }
                }
                foxDustParticles.geometry.attributes.position.needsUpdate = true; tailParticles.geometry.attributes.position.needsUpdate = true;

                let showLines = (((speedZ - minSpeed) / (maxSpeed - minSpeed)) > 0.7 || isGliding) && isPlaying;
                speedLines.visible = showLines;
                if (showLines) {
                    speedLines.children.forEach(line => {
                        line.position.z += speedZ * 2;
                        if (line.position.z > playerGroup.position.z + 5) line.position.z = playerGroup.position.z - 30 - Math.random()*20;
                        line.position.x = playerGroup.position.x + Math.cos(line.userData.angle) * line.userData.radius;
                        line.position.y = playerGroup.position.y + Math.sin(line.userData.angle) * line.userData.radius;
                        if (speedZ > maxSpeed + 0.05) {
                            line.material.color.setHSL((Date.now() % 2000) / 2000, 1, 0.5);
                        } else {
                            line.material.color.setHex(0xffffff);
                        }
                    });
                }
            }
}

function updateCamera() {
    if (!isPlaying && !isDead) {
        if (cameraShake > 0) { camera.position.x = (Math.random()-0.5)*cameraShake; camera.position.y = 6 + (Math.random()-0.5)*cameraShake; cameraShake *= 0.9; if (cameraShake < 0.01) cameraShake = 0; }
        return;
    }

    // Milder FOV warp when dash triggers
    const targetFov = 70 + ((speedZ - minSpeed) / (maxSpeed - minSpeed)) * 30 + (dashTimer > 0 ? 5 : 0);
    camera.fov += (targetFov - camera.fov) * 0.1; camera.updateProjectionMatrix();

    // Camera Look-ahead Logic
    let turnOffset = (keys.ArrowLeft ? 2 : 0) + (keys.ArrowRight ? -2 : 0);
    if (gyroActive) turnOffset += gyroTilt * 4;

    let targetX = playerGroup.position.x * 0.6 + turnOffset;
    let targetY = Math.max(4.0, playerGroup.position.y + 3.0);
    let targetZ = playerGroup.position.z + 8.5;

    // Slow pan down on death while maintaining forward momentum briefly
    if (isDead) { speedZ *= 0.95; targetZ = playerGroup.position.z + 10; targetY = Math.max(4.0, playerGroup.position.y + 4.0); targetX = playerGroup.position.x * 0.6;}

    if (cameraShake > 0) { targetX += (Math.random()-0.5)*cameraShake; targetY += (Math.random()-0.5)*cameraShake; cameraShake *= 0.9; if (cameraShake < 0.01) cameraShake = 0; }

    // Dynamic Camera Banking
    let targetBank = (keys.ArrowLeft ? 0.15 : 0) + (keys.ArrowRight ? -0.15 : 0);
    if (gyroActive) targetBank -= gyroTilt * 0.3;

    let currentUp = camera.up.clone();
    let targetUp = new THREE.Vector3(Math.sin(targetBank), Math.cos(targetBank), 0).normalize();
    currentUp.lerp(targetUp, 0.1);
    camera.up.copy(currentUp);

    camera.position.x += (targetX - camera.position.x) * 0.1; camera.position.y += (targetY - camera.position.y) * 0.1; camera.position.z = targetZ;
    camera.lookAt(playerGroup.position.x, playerGroup.position.y - 1, playerGroup.position.z - 15);
}

function animate(currentTime) {
    animationId = requestAnimationFrame(animate);
    if (isPaused) { lastTime = currentTime; return; }

    if (!lastTime) lastTime = currentTime;
    let dt = currentTime - lastTime;
    lastTime = currentTime;

    if (dt > 250) dt = 250;

    // Time Dilation when dead (Slow Motion Death!)
    let timeScale = isDead ? 0.3 : 1.0;

    accumulator += dt * timeScale;

    while (accumulator >= TIME_STEP) {
        if (isPlaying) {
            updatePhysics();
        }
        updateEffects();
        updateCamera();
        accumulator -= TIME_STEP;
    }

    renderer.render(scene, camera);
}

function onWindowResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
init();
