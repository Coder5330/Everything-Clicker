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
	txt1.textContent = count;
	txt2.textContent = inc;
	txt3.textContent = autoadd;
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
		newBtn.textContent = "Price:" + data[i]["cost"];
		newBtn.title = data[i]["description"];
		newBtn.className = "upgrade-btn";
		newBtn.onclick = () => Upgrade(i);

		upgradeBox.appendChild(info);
		upgradeBox.appendChild(newBtn);

		upgradesContainer.appendChild(upgradeBox);
	}
}

function Upgrade(i) {
	if (count >= data[i]["cost"] && data[i]["purchased"] < data[i]["buycap"]) {
		count -= data[i]["cost"];
		data[i]["purchased"]++;

		saveProgress();
		check_upgrades();
	}
	else if (count < data[i]["cost"]) {
		alert("You don't have enough money");
	}
	else {
		alert(data[i]["buylimitmsg"]);
	}
}

btn.addEventListener("click", increase);
const intervalId = setInterval(autoinc, 1000);
rungame();
