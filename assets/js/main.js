(function () {
  "use strict";

  /* reveal on scroll */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* 3D tilt + red tint on project cards */
  var cards = document.querySelectorAll(".proj-card");
  cards.forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        "perspective(900px) rotateX(" + (-py * 6).toFixed(2) + "deg) rotateY(" + (px * 6).toFixed(2) + "deg) translateY(-2px)";
    });
    card.addEventListener("mouseleave", function () {
      card.style.transform = "";
    });
  });

  /* stack chips: brand-color glow on hover */
  var stackItems = document.querySelectorAll(".stack-item");
  stackItems.forEach(function (item) {
    var color = item.dataset.c || "#ff0000";
    item.addEventListener("mouseenter", function () {
      item.style.borderColor = color;
      item.style.color = "#fff";
      item.style.boxShadow = "0 0 22px -4px " + color + "88";
    });
    item.addEventListener("mouseleave", function () {
      item.style.borderColor = "";
      item.style.color = "";
      item.style.boxShadow = "";
    });
  });

  /* smooth-scroll offset for fixed nav */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 64, behavior: "smooth" });
    });
  });

  /* nav dims on scroll */
  var nav = document.querySelector(".nav");
  window.addEventListener("scroll", function () {
    nav.style.background =
      window.scrollY > 40
        ? "rgba(5,5,5,0.9)"
        : "linear-gradient(to bottom, rgba(5,5,5,0.85), transparent)";
  }, { passive: true });
})();
