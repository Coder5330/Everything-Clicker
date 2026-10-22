const btn = document.getElementById("click-btn");
const countText = document.getElementById("count");
const clickText = document.getElementById("click-str");
const autoText = document.getElementById("auto-str");
const upgradesContainer = document.getElementById("upgrade-area");
const rebirth_area = document.getElementById("rebirth");
let rebirth_btn = null;
const glowContainer = document.getElementById('screen-glow');

const BOOST_MULTIPLIER = 7;
const BOOST_DURATION = 60;
const SPAWN_MIN = 300;
const SPAWN_MAX = 900;
const PARALLELOGRAM_SIZE = 80;
const PARALLELOGRAM_LIFETIME = 8000;
const RAIN_FONT_SIZE = 16;
const CRYPTO_UPGRADE_NAME = "Crypto Mining Software";
const PARALLELOGRAM_UPGRADE_NAME = "I am a Parallelogram";
const suffix = [
  "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", 
  "Dc", "UDc", "DDc", "TDc", "QaDc", "QiDc", "SxDc", "SpDc", "OcDc", "NoDc", 
  "Vg", "UVg", "DVg", "TVg", "QaVg", "QiVg", "SxVg", "SpVg", "OcVg", "NoVg", 
  "Tg", "UTg", "DTg", "TTg", "QaTg", "QiTg", "SxTg", "SpTg", "OcTg", "NoTg", 
  "Qd", "UQd", "DQd", "TQd", "QaQd", "QiQd", "SxQd", "SpQd", "OcQd", "NoQd", 
  "Qn", "UQn", "DQn", "TQn", "QaQn", "QiQn", "SxQn", "SpQn", "OcQn", "NoQn", 
  "SxG", "USxG", "DSxG", "TSxG", "QaSxG", "QiSxG", "SxSxG", "SpSxG", "OcSxG", "NoSxG", 
  "SpG", "USpG", "DSpG", "TSpG", "QaSpG", "QiSpG", "SxSpG", "SpSpG", "OcSpG", "NoSpG", 
  "Og", "UOg", "DOg", "TOg", "QaOg", "QiOg", "SxOg", "SpOg", "OcOg", "NoOg", 
  "Nn", "UNn", "DNn", "TNn", "QaNn", "QiNn", "SxNn", "SpNn", "OcNn", "NoNn", 
  "Ct"
];

let intensity = 40;
let growing = true;
let count = 0;
let inc = 1;
let autoadd = 0;
let data = [];
let timer = randint(SPAWN_MIN, SPAWN_MAX);
let boost = false;
let boostEnd = 0;
let parallelograms = [];
let parallelogramsOn = false;
let lastFrame = performance.now();
let lastSave = 0;

const parallelogramImage = new Image();
parallelogramImage.src = "parallelogram.png";

const buffArea = document.createElement("div");
buffArea.id = "buff-area";
document.body.appendChild(buffArea);

let boostChip = null;
let boostTimeEl = null;
let boostBarEl = null;

const rainCanvas = document.createElement("canvas");
rainCanvas.id = "crypto-rain";
document.body.appendChild(rainCanvas);
const rainCtx = rainCanvas.getContext("2d");

let rainDrops = [];
let rainLastRow = [];
let rainWasActive = false;

function format(n) {
	n = Number(n);
	if (!Number.isFinite(n)) return n > 0 ? "∞" : "0";
	if (n < 0) return "-" + format(-n);

	if (n < 1000) {
		return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
	}

	let tier = Math.floor(Math.log10(n) / 3);
	tier = Math.min(tier, suffix.length);

	let scaled = n / Math.pow(10, tier * 3);

	if (scaled >= 1000 && tier < suffix.length) {
		tier++;
		scaled = n / Math.pow(10, tier * 3);
	} else if (scaled < 1) {
		tier--;
		scaled = n / Math.pow(10, tier * 3);
	}

	const truncated = Math.floor(scaled * 100) / 100;

	return parseFloat(truncated.toFixed(2)) + suffix[tier - 1];
}

const formatter = { format };

function randint(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBoostMultiplier() {
	return boost ? BOOST_MULTIPLIER : 1;
}

function currentCost(item) {
	return Math.floor(item.cost * Math.pow(item.multiplier || 1, item.purchased));
}

function pulseGlow() {
	if (growing) {
		intensity += 1;
		if (intensity >= 80) growing = false;
	} else {
		intensity -= 1;
		if (intensity <= 30) growing = true;
	}

	glowContainer.style.boxShadow = `
		inset 0 0 ${intensity * 2}px rgba(255, 225, 60, 0.75),
		inset 0 0 ${intensity * 4}px rgba(255, 190, 0, 0.35),
		0 0 ${intensity * 3}px rgba(255, 215, 0, 0.6)
	`;

	requestAnimationFrame(pulseGlow);
}

async function loadGameData() {
	try {
		const response = await fetch('./upgrades.json');
		return await response.json();
	}
	catch (error) {
		console.error("Error loading file:", error);
	}
}

function saveCount() {
	localStorage.setItem('gameCount', count);
}

function saveProgress() {
	const purchased = {};
	for (const item of data) {
		purchased[item.upgrade] = item.purchased;
	}
	localStorage.setItem('purchased', JSON.stringify(purchased));
	saveCount();
}

function loadPurchased() {
	try {
		const saved = JSON.parse(localStorage.getItem('purchased'));
		if (saved) return saved;

		const old = JSON.parse(localStorage.getItem('gamedata'));
		if (old) {
			const migrated = {};
			for (const item of old) migrated[item.upgrade] = item.purchased || 0;
			return migrated;
		}
	}
	catch (error) {
		console.error("Error reading save:", error);
	}
	return {};
}

function loadCount() {
	const savedCount = parseFloat(localStorage.getItem('gameCount'));
	return Number.isFinite(savedCount) ? savedCount : 0;
}

function recalcStats() {
	inc = 1;
	autoadd = 0;
	for (const item of data) {
		inc += item.purchased * (item.ClickIncrease || 0);
		autoadd += item.purchased * (item.PerSecIncrease || 0);
	}
	const para = data.find(i => i.upgrade === PARALLELOGRAM_UPGRADE_NAME);
	parallelogramsOn = !!para && para.purchased > 0;
}

function showBoostChip() {
	if (boostChip) return;
	boostChip = document.createElement("div");
	boostChip.className = "buff-chip";

	const name = document.createElement("span");
	name.className = "buff-name";
	name.textContent = "x" + BOOST_MULTIPLIER + " Boost";

	boostTimeEl = document.createElement("span");
	boostTimeEl.className = "buff-time";

	boostBarEl = document.createElement("div");
	boostBarEl.className = "buff-bar";

	boostChip.append(name, boostTimeEl, boostBarEl);
	buffArea.appendChild(boostChip);
}

function hideBoostChip() {
	if (!boostChip) return;
	boostChip.remove();
	boostChip = null;
	boostTimeEl = null;
	boostBarEl = null;
}

function updateBuffs(now) {
	if (boost && now >= boostEnd) {
		boost = false;
		hideBoostChip();
		return;
	}
	if (!boost) return;

	const remainingMs = boostEnd - now;
	const secs = Math.ceil(remainingMs / 1000);
	boostTimeEl.textContent = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
	boostBarEl.style.transform = "scaleX(" + (remainingMs / (BOOST_DURATION * 1000)) + ")";
	boostChip.classList.toggle("ending", secs <= 10);
}

function activateBoost() {
	boost = true;
	boostEnd = performance.now() + BOOST_DURATION * 1000;
	showBoostChip();
}

function removeParallelogram(el, animClass) {
	const index = parallelograms.indexOf(el);
	if (index === -1) return;
	parallelograms.splice(index, 1);

	el.style.pointerEvents = "none";
	if (animClass) {
		el.classList.remove("para-expiring");
		el.classList.add(animClass);
		setTimeout(() => el.remove(), 500);
	} else {
		el.remove();
	}
}

function burstSparkles(x, y) {
	const sparkCount = 12;
	for (let i = 0; i < sparkCount; i++) {
		const spark = document.createElement("div");
		spark.className = "para-spark";
		const angle = (i / sparkCount) * Math.PI * 2;
		const dist = randint(50, 110);
		spark.style.left = x + "px";
		spark.style.top = y + "px";
		spark.style.setProperty("--dx", Math.cos(angle) * dist + "px");
		spark.style.setProperty("--dy", Math.sin(angle) * dist + "px");
		document.body.appendChild(spark);
		setTimeout(() => spark.remove(), 650);
	}
}

function spawnParallelogram() {
	const el = parallelogramImage.cloneNode();
	el.alt = "Click for boost";
	el.draggable = false;
	el.className = "para";
	el.style.position = "fixed";
	el.style.width = PARALLELOGRAM_SIZE + "px";
	el.style.left = randint(0, Math.max(0, window.innerWidth - PARALLELOGRAM_SIZE)) + "px";
	el.style.top = randint(0, Math.max(0, window.innerHeight - PARALLELOGRAM_SIZE)) + "px";
	el.style.cursor = "pointer";
	el.style.zIndex = "1000";
	el.style.userSelect = "none";

	el.addEventListener("click", () => {
		if (!parallelograms.includes(el)) return;
		const rect = el.getBoundingClientRect();
		burstSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2);
		activateBoost();
		removeParallelogram(el, "para-pop");
	});

	document.body.appendChild(el);
	parallelograms.push(el);

	setTimeout(() => el.classList.add("para-expiring"), PARALLELOGRAM_LIFETIME - 2000);
	setTimeout(() => removeParallelogram(el, "para-fade"), PARALLELOGRAM_LIFETIME - 500);
}

function updateBoost() {
	if (parallelogramsOn) {
		timer--;
		if (timer <= 0) {
			timer = randint(SPAWN_MIN, SPAWN_MAX);
			spawnParallelogram();
		}
	}
}

function resizeRain() {
	rainCanvas.width = window.innerWidth;
	rainCanvas.height = window.innerHeight;
	const columns = Math.floor(rainCanvas.width / RAIN_FONT_SIZE);
	rainDrops = Array.from({ length: columns }, () => Math.random() * -40);
	rainLastRow = new Array(columns).fill(-1);
}

function getCryptoLevel() {
	if (!Array.isArray(data)) return 0;
	const item = data.find(i => i.upgrade === CRYPTO_UPGRADE_NAME);
	return item ? item.purchased / item.buycap : 0;
}

function drawRain(dt) {
	const level = getCryptoLevel();

	if (level <= 0) {
		if (rainWasActive) {
			rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
			rainWasActive = false;
		}
		return;
	}
	rainWasActive = true;

	rainCtx.globalCompositeOperation = "destination-out";
	rainCtx.fillStyle = "rgba(0, 0, 0, 0.12)";
	rainCtx.fillRect(0, 0, rainCanvas.width, rainCanvas.height);
	rainCtx.globalCompositeOperation = "source-over";

	rainCtx.font = RAIN_FONT_SIZE + "px monospace";

	const density = 0.1 + level * 0.9;
	const speed = (6 + level * 22) * Math.min(dt, 0.1);

	for (let i = 0; i < rainDrops.length; i++) {
		if (((i * 7919) % 100) / 100 > density) continue;

		rainDrops[i] += speed * (0.6 + ((i * 31) % 10) / 12);
		const row = Math.floor(rainDrops[i]);

		if (row >= 0 && row !== rainLastRow[i]) {
			rainLastRow[i] = row;
			const x = i * RAIN_FONT_SIZE;
			const y = row * RAIN_FONT_SIZE;

			rainCtx.fillStyle = "#d8ffe0";
			rainCtx.fillText(Math.random() < 0.5 ? "0" : "1", x, y);
			rainCtx.fillStyle = "#00ff55";
			rainCtx.fillText(Math.random() < 0.5 ? "0" : "1", x, y - RAIN_FONT_SIZE);
		}

		if (row * RAIN_FONT_SIZE > rainCanvas.height && Math.random() > 0.96) {
			rainDrops[i] = Math.random() * -20;
			rainLastRow[i] = -1;
		}
	}
}

function refreshUpgradeButtons() {
	for (const item of data) {
		if (!item.btn) continue;

		let text, disabled;
		if (item.purchased >= item.buycap) {
			text = "MAXED (" + item.purchased + ")";
			disabled = true;
		} else {
			const price = currentCost(item);
			text = "$" + formatter.format(price)
				+ " (" + item.purchased + "/" + item.buycap + ")";
			disabled = count < price;
		}

		if (item.btn.textContent !== text) item.btn.textContent = text;
		if (item.btn.disabled !== disabled) item.btn.disabled = disabled;
	}
}

function addMoney(amount) {
	count += amount * getBoostMultiplier();
	saveCount();
	render();
}

function update() {
	updateBoost();
}

function gameLoop(now) {
	const dt = (now - lastFrame) / 1000;
	lastFrame = now;

	updateBuffs(now);

	if (autoadd > 0) {
		count += autoadd * getBoostMultiplier() * dt;
	}

	drawRain(dt);
	render();

	glowContainer.style.display = boost ? "block" : "none";

	if (now - lastSave > 1000) {
		saveCount();
		lastSave = now;
	}

	requestAnimationFrame(gameLoop);
}

function upgrade(i) {
	const item = data[i];
	const price = currentCost(item);

	if (item.purchased >= item.buycap) {
		alert(item.buylimitmsg);
		return;
	}
	if (count < price) {
		alert("You don't have enough money");
		return;
	}

	count -= price;
	item.purchased++;

	saveProgress();
	recalcStats();
	render();
}

function makeUpgradeButtons() {
	upgradesContainer.innerHTML = '';

	data.forEach((item, i) => {
		const upgradeBox = document.createElement("div");
		upgradeBox.className = "upgrades";

		const info = document.createElement("span");
		info.textContent = item.upgrade;
		info.className = "upgrade-name";

		const newBtn = document.createElement("button");
		newBtn.className = "upgrade-btn";
		newBtn.title = item.description;
		newBtn.onclick = () => upgrade(i);

		item.btn = newBtn;

		upgradeBox.appendChild(info);
		upgradeBox.appendChild(newBtn);
		upgradesContainer.appendChild(upgradeBox);
	});

	refreshUpgradeButtons();
}

function render() {
	const boostMultiplier = getBoostMultiplier();
	countText.textContent = "$" + formatter.format(Math.floor(count));
	clickText.textContent = formatter.format(inc * boostMultiplier);
	autoText.textContent = formatter.format(autoadd * boostMultiplier);
	clickText.classList.toggle("boosted", boost);
	autoText.classList.toggle("boosted", boost);
	refreshUpgradeButtons();
	rebirth_render();
}

async function runGame() {
	const loaded = await loadGameData();
	if (!loaded) return;
	data = loaded;

	count = loadCount();

	const purchased = loadPurchased();
	for (const item of data) {
		item.purchased = purchased[item.upgrade] || 0;
	}

	localStorage.removeItem('gamedata');
	localStorage.removeItem('gameDataHasCached');

	saveProgress();
	recalcStats();
	makeUpgradeButtons();
	render();
}

function rebirth_render() {
	if (!rebirth_btn) {
		rebirth_btn = document.createElement("button");
		rebirth_btn.textContent = "Rebirth";
		rebirth_btn.title = "Would you like to rebirth?";
		rebirth_btn.classList.add("rebirth-btn");
		rebirth_btn.addEventListener("click", rebirth_logic);
		rebirth_area.appendChild(rebirth_btn);
		void rebirth_btn.offsetWidth;
	}

	const canRebirth = count >= 1e10;
	rebirth_btn.classList.toggle("visible", canRebirth);
	rebirth_btn.disabled = !canRebirth;
}

function rebirth_logic(event) {
	if (count >= 1e10) {
		window.location.href = "i.html";
	}
}

function cheat() {
	for (const item of data) {
		item.purchased = item.buycap;
	}
	count = 1e100;

	saveProgress();
	recalcStats();
	render();
}

window.addEventListener("resize", resizeRain);
resizeRain();

btn.addEventListener("click", () => addMoney(inc));
setInterval(update, 1000);
runGame();
pulseGlow();
requestAnimationFrame(gameLoop);
