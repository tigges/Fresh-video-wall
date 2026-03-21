const yearNode = document.getElementById("year");

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

const hero = document.querySelector(".hero");
const heroOverlay = document.querySelector(".hero-overlay");

if (hero && heroOverlay) {
  let rafId = 0;

  const updateHeroPan = () => {
    const rect = hero.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 1;
    const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
    const clamped = Math.max(0, Math.min(1, progress));
    const panX = (clamped - 0.5) * 34;

    heroOverlay.style.setProperty("--scroll-pan", `${panX.toFixed(2)}px`);
    rafId = 0;
  };

  const requestPanUpdate = () => {
    if (rafId === 0) {
      rafId = window.requestAnimationFrame(updateHeroPan);
    }
  };

  updateHeroPan();
  window.addEventListener("scroll", requestPanUpdate, { passive: true });
  window.addEventListener("resize", requestPanUpdate);
}
