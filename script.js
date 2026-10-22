const rebirthed = localStorage.getItem("rebirthed") === "1";

if (!rebirthed) {
  location.href = "./index.html";
} else {
  location.href = "https://www.youtube.com/watch?v=K1bqOLECS98";
}
