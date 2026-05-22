let carouselAnimationId = null;
let baseCarouselItems = [];
let carouselIntervalId = null;

function initSkillsCarousel() {
  const track = document.querySelector(".skills-track");
  const carousel = document.querySelector(".skills-carousel");

  if (!track || !carousel) return;

  // 1. Guardamos los elementos originales una sola vez para evitar duplicaciones infinitas
  if (baseCarouselItems.length === 0) {
    baseCarouselItems = Array.from(track.children);
  }

  function renderCarousel() {
    // 2. Detener cualquier animación en curso (clave al redimensionar)
    if (carouselAnimationId) {
      cancelAnimationFrame(carouselAnimationId);
      carouselAnimationId = null;
    }

    const shouldAnimate = window.innerWidth > 1276;
    track.innerHTML = ""; // Limpiamos el contenedor

    if (shouldAnimate) {
      // Escritorio: clonamos suficientes sets (mínimo 6) para garantizar
      // que siempre haya tarjetas visibles y evitar huecos durante el scroll.
      let copies = 0;
      const minSets = 6;
      const maxCopies = 20;

      // Añadimos sets hasta que el ancho del track supere 5x el contenedor
      // o hasta alcanzar maxCopies. Esto se hace antes de cargar imágenes;
      // algunas imágenes pueden cambiar el layout, por eso recalculamos luego.
      while (
        (track.scrollWidth < carousel.clientWidth * 5 || copies < minSets) &&
        copies < maxCopies
      ) {
        baseCarouselItems.forEach((item) =>
          track.appendChild(item.cloneNode(true)),
        );
        copies++;
      }

      // Si por alguna razón no se agregaron copias (fallback), añadimos 6 sets
      if (copies < minSets) {
        for (let i = copies; i < minSets; i++) {
          baseCarouselItems.forEach((item) =>
            track.appendChild(item.cloneNode(true)),
          );
        }
        copies = minSets;
      }

      // Guardamos cuántos sets añadimos para calcular el ancho de un set tras carga de imágenes
      track.dataset.carouselSets = copies;

      // Aseguramos los estilos para animación (por si venimos de un tamaño mobile)
      track.style.display = "flex";
      track.style.flexWrap = "nowrap";
      track.style.minWidth = "max-content";
      track.style.willChange = "transform";
    } else {
      // Móvil/Tablet: insertamos los elementos normales
      baseCarouselItems.forEach((item) =>
        track.appendChild(item.cloneNode(true)),
      );

      // Limpiamos TODO estilo en línea inyectado por JS.
      // Esto permite que tu CSS actúe libremente (display: grid / display: contents).
      track.style.transform = "none";
      track.style.willChange = "auto";
      track.style.display = "";
      track.style.flexWrap = "";
      track.style.minWidth = "";

      // Autoplay vertical para móvil
      if (carouselIntervalId) {
        clearInterval(carouselIntervalId);
        carouselIntervalId = null;
      }

      // Elemento contenedor que hace el scroll
      const scroller = carousel; // .skills-carousel

      // Aseguramos que el scroller empiece arriba (evita que el título quede oculto)
      scroller.scrollTo({ top: 0, behavior: "auto" });

      // Calculamos altura del card dinámicamente
      function getCardStep() {
        const first = scroller.querySelector(".skills-card-link");
        if (!first) return 160;
        const rect = first.getBoundingClientRect();
        const style = getComputedStyle(first);
        const marginBottom = parseFloat(style.marginBottom || 0);
        return Math.round(rect.height + marginBottom);
      }

      // Inicia autoplay (con retardo para que termine el layout)
      let autoplayStarter = null;
      let isResetting = false;
      function startAutoplay() {
        if (carouselIntervalId || autoplayStarter) return;
        autoplayStarter = setTimeout(() => {
          const delay = 2000;
          carouselIntervalId = setInterval(() => {
            if (!scroller || isResetting) return;
            // Si no hay scroll extra, no hacemos nada
            if (scroller.scrollHeight <= scroller.clientHeight + 1) return;

            const atBottom =
              scroller.scrollTop + scroller.clientHeight >=
              scroller.scrollHeight - 2;
            if (atBottom) {
              if (carouselIntervalId) {
                clearInterval(carouselIntervalId);
                carouselIntervalId = null;
              }

              isResetting = true;
              setTimeout(() => {
                scroller.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => {
                  isResetting = false;
                  startAutoplay();
                }, 700);
              }, 900);

              return;
            }

            // Recalcular step cada tick (evita step=0 si el layout no terminó)
            let step = getCardStep() || Math.round(scroller.clientHeight / 3);
            if (step <= 0) return;

            const remaining =
              scroller.scrollHeight -
              scroller.clientHeight -
              scroller.scrollTop;

            // Si estamos cerca del final, vamos directo al fondo y cerramos el autoplay
            if (remaining > 0 && remaining <= step + 1) {
              if (carouselIntervalId) {
                clearInterval(carouselIntervalId);
                carouselIntervalId = null;
              }
              isResetting = true;
              scroller.scrollTo({
                top: scroller.scrollHeight - scroller.clientHeight,
                behavior: "smooth",
              });
              setTimeout(() => {
                scroller.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => {
                  isResetting = false;
                  startAutoplay();
                }, 700);
              }, 900);
              return;
            }

            // Si el step es mayor al remanente, limitamos para evitar overshoot
            if (step > remaining) step = remaining;
            scroller.scrollBy({ top: step, behavior: "smooth" });
          }, delay);
          autoplayStarter = null;
        }, 300);
      }

      function stopAutoplay() {
        if (autoplayStarter) {
          clearTimeout(autoplayStarter);
          autoplayStarter = null;
        }
        if (carouselIntervalId) {
          clearInterval(carouselIntervalId);
          carouselIntervalId = null;
        }
      }

      // Start immediately
      startAutoplay();

      // Pause on user interaction
      scroller.addEventListener("pointerdown", stopAutoplay, { passive: true });
      scroller.addEventListener("touchstart", stopAutoplay, { passive: true });
      scroller.addEventListener("mouseenter", stopAutoplay);
      scroller.addEventListener("mouseleave", startAutoplay);

      return; // Detenemos la ejecución aquí
    }

    // 3. Lógica de animación (Solo se ejecuta si shouldAnimate es true)
    const images = Array.from(track.querySelectorAll("img"));
    const loadedImages = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve);
        img.addEventListener("error", resolve);
      });
    });

    Promise.all(loadedImages).then(() => {
      let position = 0;
      let lastTime = null;
      const speed = 0.035;

      // Recalculamos cuántos sets hay (fueron almacenados en data attribute)
      const sets = parseInt(track.dataset.carouselSets, 10) || 2;

      // Calcula el ancho exacto de un set sumando los anchos de las primeras N tarjetas
      function computeOneSetWidth() {
        const children = Array.from(track.children);
        const baseCount = baseCarouselItems.length || 1;
        if (children.length >= baseCount) {
          const slice = children.slice(0, baseCount);
          return slice.reduce(
            (acc, el) => acc + el.getBoundingClientRect().width,
            0,
          );
        }
        return track.scrollWidth / Math.max(sets, 1);
      }

      let oneSetWidth = computeOneSetWidth();

      // Si tras cargar las imágenes todavía no hay suficiente contenido
      // para cubrir el flujo continuo, añadimos más sets adicionales.
      (function ensureEnoughContent() {
        const maxExtra = 15;
        let extra = 0;
        const desiredMultiplier = 5;
        while (
          track.scrollWidth < carousel.clientWidth * desiredMultiplier &&
          extra < maxExtra
        ) {
          baseCarouselItems.forEach((item) =>
            track.appendChild(item.cloneNode(true)),
          );
          extra++;
        }
        if (extra > 0) {
          // Actualizamos el contador de sets y recalculamos el ancho
          const prevSets = parseInt(track.dataset.carouselSets, 10) || 0;
          track.dataset.carouselSets = prevSets + extra;
          oneSetWidth = computeOneSetWidth();
        }
      })();

      // Si el layout cambia (imagenes responsivas), recalculamos ocasionalmente
      function recalcOneSet() {
        const newOne = computeOneSetWidth();
        if (Math.abs(newOne - oneSetWidth) > 0.5) oneSetWidth = newOne;
      }

      function animate(timestamp) {
        if (lastTime !== null) {
          const delta = timestamp - lastTime;
          position += delta * speed;
          // Loop continuo restando exactamente el ancho de un set cuando lo excedemos
          if (position >= oneSetWidth) {
            position -= oneSetWidth;
          }
          track.style.transform = `translateX(${-position}px)`;
        }
        lastTime = timestamp;
        recalcOneSet();
        carouselAnimationId = requestAnimationFrame(animate);
      }

      carouselAnimationId = requestAnimationFrame(animate);
    });
  }

  // Ejecutamos el renderizado inicial
  renderCarousel();

  // 4. Agregamos un listener de "resize" con un pequeño retraso (debounce)
  // Esto recalcula y rearma el carrusel sin sobrecargar el navegador si el usuario cambia el tamaño de la ventana
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(renderCarousel, 150);
  });
}

window.addEventListener("load", initSkillsCarousel);

function setFooterYear() {
  const yearEl = document.getElementById("year");
  const currentYear = new Date().getFullYear();
  if (yearEl) {
    yearEl.textContent = currentYear;
    return;
  }

  const footerP = document.querySelector("footer p");
  if (footerP) {
    footerP.textContent = footerP.textContent.replace(/\d{4}/, currentYear);
  }
}

window.addEventListener("load", setFooterYear);
window.addEventListener("load", initMobileMenu);

function initMobileMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const mobilePanel = document.getElementById("mobilePanel");
  const closeBtn = document.getElementById("closeMenu");
  if (!menuBtn || !mobilePanel) return;

  function openMenu() {
    mobilePanel.classList.add("open");
    menuBtn.setAttribute("aria-expanded", "true");
    mobilePanel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    mobilePanel.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    mobilePanel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  menuBtn.addEventListener("click", () => {
    if (mobilePanel.classList.contains("open")) closeMenu();
    else openMenu();
  });

  closeBtn && closeBtn.addEventListener("click", closeMenu);

  // Escape key closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Ensure panel closes when resizing to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 542 && mobilePanel.classList.contains("open"))
      closeMenu();
  });

  const mobileLinks = document.querySelectorAll(".mobile-nav a");
  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });
}
