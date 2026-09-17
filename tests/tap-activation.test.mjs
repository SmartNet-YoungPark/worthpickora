import test from "node:test";
import assert from "node:assert/strict";
import { createTapActivation } from "../lib/tap-activation.ts";

const touch = { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50, isPrimary: true };

test("touch release opens once even when followed by a Safari synthetic click", () => {
  const tap = createTapActivation(() => 1000);
  let expanded = false;
  tap.down(touch);
  if (tap.up(touch)) expanded = !expanded;
  if (tap.click(1)) expanded = !expanded;
  assert.equal(expanded, true);
  tap.down(touch);
  if (tap.up(touch)) expanded = !expanded;
  if (tap.click(1)) expanded = !expanded;
  assert.equal(expanded, false);
});

test("scroll gestures and canceled touches do not activate the toggle", () => {
  const tap = createTapActivation();
  tap.down(touch);
  tap.move({ ...touch, clientY: 90 });
  assert.equal(tap.up(touch), false);
  tap.down(touch);
  tap.cancel();
  assert.equal(tap.up(touch), false);
  tap.down(touch);
  assert.equal(tap.up({ ...touch, clientX: 90 }), false);
});

test("mouse, keyboard, and click-only accessibility activation still work", () => {
  const tap = createTapActivation(() => 1000);
  assert.equal(tap.click(1), true);
  tap.down(touch);
  assert.equal(tap.up(touch), true);
  assert.equal(tap.click(0), true);
  const mouse = { ...touch, pointerType: "mouse" };
  tap.down(mouse);
  assert.equal(tap.up(mouse), false);
  assert.equal(tap.click(1), true);
});
