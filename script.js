const menuButton = document.getElementById("menu-btn");
const navigationLinks = document.getElementById("nav-links");

if (menuButton && navigationLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navigationLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
  menuButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      menuButton.click();
    }
  });

  navigationLinks.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      navigationLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

const qrLink = document.getElementById("qr-link");
const qrModal = document.getElementById("qr-modal");
const closeQrModal = document.getElementById("close-qr-modal");

if (qrLink && qrModal && closeQrModal) {
  const closeModal = () => {
    qrModal.style.display = "none";
  };

  qrLink.addEventListener("click", (event) => {
    event.preventDefault();
    qrModal.style.display = "flex";
  });
  closeQrModal.addEventListener("click", closeModal);
  qrModal.addEventListener("click", (event) => {
    if (event.target === qrModal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

if (typeof Swiper !== "undefined" && document.querySelector(".swiper")) {
  new Swiper(".swiper", {
    loop: true,
    pagination: { el: ".swiper-pagination", clickable: true },
  });
}

if (typeof ScrollReveal !== "undefined") {
  ScrollReveal().reveal(".section__container", {
    distance: "24px",
    duration: 700,
    interval: 80,
    origin: "bottom",
  });
}
