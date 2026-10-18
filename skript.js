let count = 0;
const btn = document.querySelector("button");

function increase(event) {
	count++
	document.getElementById("count").textContent = "$"+count	
}

btn.addEventListener("click", increase);
