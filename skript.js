let count = 0;
const btn = document.getElementById("click-btn");
const txt1 = document.getElementById("count");
const txt2 = document.getElementById("click-str");
const txt3 = document.getElementById("auto-str");
const upgradesContainer = document.getElementById("upgrade-area");
let inc = 1;
let autoadd = 0;
let data = [];

async function loadgamedata() {
	try {
		const response = await fetch('./upgrades.json');
		return await response.json();
	}
	catch (error) {
		console.error("Error loading file:", error);
	}
}

function currentCost(item) {
	return Math.floor(item.cost * Math.pow(item.multiplier || 1, item.purchased));
}

function saveProgress() {
	const purchased = {};
	for (const item of data) {
		purchased[item.upgrade] = item.purchased;
	}
	localStorage.setItem('purchased', JSON.stringify(purchased));
	localStorage.setItem('gameCount', count);
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

async function rungame() {
	data = await loadgamedata();
	if (!data) return;

	const savedCount = parseInt(localStorage.getItem('gameCount'), 10);
	count = Number.isFinite(savedCount) ? savedCount : 0;

	const purchased = loadPurchased();
	for (const item of data) {
		item.purchased = purchased[item.upgrade] || 0;
	}

	localStorage.removeItem('gamedata');
	localStorage.removeItem('gameDataHasCached');

	saveProgress();
	check_upgrades();
	makeUpgradeButtons();
}

function increase(event) {
	count += inc;
	localStorage.setItem('gameCount', count);
	render();
}

function autoinc() {
	count += autoadd;
	localStorage.setItem('gameCount', count);
	render();
}

function render() {
	txt1.textContent = "$" + count;
	txt2.textContent = inc;
	txt3.textContent = autoadd;
	refreshUpgradeButtons();
}

function check_upgrades() {
	inc = 1;
	autoadd = 0;
	for (let i = 0; i < data.length; i++) {
		inc += data[i]["purchased"] * (data[i]["ClickIncrease"] || 0);
		autoadd += data[i]["purchased"] * (data[i]["PerSecIncrease"] || 0);
	}
	render();
}

function makeUpgradeButtons() {
	upgradesContainer.innerHTML = '';

	for (let i = 0; i < data.length; i++) {
		const upgradeBox = document.createElement("div");
		upgradeBox.className = "upgrades";

		const info = document.createElement("span");
		info.textContent = data[i]["upgrade"];
		info.className = "upgrade-name";

		const newBtn = document.createElement("button");
		newBtn.className = "upgrade-btn";
		newBtn.title = data[i]["description"];
		newBtn.onclick = () => Upgrade(i);

		data[i].btn = newBtn;

		upgradeBox.appendChild(info);
		upgradeBox.appendChild(newBtn);

		upgradesContainer.appendChild(upgradeBox);
	}
	refreshUpgradeButtons();
}

function refreshUpgradeButtons() {
	for (const item of data) {
		if (!item.btn) continue;

		if (item.purchased >= item.buycap) {
			item.btn.textContent = "MAXED (" + item.purchased + ")";
			item.btn.disabled = true;
		} else {
			const price = currentCost(item);
			item.btn.textContent = "Cost:$" + price.toLocaleString()
				+ " (" + item.purchased + "/" + item.buycap + ")";
			item.btn.disabled = count < price;
		}
	}
}

function Upgrade(i) {
	const item = data[i];
	const price = currentCost(item);

	if (count >= price && item.purchased < item.buycap) {
		count -= price;
		item.purchased++;

		saveProgress();
		check_upgrades();
	}
	else if (item.purchased >= item.buycap) {
		alert(item.buylimitmsg);
	}
	else {
		alert("You don't have enough money");
	}
}

btn.addEventListener("click", increase);
const intervalId = setInterval(autoinc, 1000);
rungame();
