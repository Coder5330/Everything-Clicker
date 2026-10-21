let count = 0;
const btn = document.getElementById("click-btn");
const txt1 = document.getElementById("count");
const upgrades = document.getElementById("layer1Right");
let inc = 1;
let autoadd = 0;

function render() {
	txt1.textContent = "$" + count;
}

function increase(event) {
	count += inc;
	render()
}

function autoinc(){
	count += autoadd;
	render()
}

async function loadUPGandMake() {
  try {
    const response = await fetch('./upgrades.json');
    const d = await response.json();
    console.log(d);
	for (let i = 0; i<d.length; i++){
		const newBtn = document.createElement("button");
		newBtn.textContent = d[i]["upgrade"];
		newBtn.className = "upgrade-btn";
		newBtn.onclick = () => Upgrade(i);
		upgrades.appendChild(newBtn);
	}
  } catch (error) {
    console.error('Error loading JSON:', error);
  }
}

function Upgrade(i){
	if (count >= data[i]["cost"]){
		count -= data[i]["cost"];
		inc += data[i]["ClickIncrease"]||0;
		auto += data[i]["PerSecIncrease"]||0;
		render()
	} else {
		alert("You don't have enough money");
	}
}
data = loadUPGandMake();
btn.addEventListener("click", increase);
const intervalId = setInterval(autoinc, 1000);
