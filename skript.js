let count = 0;
const btn = document.querySelector("button");
const txt1 = document.getElementById("count");
const upgrades = document.getElementById("layer1Right");
let inc = 1;
let autoadd = 0;

function increase(event) {
	count += inc;
	txt1.textContent = "$"+count;
}

function autoinc(){
	count += autoadd;
}

async function loadUPG() {
  try {
    const response = await fetch('./upgrades.json');
    const data = await response.json();
    console.log(data);
	return data;
  } catch (error) {
    console.error('Error loading JSON:', error);
  }
}

function Upgrade(i){
	if (count >= data[i]["cost"]){
		count -= data[i]["cost"];
		increase += data[i]["clickIncrease"];
		auto += data[i]["PerSecIncrease"];
	} else {
		alert("You don't have enough money");
	}
}

function MakeUpgBtn(d){
	for (let i = 0; i<d.length; i++){
		const newBtn = document.createElement("button");
		newBtn.textContent = d[i]["upgrade"];
		newBtn.onclick = () => Upgrade(i);
		upgrades.appendChild(newBtn);
	}
}

data = loadUPG();
MakeUpgBtn(data);
btn.addEventListener("click", increase);
const intervalId = setInterval(autoinc, 1000);
