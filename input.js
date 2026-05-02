"use strict";

function isTouchOnlyDevice() {
  const maxTouchPoints = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const anyCoarsePointer = window.matchMedia?.("(any-pointer: coarse)")?.matches ?? false;
  const finePointer = window.matchMedia?.("(pointer: fine)")?.matches ?? false;
  const hoverPointer = window.matchMedia?.("(hover: hover)")?.matches ?? false;
  const ua = navigator.userAgent || "";
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) || navigator.userAgentData?.mobile === true;
  const touchCapable = maxTouchPoints > 0 || coarsePointer || anyCoarsePointer || "ontouchstart" in window;
  const desktopLikePointer = finePointer && hoverPointer;
  if (mobileUa) return true;
  if (!touchCapable) return false;
  if (desktopLikePointer) return false;
  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  return (coarsePointer || anyCoarsePointer) && shortSide <= 600 && longSide <= 950;
}

function isMobileViewport() {
  return isTouchOnlyDevice();
}

function effectiveControlType() {
  if (isMobileViewport()) return "joystick";
  return runtime.settings?.controlType || "keyboard";
}

function gameplayCameraZoom() {
  return isMobileViewport() ? 0.9 : 1;
}

function isTextInputElement(element) {
  if (!element) return false;
  const tag = element.tagName;
  return element.isContentEditable || tag === "INPUT" || tag === "TEXTAREA";
}

function isTextInputActive() {
  return isTextInputElement(document.activeElement);
}
