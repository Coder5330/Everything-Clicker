const btn = document.getElementById("click-btn");
const countText = document.getElementById("count");
const clickText = document.getElementById("click-str");
const autoText = document.getElementById("auto-str");
const upgradesContainer = document.getElementById("upgrade-area");

const BOOST_MULTIPLIER = 7;
const BOOST_DURATION = 60;

let count = 0; 
let inc = 1;
let autoadd = 0;
let data = [];
let timer = randint(300, 900);
let boost = false;
let boostTimer = BOOST_DURATION;
let parallelograms = [];
let parallelogramsOn = false;

const parallelogramImage = new Image();
parallelogramImage.src = "parallelogram.png";

function randint(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMultiplier() {
	return boost ? BOOST_MULTIPLIER : 1;
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
	const savedCount = parseInt(localStorage.getItem('gameCount'), 10);
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

function updateBoost() {
	if (!parallelogramsOn) return;

	timer--;
	if (timer <= 0) {
		timer = randint(300, 900);
		boost = true;
	}

	if (boost) {
		boostTimer--;
		if (boostTimer <= 0) {
			boost = false;
			boostTimer = BOOST_DURATION;
		}
	}
}

function addMoney(amount) {
	count += amount * getMultiplier();
	saveCount();
	render();
}

function update() {
	addMoney(autoadd);
	updateBoost();
}

function upgrade(i) {
	const item = data[i];

	if (count < item.cost) {
		alert("You don't have enough money");
		return;
	}
	if (item.purchased >= item.buycap) {
		alert(item.buylimitmsg);
		return;
	}

	if (item.upgrade == "I am a Parallelogram") {
		parallelogramsOn = true;
	}

	count -= item.cost;
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
		newBtn.textContent = "Cost:$" + item.cost;
		newBtn.title = item.description;
		newBtn.className = "upgrade-btn";
		newBtn.onclick = () => upgrade(i);

		upgradeBox.appendChild(info);
		upgradeBox.appendChild(newBtn);
		upgradesContainer.appendChild(upgradeBox);
	});
}

function render() {
	const multiplier = getMultiplier();
	countText.textContent = "$" + count;
	clickText.textContent = inc * multiplier;
	autoText.textContent = autoadd * multiplier;
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
	render();
	makeUpgradeButtons();
}

btn.addEventListener("click", () => addMoney(inc));
setInterval(update, 1000);
runGame();
