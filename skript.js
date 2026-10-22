const btn = document.getElementById("click-btn");
const countText = document.getElementById("count");
const clickText = document.getElementById("click-str");
const autoText = document.getElementById("auto-str");
const upgradesContainer = document.getElementById("upgrade-area");
const glowContainer = document.getElementById('screen-glow');

const BOOST_MULTIPLIER = 7;
const BOOST_DURATION = 60;
const SPAWN_MIN = 30;
const SPAWN_MAX = 90;
const PARALLELOGRAM_SIZE = 80;
const PARALLELOGRAM_LIFETIME = 8000;
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
let boostTimer = BOOST_DURATION;
let parallelograms = [];
let parallelogramsOn = true;
let lastFrame = performance.now();
let lastSave = 0;

const parallelogramImage = new Image();
parallelogramImage.src = "parallelogram.png";

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
}

function activateBoost() {
	boost = true;
	boostTimer = BOOST_DURATION;
	render();
}

function removeParallelogram(el) {
	const index = parallelograms.indexOf(el);
	if (index !== -1) parallelograms.splice(index, 1);
	el.remove();
}

function spawnParallelogram() {
	const el = parallelogramImage.cloneNode();
	el.alt = "Click for boost";
	el.draggable = false;
	el.style.position = "fixed";
	el.style.width = PARALLELOGRAM_SIZE + "px";
	el.style.left = randint(0, Math.max(0, window.innerWidth - PARALLELOGRAM_SIZE)) + "px";
	el.style.top = randint(0, Math.max(0, window.innerHeight - PARALLELOGRAM_SIZE)) + "px";
	el.style.cursor = "pointer";
	el.style.zIndex = "1000";
	el.style.userSelect = "none";

	el.addEventListener("click", () => {
		activateBoost();
		removeParallelogram(el);
	});

	document.body.appendChild(el);
	parallelograms.push(el);

	setTimeout(() => removeParallelogram(el), PARALLELOGRAM_LIFETIME);
}

function updateBoost() {
	if (parallelogramsOn) {
		timer--;
		if (timer <= 0) {
			timer = randint(SPAWN_MIN, SPAWN_MAX);
			spawnParallelogram();
		}
	}

	if (boost) {
		boostTimer--;
		if (boostTimer <= 0) {
			boost = false;
			boostTimer = BOOST_DURATION;
			render();
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

	if (autoadd > 0) {
		count += autoadd * getBoostMultiplier() * dt;
	}

	render();
	
	if (boost) {
		glowContainer.style.display = "block";
	} else {
		glowContainer.style.display = "none";
	}

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
	refreshUpgradeButtons();
}

async function runGame() {
	data = await loadGameData();
	if (!data) return;

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

btn.addEventListener("click", () => addMoney(inc));
setInterval(update, 1000);
runGame();
pulseGlow();
requestAnimationFrame(gameLoop);
