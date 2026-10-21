let count = 0;
const btn = document.getElementById("click-btn");
const txt1 = document.getElementById("count");
const txt2 = document.getElementById("click-str");
const txt3 = document.getElementById("auto-str");
const upgrades = document.getElementById("layer1Right");
const upgradesContainer = document.getElementById("upgrade-area");
let inc = 1;
let autoadd = 0;
let data = [];

async function loadgamedata() {
	try {
		const response = await fetch('./upgrades.json');
		const jsondata = await response.json();
		console.log("Successfully loaded default data:", jsondata);
		return jsondata;
	}
	catch (error) {
		console.error("Error loading file:", error);
	}
}

function cacheGameData(jsondata) {
	if (localStorage.getItem('gameDataHasCached')) {
		return;
	}
	if (!jsondata) return;

	try {
		localStorage.setItem('gamedata', JSON.stringify(jsondata));
		localStorage.setItem('gameDataHasCached', 'true');
	}
	catch (error) {
		console.error("Error caching data", error);
	}
}

async function rungame() {
	const savedData = localStorage.getItem('gamedata');
	const savedCount = localStorage.getItem('gameCount');

	if (savedCount !== null) {
		count = parseInt(savedCount, 10);
	}

	if (savedData) {
		data = JSON.parse(savedData);
		console.log("Loaded game from local storage");
	} else {
		data = await loadgamedata();
		cacheGameData(data);
	}

	check_upgrades();
	makeUpgradeButtons();
	console.log("Game initialised.");
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
		inc += data[i]["purchased"] * data[i]["ClickIncrease"];
		autoadd += data[i]["purchased"] * data[i]["PerSecIncrease"];
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
		
		localStorage.setItem('gamedata', JSON.stringify(data));
		localStorage.setItem('gameCount', count);
		
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

