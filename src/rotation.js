import { $ } from "./presentation.js";
import { runtime } from "./state.js";
export function setupMapRotation() {
  const surface = $("map"),
    north = $("north-reset");
  let press = null,
    gesture = null,
    suppressClick = false;
  const isMapControl = (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        ".map-pin,.leaflet-popup,.leaflet-control,button,a,input,select,textarea",
      )
    )
      return true;
    return [...surface.querySelectorAll(".map-pin")].some((marker) => {
      const rect = marker.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    });
  };
  const finish = () => {
    if (!press) return;
    const wasRotating = !!gesture;
    press = null;
    gesture = null;
    surface.classList.remove("is-rotating");
    if (wasRotating) runtime.map.dragging.enable();
    document.removeEventListener("mousemove", move, true);
    document.removeEventListener("mouseup", end, true);
    window.removeEventListener("blur", finish);
  };
  const startRotation = () => {
    if (!press || gesture) return;
    // Disabling Leaflet's drag handler also ends a pan already under way.
    runtime.map.dragging.disable();
    gesture = {
      startX: press.x,
      startBearing: runtime.map.getBearing(),
      moved: false,
    };
    surface.classList.add("is-rotating");
  };
  const move = (event) => {
    if (!press) return;
    if (!(event.buttons & 1)) {
      finish();
      return;
    }
    if (!gesture) {
      press.x = event.clientX;
      press.y = event.clientY;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const dx = event.clientX - gesture.startX;
    if (Math.abs(dx) > 3) gesture.moved = true;
    // A horizontal drag changes the bearing, like a map rotation gesture.
    runtime.map.setBearing(gesture.startBearing + dx * 0.4);
  };
  const end = (event) => {
    if (!press) return;
    if (gesture) {
      if (gesture.moved) {
        suppressClick = true;
        setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    finish();
  };
  surface.addEventListener(
    "mousedown",
    (event) => {
      if (event.button !== 0 || isMapControl(event)) return;
      press = {
        x: event.clientX,
        y: event.clientY,
      };
      document.addEventListener("mousemove", move, true);
      document.addEventListener("mouseup", end, true);
      window.addEventListener("blur", finish, {
        once: true,
      });
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        startRotation();
      }
    },
    true,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        press &&
        !gesture &&
        (event.key === "Control" || event.key === "Meta")
      )
        startRotation();
    },
    true,
  );
  surface.addEventListener(
    "contextmenu",
    (event) => {
      if (gesture) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  surface.addEventListener(
    "click",
    (event) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }
    },
    true,
  );
  runtime.map.on("rotate", () => {
    const bearing = runtime.map.getBearing();
    north.classList.toggle(
      "is-rotated",
      Math.abs(bearing) > 0.5 && Math.abs(bearing - 360) > 0.5,
    );
    north.querySelector("span").style.transform = `rotate(${-bearing}deg)`;
  });
  north.addEventListener("click", () => runtime.map.setBearing(0));
}
