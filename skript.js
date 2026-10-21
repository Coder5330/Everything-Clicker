let count = 0;
const btn = document.getElementById("click-btn");
const txt1 = document.getElementById("count");
const txt2 = document.getElementById("click-str");
const txt3 = document.getElementById("auto-str");
const upgrades = document.getElementById("layer1Right");
let inc = 1;
let autoadd = 0;
let data = []


function render() {
	txt1.textContent = count;
	txt2.textContent = inc;
	txt3.textContent = autoadd;
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
	data = d;
	for (let i = 0; i<d.length; i++){
		const newBtn = document.createElement("button");
		newBtn.textContent = d[i]["upgrade"]+" Costs: "+d[i]["cost"];
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
		autoadd += data[i]["PerSecIncrease"]||0;
		render()
	} else {
		alert("You don't have enough money");
	}
}
data = loadUPGandMake();
btn.addEventListener("click", increase);
const intervalId = setInterval(autoinc, 1000);
