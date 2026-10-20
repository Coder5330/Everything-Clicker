let count = 0;
const btn = document.querySelector("button");
const txt1 = document.getElementById("count");

function increase(event) {
	count++;
	txt1.textContent = "$"+count;
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

loadUPG();
btn.addEventListener("click", increase);
