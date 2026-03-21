const yearNode = document.getElementById("year");

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const diamondStage = document.querySelector(".diamond-stage");

if (diamondStage) {
  window.addEventListener("pointermove", (event) => {
    const { innerWidth, innerHeight } = window;
    const x = (event.clientX / innerWidth - 0.5) * 10;
    const y = (event.clientY / innerHeight - 0.5) * 10;
    diamondStage.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  });
}
