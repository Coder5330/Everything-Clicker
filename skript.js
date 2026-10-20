let count = 0;
const btn = document.querySelector("button");
const txt1 = document.getElementById("count");

function increase(event) {
	count++;
	txt1.textContent = "$"+count;
}

btn.addEventListener("click", increase);
