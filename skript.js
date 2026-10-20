let count = 0;
const btn = document.querySelector("button");
const txt1 = document.getElementById("count");

function increase(event) {
	count++;
	txt1.textContent = "$"+count;
}

async function loadJSON() {
  try {
    const response = await fetch('./example.json');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('Error loading JSON:', error);
  }
}

loadJSON();
btn.addEventListener("click", increase);
