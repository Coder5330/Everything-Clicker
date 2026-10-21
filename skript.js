let count = 0;
const btn = document.getElementById("click-btn");
const txt1 = document.getElementById("count");
const txt2 = document.getElementById("click-str");
const txt3 = document.getElementById("auto-str");
const upgrades = document.getElementById("layer1Right");
const upgradesContainer = document.getElementById("upgrade-area");
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
	  upgradesContainer.innerHTML= '';

	for (let i = 0; i<d.length; i++){
		const upgradeBox = document.createElement("div");
		upgradeBox.className = "upgrades";
		
		const info = document.createElement("span");
		info.textContent = d[i]["upgrade"]
		info.className="upgrade-name"
		
		const newBtn = document.createElement("button");
		newBtn.textContent = "Price:" + d[i]["cost"];
		newBtn.title = d[i]["description"];
		newBtn.className = "upgrade-btn";
		newBtn.onclick = () => Upgrade(i);

		upgradeBox.appendChild(info);
		upgradeBox.appendChild(newBtn);

		upgradesContainer.appendChild(upgradeBox);
	}
  } catch (error) {
    console.error('Error loading JSON:', error);
  }
}

function Upgrade(i){
	if (count >= data[i]["cost"] && data[i]["purchased"] < data[i]["buycap"]){

		count -= data[i]["cost"];
		inc += data[i]["ClickIncrease"]||0;
		autoadd += data[i]["PerSecIncrease"]||0;
		data[i]["purchased"]++;
		render();
	} 
	else if (count < data[i]["cost"]){
		alert("You don't have enough money");
	}
	else {
		alert(data[i]["buylimitmsg"])
	}
}
loadUPGandMake()
btn.addEventListener("click", increase);
const intervalId = setInterval(autoinc, 1000);
