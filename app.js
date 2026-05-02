(() => {
  "use strict";

"use strict";

const ENEMY_TYPES = {
  redCircle: {
    key: "redCircle",
    label: "red circle",
    shape: "circle",
    color: 0xc45d55,
    stroke: 0xe3a09a,
    radius: 14,
    baseHp: 2,
    damage: 10,
    speed: 76,
    exp: 1,
    minWave: 1,
    weight: 78,
  },
  blueSquare: {
    key: "blueSquare",
    label: "orange square",
    shape: "square",
    color: 0xd98242,
    stroke: 0xf0bd81,
    radius: 15,
    baseHp: 4,
    damage: 15,
    speed: 60,
    exp: 2,
    minWave: 1,
    weight: 22,
  },
  yellowTriangle: {
    key: "yellowTriangle",
    label: "yellow triangle",
    shape: "triangle",
    color: 0xd5b85f,
    stroke: 0xf0d995,
    radius: 17,
    baseHp: 8,
    damage: 22,
    speed: 80,
    exp: 4,
    minWave: 5,
    weight: 20,
  },
  redPentagon: {
    key: "redPentagon",
    label: "green pentagon",
    shape: "pentagon",
    color: 0x83b95e,
    stroke: 0xc2e690,
    radius: 25,
    baseHp: 16,
    damage: 34,
    speed: 52,
    exp: 8,
    minWave: 10,
    weight: 7,
  },
  cyanHexagon: {
    key: "cyanHexagon",
    label: "cyan hexagon",
    shape: "hexagon",
    color: 0x58b7c7,
    stroke: 0xa9dfe6,
    radius: 24,
    baseHp: 19.2,
    damage: 34,
    speed: 105,
    exp: 10,
    minWave: 15,
    weight: 2,
    dashIntervalMs: 1150,
    dashDurationMs: 132,
    dashMultiplier: 2.05,
    dashInertiaMs: 150,
    dashInertiaPower: 0.24,
  },
};

const CONFIG = {
  playerSpeed: 233,
  playerAcceleration: 30,
  playerBrake: 20,
  playerRadius: 16,
  maxHp: 100,
  bulletSpeed: 610,
  bulletDamage: 2,
  bulletRadius: 5.45,
  fireIntervalMs: 748,
  bulletLifeMs: 945,
  bulletMaxDistance: 612,
  bulletFadeMs: 120,
  upgradeInvulnerabilityMs: 1500,
  waveDurationMs: 10000,
  firstSpawnIntervalMs: 1450,
  minSpawnIntervalMs: 320,
  maxEnemies: 400,
  contactCooldownMs: 720,
  spawnPaddingMin: 100,
  spawnPaddingMax: 180,
  magnetRadius: 135,
  pickupRadius: 26,
  expLifeMs: 52500,
  expFadeMs: 600,
  cullDistance: 1600,
  enemySeparationCell: 56,
  enemySeparationStrength: 0.55,
  targetVisibilityPadding: 32,
  razerHitCooldownMs: 360,
  knockbackDurationMs: 150,
  knockbackMovementLockMs: 150,
  bazookaDamage: 12,
  bazookaBaseRadius: 54,
  bazookaKnockbackRadiusMultiplier: 1.15,
  masochismRadius: 108,
  masochismKnockbackRadius: 96,
  masochismDamageRadius: 118,
  masochismSlowMs: 2000,
  masochismSlowMultiplier: 0.65,
  thorWarningMs: 1000,
  thorClusterRadius: 150,
  thorMinStrikeDistance: 88,
};

const SHOOTER_BULLET_COUNTS = [1, 2, 3, 5];
const SHOOTER_FIRE_RATE_BONUS = [0, 0, 0.05, 0.15];
const ARROW_PIERCE_LIMITS = [0, 2, 4, 6];
const KNOCKBACK_RANGES = [null, { min: 6, max: 11 }, { min: 10, max: 15 }];
const MASOCHISM_BULLET_COUNTS = [0, 8, 10, 12];
const MASOCHISM_BULLET_DAMAGE = [0, 4, 4, 5];
const MASOCHISM_KNOCKBACK_RANGE = { min: 8, max: 12 };
const BAZOOKA_ATTACK_INTERVALS = [0, 10, 7, 5];
const BAZOOKA_KNOCKBACK_RANGES = [null, null, { min: 14, max: 22 }, { min: 17, max: 26 }];
const BAZOOKA_LIGHT_BLEED = { durationMs: 2000, damagePerSecond: 0.3, level: 0.5 };
const BLOODY_CONFIG = {
  1: { durationMs: 2000, damagePerSecond: 0.6, slowMultiplier: 1 },
  2: { durationMs: 3000, damagePerSecond: 0.96, slowMultiplier: 0.85 },
  3: { durationMs: 5000, damagePerSecond: 1.32, slowMultiplier: 0.75 },
};
const ENERGY_DRINK_SPEED_BONUS = [0, 0.1, 0.15, 0.2];
const ENERGY_DRINK_FIRE_RATE_BONUS = [0, 0.06, 0.12, 0.24];
const THOR_CONFIG = {
  1: { intervalMs: 5000, count: 1, damage: 6, radius: 38 },
  2: { intervalMs: 4000, count: 2, damage: 8, radius: 38 },
  3: { intervalMs: 3000, count: 3, damage: 10, radius: 52 },
};
const RAZER_CONFIG = {
  1: { count: 1, damage: 3, radius: 82.5, hitRadius: 14.5, rotationsPerSecond: 0.65, color: 0xa94e59, stroke: 0xd58a85 },
  2: { count: 2, damage: 4, radius: 86.9, hitRadius: 15.0, rotationsPerSecond: 0.86, color: 0xb65b61, stroke: 0xe0a09a },
  3: { count: 3, damage: 6, radius: 91.3, hitRadius: 15.5, rotationsPerSecond: 1.1, color: 0x8d5aa6, stroke: 0xd1aae3 },
};

const SUPERPOWER_REGISTRY = [
  {
    id: "razer",
    title: "Razer",
    maxLevel: 3,
    descriptions: [
      "Пила вращающаяся вокруг игрока и наносящая контактный урон.",
      "Уровень 2: две пилы на орбите, выше скорость и урон.",
      "Уровень 3: три фиолетовые пилы, выше скорость и урон.",
    ],
  },
  {
    id: "shooter",
    title: "Shooter",
    maxLevel: 3,
    descriptions: [
      "Игрок выпускает две пули за раз.",
      "Уровень 2: Игрок выпускает три пули за раз.",
      "Уровень 3: Игрок выпускает пять пуль за раз.",
    ],
  },
  {
    id: "bazooka",
    title: "Bazooka",
    maxLevel: 3,
    descriptions: [
      "Каждая 10-я атака заменяется взрывным снарядом.",
      "Уровень 2: выстрел каждые 7 атак, увеличенный радиус, взрыв снаряда отталкивает врагов.",
      "Уровень 3: выстрел каждые 5 атак, взрыв снаряда накладывает легкое кровотечение на врагов.",
    ],
  },
  {
    id: "arrow",
    title: "Arrow",
    maxLevel: 3,
    descriptions: [
      "Снаряды пронзают 2 врага.",
      "Снаряды пронзают 4 врага. Увеличивает урон снаряда за каждого второго пробитого врага.",
      "Снаряды пронзают 6 врагов. Скорость снарядов увеличена.",
    ],
  },
  {
    id: "masochism",
    title: "Masochism",
    maxLevel: 3,
    descriptions: [
      "При получении урона выпускает 8 сильных снарядов во все стороны.",
      "Выпускает 10 сильных снарядов, замедляет и также немного отталкивает врагов.",
      "Выпускает 12 сильных снарядов, враги в небольшом радиусе от героя получат урон.",
    ],
  },
  {
    id: "bloody",
    title: "Bloody",
    maxLevel: 3,
    descriptions: [
      "Каждый снаряд вызывает у врага кровотечение.",
      "Каждый снаряд замедляет врага и вызывает сильное кровотечение.",
      "Каждый снаряд сильно замедляет врага и вызывает безумное кровотечение.",
    ],
  },
  {
    id: "knockback",
    title: "Knockback",
    maxLevel: 2,
    descriptions: [
      "Отталкивает врагов получивших урон.",
      "Сильнее отталкивает врагов получивших урон.",
    ],
  },
  {
    id: "energyDrink",
    title: "Energy drink",
    maxLevel: 3,
    descriptions: [
      "Ускоряет персонажа на 10%, ускоряет темп атаки персонажа на 6%.",
      "Ускоряет персонажа на 15%, ускоряет темп атаки персонажа на 12%.",
      "Ускоряет персонажа на 20%, ускоряет темп атаки персонажа на 24%.",
    ],
  },
  {
    id: "thor",
    title: "Thor",
    maxLevel: 3,
    descriptions: [
      "Каждые 5 сек. бьет молнией по скоплению врагов.",
      "Уровень 2: каждые 4 сек. бьет двумя молниями по скоплениям.",
      "Уровень 3: каждые 3 сек. бьет тремя молниями с увеличенной областью.",
    ],
  },
];

function nextLevelExp(level) {
  return Math.floor(6 + level * 2.4 + level * level * 0.65);
}

function expSizeForValue(value) {
  if (value <= 1.2) return 5.2;
  if (value <= 2.4) return 6.6;
  if (value <= 4.8) return 8.2;
  return clamp(8.2 + Math.sqrt(value - 4.8) * 1.35, 8.2, 14);
}

function roundExpValue(value) {
  return Math.round(value * 100) / 100;
}

function formatExpValue(value) {
  const rounded = roundExpValue(value);
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) return String(Math.round(rounded));
  return rounded.toFixed(1).replace(/\.0$/, "");
}

function waveExpMultiplier(wave) {
  return Math.pow(1.05, Math.max(0, wave - 1));
}

function splitExpReward(value, maxPickupSize) {
  const totalCents = Math.max(1, Math.round(value * 100));
  let count = 1;
  for (let i = 1; i <= 3; i += 1) {
    if (expSizeForValue(totalCents / 100 / i) <= maxPickupSize) {
      count = i;
      break;
    }
    count = i;
  }

  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

function makeRoundedTriangle(scene, radius, fill, stroke, lineWidth = 2) {
  const graphics = scene.add.graphics();
  const points = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = -Math.PI / 2 + (i / 3) * Math.PI * 2;
    points.push(new Phaser.Geom.Point(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }

  const corner = radius * 0.22;
  const roundedPoints = [];
  graphics.lineStyle(lineWidth, stroke, 0.78);
  graphics.fillStyle(fill, 1);

  points.forEach((point, index) => {
    const prev = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const toPrev = new Phaser.Math.Vector2(prev.x - point.x, prev.y - point.y).normalize().scale(corner);
    const toNext = new Phaser.Math.Vector2(next.x - point.x, next.y - point.y).normalize().scale(corner);
    const start = new Phaser.Geom.Point(point.x + toPrev.x, point.y + toPrev.y);
    const end = new Phaser.Geom.Point(point.x + toNext.x, point.y + toNext.y);

    if (index > 0) roundedPoints.push(start);
    for (let step = 0; step <= 4; step += 1) {
      const t = step / 4;
      const inv = 1 - t;
      roundedPoints.push(
        new Phaser.Geom.Point(
          inv * inv * start.x + 2 * inv * t * point.x + t * t * end.x,
          inv * inv * start.y + 2 * inv * t * point.y + t * t * end.y
        )
      );
    }
  });

  graphics.fillPoints(roundedPoints, true);
  graphics.strokePoints(roundedPoints, true);
  return graphics;
}

function makeRegularPolygon(scene, sides, radius, fill, stroke, lineWidth = 2) {
  const graphics = scene.add.graphics();
  graphics.lineStyle(lineWidth, stroke, 0.78);
  graphics.fillStyle(fill, 1);

  if (sides === 4) {
    const size = radius * 1.72;
    graphics.fillRoundedRect(-size / 2, -size / 2, size, size, 3);
    graphics.strokeRoundedRect(-size / 2, -size / 2, size, size, 3);
  } else if (sides === 3) {
    graphics.destroy();
    return makeRoundedTriangle(scene, radius, fill, stroke, lineWidth);
  } else {
    const points = [];
    const angleOffset = sides === 3 ? -Math.PI / 2 : -Math.PI / 2;
    for (let i = 0; i < sides; i += 1) {
      const angle = angleOffset + (i / sides) * Math.PI * 2;
      points.push(new Phaser.Geom.Point(Math.cos(angle) * radius, Math.sin(angle) * radius));
    }
    graphics.fillPoints(points, true);
    graphics.strokePoints(points, true);
  }

  return graphics;
}


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


"use strict";

class Enemy {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(5);
    this.body = scene.physics.add.existing(this.container);
    this.body.body.setCircle(16);
    this.active = false;
    this.dying = false;
    this.type = null;
    this.hp = 0;
    this.maxHp = 0;
    this.speed = 0;
    this.damage = 0;
    this.exp = 0;
    this.radius = 16;
    this.separationRadius = 10;
    this.separationX = 0;
    this.separationY = 0;
    this.separationIndex = 0;
    this.spawnWave = 1;
    this.slowUntil = 0;
    this.slowMultiplier = 1;
    this.bleedUntil = 0;
    this.bleedNextTickAt = 0;
    this.bleedDamagePerSecond = 0;
    this.bleedLevel = 0;
    this.nextDashAt = 0;
    this.dashUntil = 0;
    this.dashInertiaUntil = 0;
    this.dashX = 0;
    this.dashY = 0;
    this.knockbackUntil = 0;
    this.knockbackMovementLockUntil = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.lastDamageAt = -9999;
    this.shape = null;
    this.healthBar = scene.add.graphics();
    this.healthBar.setDepth(7);
    this.healthBar.setVisible(false);
  }

  spawn(x, y, type, wave) {
    this.type = type;
    this.radius = type.radius;
    this.separationRadius = Math.min(type.radius, Math.max(10, type.radius * 0.936));
    const heavyGrowth = type.key === "redPentagon" || type.key === "cyanHexagon";
    const hpScale = type.key === "redCircle" ? 0 : Math.max(0, wave - type.minWave) * (heavyGrowth ? 1.12 : 0.44);
    this.maxHp = type.key === "cyanHexagon" ? Math.round((type.baseHp + hpScale) * 10) / 10 : Math.round(type.baseHp + hpScale);
    this.hp = this.maxHp;
    const waveSpeedBonus = Math.min(43.2, wave * 2.79);
    const waveSpeedMultiplier = Math.pow(type.key === "cyanHexagon" ? 1.00648 : 1.0108, Math.max(0, wave - 1));
    this.speed = (type.speed + waveSpeedBonus) * waveSpeedMultiplier;
    this.damage = type.damage;
    this.exp = type.exp;
    this.spawnWave = wave;
    this.slowUntil = 0;
    this.slowMultiplier = 1;
    this.clearBleed();
    this.nextDashAt = this.scene.time.now + Phaser.Math.Between(320, type.dashIntervalMs || 900);
    this.dashUntil = 0;
    this.dashInertiaUntil = 0;
    this.dashX = 0;
    this.dashY = 0;
    this.knockbackUntil = 0;
    this.knockbackMovementLockUntil = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.lastDamageAt = -9999;
    this.dying = false;
    this.container.setPosition(x, y);
    this.container.setActive(true).setVisible(true);
    this.container.setAlpha(1);
    this.container.setScale(1);
    this.container.removeAll(true);

    if (type.shape === "circle") {
      this.shape = this.scene.add.graphics();
      this.shape.lineStyle(2, type.stroke, 0.74);
      this.shape.fillStyle(type.color, 1);
      this.shape.fillCircle(0, 0, this.radius);
      this.shape.strokeCircle(0, 0, this.radius);
    } else if (type.shape === "square") {
      this.shape = makeRegularPolygon(this.scene, 4, this.radius, type.color, type.stroke, 2);
    } else if (type.shape === "triangle") {
      this.shape = makeRegularPolygon(this.scene, 3, this.radius, type.color, type.stroke, 2);
    } else if (type.shape === "hexagon") {
      this.shape = makeRegularPolygon(this.scene, 6, this.radius, type.color, type.stroke, 2);
    } else {
      this.shape = makeRegularPolygon(this.scene, 5, this.radius, type.color, type.stroke, 2);
    }

    this.container.add(this.shape);
    this.body.body.setCircle(this.radius);
    this.body.body.setOffset(-this.radius, -this.radius);
    this.body.body.enable = true;
    this.active = true;
    this.clearHealthBar();
  }

  update(player, delta, now = 0) {
    if (!this.active) return;
    const dx = player.body.x - this.container.x;
    const dy = player.body.y - this.container.y;
    const distance = Math.hypot(dx, dy) || 1;
    const slow = now < this.slowUntil ? this.slowMultiplier : 1;
    let moveX = dx / distance;
    let moveY = dy / distance;
    let speed = this.speed * slow;

    if (this.type.dashIntervalMs) {
      if (now >= this.nextDashAt) {
        const dashDx = player.body.x - this.container.x;
        const dashDy = player.body.y - this.container.y;
        const dashDistance = Math.hypot(dashDx, dashDy) || 1;
        this.dashX = dashDx / dashDistance;
        this.dashY = dashDy / dashDistance;
        this.dashUntil = now + this.type.dashDurationMs;
        this.dashInertiaUntil = this.dashUntil + (this.type.dashInertiaMs || 0);
        this.nextDashAt = now + this.type.dashIntervalMs;
      }

      if (now < this.dashUntil) {
        moveX = this.dashX;
        moveY = this.dashY;
        speed *= this.type.dashMultiplier;
      } else if (now < this.dashInertiaUntil) {
        const inertiaMs = this.type.dashInertiaMs || 1;
        const fade = clamp((this.dashInertiaUntil - now) / inertiaMs, 0, 1);
        const pull = (this.type.dashInertiaPower || 0.2) * fade;
        const blendedX = moveX * (1 - pull) + this.dashX * pull;
        const blendedY = moveY * (1 - pull) + this.dashY * pull;
        const blendedDistance = Math.hypot(blendedX, blendedY) || 1;
        moveX = blendedX / blendedDistance;
        moveY = blendedY / blendedDistance;
        speed *= 1 + (this.type.dashMultiplier - 1) * 0.18 * fade;
      }
    }

    let velocityX = now < this.knockbackMovementLockUntil ? 0 : moveX * speed;
    let velocityY = now < this.knockbackMovementLockUntil ? 0 : moveY * speed;
    if (now < this.knockbackUntil) {
      const fade = clamp((this.knockbackUntil - now) / CONFIG.knockbackDurationMs, 0, 1);
      const eased = fade * fade;
      velocityX += this.knockbackX * eased;
      velocityY += this.knockbackY * eased;
    } else {
      this.knockbackX = 0;
      this.knockbackY = 0;
    }
    this.body.body.setVelocity(velocityX, velocityY);
    this.container.rotation += (delta / 1000) * (this.type.shape === "circle" ? 0.2 : this.type.shape === "hexagon" ? 1.25 : 0.9);
    this.drawHealthBar();
  }

  applySlow(multiplier, until) {
    this.slowMultiplier = Math.min(this.slowMultiplier, multiplier);
    this.slowUntil = Math.max(this.slowUntil, until);
  }

  applyKnockback(dirX, dirY, distance, now) {
    const length = Math.hypot(dirX, dirY) || 1;
    const duration = CONFIG.knockbackDurationMs || 110;
    const speed = (Math.max(0, distance) * 3 * 1000) / duration;
    this.knockbackX = (dirX / length) * speed;
    this.knockbackY = (dirY / length) * speed;
    this.knockbackUntil = Math.max(this.knockbackUntil, now + duration);
    this.knockbackMovementLockUntil = Math.max(this.knockbackMovementLockUntil, now + (CONFIG.knockbackMovementLockMs || 150));
  }

  applyBleed(level, damagePerSecond, until, now) {
    if (this.bleedUntil > now) {
      const currentPower = this.bleedDamagePerSecond * Math.max(0, this.bleedUntil - now);
      const incomingPower = damagePerSecond * Math.max(0, until - now);
      if (incomingPower < currentPower && damagePerSecond <= this.bleedDamagePerSecond) return;
    }
    this.bleedLevel = level;
    this.bleedDamagePerSecond = damagePerSecond;
    this.bleedUntil = until;
    const nextTick = now + 1000;
    this.bleedNextTickAt = this.bleedNextTickAt > now ? Math.min(this.bleedNextTickAt, nextTick) : nextTick;
  }

  clearBleed() {
    this.bleedUntil = 0;
    this.bleedNextTickAt = 0;
    this.bleedDamagePerSecond = 0;
    this.bleedLevel = 0;
  }

  takeDamage(amount, feedback = true) {
    if (!this.active) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.drawHealthBar();
    if (!feedback) return this.hp <= 0;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(1);
    this.container.setScale(1);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.62,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 55,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (this.active && !this.dying) {
          this.container.setAlpha(1);
          this.container.setScale(1);
        }
      },
    });
    return this.hp <= 0;
  }

  kill() {
    if (this.dying) return;
    this.active = false;
    this.dying = true;
    this.body.body.enable = false;
    this.body.body.setVelocity(0, 0);
    this.clearHealthBar();
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0.25,
      scaleY: 0.25,
      duration: 240,
      ease: "Sine.easeInOut",
      onComplete: () => this.disable(),
    });
  }

  disable() {
    this.active = false;
    this.dying = false;
    this.scene.tweens.killTweensOf(this.container);
    this.body.body.enable = false;
    this.body.body.setVelocity(0, 0);
    this.container.setActive(false).setVisible(false);
    this.container.removeAll(true);
    this.container.setAlpha(1);
    this.container.setScale(1);
    this.spawnWave = 1;
    this.slowUntil = 0;
    this.slowMultiplier = 1;
    this.clearBleed();
    this.nextDashAt = 0;
    this.dashUntil = 0;
    this.dashInertiaUntil = 0;
    this.dashX = 0;
    this.dashY = 0;
    this.knockbackUntil = 0;
    this.knockbackMovementLockUntil = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.clearHealthBar();
  }

  drawHealthBar() {
    if (!this.active || this.hp >= this.maxHp) {
      this.clearHealthBar();
      return;
    }

    const pct = clamp(this.hp / this.maxHp, 0, 1);
    const width = clamp(this.radius * 2.2, 22, 46);
    const height = 4;
    const x = this.container.x - width / 2;
    const y = this.container.y - this.radius - 14;

    this.healthBar.clear();
    this.healthBar.setVisible(true);
    this.healthBar.fillStyle(0x11100e, 0.76);
    this.healthBar.fillRoundedRect(x, y, width, height, 2);
    this.healthBar.fillStyle(0xc56b55, 0.9);
    this.healthBar.fillRoundedRect(x, y, Math.max(2, width * pct), height, 2);
    this.healthBar.lineStyle(1, 0xffffff, 0.1);
    this.healthBar.strokeRoundedRect(x, y, width, height, 2);
  }

  clearHealthBar() {
    this.healthBar.clear();
    this.healthBar.setVisible(false);
  }
}

class WaveDirector {
  constructor(scene) {
    this.scene = scene;
    this.reset();
  }

  reset() {
    this.wave = 1;
    this.elapsed = 0;
    this.nextWaveAt = CONFIG.waveDurationMs;
    this.spawnTimer = 0;
  }

  update(delta) {
    this.elapsed += delta;

    if (this.elapsed >= this.nextWaveAt) {
      this.wave += 1;
      this.nextWaveAt += CONFIG.waveDurationMs;
      this.scene.onWaveChanged(this.wave);
    }

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.scene.spawnEnemyPack();
      this.spawnTimer = this.currentSpawnInterval();
    }
  }

  currentSpawnInterval() {
    const interval = CONFIG.firstSpawnIntervalMs - (this.wave - 1) * 82;
    const waveSpawnSpeedMultiplier = Math.pow(0.995, this.wave - 1);
    return Math.max(CONFIG.minSpawnIntervalMs, interval * waveSpawnSpeedMultiplier);
  }

  spawnCount() {
    let count = 1;
    if (this.wave >= 13) count = Phaser.Math.Between(3, 4);
    else if (this.wave >= 8) count = Phaser.Math.Between(2, 3);
    else if (this.wave >= 4) count = Phaser.Math.Between(1, 2);

    const extraChance = this.wave === 1 ? 0.06 : clamp(count * 0.12, 0.12, 0.42);
    return count + (Math.random() < extraChance ? 1 : 0);
  }

  chooseType() {
    const available = Object.values(ENEMY_TYPES).filter((type) => type.minWave <= this.wave);
    const weighted = available.map((type) => {
      let weight = type.weight;
      if (type.key === "yellowTriangle") weight += Math.min(10, this.wave - 5);
      if (type.key === "redPentagon") weight += Math.min(6, Math.floor((this.wave - 10) / 2));
      if (type.key === "cyanHexagon") weight += Math.min(3, Math.floor((this.wave - 15) / 4));
      return { type, weight };
    });

    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }
    return weighted[0].type;
  }
}


"use strict";

function makeRazerSaw(scene, level) {
  const cfg = RAZER_CONFIG[level] || RAZER_CONFIG[1];
  const graphics = scene.add.graphics();
  const outer = level >= 3 ? 14.7 : 13.5;
  const inner = level >= 3 ? 8.6 : 8;
  const points = [];

  for (let i = 0; i < 18; i += 1) {
    const angle = -Math.PI / 2 + (i / 18) * Math.PI * 2;
    const radius = i % 2 === 0 ? outer : inner;
    points.push(new Phaser.Geom.Point(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }

  graphics.fillStyle(cfg.color, 0.92);
  graphics.fillPoints(points, true);
  graphics.lineStyle(1.5, cfg.stroke, 0.78);
  graphics.strokePoints(points, true);
  graphics.fillStyle(level >= 3 ? 0x3a2942 : 0x2c2222, 0.8);
  graphics.fillCircle(0, 0, 4.4);
  return graphics;
}


"use strict";

const dom = {
  shell: document.getElementById("game-shell"),
  container: document.getElementById("game-container"),
  menu: document.getElementById("main-menu"),
  menuCard: document.querySelector(".menu-card"),
  menuRain: document.getElementById("menu-rain"),
  gameOver: document.getElementById("game-over"),
  resultCard: document.querySelector(".result-card"),
  pauseScreen: document.getElementById("pause-screen"),
  upgradeScreen: document.getElementById("upgrade-screen"),
  upgradeOptions: document.getElementById("upgrade-options"),
  leaderboardButton: document.getElementById("leaderboard-button"),
  leaderboardPanel: document.getElementById("leaderboard-panel"),
  leaderboardCategoryButton: document.getElementById("leaderboard-category-button"),
  leaderboardCategoryLabel: document.getElementById("leaderboard-category-label"),
  leaderboardCategoryMenu: document.getElementById("leaderboard-category-menu"),
  leaderboardList: document.getElementById("leaderboard-list"),
  leaderboardPlayerRank: document.getElementById("leaderboard-player-rank"),
  settingsButton: document.getElementById("settings-button"),
  settingsPanel: document.getElementById("settings-panel"),
  settingControlRow: document.getElementById("setting-control-type-row"),
  settingJoystickRow: document.getElementById("setting-joystickOpacity")?.closest(".settings-row"),
  settingLabels: {
    controlType: document.getElementById("setting-controlType"),
    hudPosition: document.getElementById("setting-hudPosition"),
    joystickOpacity: document.getElementById("setting-joystickOpacity"),
  },
  pauseButton: document.getElementById("pause-button"),
  musicButton: document.getElementById("music-button"),
  playButton: document.getElementById("play-button"),
  restartButton: document.getElementById("restart-button"),
  menuButton: document.getElementById("menu-button"),
  resumeButton: document.getElementById("resume-button"),
  pauseMenuButton: document.getElementById("pause-menu-button"),
  hud: document.getElementById("hud"),
  wave: document.getElementById("hud-wave"),
  time: document.getElementById("hud-time"),
  hpText: document.getElementById("hud-hp-text"),
  hpFill: document.getElementById("hp-fill"),
  level: document.getElementById("hud-level"),
  expText: document.getElementById("hud-exp-text"),
  expFill: document.getElementById("exp-fill"),
  levelToast: document.getElementById("level-toast"),
  damageVignette: document.getElementById("damage-vignette"),
  fadeLayer: document.getElementById("fade-layer"),
  joystick: document.getElementById("joystick"),
  joystickKnob: document.getElementById("joystick-knob"),
  statTime: document.getElementById("stat-time"),
  statLevel: document.getElementById("stat-level"),
  statWave: document.getElementById("stat-wave"),
  statKills: document.getElementById("stat-kills"),
  statExp: document.getElementById("stat-exp"),
  nicknamePanel: document.getElementById("nickname-panel"),
  nicknameInput: document.getElementById("nickname-input"),
  nicknameSaveButton: document.getElementById("nickname-save-button"),
};

const runtime = {
  mode: "menu",
  scene: null,
  lastSummary: null,
  pendingStart: false,
  settings: null,
  musicEnabled: true,
  leaderboardCategory: "score",
  leaderboardRequestId: 0,
  leaderboardRun: null,
  pendingLeaderboardRun: null,
};

const SETTINGS_STORAGE_KEY = "timeKillerSettings";

const SETTING_OPTIONS = {
  controlType: [
    { value: "keyboard", label: "Клавиатура" },
    { value: "joystick", label: "Джойстик" },
    { value: "cursor", label: "Курсор" },
    { value: "combined", label: "Комбинированное" },
  ],
  hudPosition: [
    { value: "top", label: "Сверху" },
    { value: "bottom", label: "Снизу" },
  ],
  joystickOpacity: [
    { value: "0", label: "0%" },
    { value: "25", label: "25%" },
    { value: "50", label: "50%" },
    { value: "75", label: "75%" },
  ],
};

function defaultSettings() {
  return {
    controlType: "combined",
    hudPosition: isMobileViewport() ? "top" : "bottom",
    joystickOpacity: "75",
  };
}

function isValidSetting(key, value) {
  return SETTING_OPTIONS[key]?.some((option) => option.value === value) || false;
}

function loadSettings() {
  const settings = defaultSettings();
  try {
    const raw = window.localStorage?.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return settings;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return settings;

    Object.keys(SETTING_OPTIONS).forEach((key) => {
      if (isValidSetting(key, parsed[key])) settings[key] = parsed[key];
    });
  } catch (error) {
    return settings;
  }
  return settings;
}

function saveSettings() {
  try {
    window.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(runtime.settings));
  } catch (error) {}
}

function settingLabel(key, value) {
  return SETTING_OPTIONS[key]?.find((option) => option.value === value)?.label || value;
}

function isJoystickOpacityLocked() {
  if (!runtime.settings || isMobileViewport()) return false;
  return runtime.settings.controlType === "keyboard" || runtime.settings.controlType === "cursor";
}

function updateSettingsUi(skipKey = "") {
  if (!runtime.settings) return;
  Object.keys(dom.settingLabels).forEach((key) => {
    if (key !== skipKey && dom.settingLabels[key]) {
      dom.settingLabels[key].textContent = settingLabel(key, runtime.settings[key]);
    }
  });
  dom.settingControlRow?.classList.toggle("hidden", isMobileViewport());
  const joystickLocked = isJoystickOpacityLocked();
  dom.settingJoystickRow?.classList.toggle("is-disabled", joystickLocked);
  dom.settingJoystickRow?.querySelectorAll(".settings-arrow").forEach((button) => {
    button.disabled = joystickLocked;
    button.setAttribute("aria-disabled", joystickLocked ? "true" : "false");
  });
}

function syncSettingsPanelHeight() {
  if (!dom.settingsPanel || !dom.menuCard) return;
  if (window.matchMedia?.("(max-width: 1180px)")?.matches) {
    dom.settingsPanel.style.removeProperty("--settings-panel-height");
    dom.leaderboardPanel?.style.removeProperty("--settings-panel-height");
    syncMobileLeaderboardOffset();
    return;
  }
  dom.menu?.style.removeProperty("--leaderboard-mobile-shift");
  const height = Math.round(dom.menuCard.getBoundingClientRect().height);
  if (height > 0) {
    dom.settingsPanel.style.setProperty("--settings-panel-height", `${height}px`);
    dom.leaderboardPanel?.style.setProperty("--settings-panel-height", `${height}px`);
  }
}

function syncMobileLeaderboardOffset() {
  if (!dom.menu || !dom.menuCard || !dom.leaderboardPanel) return;
  if (!isMobileViewport()) {
    dom.menu.style.removeProperty("--leaderboard-mobile-shift");
    return;
  }
  const panelRect = dom.leaderboardPanel.getBoundingClientRect();
  const menuRect = dom.menuCard.getBoundingClientRect();
  const baseTop = Number.isFinite(dom.menuCard.offsetTop) ? dom.menuCard.offsetTop : menuRect.top;
  const requiredShift = Math.ceil(panelRect.bottom + 12 - baseTop);
  const shift = Math.max(82, requiredShift);
  dom.menu.style.setProperty("--leaderboard-mobile-shift", `${shift}px`);
}

function syncNicknamePanelPosition() {
  if (!dom.gameOver || !dom.resultCard || !dom.nicknamePanel) return;
  const resultHeight = Math.round(dom.resultCard.getBoundingClientRect().height);
  const nicknameHeight = Math.round(dom.nicknamePanel.getBoundingClientRect().height);
  if (resultHeight > 0) dom.gameOver.style.setProperty("--result-card-half", `${Math.round(resultHeight / 2)}px`);
  if (nicknameHeight > 0) dom.gameOver.style.setProperty("--nickname-panel-half", `${Math.round(nicknameHeight / 2)}px`);
}

function setNicknamePanelActive(active) {
  if (!dom.nicknamePanel || !dom.nicknameInput || !dom.nicknameSaveButton) return;
  dom.nicknamePanel.setAttribute("aria-hidden", active ? "false" : "true");
  dom.nicknamePanel.classList.toggle("is-active", active);
  dom.nicknameInput.disabled = !active;
  dom.nicknameInput.tabIndex = active ? 0 : -1;
  if (!active) {
    dom.nicknameInput.blur();
    dom.nicknameSaveButton.disabled = true;
  } else {
    updateNicknameButton();
  }
}

function applySettings(skipLabelKey = "") {
  if (!runtime.settings) return;
  const hudTop = runtime.settings.hudPosition === "top";
  dom.shell.dataset.hudPosition = runtime.settings.hudPosition;
  dom.hud.classList.toggle("hud-top", hudTop);
  dom.hud.classList.toggle("hud-bottom", !hudTop);
  dom.levelToast.classList.toggle("toast-below-hud", hudTop);
  dom.joystick.style.setProperty("--joystick-opacity", String(Number(runtime.settings.joystickOpacity) / 100));
  updateSettingsUi(skipLabelKey);
  syncSettingsPanelHeight();
  positionLevelToast();
  runtime.scene?.applyRuntimeSettings();
}

function animateSettingLabel(key) {
  const label = dom.settingLabels[key];
  if (!label || !runtime.settings) return;
  window.clearTimeout(label._settingSwapTimer);
  window.clearTimeout(label._settingEnterTimer);
  label.classList.remove("value-enter");
  label.classList.add("value-exit");
  label._settingSwapTimer = window.setTimeout(() => {
    label.textContent = settingLabel(key, runtime.settings[key]);
    label.classList.remove("value-exit");
    void label.offsetWidth;
    label.classList.add("value-enter");
    label._settingEnterTimer = window.setTimeout(() => {
      label.classList.remove("value-enter");
    }, 190);
  }, 70);
}

function cycleSetting(key, direction) {
  const options = SETTING_OPTIONS[key];
  if (!options || !runtime.settings) return;
  if (key === "joystickOpacity" && isJoystickOpacityLocked()) return;
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === runtime.settings[key]));
  const nextIndex = (currentIndex + direction + options.length) % options.length;
  runtime.settings[key] = options[nextIndex].value;
  saveSettings();
  applySettings(key);
  animateSettingLabel(key);
}

const MENU_RAIN_TYPES = ["circle", "square", "triangle", "pentagon", "hexagon"];
const menuRainState = {
  shapes: [],
  active: new Set(),
  recentSpawns: [],
  spawnTimer: null,
  running: false,
  seed: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomDirection() {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function desiredMenuRainCount() {
  const width = window.innerWidth;
  if (width < 520) return 9;
  if (width < 820) return 12;
  const count = clamp(Math.round(width / 78), 16, 24);
  return isDesktopPointer() ? Math.max(count + 1, Math.ceil(count * 1.05)) : count;
}

function menuRainSpawnDelay() {
  return window.innerWidth < 620 ? randomRange(620, 1050) : randomRange(390, 820);
}

function createMenuShapeElement() {
  const element = document.createElement("span");
  element.className = "menu-shape";
  element.addEventListener("animationend", () => releaseMenuShape(element));
  element.addEventListener("pointerdown", handleMenuShapePointerDown);
  return element;
}

function releaseMenuShape(element) {
  element.className = "menu-shape";
  menuRainState.active.delete(element);
  element.__rainData = null;
}

function isDesktopPointer() {
  return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches || false;
}

function handleMenuShapePointerDown(event) {
  if (!isDesktopPointer() || event.button !== 0 || event.pointerType !== "mouse") return;
  const element = event.currentTarget;
  if (!menuRainState.active.has(element)) return;
  event.preventDefault();
  event.stopPropagation();
  popMenuShape(element);
}

function popMenuShape(element) {
  const rect = element.getBoundingClientRect();
  const root = dom.menuRain.getBoundingClientRect();
  const size = Math.max(1, rect.width || element.__rainData?.size || 22);
  element.style.setProperty("--pop-x", `${(rect.left - root.left + rect.width / 2).toFixed(1)}px`);
  element.style.setProperty("--pop-y", `${(rect.top - root.top + rect.height / 2).toFixed(1)}px`);
  element.style.setProperty("--pop-half", `${(size / 2).toFixed(1)}px`);
  element.style.setProperty("--size", `${size.toFixed(1)}px`);
  element.className = `menu-shape menu-shape-${element.__rainData?.type || "circle"} is-popping`;
}

function clearMenuRain() {
  window.clearTimeout(menuRainState.spawnTimer);
  menuRainState.spawnTimer = null;
  menuRainState.recentSpawns = [];
  Array.from(menuRainState.active).forEach((element) => releaseMenuShape(element));
}

function pickMenuRainSpawn(size) {
  const now = performance.now();
  const width = Math.max(1, window.innerWidth);
  const minGap = clamp(((size + 38) / width) * 100, 9, 18);
  menuRainState.recentSpawns = menuRainState.recentSpawns.filter((entry) => now - entry.time < 1500);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const x = randomRange(4, 96);
    const hasNearSpawn = menuRainState.recentSpawns.some((entry) => Math.abs(entry.x - x) < minGap);
    if (hasNearSpawn) continue;
    return { x, now };
  }

  return null;
}

function configureMenuShape(element) {
  const type = MENU_RAIN_TYPES[Math.floor(Math.random() * MENU_RAIN_TYPES.length)];
  const size = randomRange(15, type === "pentagon" ? 31 : 27) * (isDesktopPointer() ? 1.1 : 1);
  const spawn = pickMenuRainSpawn(size);
  if (!spawn) return false;

  const duration = randomRange(10.5, 17.5);
  const sway = randomRange(-34, 34);
  const startRotation = randomRange(-30, 30);
  const endRotation = startRotation + randomRange(140, 390) * (Math.random() < 0.5 ? -1 : 1);

  element.className = `menu-shape menu-shape-${type}`;
  element.style.setProperty("--size", `${size.toFixed(1)}px`);
  element.style.setProperty("--x", `${spawn.x.toFixed(2)}vw`);
  element.style.setProperty("--sway", `${sway.toFixed(1)}px`);
  element.style.setProperty("--duration", `${duration.toFixed(2)}s`);
  element.style.setProperty("--start-rotation", `${startRotation.toFixed(1)}deg`);
  element.style.setProperty("--end-rotation", `${endRotation.toFixed(1)}deg`);
  element.__rainData = { x: spawn.x, size, type, time: spawn.now };
  menuRainState.recentSpawns.push({ x: spawn.x, time: spawn.now });
  return true;
}

function syncMenuRain() {
  if (!dom.menuRain) return;
  const desiredCount = desiredMenuRainCount();

  while (menuRainState.shapes.length < desiredCount) {
    const element = createMenuShapeElement();
    menuRainState.seed += 1;
    menuRainState.shapes.push(element);
    dom.menuRain.appendChild(element);
  }

  while (menuRainState.shapes.length > desiredCount) {
    const inactiveIndex = menuRainState.shapes.findIndex((element) => !menuRainState.active.has(element));
    if (inactiveIndex < 0) break;
    const [element] = menuRainState.shapes.splice(inactiveIndex, 1);
    releaseMenuShape(element);
    element.remove();
  }
}

function spawnMenuRainShape() {
  if (!menuRainState.running || menuRainState.active.size >= desiredMenuRainCount()) return;
  syncMenuRain();
  const element = menuRainState.shapes.find((item) => !menuRainState.active.has(item));
  if (!element || !configureMenuShape(element)) return;

  menuRainState.active.add(element);
  void element.offsetWidth;
  element.classList.add("is-active");
}

function scheduleMenuRainSpawn(initial = false) {
  window.clearTimeout(menuRainState.spawnTimer);
  if (!menuRainState.running) return;
  const delay = initial ? randomRange(360, 720) : menuRainSpawnDelay();
  menuRainState.spawnTimer = window.setTimeout(() => {
    spawnMenuRainShape();
    scheduleMenuRainSpawn(false);
  }, delay);
}

function setMenuRainActive(active, reset = false) {
  if (!dom.menuRain) return;
  syncMenuRain();
  menuRainState.running = active;
  dom.menuRain.classList.toggle("is-running", active);

  if (!active) {
    clearMenuRain();
    return;
  }

  if (reset) clearMenuRain();
  scheduleMenuRainSpawn(true);
}

function updateHud(stats, wave) {
  dom.wave.textContent = `Волна ${wave}`;
  dom.time.textContent = formatTime(stats.survivalMs);
  dom.hpText.textContent = `${Math.ceil(stats.hp)} / ${stats.maxHp}`;
  dom.hpFill.style.transform = `scaleX(${clamp(stats.hp / stats.maxHp, 0, 1)})`;
  dom.level.textContent = `Level ${stats.level}`;
  dom.expText.textContent = `${formatExpValue(stats.exp)} / ${stats.nextExp}`;
  dom.expFill.style.transform = `scaleX(${clamp(stats.exp / stats.nextExp, 0, 1)})`;
}

function positionLevelToast() {
  const hudRect = dom.hud.getBoundingClientRect();
  const hudTop = runtime.settings?.hudPosition === "top";
  dom.levelToast.classList.toggle("toast-below-hud", hudTop);

  if (hudTop) {
    const top = hudRect.height > 0 && !dom.hud.classList.contains("hidden")
      ? hudRect.bottom + 10
      : 148;
    dom.levelToast.style.setProperty("--level-toast-top", `${Math.round(top)}px`);
    return;
  }

  const bottom = hudRect.height > 0 && !dom.hud.classList.contains("hidden")
    ? window.innerHeight - hudRect.top + 10
    : 148;
  dom.levelToast.style.setProperty("--level-toast-bottom", `${Math.round(bottom)}px`);
}

function resetLevelToast() {
  window.cancelAnimationFrame(showLevelToast.frame);
  window.clearTimeout(showLevelToast.timer);
  window.clearTimeout(showHudLevelPulse.timer);
  dom.levelToast.classList.remove("show");
  dom.levelToast.textContent = "LEVEL UP";
  dom.hud.classList.remove("level-pulse");
}

function showHudLevelPulse() {
  window.clearTimeout(showHudLevelPulse.timer);
  dom.hud.classList.remove("level-pulse");
  void dom.hud.offsetWidth;
  dom.hud.classList.add("level-pulse");
  showHudLevelPulse.timer = window.setTimeout(() => dom.hud.classList.remove("level-pulse"), 980);
}

function showLevelToast(levelsGained = 1) {
  window.cancelAnimationFrame(showLevelToast.frame);
  window.clearTimeout(showLevelToast.timer);
  dom.levelToast.classList.remove("show");
  positionLevelToast();
  dom.levelToast.textContent = levelsGained > 1 ? `LEVEL UP x${levelsGained}` : "LEVEL UP";
  void dom.levelToast.offsetWidth;
  showLevelToast.frame = window.requestAnimationFrame(() => {
    dom.levelToast.classList.add("show");
  });
  showLevelToast.timer = window.setTimeout(() => dom.levelToast.classList.remove("show"), 1160);
  showHudLevelPulse();
}

function showDamageFeedback() {
  dom.damageVignette.classList.add("show");
  window.clearTimeout(showDamageFeedback.timer);
  showDamageFeedback.timer = window.setTimeout(() => dom.damageVignette.classList.remove("show"), 130);
}

function showGameOver(summary) {
  resetLevelToast();
  hidePauseScreen();
  hideUpgradeScreen();
  setPauseButtonVisible(false);
  dom.statTime.textContent = summary.time;
  dom.statLevel.textContent = String(summary.level);
  dom.statWave.textContent = String(summary.wave);
  dom.statKills.textContent = String(summary.kills);
  dom.statExp.textContent = String(summary.exp);
  prepareNicknamePanel(summary);
  syncNicknamePanelPosition();
  setNicknamePanelActive(true);
  dom.hud.classList.add("hidden");
  transitionTo(() => {
    dom.gameOver.classList.add("screen-active");
  });
}

function transitionTo(callback) {
  dom.fadeLayer.classList.add("show");
  window.setTimeout(() => {
    callback();
    dom.fadeLayer.classList.remove("show");
  }, 185);
}

function hideScreens() {
  dom.menu.classList.remove("screen-active");
  dom.gameOver.classList.remove("screen-active");
  dom.pauseScreen.classList.remove("screen-active");
  dom.upgradeScreen.classList.remove("screen-active");
  setNicknamePanelActive(false);
  hideSettingsPanel();
  hideLeaderboardPanel();
}

function showPauseScreen() {
  dom.pauseScreen.classList.add("screen-active");
}

function hidePauseScreen() {
  dom.pauseScreen.classList.remove("screen-active");
}

function showUpgradeScreen(choices) {
  hidePauseScreen();
  dom.upgradeOptions.innerHTML = "";
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    const styleId = choice.styleId || choice.id.split("-")[0];
    button.className = `upgrade-option upgrade-option-${styleId}`;
    button.type = "button";
    button.innerHTML = `
      <span class="upgrade-badge">${choice.badge}</span>
      <span class="upgrade-title">${choice.title}</span>
      <span class="upgrade-description">${choice.description}</span>
    `;
    button.addEventListener("click", () => runtime.scene?.chooseUpgrade(index));
    dom.upgradeOptions.appendChild(button);
  });
  dom.upgradeScreen.classList.add("screen-active");
}

function hideUpgradeScreen() {
  dom.upgradeScreen.classList.remove("screen-active");
  dom.upgradeOptions.innerHTML = "";
}

function showSettingsPanel() {
  if (runtime.mode !== "menu") return;
  if (isMobileViewport()) hideLeaderboardPanel();
  syncSettingsPanelHeight();
  dom.menu.classList.add("settings-open");
  dom.settingsPanel.classList.add("open");
  dom.settingsPanel.setAttribute("aria-hidden", "false");
}

function hideSettingsPanel() {
  dom.menu.classList.remove("settings-open");
  dom.settingsPanel.classList.remove("open");
  dom.settingsPanel.setAttribute("aria-hidden", "true");
}

function toggleSettingsPanel() {
  if (runtime.mode !== "menu") return;
  if (dom.settingsPanel.classList.contains("open")) hideSettingsPanel();
  else showSettingsPanel();
}

function setLeaderboardCategoryMenuOpen(open) {
  dom.leaderboardCategoryMenu?.classList.toggle("open", open);
  dom.leaderboardCategoryMenu?.setAttribute("aria-hidden", open ? "false" : "true");
  dom.leaderboardCategoryButton?.setAttribute("aria-expanded", open ? "true" : "false");
}

function formatLeaderboardValue(category, value) {
  return leaderboards?.formatValue(category, value) || String(value ?? "—");
}

function setLeaderboardAnimation(element, index = 0) {
  element.classList.remove("leaderboard-animate-in");
  element.style.setProperty("--leaderboard-delay", `${Math.min(index * 42, 462)}ms`);
  void element.offsetWidth;
  element.classList.add("leaderboard-animate-in");
}

function renderLeaderboardRows(category, rows, playerRank) {
  if (!dom.leaderboardList) return;
  dom.leaderboardList.innerHTML = "";
  const normalizedRows = Array.isArray(rows) ? rows.slice(0, 10) : [];
  for (let i = 0; i < 10; i += 1) {
    const row = normalizedRows[i];
    const element = document.createElement("div");
    element.className = `leaderboard-row${row ? "" : " is-empty"}`;
    const place = document.createElement("span");
    const name = document.createElement("span");
    const value = document.createElement("span");
    place.textContent = `${i + 1}.`;
    name.textContent = row?.player_name || "—";
    value.textContent = row ? formatLeaderboardValue(category, row.value) : "—";
    element.append(place, name, value);
    setLeaderboardAnimation(element, i);
    dom.leaderboardList.appendChild(element);
  }
  dom.leaderboardPlayerRank.innerHTML = "";
  const rank = playerRank?.rank_position || playerRank?.place || null;
  if (playerRank && Number(rank) > 10) {
    const place = document.createElement("span");
    const name = document.createElement("span");
    const value = document.createElement("span");
    place.textContent = `${rank}.`;
    name.textContent = playerRank.player_name || "Ты";
    value.textContent = formatLeaderboardValue(category, playerRank.value);
    dom.leaderboardPlayerRank.append(place, name, value);
    dom.leaderboardPlayerRank.classList.add("show");
    setLeaderboardAnimation(dom.leaderboardPlayerRank, 10);
  } else {
    dom.leaderboardPlayerRank.classList.remove("show");
  }
  syncSettingsPanelHeight();
}

function renderLeaderboardMessage(message) {
  if (!dom.leaderboardList) return;
  dom.leaderboardList.innerHTML = "";
  const element = document.createElement("div");
  element.className = "leaderboard-message";
  element.textContent = message;
  setLeaderboardAnimation(element, 0);
  dom.leaderboardList.appendChild(element);
  dom.leaderboardPlayerRank.innerHTML = "";
  dom.leaderboardPlayerRank.classList.remove("show");
  syncSettingsPanelHeight();
}

async function loadLeaderboard(category = runtime.leaderboardCategory, force = false) {
  const service = leaderboards;
  const requestId = runtime.leaderboardRequestId + 1;
  runtime.leaderboardRequestId = requestId;
  if (!service) {
    renderLeaderboardMessage("Не удалось загрузить лидерборд");
    return;
  }
  runtime.leaderboardCategory = service.labels[category] ? category : "score";
  dom.leaderboardCategoryLabel.textContent = service.labels[runtime.leaderboardCategory];
  dom.leaderboardCategoryMenu?.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === runtime.leaderboardCategory);
  });
  renderLeaderboardMessage("Загрузка...");
  try {
    const data = await service.loadCategory(runtime.leaderboardCategory, force);
    if (requestId !== runtime.leaderboardRequestId) return;
    renderLeaderboardRows(runtime.leaderboardCategory, data.top, data.playerRank);
  } catch (error) {
    if (requestId !== runtime.leaderboardRequestId) return;
    renderLeaderboardMessage("Не удалось загрузить лидерборд");
  }
}

function showLeaderboardPanel() {
  if (runtime.mode !== "menu") return;
  if (isMobileViewport()) hideSettingsPanel();
  syncSettingsPanelHeight();
  dom.menu.classList.add("leaderboard-open");
  dom.leaderboardPanel.classList.add("open");
  dom.leaderboardPanel.setAttribute("aria-hidden", "false");
  loadLeaderboard(runtime.leaderboardCategory);
}

function hideLeaderboardPanel() {
  dom.menu.classList.remove("leaderboard-open");
  dom.leaderboardPanel?.classList.remove("open");
  dom.leaderboardPanel?.setAttribute("aria-hidden", "true");
  setLeaderboardCategoryMenuOpen(false);
}

function toggleLeaderboardPanel() {
  if (runtime.mode !== "menu") return;
  if (dom.leaderboardPanel.classList.contains("open")) hideLeaderboardPanel();
  else showLeaderboardPanel();
}

function updateNicknameButton() {
  const service = leaderboards;
  if (!service || !dom.nicknameInput || !dom.nicknameSaveButton) return;
  const value = service.normalizePlayerName(dom.nicknameInput.value);
  const saved = service.getSavedPlayerName();
  dom.nicknameSaveButton.disabled = !service.isValidPlayerName(value) || value === saved;
}

function setNicknameTaken(active) {
  if (!dom.nicknamePanel || !dom.nicknameInput) return;
  const message = active ? "Ник занят" : "";
  dom.nicknamePanel.toggleAttribute("data-status", Boolean(message));
  if (message) dom.nicknamePanel.setAttribute("data-status", message);
  dom.nicknameInput.classList.toggle("is-error", active);
}

function setNicknameSubmitError(error) {
  if (!dom.nicknamePanel || !dom.nicknameInput) return;
  const messages = {
    nickname_taken: "Ник занят",
    nickname_invalid: "Ник 3-16 символов",
    auth_failed: "Ошибка авторизации",
    submit_failed: "Ошибка отправки",
    leaderboard_unavailable: "Лидерборд недоступен",
  };
  if (error === "run_rejected") messages[error] = "Р РµР·СѓР»СЊС‚Р°С‚ РѕС‚РєР»РѕРЅРµРЅ";
  if (error === "submit_cooldown") messages[error] = "РџРѕРІС‚РѕСЂРё С‡РµСЂРµР· 15 СЃРµРє.";
  const message = messages[error] || "";
  dom.nicknamePanel.toggleAttribute("data-status", Boolean(message));
  if (message) dom.nicknamePanel.setAttribute("data-status", message);
  dom.nicknameInput.classList.toggle("is-error", Boolean(message));
}

function sanitizeNicknameInput() {
  const service = leaderboards;
  if (!service || !dom.nicknameInput) return;
  const sanitized = service.sanitizePlayerName
    ? service.sanitizePlayerName(dom.nicknameInput.value)
    : service.normalizePlayerName(dom.nicknameInput.value);
  if (dom.nicknameInput.value !== sanitized) dom.nicknameInput.value = sanitized;
  setNicknameTaken(false);
}

function prepareNicknamePanel(summary) {
  const service = leaderboards;
  if (!service) return;
  const savedName = service.getSavedPlayerName();
  if (dom.nicknameInput) dom.nicknameInput.value = service.sanitizePlayerName ? service.sanitizePlayerName(savedName) : savedName;
  runtime.pendingLeaderboardRun = {
    summary,
    runId: runtime.leaderboardRun?.runId || "",
    tracking: runtime.leaderboardRun || null,
    submitted: false,
    submitting: false,
  };
  updateNicknameButton();
}

function currentNicknameForSubmit() {
  const service = leaderboards;
  if (!service) return "";
  sanitizeNicknameInput();
  const typed = service.normalizePlayerName(dom.nicknameInput?.value || "");
  if (!service.isValidPlayerName(typed)) return "";
  const saved = service.savePlayerName(typed);
  if (dom.nicknameInput && saved) dom.nicknameInput.value = saved;
  updateNicknameButton();
  return saved;
}

function submitPendingLeaderboardRun() {
  const service = leaderboards;
  const pending = runtime.pendingLeaderboardRun;
  if (!service || !pending || pending.submitted || pending.submitting) return "skipped";
  const name = currentNicknameForSubmit();
  if (!name) {
    pending.submitted = true;
    runtime.pendingLeaderboardRun = null;
    return "skipped";
  }
  const summary = {
    ...pending.summary,
    build: pending.summary?.build
      ? {
          skills: { ...(pending.summary.build.skills || {}) },
          aidKits: pending.summary.build.aidKits || 0,
        }
      : null,
  };
  const initialRunId = pending.runId || pending.tracking?.runId || "";
  const runIdPromise = initialRunId
    ? Promise.resolve(initialRunId)
    : pending.tracking?.promise
      ? pending.tracking.promise.then((runId) => runId || pending.tracking?.runId || "")
      : Promise.resolve("");
  pending.submitting = true;
  pending.submitted = true;
  runtime.pendingLeaderboardRun = null;
  runIdPromise
    .then((runId) => {
      if (!service.canSubmitRun(summary, name, runId)) return false;
      return service.submitRun(summary, name, runId);
    })
    .then((submitted) => {
      pending.submitting = false;
      if (submitted && dom.leaderboardPanel?.classList.contains("open")) loadLeaderboard(runtime.leaderboardCategory, true);
    })
    .catch(() => {
      pending.submitting = false;
    });
  return "started";
}

function saveNicknameFromInput() {
  const service = leaderboards;
  if (!service || !dom.nicknameInput) return;
  sanitizeNicknameInput();
  const saved = service.savePlayerName(dom.nicknameInput.value);
  if (saved) {
    dom.nicknameInput.value = saved;
    updateNicknameButton();
  }
}

function setPauseButtonVisible(visible) {
  dom.pauseButton.classList.toggle("hidden", !visible);
  dom.musicButton?.classList.toggle("hidden", !visible);
  updateMusicButton();
}


"use strict";

const MUSIC_STORAGE_KEY = "timeKillerMusicEnabled";
const MUSIC_NORMAL_VOLUME = 0.25;
const MUSIC_PAUSE_VOLUME = 0.1;
const MUSIC_FADE_MS = 260;
const musicState = {
  audio: null,
  fadeFrame: null,
  fadeEndTimer: null,
  pauseTimer: null,
  runStarted: false,
  savedTime: 0,
  hasRunStartPosition: false,
};

function loadMusicEnabled() {
  try {
    const raw = window.localStorage?.getItem(MUSIC_STORAGE_KEY);
    if (raw === null || raw === undefined) return true;
    return raw !== "false";
  } catch (error) {
    return true;
  }
}

function saveMusicEnabled() {
  try {
    window.localStorage?.setItem(MUSIC_STORAGE_KEY, runtime.musicEnabled ? "true" : "false");
  } catch (error) {}
}

function ensureMusicAudio() {
  if (!musicState.audio) {
    const audio = new Audio("music.mp3");
    audio.loop = true;
    audio.preload = "metadata";
    audio.volume = 0;
    musicState.audio = audio;
  }
  return musicState.audio;
}

function updateMusicButton() {
  if (!dom.musicButton) return;
  dom.musicButton.classList.toggle("is-off", !runtime.musicEnabled);
  dom.musicButton.setAttribute("aria-pressed", runtime.musicEnabled ? "true" : "false");
  dom.musicButton.setAttribute("aria-label", runtime.musicEnabled ? "Music on" : "Music off");
}

function musicTargetVolume() {
  if (!musicState.runStarted || runtime.mode === "menu") return 0;
  if (!runtime.musicEnabled) return 0;
  if (runtime.mode === "paused") return MUSIC_PAUSE_VOLUME;
  return MUSIC_NORMAL_VOLUME;
}

function setMusicGainNow(value) {
  const target = clamp(value, 0, 1);
  if (musicState.audio) musicState.audio.volume = target;
}

function cancelMusicFade() {
  window.cancelAnimationFrame(musicState.fadeFrame);
  window.clearTimeout(musicState.fadeEndTimer);
  window.clearTimeout(musicState.pauseTimer);
  musicState.fadeFrame = null;
  musicState.fadeEndTimer = null;
  musicState.pauseTimer = null;
}

function fadeMusicVolume(targetVolume, options = {}) {
  const audio = ensureMusicAudio();
  const duration = options.duration ?? MUSIC_FADE_MS;
  const pauseWhenDone = options.pauseWhenDone || false;
  const resetWhenDone = options.resetWhenDone || false;
  const target = clamp(targetVolume, 0, 1);
  cancelMusicFade();

  const finish = () => {
    audio.volume = target;
    if (pauseWhenDone) {
      musicState.pauseTimer = window.setTimeout(() => {
        if (!resetWhenDone && Number.isFinite(audio.currentTime)) {
          musicState.savedTime = audio.currentTime;
        }
        audio.pause();
        if (resetWhenDone) {
          try {
            audio.currentTime = 0;
          } catch (error) {}
        }
      }, 70);
    } else if (resetWhenDone) {
      try {
        audio.currentTime = 0;
      } catch (error) {}
    }
  };

  if (target > 0 && audio.paused) {
    setMusicGainNow(0);
    const playResult = audio.play();
    if (playResult?.catch) playResult.catch(() => {});
  }

  if (duration <= 0 || Math.abs(audio.volume - target) < 0.01) {
    finish();
    return;
  }

  const startVolume = audio.volume;
  const startTime = performance.now();
  const step = () => {
    const progress = clamp((performance.now() - startTime) / duration, 0, 1);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    audio.volume = startVolume + (target - startVolume) * eased;
    if (progress >= 1) {
      musicState.fadeFrame = null;
      finish();
      return;
    }
    musicState.fadeFrame = window.requestAnimationFrame(step);
  };
  musicState.fadeFrame = window.requestAnimationFrame(step);
}

function syncMusicVolume(options = {}) {
  fadeMusicVolume(musicTargetVolume(), options);
}

function startRunMusic() {
  musicState.runStarted = true;
  updateMusicButton();
  if (!runtime.musicEnabled) return;

  const audio = ensureMusicAudio();
  cancelMusicFade();
  const startPlayback = () => {
    if (!musicState.runStarted) return;
    if (!musicState.hasRunStartPosition && Number.isFinite(audio.duration) && audio.duration > 2) {
      try {
        audio.currentTime = Math.random() * Math.max(1, audio.duration - 1);
        musicState.hasRunStartPosition = true;
      } catch (error) {}
    } else if (musicState.savedTime > 0 && Number.isFinite(audio.duration)) {
      try {
        audio.currentTime = Math.min(musicState.savedTime, Math.max(0, audio.duration - 0.5));
      } catch (error) {}
    }
    setMusicGainNow(0);
    const playResult = audio.play();
    if (playResult?.then) {
      playResult
        .then(() => syncMusicVolume())
        .catch(() => {});
    } else {
      syncMusicVolume();
    }
  };

  if (audio.readyState >= 1) {
    startPlayback();
  } else {
    setMusicGainNow(0);
    audio.addEventListener("loadedmetadata", startPlayback, { once: true });
    audio.load();
    const primeResult = audio.play();
    if (primeResult?.catch) primeResult.catch(() => {});
  }
}

function stopRunMusic(immediate = false) {
  musicState.runStarted = false;
  musicState.savedTime = 0;
  musicState.hasRunStartPosition = false;
  if (!musicState.audio) return;
  fadeMusicVolume(0, {
    duration: immediate ? 0 : MUSIC_FADE_MS,
    pauseWhenDone: true,
    resetWhenDone: true,
  });
}

function setMusicPaused(paused) {
  if (!musicState.runStarted || !runtime.musicEnabled) return;
  syncMusicVolume({ duration: MUSIC_FADE_MS });
}

function setMusicEnabled(enabled) {
  runtime.musicEnabled = Boolean(enabled);
  saveMusicEnabled();
  updateMusicButton();

  if (!musicState.runStarted) return;
  if (!runtime.musicEnabled) {
    if (musicState.audio && Number.isFinite(musicState.audio.currentTime)) {
      musicState.savedTime = musicState.audio.currentTime;
    }
    syncMusicVolume({ duration: MUSIC_FADE_MS, pauseWhenDone: true });
    return;
  }

  if (!musicState.audio) {
    startRunMusic();
    return;
  }

  if (musicState.audio.paused && musicState.savedTime > 0 && Number.isFinite(musicState.audio.duration)) {
    try {
      musicState.audio.currentTime = Math.min(musicState.savedTime, Math.max(0, musicState.audio.duration - 0.5));
    } catch (error) {}
  }
  syncMusicVolume({ duration: MUSIC_FADE_MS });
}

function toggleMusic() {
  setMusicEnabled(!runtime.musicEnabled);
}


"use strict";

const leaderboards = (() => {
  const PROJECT_URL = "https://hbojcmkohqxwirysdalg.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_stgEvQyS4pIa85D6Qei08A_wui0kw7v";
  const PLAYER_NAME_KEY = "timeKillerPlayerName";
  const CACHE_MS = 60000;
  const CATEGORY_LABELS = {
    score: "Очки",
    time: "Время",
    kills: "Убийства",
  };
  const ABILITY_MAX_LEVELS = {
    razer: 3,
    shooter: 3,
    bazooka: 3,
    arrow: 3,
    masochism: 3,
    bloody: 3,
    knockback: 2,
    energyDrink: 3,
    thor: 3,
  };
  const state = {
    client: null,
    sessionPromise: null,
    cache: new Map(),
    submitError: "",
    checkpointInFlight: false,
  };

  function createClient() {
    if (state.client) return state.client;
    if (!window.supabase?.createClient) return null;
    state.client = window.supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return state.client;
  }

  async function ensureSession() {
    const client = createClient();
    if (!client?.auth) return null;
    if (state.sessionPromise) return state.sessionPromise;
    state.sessionPromise = (async () => {
      try {
        const current = await client.auth.getSession();
        if (current.data?.session) return current.data.session;
        const anonymous = await client.auth.signInAnonymously();
        if (anonymous.error) return null;
        return anonymous.data?.session || null;
      } catch (error) {
        return null;
      } finally {
        state.sessionPromise = null;
      }
    })();
    return state.sessionPromise;
  }

  function normalizePlayerName(value) {
    return String(value || "").trim();
  }

  function sanitizePlayerName(value) {
    return normalizePlayerName(value).replace(/[^A-Za-zА-Яа-яЁё0-9_-]/gu, "").slice(0, 16);
  }

  function isValidPlayerName(value) {
    const name = normalizePlayerName(value);
    return /^[A-Za-zА-Яа-яЁё0-9_-]{3,16}$/u.test(name);
  }

  function getSavedPlayerName() {
    try {
      const value = window.localStorage?.getItem(PLAYER_NAME_KEY) || "";
      return isValidPlayerName(value) ? normalizePlayerName(value) : "";
    } catch (error) {
      return "";
    }
  }

  function savePlayerName(value) {
    const name = normalizePlayerName(value);
    if (!isValidPlayerName(name)) return "";
    try {
      window.localStorage?.setItem(PLAYER_NAME_KEY, name);
    } catch (error) {}
    return name;
  }

  function roundNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : NaN;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function normalizeBuild(value) {
    const source = value && typeof value === "object" ? value : {};
    const rawSkills = source.skills && typeof source.skills === "object" ? source.skills : {};
    const skills = {};
    Object.keys(rawSkills).forEach((id) => {
      const maxLevel = ABILITY_MAX_LEVELS[id];
      const level = roundNumber(rawSkills[id]);
      if (!maxLevel || !Number.isFinite(level) || level <= 0) return;
      skills[id] = Math.min(maxLevel, level);
    });
    const rawAidKits = roundNumber(source.aidKits || 0);
    const aidKits = Number.isFinite(rawAidKits) ? Math.max(0, Math.min(99, rawAidKits)) : 0;
    return { skills, aidKits };
  }

  function buildUpgradeCount(build) {
    const skills = build?.skills || {};
    return Object.keys(skills).reduce((sum, id) => sum + Math.max(0, roundNumber(skills[id])), 0) + Math.max(0, roundNumber(build?.aidKits || 0));
  }

  function buildMetricsPayload(summary, runId) {
    const build = normalizeBuild(summary?.build);
    const payload = {
      runId: String(runId || summary?.runId || ""),
      score: roundNumber(summary?.score),
      survivalTime: roundNumber(summary?.survivalTime),
      kills: roundNumber(summary?.kills),
      wave: roundNumber(summary?.wave),
      level: roundNumber(summary?.level),
      exp: roundNumber(summary?.expValue ?? summary?.exp),
      deviceType: summary?.deviceType === "mobile" ? "mobile" : "desktop",
      build,
    };
    if (!isUuid(payload.runId)) return null;
    if (payload.score < 0 || payload.score > 50000) return null;
    if (payload.survivalTime < 10 || payload.survivalTime > 3600) return null;
    if (payload.kills < 0 || payload.kills > 100000) return null;
    if (payload.wave < 1 || payload.wave > 1000) return null;
    if (payload.level < 1 || payload.level > 100) return null;
    if (payload.exp < 0 || payload.exp > 50000) return null;
    if (!Number.isFinite(payload.score + payload.survivalTime + payload.kills + payload.wave + payload.level + payload.exp)) return null;
    if (payload.wave > Math.floor(payload.survivalTime / 10) + 5) return null;
    if (payload.kills > payload.survivalTime * 6.5 + 160) return null;
    if (payload.exp > payload.survivalTime * 70 + 1000) return null;
    if (payload.level > Math.floor(payload.survivalTime / 12) + 8) return null;
    if (buildUpgradeCount(build) > Math.floor(payload.level / 3) + 2) return null;
    const maxScore = Math.min(50000, payload.survivalTime * 75 + 1000);
    if (payload.score > maxScore || Math.abs(payload.score - payload.exp) > 5) return null;
    return payload;
  }

  function buildRunPayload(summary, playerName, runId) {
    const name = normalizePlayerName(playerName);
    const payload = buildMetricsPayload(summary, runId);
    if (!payload || !isValidPlayerName(name)) return null;
    payload.playerName = name;
    return payload;
  }

  function buildCheckpointPayload(summary, runId) {
    return buildMetricsPayload(summary, runId);
  }

  function canSubmitRun(summary, playerName, runId) {
    return Boolean(buildRunPayload(summary, playerName, runId));
  }

  async function startRun() {
    state.submitError = "";
    const session = await ensureSession();
    const client = createClient();
    if (!client) {
      state.submitError = "leaderboard_unavailable";
      return "";
    }
    if (!session) {
      state.submitError = "auth_failed";
      return "";
    }
    try {
      const result = await client.rpc("start_leaderboard_run");
      if (result.error) {
        state.submitError = parseSubmitError(result.error);
        return "";
      }
      return isUuid(result.data) ? result.data : "";
    } catch (error) {
      state.submitError = parseSubmitError(error);
      return "";
    }
  }

  async function submitRun(summary, playerName, runId) {
    const payload = buildRunPayload(summary, playerName, runId);
    if (!payload) return false;
    state.submitError = "";
    const session = await ensureSession();
    const client = createClient();
    if (!client) {
      state.submitError = "leaderboard_unavailable";
      return false;
    }
    if (!session) {
      state.submitError = "auth_failed";
      return false;
    }
    try {
      const result = await client.rpc("submit_leaderboard_run", {
        p_run_id: payload.runId,
        p_player_name: payload.playerName,
        p_score: payload.score,
        p_survival_time: payload.survivalTime,
        p_kills: payload.kills,
        p_wave: payload.wave,
        p_level: payload.level,
        p_exp: payload.exp,
        p_device_type: payload.deviceType,
        p_build: payload.build,
      });
      if (result.error) {
        state.submitError = parseSubmitError(result.error);
        return false;
      }
      if (result.data !== true) {
        state.submitError = "run_rejected";
        return false;
      }
      state.cache.clear();
      return true;
    } catch (error) {
      state.submitError = parseSubmitError(error);
      return false;
    }
  }

  async function submitCheckpoint(summary, runId) {
    if (state.checkpointInFlight) return false;
    const payload = buildCheckpointPayload(summary, runId);
    if (!payload) return false;
    const client = createClient();
    if (!client) return false;
    state.checkpointInFlight = true;
    try {
      await ensureSession();
      const result = await client.rpc("submit_leaderboard_checkpoint", {
        p_run_id: payload.runId,
        p_score: payload.score,
        p_survival_time: payload.survivalTime,
        p_kills: payload.kills,
        p_wave: payload.wave,
        p_level: payload.level,
        p_exp: payload.exp,
        p_build: payload.build,
      });
      return !result.error;
    } catch (error) {
      return false;
    } finally {
      state.checkpointInFlight = false;
    }
  }

  function parseSubmitError(error) {
    const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    if (text.includes("nickname_taken")) return "nickname_taken";
    if (text.includes("invalid_player_name") || text.includes("value too long") || text.includes("character varying(8)") || text.includes("character varying(12)")) return "nickname_invalid";
    if (text.includes("auth_required")) return "auth_failed";
    if (text.includes("submit_cooldown") || text.includes("start_cooldown")) return "submit_cooldown";
    if (text.includes("run_not_active") || text.includes("run_already_submitted") || text.includes("invalid_run_id") || text.includes("run_rejected") || text.includes("invalid_elapsed_time") || text.includes("invalid_run_values") || text.includes("invalid_score")) return "run_rejected";
    return "submit_failed";
  }

  function getSubmitError() {
    return state.submitError;
  }

  function normalizeCategory(category) {
    return CATEGORY_LABELS[category] ? category : "score";
  }

  async function loadCategory(category, force = false) {
    const key = normalizeCategory(category);
    const cached = state.cache.get(key);
    const now = Date.now();
    if (!force && cached && now - cached.loadedAt < CACHE_MS) return cached.data;
    const client = createClient();
    if (!client) throw new Error("leaderboard_unavailable");
    await ensureSession();
    const topResult = await client.rpc("get_leaderboard_top", { p_category: key });
    if (topResult.error) throw topResult.error;
    let playerRank = null;
    try {
      const rankResult = await client.rpc("get_leaderboard_player_rank", { p_category: key });
      if (!rankResult.error) {
        playerRank = Array.isArray(rankResult.data) ? rankResult.data[0] || null : rankResult.data || null;
      }
    } catch (error) {
      playerRank = null;
    }
    const data = {
      top: Array.isArray(topResult.data) ? topResult.data : [],
      playerRank,
    };
    state.cache.set(key, { loadedAt: now, data });
    return data;
  }

  function formatValue(category, value) {
    const number = roundNumber(value);
    if (!Number.isFinite(number)) return "—";
    if (category === "time") {
      const minutes = Math.floor(number / 60);
      const seconds = number % 60;
      return `${minutes} м. ${seconds} с.`;
    }
    return String(number);
  }

  ensureSession();

  return Object.freeze({
    labels: CATEGORY_LABELS,
    loadCategory,
    startRun,
    submitRun,
    submitCheckpoint,
    canSubmitRun,
    getSubmitError,
    getSavedPlayerName,
    savePlayerName,
    normalizePlayerName,
    sanitizePlayerName,
    isValidPlayerName,
    formatValue,
  });
})();


(() => {
  "use strict";

  class Player {
    constructor(scene) {
      this.scene = scene;
      this.speed = CONFIG.playerSpeed;
      this.radius = CONFIG.playerRadius;
      this.currentVelocity = new Phaser.Math.Vector2(0, 0);
      this.body = scene.physics.add.image(0, 0, "playerTexture");
      this.body.setCircle(this.radius);
      this.body.setOffset(0, 0);
      this.body.setDamping(false);
      this.body.setDrag(0);
      this.body.setMaxVelocity(this.speed);
      this.body.setDepth(8);
      this.body.displayWidth = this.radius * 2;
      this.body.displayHeight = this.radius * 2;
      this.body.refreshBody();
      this.baseScaleX = this.body.scaleX;
      this.baseScaleY = this.body.scaleY;

      this.ring = scene.add.graphics();
      this.ring.setDepth(7);
    }

    reset() {
      this.body.setPosition(0, 0);
      this.body.setVelocity(0, 0);
      this.resetVisual();
      this.currentVelocity.set(0, 0);
      this.ring.clear();
    }

    update(inputVector, delta) {
      const desiredX = inputVector.x * this.speed;
      const desiredY = inputVector.y * this.speed;
      const hasInput = Math.hypot(inputVector.x, inputVector.y) > 0.01;
      const rate = hasInput ? CONFIG.playerAcceleration : CONFIG.playerBrake;
      const blend = 1 - Math.exp((-rate * delta) / 1000);

      this.currentVelocity.x = Phaser.Math.Linear(this.currentVelocity.x, desiredX, blend);
      this.currentVelocity.y = Phaser.Math.Linear(this.currentVelocity.y, desiredY, blend);

      if (!hasInput && this.currentVelocity.lengthSq() < 4) {
        this.currentVelocity.set(0, 0);
      }

      this.body.setVelocity(this.currentVelocity.x, this.currentVelocity.y);
      this.draw();
    }

    draw() {
      this.ring.clear();
      this.ring.lineStyle(1, 0xffffff, 0.12);
      this.ring.strokeCircle(this.body.x, this.body.y, this.radius + 7);
    }

    pulseDamage() {
      this.scene.tweens.killTweensOf(this.body);
      this.body.setAlpha(1);
      this.body.setScale(this.baseScaleX, this.baseScaleY);
      this.scene.tweens.add({
        targets: this.body,
        alpha: 0.55,
        scaleX: this.baseScaleX * 1.08,
        scaleY: this.baseScaleY * 1.08,
        duration: 65,
        yoyo: true,
        ease: "Sine.easeOut",
        onComplete: () => this.resetVisual(),
      });
    }

    resetVisual() {
      this.scene.tweens.killTweensOf(this.body);
      this.body.setAlpha(1);
      this.body.setScale(this.baseScaleX, this.baseScaleY);
    }
  }

  class Bullet {
    constructor(scene) {
      this.scene = scene;
      this.sprite = scene.physics.add.image(0, 0, "bulletTexture");
      this.sprite.setDepth(6);
      this.sprite.setCircle(CONFIG.bulletRadius, 7 - CONFIG.bulletRadius, 7 - CONFIG.bulletRadius);
      this.sprite.setActive(false).setVisible(false);
      this.sprite.body.enable = false;
      this.spawnedAt = 0;
      this.startX = 0;
      this.startY = 0;
      this.trail = scene.add.graphics();
      this.trail.setDepth(4);
      this.active = false;
      this.fading = false;
      this.kind = "bullet";
      this.damage = CONFIG.bulletDamage;
      this.radius = CONFIG.bulletRadius;
      this.lifeMs = CONFIG.bulletLifeMs;
      this.maxDistance = CONFIG.bulletMaxDistance;
      this.trailColor = 0x5b9dff;
      this.explosionRadius = 0;
      this.pierceLimit = 1;
      this.arrowLevel = 0;
      this.appliesBloody = false;
      this.appliesKnockback = false;
      this.hitEnemies = new Set();
    }

    fire(x, y, dirX, dirY, now, options = {}) {
      this.scene.tweens.killTweensOf(this.sprite);
      const textureKey = options.textureKey || "bulletTexture";
      this.kind = options.kind || "bullet";
      this.damage = options.damage ?? CONFIG.bulletDamage;
      this.radius = options.radius ?? CONFIG.bulletRadius;
      this.lifeMs = options.lifeMs ?? CONFIG.bulletLifeMs;
      this.maxDistance = options.maxDistance ?? CONFIG.bulletMaxDistance;
      this.trailColor = options.trailColor ?? 0x5b9dff;
      this.explosionRadius = options.explosionRadius ?? 0;
      this.pierceLimit = options.pierceLimit ?? 1;
      this.arrowLevel = options.arrowLevel ?? 0;
      this.appliesBloody = options.appliesBloody ?? false;
      this.appliesKnockback = options.appliesKnockback ?? false;
      this.hitEnemies.clear();
      this.startX = x;
      this.startY = y;
      this.spawnedAt = now;
      this.sprite.setTexture(textureKey);
      this.sprite.setPosition(x, y);
      this.sprite.setActive(true).setVisible(true);
      this.sprite.setAlpha(1);
      this.sprite.setScale(1);
      this.sprite.setRotation(options.rotation ?? Math.atan2(dirY, dirX));
      this.sprite.setCircle(this.radius, this.sprite.frame.width / 2 - this.radius, this.sprite.frame.height / 2 - this.radius);
      this.sprite.body.enable = true;
      this.sprite.body.setVelocity(dirX * (options.speed ?? CONFIG.bulletSpeed), dirY * (options.speed ?? CONFIG.bulletSpeed));
      this.active = true;
      this.fading = false;
      this.drawTrail();
    }

    update(now) {
      if (!this.active) return;
      const traveled = Phaser.Math.Distance.Between(this.startX, this.startY, this.sprite.x, this.sprite.y);
      if (now - this.spawnedAt > this.lifeMs || traveled > this.maxDistance) {
        this.disable(true);
        return;
      }
      this.drawTrail();
    }

    drawTrail() {
      const body = this.sprite.body;
      const vx = body ? body.velocity.x : 0;
      const vy = body ? body.velocity.y : 0;
      const len = Math.hypot(vx, vy) || 1;
      const tx = this.sprite.x - (vx / len) * (this.kind === "bazooka" ? 24 : 16);
      const ty = this.sprite.y - (vy / len) * (this.kind === "bazooka" ? 24 : 16);
      this.trail.clear();
      this.trail.lineStyle(this.kind === "bazooka" ? 5 : 3, this.trailColor, this.kind === "bazooka" ? 0.2 : 0.18);
      this.trail.lineBetween(tx, ty, this.sprite.x, this.sprite.y);
    }

    disable(animated = true) {
      if (this.fading && animated) return;
      this.active = false;
      this.sprite.body.enable = false;
      this.sprite.body.setVelocity(0, 0);
      this.trail.clear();

      if (!animated || !this.sprite.visible) {
        this.scene.tweens.killTweensOf(this.sprite);
        this.fading = false;
        this.sprite.setActive(false).setVisible(false);
        this.sprite.setAlpha(1);
        this.sprite.setScale(1);
        this.appliesBloody = false;
        this.appliesKnockback = false;
        this.hitEnemies.clear();
        return;
      }

      this.fading = true;
      this.sprite.setActive(false);
      this.scene.tweens.killTweensOf(this.sprite);
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: CONFIG.bulletFadeMs,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.fading = false;
          this.sprite.setVisible(false);
          this.sprite.setAlpha(1);
          this.sprite.setScale(1);
          this.appliesBloody = false;
          this.appliesKnockback = false;
          this.hitEnemies.clear();
        },
      });
    }
  }

  class ExpPickup {
    constructor(scene) {
      this.scene = scene;
      this.container = scene.add.container(0, 0);
      this.container.setDepth(3);
      this.body = scene.physics.add.existing(this.container);
      this.body.body.setCircle(8);
      this.body.body.setOffset(-8, -8);
      this.body.body.enable = false;
      this.value = 1;
      this.spawnedAt = 0;
      this.ageMs = 0;
      this.active = false;
      this.collecting = false;
      this.attracting = false;
      this.shape = null;
      this.size = 5.2;
    }

    spawn(x, y, value, now, maxSize = Infinity) {
      this.value = value;
      this.spawnedAt = now;
      this.ageMs = 0;
      this.collecting = false;
      this.attracting = false;
      this.size = Math.min(expSizeForValue(value), maxSize);
      this.container.setPosition(x, y);
      this.container.setScale(1);
      this.container.setAlpha(1);
      this.container.setActive(true).setVisible(true);
      this.container.removeAll(true);
      const size = this.size;
      const graphics = this.scene.add.graphics();
      graphics.lineStyle(value >= 4 ? 1.4 : 1, 0xf2dda0, 0.82);
      graphics.fillStyle(0xd5c27a, 0.95);
      graphics.fillPoints(
        [
          new Phaser.Geom.Point(0, -size),
          new Phaser.Geom.Point(size, 0),
          new Phaser.Geom.Point(0, size),
          new Phaser.Geom.Point(-size, 0),
        ],
        true
      );
      graphics.strokePoints(
        [
          new Phaser.Geom.Point(0, -size),
          new Phaser.Geom.Point(size, 0),
          new Phaser.Geom.Point(0, size),
          new Phaser.Geom.Point(-size, 0),
        ],
        true
      );
      this.shape = graphics;
      this.container.add(graphics);
      const bodyRadius = size + 2;
      this.body.body.setCircle(bodyRadius);
      this.body.body.setOffset(-bodyRadius, -bodyRadius);
      this.body.body.enable = true;
      this.body.body.setVelocity(0, 0);
      this.active = true;
    }

    update(player, now, delta) {
      if (!this.active) return false;

      this.container.rotation += delta / 850;
      const dx = player.body.x - this.container.x;
      const dy = player.body.y - this.container.y;
      const distance = Math.hypot(dx, dy) || 1;

      if (distance < CONFIG.pickupRadius) {
        return true;
      }

      if (distance < CONFIG.magnetRadius) {
        this.attracting = true;
        const strength = Phaser.Math.Linear(150, 480, 1 - distance / CONFIG.magnetRadius);
        this.body.body.setVelocity((dx / distance) * strength, (dy / distance) * strength);
      } else {
        this.attracting = false;
        this.ageMs += delta;
        const fadeStart = Math.max(0, CONFIG.expLifeMs - CONFIG.expFadeMs);
        if (this.ageMs >= fadeStart) {
          const remaining = Math.max(0, CONFIG.expLifeMs - this.ageMs);
          this.container.setAlpha(Phaser.Math.Clamp(remaining / CONFIG.expFadeMs, 0, 1));
        } else if (this.container.alpha !== 1) {
          this.container.setAlpha(1);
        }
        if (this.ageMs >= CONFIG.expLifeMs) {
          this.disable();
          return false;
        }
        this.body.body.velocity.scale(0.9);
      }

      return false;
    }

    collect() {
      if (!this.active || this.collecting) return;
      this.active = false;
      this.collecting = true;
      this.body.body.enable = false;
      this.body.body.setVelocity(0, 0);
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: 120,
        ease: "Sine.easeOut",
        onComplete: () => this.disable(),
      });
    }

    disable() {
      this.active = false;
      this.collecting = false;
      this.attracting = false;
      this.scene.tweens.killTweensOf(this.container);
      this.body.body.enable = false;
      this.body.body.setVelocity(0, 0);
      this.container.setActive(false).setVisible(false);
      this.container.removeAll(true);
      this.container.setAlpha(1);
      this.container.setScale(1);
    }
  }

  class GameScene extends Phaser.Scene {
    constructor() {
      super("GameScene");
      this.controls = {
        keys: null,
        cursors: null,
        joystick: { active: false, pointerId: null, originX: 0, originY: 0, x: 0, y: 0, touchFallback: false },
        cursor: { inside: false, screenX: 0, screenY: 0, worldX: 0, worldY: 0 },
      };
      this.stats = {};
      this.state = "menu";
      this.enemyPool = [];
      this.bulletPool = [];
      this.expPool = [];
      this.activeEnemies = [];
      this.activeBullets = [];
      this.activeExp = [];
      this.deathEffects = [];
      this.razerBlades = [];
      this.razerHitTimes = new Map();
      this.razerBaseAngle = 0;
      this.razerVisualLevel = 0;
      this.thorStrikes = [];
      this.thorCycleHits = new Map();
      this.thorCycleId = 0;
      this.nextThorAt = 0;
      this.resizeFrame = null;
      this.resizeForce = false;
      this.superpowers = {};
      this.ownedSuperpowers = [];
      this.upgradeQueue = [];
      this.currentUpgradeChoices = [];
      this.bazookaAttackCounter = 0;
    }

    preload() {}

    create() {
      runtime.scene = this;
      this.createTextures();
      this.cameras.main.setBackgroundColor("#141311");
      this.physics.world.setBounds(-1000000, -1000000, 2000000, 2000000);

      this.grid = this.add.graphics();
      this.grid.setScrollFactor(0);
      this.grid.setDepth(-100);

      this.enemyGroup = this.physics.add.group();
      this.bulletGroup = this.physics.add.group();
      this.expGroup = this.physics.add.group();

      this.player = new Player(this);
      this.cameras.main.setZoom(gameplayCameraZoom());
      this.configureCameraFollow();

      this.waveDirector = new WaveDirector(this);
      this.setupInput();
      this.setupPools();
      this.setupOverlaps();
      this.resetGame();
      this.pauseForMenu();

      window.addEventListener("resize", () => this.queueResize());
      window.addEventListener("orientationchange", () => this.queueResize());
      document.addEventListener("fullscreenchange", () => this.queueResize(true));
      document.addEventListener("webkitfullscreenchange", () => this.queueResize(true));
      this.scale.on("resize", () => this.queueResize());
      this.queueResize(true);
      applySettings();

      if (runtime.pendingStart) {
        runtime.pendingStart = false;
        this.startGame();
      }
    }

    queueResize(force = false) {
      this.resizeForce = this.resizeForce || force;
      if (this.resizeFrame) return;
      this.resizeFrame = window.requestAnimationFrame(() => {
        const shouldForce = this.resizeForce;
        this.resizeFrame = null;
        this.resizeForce = false;
        this.handleResize(shouldForce);
      });
    }

    viewportSize() {
      const rect = dom.container.getBoundingClientRect();
      const width = Math.max(1, Math.round(window.innerWidth || rect.width || this.scale.gameSize.width));
      const height = Math.max(1, Math.round(window.innerHeight || rect.height || this.scale.gameSize.height));
      return { width, height };
    }

    handleResize(force = false) {
      const { width, height } = this.viewportSize();
      const gameWidth = Math.round(this.scale.gameSize.width);
      const gameHeight = Math.round(this.scale.gameSize.height);

      this.clearJoystick();

      if (gameWidth !== width || gameHeight !== height) {
        this.scale.resize(width, height);
      }

      this.cameras.main.roundPixels = false;
      this.cameras.main.setViewport(0, 0, width, height);
      this.cameras.main.setSize(width, height);
      this.cameras.main.setZoom(gameplayCameraZoom());

      if (this.player?.body && (force || this.state !== "playing")) {
        this.cameras.main.centerOn(this.player.body.x, this.player.body.y);
      }

      this.configureCameraFollow();

      this.grid?.clear();
      this.grid?.setScrollFactor(0);
      this.grid?.setDepth(-100);
      this.grid?.setVisible(true);
      this.drawGrid();
      positionLevelToast();
    }

    configureCameraFollow() {
      if (!this.player?.body) return;
      const camera = this.cameras.main;
      camera.roundPixels = false;
      camera.startFollow(this.player.body, false, 1, 1);
    }

    createTextures() {
      if (!this.textures.exists("playerTexture")) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xd8d4cb, 1);
        g.fillCircle(18, 18, 16);
        g.lineStyle(2, 0xffffff, 0.42);
        g.strokeCircle(18, 18, 16);
        g.generateTexture("playerTexture", 36, 36);
        g.destroy();
      }

      if (!this.textures.exists("bulletTexture")) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x5b9dff, 1);
        g.fillCircle(7, 7, 5.45);
        g.lineStyle(1, 0xc8ddff, 0.45);
        g.strokeCircle(7, 7, 5.45);
        g.generateTexture("bulletTexture", 14, 14);
        g.destroy();
      }

      if (!this.textures.exists("bulletDarkTexture")) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x5a4fa8, 1);
        g.fillCircle(7, 7, 5.45);
        g.lineStyle(1, 0xb1a5e8, 0.42);
        g.strokeCircle(7, 7, 5.45);
        g.generateTexture("bulletDarkTexture", 14, 14);
        g.destroy();
      }

      if (!this.textures.exists("arrowTexture")) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x6ea9ff, 1);
        g.lineStyle(1, 0xd1e3ff, 0.46);
        g.beginPath();
        g.moveTo(22, 9);
        g.lineTo(3, 2.7);
        g.lineTo(6.6, 9);
        g.lineTo(3, 15.3);
        g.closePath();
        g.fillPath();
        g.strokePath();
        g.generateTexture("arrowTexture", 24, 18);
        g.destroy();
      }

      if (!this.textures.exists("arrowDarkTexture")) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x6f55c7, 1);
        g.lineStyle(1, 0xc8b8f0, 0.44);
        g.beginPath();
        g.moveTo(22, 9);
        g.lineTo(3, 2.7);
        g.lineTo(6.6, 9);
        g.lineTo(3, 15.3);
        g.closePath();
        g.fillPath();
        g.strokePath();
        g.generateTexture("arrowDarkTexture", 24, 18);
        g.destroy();
      }

      if (!this.textures.exists("bazookaTexture")) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xc98245, 1);
        g.fillCircle(12, 12, 9);
        g.lineStyle(2, 0xf0bf82, 0.58);
        g.strokeCircle(12, 12, 9);
        g.fillStyle(0xffddb0, 0.28);
        g.fillCircle(15, 9, 3);
        g.generateTexture("bazookaTexture", 24, 24);
        g.destroy();
      }
    }

    setupInput() {
      this.controls.keys = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        f: Phaser.Input.Keyboard.KeyCodes.F,
        esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      });
      this.controls.cursors = this.input.keyboard.createCursorKeys();
      this.input.keyboard.removeCapture([
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.F,
      ]);

      this.controls.keys.f.on("down", () => {
        if (isTextInputActive()) return;
        if (!document.fullscreenElement) {
          dom.shell.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
      });

      this.controls.keys.esc.on("down", () => {
        if (isTextInputActive()) return;
        this.togglePause();
      });

      this.input.on("pointerdown", (pointer) => this.handlePointerDown(pointer));
      this.input.on("pointermove", (pointer) => this.handlePointerMove(pointer));
      this.input.on("pointerup", (pointer) => this.handlePointerUp(pointer));
      this.input.on("pointerupoutside", (pointer) => this.handlePointerUp(pointer));
      this.game.canvas?.addEventListener("mouseleave", () => {
        this.controls.cursor.inside = false;
        if (effectiveControlType() === "cursor") this.player?.currentVelocity.set(0, 0);
      });
      window.addEventListener("blur", () => {
        this.controls.cursor.inside = false;
        this.clearJoystick();
        this.player?.currentVelocity.set(0, 0);
      });
    }

    setupPools() {
      for (let i = 0; i < CONFIG.maxEnemies; i += 1) {
        const enemy = new Enemy(this);
        enemy.disable();
        this.enemyPool.push(enemy);
        this.enemyGroup.add(enemy.container);
      }

      for (let i = 0; i < 140; i += 1) {
        const bullet = new Bullet(this);
        bullet.disable(false);
        this.bulletPool.push(bullet);
        this.bulletGroup.add(bullet.sprite);
      }

      for (let i = 0; i < 260; i += 1) {
        const pickup = new ExpPickup(this);
        pickup.disable();
        this.expPool.push(pickup);
        this.expGroup.add(pickup.container);
      }
    }

    setupOverlaps() {
      this.physics.add.overlap(this.bulletGroup, this.enemyGroup, (bulletSprite, enemyContainer) => {
        const bullet = bulletSprite.__owner;
        const enemy = enemyContainer.__owner;
        if (!bullet || !enemy || !bullet.active || !enemy.active) return;
        this.handleBulletEnemyHit(bullet, enemy);
      });

      this.enemyPool.forEach((enemy) => {
        enemy.container.__owner = enemy;
      });
      this.bulletPool.forEach((bullet) => {
        bullet.sprite.__owner = bullet;
      });
      this.expPool.forEach((pickup) => {
        pickup.container.__owner = pickup;
      });
    }

    pauseForMenu() {
      this.state = "menu";
      this.clearJoystick();
      this.player.resetVisual();
      stopRunMusic(true);
      this.tweens.resumeAll();
      this.setPlayerVisible(false);
      this.physics.pause();
      setPauseButtonVisible(false);
      hidePauseScreen();
      hideUpgradeScreen();
      hideUpgradeScreen();
    }

    startGame() {
      if (!this.player) {
        runtime.pendingStart = true;
        return;
      }
      this.resetGame();
      this.state = "playing";
      runtime.mode = "playing";
      this.setPlayerVisible(true);
      this.tweens.resumeAll();
      this.physics.resume();
      setPauseButtonVisible(true);
      if (!musicState.runStarted) startRunMusic();
      hidePauseScreen();
      hideUpgradeScreen();
    }

    pauseRun() {
      if (this.state !== "playing") return;
      this.state = "paused";
      runtime.mode = "paused";
      this.clearJoystick();
      this.player.currentVelocity.set(0, 0);
      this.player.body.setVelocity(0, 0);
      this.player.resetVisual();
      this.physics.pause();
      this.tweens.pauseAll();
      setMusicPaused(true);
      showPauseScreen();
      hideUpgradeScreen();
    }

    resumeRun() {
      if (this.state !== "paused") return;
      this.state = "playing";
      runtime.mode = "playing";
      this.player.resetVisual();
      this.tweens.resumeAll();
      this.physics.resume();
      setMusicPaused(false);
      hidePauseScreen();
    }

    togglePause() {
      if (this.state === "playing") this.pauseRun();
      else if (this.state === "paused") this.resumeRun();
    }

    applyRuntimeSettings() {
      if (this.cameras?.main) {
        this.cameras.main.setZoom(gameplayCameraZoom());
        this.configureCameraFollow();
      }

      const mode = effectiveControlType();
      if (!isMobileViewport() && mode !== "joystick" && mode !== "combined") this.clearJoystick();
      if (mode !== "cursor") this.controls.cursor.inside = false;
      this.drawGrid();
    }

    setPlayerVisible(visible) {
      if (!this.player) return;
      this.player.body.setVisible(visible);
      this.player.ring.setVisible(visible);
    }

    resetGame() {
      this.tweens.resumeAll();
      this.state = "playing";
      this.stats = {
        hp: CONFIG.maxHp,
        maxHp: CONFIG.maxHp,
        level: 1,
        exp: 0,
        totalExp: 0,
        nextExp: nextLevelExp(1),
        kills: 0,
        survivalMs: 0,
        lastFireAt: -CONFIG.fireIntervalMs,
        lastContactAt: -CONFIG.contactCooldownMs,
        invulnerableUntil: 0,
        aidKits: 0,
      };
      this.superpowers = {};
      this.ownedSuperpowers = [];
      this.upgradeQueue = [];
      this.currentUpgradeChoices = [];
      this.bazookaAttackCounter = 0;
      this.nextThorAt = 0;
      this.thorCycleId = 0;

      this.waveDirector.reset();
      this.player.reset();
      this.player.speed = CONFIG.playerSpeed;
      this.player.body.setMaxVelocity(CONFIG.playerSpeed);
      this.cameras.main.centerOn(0, 0);
      this.cameras.main.stopFollow();
      this.cameras.main.roundPixels = false;
      this.cameras.main.setZoom(gameplayCameraZoom());
      this.configureCameraFollow();

      this.enemyPool.forEach((enemy) => enemy.disable());
      this.bulletPool.forEach((bullet) => bullet.disable(false));
      this.expPool.forEach((pickup) => pickup.disable());
      this.clearDeathEffects();
      this.clearRazer();
      this.clearThorEffects();
      this.clearJoystick();
      this.activeEnemies = [];
      this.activeBullets = [];
      this.activeExp = [];
      resetLevelToast();
      hidePauseScreen();
      hideUpgradeScreen();
      setPauseButtonVisible(false);
      this.drawGrid();
      updateHud(this.stats, this.waveDirector.wave);
    }

    update(time, delta) {
      this.drawGrid();
      if (this.state !== "playing") return;

      const safeDelta = Math.min(delta, 50);
      this.stats.survivalMs += safeDelta;
      this.waveDirector.update(safeDelta);
      this.updateLeaderboardCheckpoint();

      const input = this.readMovementInput();
      this.player.speed = this.currentPlayerSpeed();
      this.player.body.setMaxVelocity(this.player.speed);
      this.player.update(input, safeDelta);
      this.updatePlayerInvulnerability(time);

      this.updateEnemies(safeDelta, time);
      this.updateBloodyStatuses(time);
      this.updateRazer(safeDelta, time);
      this.updateThor(this.stats.survivalMs);
      this.updateBullets(time);
      this.updateExp(time, safeDelta);
      if (this.state !== "playing") {
        updateHud(this.stats, this.waveDirector.wave);
        return;
      }
      this.tryAutoFire(time);
      this.cullFarObjects();
      updateHud(this.stats, this.waveDirector.wave);
    }

    readKeyboardInput() {
      if (isTextInputActive()) return { x: 0, y: 0 };
      let x = 0;
      let y = 0;
      const keys = this.controls.keys;
      const cursors = this.controls.cursors;

      if (keys.a.isDown || cursors.left.isDown) x -= 1;
      if (keys.d.isDown || cursors.right.isDown) x += 1;
      if (keys.w.isDown || cursors.up.isDown) y -= 1;
      if (keys.s.isDown || cursors.down.isDown) y += 1;
      return { x, y };
    }

    readCursorInput() {
      const cursor = this.controls.cursor;
      if (!cursor.inside) return { x: 0, y: 0 };
      this.refreshCursorWorld();
      if (!cursor.inside) return { x: 0, y: 0 };
      const dx = cursor.worldX - this.player.body.x;
      const dy = cursor.worldY - this.player.body.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= this.player.radius) return { x: 0, y: 0 };
      return { x: dx / distance, y: dy / distance };
    }

    readMovementInput() {
      let x = 0;
      let y = 0;
      const mode = effectiveControlType();
      const mobile = isMobileViewport();

      if (!mobile && mode === "cursor") {
        return this.readCursorInput();
      }

      if (!mobile && (mode === "keyboard" || mode === "combined")) {
        const keyboard = this.readKeyboardInput();
        x += keyboard.x;
        y += keyboard.y;
      }

      if ((mobile || this.controls.joystick.touchFallback || mode === "joystick" || mode === "combined") && this.controls.joystick.active) {
        x += this.controls.joystick.x;
        y += this.controls.joystick.y;
      }

      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }
      return { x, y };
    }

    updateEnemies(delta, time) {
      for (let i = this.activeEnemies.length - 1; i >= 0; i -= 1) {
        const enemy = this.activeEnemies[i];
        if (!enemy.active) {
          this.activeEnemies.splice(i, 1);
          continue;
        }
        enemy.update(this.player, delta, time);
      }

      this.applyEnemySeparation(delta);

      for (const enemy of this.activeEnemies) {
        if (!enemy.active) continue;
        const distance = Phaser.Math.Distance.Between(this.player.body.x, this.player.body.y, enemy.container.x, enemy.container.y);
        if (distance < this.player.radius + enemy.radius && time - this.stats.lastContactAt >= CONFIG.contactCooldownMs) {
          if (this.damagePlayer(enemy.damage)) {
            this.stats.lastContactAt = time;
            enemy.lastDamageAt = time;
          }
        }
      }
    }

    applyEnemySeparation(delta) {
      if (this.activeEnemies.length < 2) return;

      const cellSize = CONFIG.enemySeparationCell;
      const buckets = new Map();
      const active = [];

      for (const enemy of this.activeEnemies) {
        if (!enemy.active) continue;
        enemy.separationX = 0;
        enemy.separationY = 0;
        enemy.separationIndex = active.length;
        active.push(enemy);

        const cellX = Math.floor(enemy.container.x / cellSize);
        const cellY = Math.floor(enemy.container.y / cellSize);
        const key = `${cellX},${cellY}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(enemy);
      }

      if (active.length < 2) return;

      for (const enemy of active) {
        const cellX = Math.floor(enemy.container.x / cellSize);
        const cellY = Math.floor(enemy.container.y / cellSize);

        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const bucket = buckets.get(`${cellX + ox},${cellY + oy}`);
            if (!bucket) continue;

            for (const other of bucket) {
              if (other.separationIndex <= enemy.separationIndex) continue;

              const dx = enemy.container.x - other.container.x;
              const dy = enemy.container.y - other.container.y;
              const minDistance = enemy.separationRadius + other.separationRadius;
              const distSq = dx * dx + dy * dy;
              if (distSq >= minDistance * minDistance) continue;

              let distance = Math.sqrt(distSq);
              let nx = 0;
              let ny = 0;

              if (distance < 0.001) {
                const angle = enemy.separationIndex * 2.399963 + other.separationIndex * 0.73;
                nx = Math.cos(angle);
                ny = Math.sin(angle);
                distance = 0.001;
              } else {
                nx = dx / distance;
                ny = dy / distance;
              }

              const pressure = (minDistance - distance) / minDistance;
              enemy.separationX += nx * pressure;
              enemy.separationY += ny * pressure;
              other.separationX -= nx * pressure;
              other.separationY -= ny * pressure;
            }
          }
        }
      }

      const deltaScale = clamp(delta / 16.67, 0.65, 1.35);

      for (const enemy of active) {
        const length = Math.hypot(enemy.separationX, enemy.separationY);
        if (length <= 0.001) continue;

        const push = Math.min(90, length * 55) * CONFIG.enemySeparationStrength * deltaScale;
        const body = enemy.body.body;
        const baseVelocityX = body.velocity.x;
        const baseVelocityY = body.velocity.y;
        body.velocity.x += (enemy.separationX / length) * push;
        body.velocity.y += (enemy.separationY / length) * push;

        const chaseX = this.player.body.x - enemy.container.x;
        const chaseY = this.player.body.y - enemy.container.y;
        const chaseLength = Math.hypot(chaseX, chaseY);
        if (chaseLength > 0.001 && body.velocity.x * chaseX + body.velocity.y * chaseY < 0) {
          body.velocity.x = baseVelocityX;
          body.velocity.y = baseVelocityY;
        }
      }
    }

    updateBullets(time) {
      for (let i = this.activeBullets.length - 1; i >= 0; i -= 1) {
        const bullet = this.activeBullets[i];
        if (!bullet.active) {
          this.activeBullets.splice(i, 1);
          continue;
        }
        this.resolveBulletHit(bullet);
        if (!bullet.active) continue;
        bullet.update(time);
      }
    }

    resolveBulletHit(bullet) {
      for (const enemy of this.activeEnemies) {
        if (!enemy.active) continue;
        if (bullet.hitEnemies?.has(enemy)) continue;
        const hitDistance = enemy.radius + bullet.radius;
        const distSq = Phaser.Math.Distance.Squared(bullet.sprite.x, bullet.sprite.y, enemy.container.x, enemy.container.y);
        if (distSq <= hitDistance * hitDistance) {
          this.handleBulletEnemyHit(bullet, enemy);
          return;
        }
      }
    }

    handleBulletEnemyHit(bullet, enemy) {
      if (bullet.hitEnemies?.has(enemy)) return;
      if (bullet.kind === "bazooka") {
        const x = bullet.sprite.x;
        const y = bullet.sprite.y;
        const radius = bullet.explosionRadius;
        const level = this.getSuperpowerLevel("bazooka");
        bullet.disable();
        this.explodeBazooka(x, y, radius, level);
        return;
      }

      const hitIndex = (bullet.hitEnemies?.size || 0) + 1;
      const bonusDamage = bullet.kind === "arrow" && bullet.arrowLevel >= 2
        ? 3 + Math.floor((hitIndex - 1) / 2)
        : 0;
      bullet.hitEnemies?.add(enemy);
      const died = enemy.takeDamage(bullet.damage + bonusDamage);
      if (bullet.appliesKnockback) {
        const velocity = bullet.sprite.body?.velocity || { x: 0, y: 0 };
        this.applySkillKnockback(enemy, bullet.sprite.x, bullet.sprite.y, velocity.x, velocity.y);
      }
      if (!died && bullet.appliesBloody) {
        this.applyBloodyToEnemy(enemy, this.time.now);
      }
      if (died) {
        this.killEnemy(enemy);
      }
      if ((bullet.hitEnemies?.size || 0) >= bullet.pierceLimit) {
        bullet.disable();
      }
    }

    applySkillKnockback(enemy, sourceX, sourceY, fallbackX = 0, fallbackY = 0) {
      const level = this.getSuperpowerLevel("knockback");
      const range = KNOCKBACK_RANGES[level];
      if (!range || !enemy.active) return;
      this.applyEnemyKnockback(enemy, sourceX, sourceY, Phaser.Math.Between(range.min, range.max), fallbackX, fallbackY);
    }

    applyEnemyKnockback(enemy, sourceX, sourceY, distance, fallbackX = 0, fallbackY = 0) {
      if (!enemy.active) return;
      let dirX = enemy.container.x - sourceX;
      let dirY = enemy.container.y - sourceY;
      const length = Math.hypot(dirX, dirY);
      if (length < 0.001) {
        dirX = fallbackX;
        dirY = fallbackY;
      }
      const fallbackLength = Math.hypot(dirX, dirY);
      if (fallbackLength < 0.001) {
        dirX = enemy.container.x - this.player.body.x;
        dirY = enemy.container.y - this.player.body.y;
      }
      enemy.applyKnockback(dirX, dirY, distance, this.time.now);
    }

    applyRadialKnockback(x, y, radius, range) {
      for (const enemy of this.activeEnemies) {
        if (!enemy.active) continue;
        const distance = Phaser.Math.Distance.Between(x, y, enemy.container.x, enemy.container.y);
        if (distance <= radius + enemy.radius) {
          this.applyEnemyKnockback(enemy, x, y, Phaser.Math.Between(range.min, range.max));
        }
      }
    }

    applyBloodyToEnemy(enemy, now) {
      const level = this.getSuperpowerLevel("bloody");
      const cfg = BLOODY_CONFIG[level];
      if (!cfg || !enemy.active) return;
      enemy.applyBleed(level, cfg.damagePerSecond, now + cfg.durationMs, now);
      if (cfg.slowMultiplier < 1) {
        enemy.applySlow(cfg.slowMultiplier, now + cfg.durationMs);
      }
    }

    applyLightBleedToEnemy(enemy, now) {
      if (!enemy.active) return;
      enemy.applyBleed(BAZOOKA_LIGHT_BLEED.level, BAZOOKA_LIGHT_BLEED.damagePerSecond, now + BAZOOKA_LIGHT_BLEED.durationMs, now);
    }

    updateBloodyStatuses(time) {
      for (const enemy of [...this.activeEnemies]) {
        if (!enemy.active || enemy.bleedUntil <= 0) continue;
        if (enemy.bleedNextTickAt <= 0) enemy.bleedNextTickAt = time + 1000;
        let died = false;
        while (enemy.active && enemy.bleedNextTickAt <= time && enemy.bleedNextTickAt <= enemy.bleedUntil) {
          const nextTick = enemy.bleedNextTickAt + 1000;
          if (enemy.takeDamage(enemy.bleedDamagePerSecond, false)) {
            this.killEnemy(enemy);
            died = true;
            break;
          }
          enemy.bleedNextTickAt = nextTick;
        }
        if (!died && time >= enemy.bleedUntil) {
          enemy.clearBleed();
        }
      }
    }

    updateExp(time, delta) {
      for (let i = this.activeExp.length - 1; i >= 0; i -= 1) {
        const pickup = this.activeExp[i];
        if (!pickup.active) {
          this.activeExp.splice(i, 1);
          continue;
        }
        if (pickup.update(this.player, time, delta)) {
          this.addExp(pickup.value);
          pickup.collect();
        }
      }
    }

    tryAutoFire(time) {
      if (time - this.stats.lastFireAt < this.currentFireIntervalMs()) return;
      const visibleTargets = this.getVisibleEnemiesSorted();
      const shooterLevel = this.getSuperpowerLevel("shooter");
      const bazookaLevel = this.getSuperpowerLevel("bazooka");
      if (visibleTargets.length === 0 && shooterLevel === 0 && bazookaLevel === 0) return;
      if (!this.getFreeBullet()) return;

      if (bazookaLevel > 0) {
        this.bazookaAttackCounter += 1;
        const interval = BAZOOKA_ATTACK_INTERVALS[bazookaLevel] || 10;
        if (this.bazookaAttackCounter % interval === 0) {
          if (this.fireBazooka(visibleTargets[0], time, bazookaLevel)) {
            this.stats.lastFireAt = time;
          }
          return;
        }
      }

      if (this.fireShooterVolley(visibleTargets, time, shooterLevel)) {
        this.stats.lastFireAt = time;
      }
    }

    currentFireIntervalMs() {
      const shooterLevel = this.getSuperpowerLevel("shooter");
      const energyLevel = this.getSuperpowerLevel("energyDrink");
      const bonus = (SHOOTER_FIRE_RATE_BONUS[shooterLevel] || 0) + (ENERGY_DRINK_FIRE_RATE_BONUS[energyLevel] || 0);
      return CONFIG.fireIntervalMs / (1 + bonus);
    }

    currentPlayerSpeed() {
      const energyLevel = this.getSuperpowerLevel("energyDrink");
      return CONFIG.playerSpeed * (1 + (ENERGY_DRINK_SPEED_BONUS[energyLevel] || 0));
    }

    fireShooterVolley(visibleTargets, time, shooterLevel) {
      const count = SHOOTER_BULLET_COUNTS[shooterLevel] || 1;
      const arrowLevel = this.getSuperpowerLevel("arrow");
      const useArrow = arrowLevel > 0;
      const textureKey = useArrow
        ? (shooterLevel >= 3 ? "arrowDarkTexture" : "arrowTexture")
        : (shooterLevel >= 3 ? "bulletDarkTexture" : "bulletTexture");
      const trailColor = shooterLevel >= 3 ? 0x6559c7 : 0x5b9dff;
      const pierceLimit = useArrow ? ARROW_PIERCE_LIMITS[arrowLevel] : 1;
      const speed = CONFIG.bulletSpeed * (arrowLevel >= 3 ? 1.15 : 1);
      let created = 0;

      for (let i = 0; i < count; i += 1) {
        const target = visibleTargets[i] || null;
        const direction = target ? this.directionToEnemy(target) : randomDirection();
        const bullet = this.getFreeBullet();
        if (!bullet) break;
        bullet.fire(this.player.body.x, this.player.body.y, direction.x, direction.y, time, {
          kind: useArrow ? "arrow" : "bullet",
          textureKey,
          trailColor,
          radius: useArrow ? 7.7 : CONFIG.bulletRadius,
          speed,
          damage: CONFIG.bulletDamage,
          pierceLimit,
          arrowLevel: useArrow ? arrowLevel : 0,
          appliesBloody: true,
          appliesKnockback: true,
        });
        this.activeBullets.push(bullet);
        created += 1;
      }

      return created > 0;
    }

    fireBazooka(target, time, level) {
      const direction = target ? this.directionToEnemy(target) : randomDirection();
      const bullet = this.getFreeBullet();
      if (!bullet) return false;
      const radius = CONFIG.bazookaBaseRadius * Math.pow(1.1, Math.max(0, level - 1));
      bullet.fire(this.player.body.x, this.player.body.y, direction.x, direction.y, time, {
        kind: "bazooka",
        textureKey: "bazookaTexture",
        radius: 9,
        speed: CONFIG.bulletSpeed * 0.92,
        damage: 0,
        trailColor: 0xc98245,
        maxDistance: CONFIG.bulletMaxDistance * 1.2,
        lifeMs: CONFIG.bulletLifeMs * 1.45,
        explosionRadius: radius,
      });
      this.activeBullets.push(bullet);
      return true;
    }

    triggerMasochism() {
      const level = this.getSuperpowerLevel("masochism");
      if (level <= 0) return;

      const count = MASOCHISM_BULLET_COUNTS[level] || 0;
      const bulletDamage = MASOCHISM_BULLET_DAMAGE[level] || CONFIG.bulletDamage;
      const originX = this.player.body.x;
      const originY = this.player.body.y;
      const now = this.time.now;

      for (let i = 0; i < count; i += 1) {
        const bullet = this.getFreeBullet();
        if (!bullet) break;
        const angle = (i / count) * Math.PI * 2;
        bullet.fire(originX, originY, Math.cos(angle), Math.sin(angle), now, {
          kind: "bullet",
          textureKey: "bulletTexture",
          trailColor: 0x5b9dff,
          damage: bulletDamage,
          speed: CONFIG.bulletSpeed,
          pierceLimit: 1,
        });
        this.activeBullets.push(bullet);
      }

      if (level >= 2) {
        this.slowNearbyEnemies(originX, originY, CONFIG.masochismRadius, now);
        this.applyRadialKnockback(originX, originY, CONFIG.masochismKnockbackRadius, MASOCHISM_KNOCKBACK_RANGE);
      }

      if (level >= 3) {
        this.damageNearbyEnemies(originX, originY, CONFIG.masochismDamageRadius, 2);
      }

      this.makeMasochismFeedback(originX, originY, CONFIG.masochismRadius, level);
    }

    slowNearbyEnemies(x, y, radius, now) {
      for (const enemy of this.activeEnemies) {
        if (!enemy.active) continue;
        const distance = Phaser.Math.Distance.Between(x, y, enemy.container.x, enemy.container.y);
        if (distance <= radius + enemy.radius) {
          enemy.applySlow(CONFIG.masochismSlowMultiplier, now + CONFIG.masochismSlowMs);
        }
      }
    }

    damageNearbyEnemies(x, y, radius, damage) {
      for (const enemy of [...this.activeEnemies]) {
        if (!enemy.active) continue;
        const distance = Phaser.Math.Distance.Between(x, y, enemy.container.x, enemy.container.y);
        if (distance <= radius + enemy.radius && enemy.takeDamage(damage)) {
          this.killEnemy(enemy);
        }
      }
    }

    makeMasochismFeedback(x, y, radius, level) {
      const effect = this.add.graphics({ x, y });
      effect.setDepth(6);
      effect.lineStyle(2, level >= 3 ? 0xca6978 : 0xb45a66, level >= 3 ? 0.28 : 0.2);
      effect.strokeCircle(0, 0, radius);
      effect.lineStyle(level >= 2 ? 2 : 1, 0xffffff, level >= 2 ? 0.22 : 0.1);
      effect.strokeCircle(0, 0, level >= 2 ? CONFIG.masochismKnockbackRadius : radius * 0.58);
      if (level >= 2) {
        effect.fillStyle(0xffffff, 0.035);
        effect.fillCircle(0, 0, CONFIG.masochismKnockbackRadius * 0.72);
      }
      this.deathEffects.push(effect);
      this.tweens.add({
        targets: effect,
        alpha: 0,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 260,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.deathEffects = this.deathEffects.filter((item) => item !== effect);
          effect.destroy();
        },
      });
    }

    directionToEnemy(enemy) {
      const dx = enemy.container.x - this.player.body.x;
      const dy = enemy.container.y - this.player.body.y;
      const distance = Math.hypot(dx, dy) || 1;
      return { x: dx / distance, y: dy / distance };
    }

    getVisibleEnemiesSorted() {
      return this.activeEnemies
        .filter((enemy) => enemy.active && this.isEnemyVisibleInCamera(enemy))
        .sort((a, b) => {
          const da = Phaser.Math.Distance.Squared(this.player.body.x, this.player.body.y, a.container.x, a.container.y);
          const db = Phaser.Math.Distance.Squared(this.player.body.x, this.player.body.y, b.container.x, b.container.y);
          return da - db;
        });
    }

    findNearestEnemy() {
      return this.getVisibleEnemiesSorted()[0] || null;
    }

    isEnemyVisibleInCamera(enemy, padding = CONFIG.targetVisibilityPadding) {
      const view = this.cameras.main.worldView;
      const x = enemy.container.x;
      const y = enemy.container.y;
      return (
        x >= view.x - padding &&
        x <= view.x + view.width + padding &&
        y >= view.y - padding &&
        y <= view.y + view.height + padding
      );
    }

    spawnEnemyPack() {
      if (this.activeEnemies.length >= CONFIG.maxEnemies) return;
      const count = Math.min(this.waveDirector.spawnCount(), CONFIG.maxEnemies - this.activeEnemies.length);
      for (let i = 0; i < count; i += 1) {
        const enemy = this.getFreeEnemy();
        if (!enemy) return;
        const type = this.waveDirector.chooseType();
        const point = this.randomSpawnPoint();
        enemy.spawn(point.x, point.y, type, this.waveDirector.wave);
        this.activeEnemies.push(enemy);
      }
    }

    randomSpawnPoint() {
      const view = this.currentGameplayView();
      const safe = 18;

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const side = Phaser.Math.Between(0, 3);
        const pad = Phaser.Math.Between(CONFIG.spawnPaddingMin, CONFIG.spawnPaddingMax);
        let x = view.x;
        let y = view.y;

        if (side === 0) {
          x = Phaser.Math.FloatBetween(view.x - pad, view.right + pad);
          y = view.y - pad;
        } else if (side === 1) {
          x = view.right + pad;
          y = Phaser.Math.FloatBetween(view.y - pad, view.bottom + pad);
        } else if (side === 2) {
          x = Phaser.Math.FloatBetween(view.x - pad, view.right + pad);
          y = view.bottom + pad;
        } else {
          x = view.x - pad;
          y = Phaser.Math.FloatBetween(view.y - pad, view.bottom + pad);
        }

        if (
          x < view.x - safe ||
          x > view.right + safe ||
          y < view.y - safe ||
          y > view.bottom + safe
        ) {
          return { x, y };
        }
      }

      const fallbackPad = CONFIG.spawnPaddingMax;
      const side = Phaser.Math.Between(0, 3);
      if (side === 0) return { x: Phaser.Math.FloatBetween(view.x, view.right), y: view.y - fallbackPad };
      if (side === 1) return { x: view.right + fallbackPad, y: Phaser.Math.FloatBetween(view.y, view.bottom) };
      if (side === 2) return { x: Phaser.Math.FloatBetween(view.x, view.right), y: view.bottom + fallbackPad };
      return { x: view.x - fallbackPad, y: Phaser.Math.FloatBetween(view.y, view.bottom) };
    }

    currentGameplayView() {
      const camera = this.cameras.main;
      const zoom = camera.zoom || 1;
      const width = camera.width / zoom;
      const height = camera.height / zoom;
      const centerX = this.player?.body?.x ?? camera.midPoint.x;
      const centerY = this.player?.body?.y ?? camera.midPoint.y;
      const x = centerX - width / 2;
      const y = centerY - height / 2;
      return {
        x,
        y,
        width,
        height,
        right: x + width,
        bottom: y + height,
      };
    }

    getFreeEnemy() {
      return this.enemyPool.find((enemy) => !enemy.active && !enemy.dying);
    }

    getFreeBullet() {
      return this.bulletPool.find((bullet) => !bullet.active && !bullet.fading);
    }

    getFreeExp() {
      return this.expPool.find((pickup) => !pickup.active && !pickup.collecting);
    }

    killEnemy(enemy) {
      const x = enemy.container.x;
      const y = enemy.container.y;
      const expValue = roundExpValue(enemy.exp * waveExpMultiplier(enemy.spawnWave || this.waveDirector.wave));
      const color = enemy.type.color;
      const radius = enemy.radius;
      enemy.kill();
      this.stats.kills += 1;
      this.dropExpReward(x, y, expValue, radius);
      this.makeKillFeedback(x, y, radius, color);
    }

    dropExpReward(x, y, value, enemyRadius) {
      const maxPickupSize = Math.max(5.2, enemyRadius * 0.56);
      const pieces = splitExpReward(value, maxPickupSize);
      const spread = pieces.length === 1 ? 0 : Math.min(enemyRadius * 0.42, 14);

      pieces.forEach((part, index) => {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2) + (index / pieces.length) * Math.PI * 2;
        const distance = spread * Phaser.Math.FloatBetween(0.55, 1);
        this.dropExp(
          x + Math.cos(angle) * distance,
          y + Math.sin(angle) * distance,
          part,
          maxPickupSize
        );
      });
    }

    dropExp(x, y, value, maxPickupSize = Infinity) {
      const pickup = this.getFreeExp();
      if (!pickup) return;
      pickup.spawn(x, y, value, this.time.now, maxPickupSize);
      this.activeExp.push(pickup);
    }

    makeKillFeedback(x, y, radius, color) {
      const effect = this.add.graphics({ x, y });
      effect.setDepth(2);
      effect.lineStyle(2, 0xffffff, 0.16);
      effect.strokeCircle(0, 0, radius + 3);
      effect.fillStyle(color, 0.5);
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const distance = radius * Phaser.Math.FloatBetween(0.65, 1.05);
        const size = Phaser.Math.FloatBetween(2.5, 4.5);
        effect.fillRect(Math.cos(angle) * distance - size / 2, Math.sin(angle) * distance - size / 2, size, size);
      }
      this.deathEffects.push(effect);
      this.tweens.add({
        targets: effect,
        alpha: 0,
        scaleX: 1.75,
        scaleY: 1.75,
        rotation: Phaser.Math.FloatBetween(-0.35, 0.35),
        duration: 280,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.deathEffects = this.deathEffects.filter((item) => item !== effect);
          effect.destroy();
        },
      });
    }

    clearDeathEffects() {
      this.deathEffects.forEach((effect) => {
        this.tweens.killTweensOf(effect);
        effect.destroy();
      });
      this.deathEffects = [];
    }

    explodeBazooka(x, y, radius, level) {
      const damaged = new Set();
      const now = this.time.now;
      for (const enemy of [...this.activeEnemies]) {
        if (!enemy.active || damaged.has(enemy)) continue;
        const distance = Phaser.Math.Distance.Between(x, y, enemy.container.x, enemy.container.y);
        if (distance <= radius + enemy.radius) {
          damaged.add(enemy);
          const died = enemy.takeDamage(CONFIG.bazookaDamage);
          if (level >= 3 && !died) {
            this.applyLightBleedToEnemy(enemy, now);
          }
          if (died) {
            this.killEnemy(enemy);
          }
        }
      }

      if (level >= 2) {
        const range = BAZOOKA_KNOCKBACK_RANGES[Math.min(level, 3)] || BAZOOKA_KNOCKBACK_RANGES[2];
        const knockbackRadius = radius * CONFIG.bazookaKnockbackRadiusMultiplier * (level >= 3 ? 1.2 : 1);
        this.applyRadialKnockback(x, y, knockbackRadius, range);
      }

      const effect = this.add.graphics({ x, y });
      effect.setDepth(6);
      effect.fillStyle(0xc98245, level >= 3 ? 0.13 : 0.1);
      effect.fillCircle(0, 0, radius * 0.72);
      effect.lineStyle(2, 0xf0bf82, 0.32);
      effect.strokeCircle(0, 0, radius);
      effect.lineStyle(1, 0xffffff, 0.12);
      effect.strokeCircle(0, 0, radius * 0.58);
      this.deathEffects.push(effect);
      this.tweens.add({
        targets: effect,
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 260,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.deathEffects = this.deathEffects.filter((item) => item !== effect);
          effect.destroy();
        },
      });
    }

    updateRazer(delta, time) {
      const level = this.getSuperpowerLevel("razer");
      if (level <= 0) return;
      const cfg = RAZER_CONFIG[level];
      if (!cfg) return;
      if (this.razerBlades.length !== cfg.count || this.razerVisualLevel !== level) {
        this.rebuildRazerBlades(level);
      }

      this.razerBaseAngle += (Math.PI * 2 * cfg.rotationsPerSecond * delta) / 1000;
      const px = this.player.body.x;
      const py = this.player.body.y;

      this.razerBlades.forEach((blade, index) => {
        const angle = this.razerBaseAngle + (index / cfg.count) * Math.PI * 2;
        blade.container.setPosition(px + Math.cos(angle) * cfg.radius, py + Math.sin(angle) * cfg.radius);
        blade.container.rotation += delta / 125;

        for (const enemy of this.activeEnemies) {
          if (!enemy.active) continue;
          const lastHit = this.razerHitTimes.get(enemy) || -9999;
          if (time - lastHit < CONFIG.razerHitCooldownMs) continue;
          const distance = Phaser.Math.Distance.Between(blade.container.x, blade.container.y, enemy.container.x, enemy.container.y);
          if (distance <= enemy.radius + cfg.hitRadius) {
            this.razerHitTimes.set(enemy, time);
            const died = enemy.takeDamage(cfg.damage);
            if (died) {
              this.killEnemy(enemy);
            }
          }
        }
      });
    }

    rebuildRazerBlades(level) {
      this.clearRazer();
      const cfg = RAZER_CONFIG[level];
      if (!cfg) return;

      for (let i = 0; i < cfg.count; i += 1) {
        const container = this.add.container(this.player.body.x, this.player.body.y);
        container.setDepth(6);
        container.add(makeRazerSaw(this, level));
        this.razerBlades.push({ container });
      }
      this.razerVisualLevel = level;
    }

    clearRazer() {
      this.razerBlades.forEach((blade) => blade.container.destroy(true));
      this.razerBlades = [];
      this.razerHitTimes.clear();
      this.razerBaseAngle = 0;
      this.razerVisualLevel = 0;
    }

    updateThor(time) {
      const level = this.getSuperpowerLevel("thor");
      if (level <= 0) return;
      const cfg = THOR_CONFIG[level];
      if (!cfg) return;

      if (this.nextThorAt <= 0) {
        this.nextThorAt = time + cfg.intervalMs;
      }

      if (time >= this.nextThorAt) {
        this.spawnThorStrikes(cfg, time);
        this.nextThorAt = time + cfg.intervalMs;
      }

      for (const strike of [...this.thorStrikes]) {
        if (!strike.active || strike.hit || time < strike.strikeAt) continue;
        this.resolveThorStrike(strike);
      }
    }

    spawnThorStrikes(cfg, time) {
      const points = this.pickThorStrikePoints(cfg.count, cfg.radius);
      if (points.length === 0) return;
      this.thorCycleId += 1;
      this.thorCycleHits.set(this.thorCycleId, new Set());

      points.forEach((point) => {
        const effect = this.add.graphics({ x: point.x, y: point.y });
        effect.setDepth(4);
        effect.setAlpha(0);
        effect.setScale(0.82);
        effect.fillStyle(0xd7b94d, 0.1);
        effect.fillCircle(0, 0, cfg.radius);
        effect.lineStyle(2, 0xf0d778, 0.46);
        effect.strokeCircle(0, 0, cfg.radius);
        effect.lineStyle(1, 0xfff1b2, 0.22);
        effect.strokeCircle(0, 0, cfg.radius * 0.58);
        this.tweens.add({
          targets: effect,
          alpha: 0.66,
          scaleX: 1,
          scaleY: 1,
          duration: 190,
          ease: "Sine.easeOut",
        });
        this.thorStrikes.push({
          active: true,
          hit: false,
          x: point.x,
          y: point.y,
          radius: cfg.radius,
          damage: cfg.damage,
          strikeAt: time + CONFIG.thorWarningMs,
          cycleId: this.thorCycleId,
          effect,
        });
      });
    }

    pickThorStrikePoints(count, radius) {
      const view = this.cameras.main.worldView;
      const enemies = this.activeEnemies.filter((enemy) => enemy.active && !enemy.dying && this.isEnemyVisibleInCamera(enemy, 0));
      if (enemies.length === 0) return [];
      const clusterRadiusSq = CONFIG.thorClusterRadius * CONFIG.thorClusterRadius;
      const playerX = this.player.body.x;
      const playerY = this.player.body.y;
      const marginX = Math.min(radius, view.width * 0.5);
      const marginY = Math.min(radius, view.height * 0.5);
      const minX = view.x + marginX;
      const maxX = view.right - marginX;
      const minY = view.y + marginY;
      const maxY = view.bottom - marginY;
      const candidates = enemies.map((enemy) => {
        let score = 0;
        let sumX = 0;
        let sumY = 0;
        for (const other of enemies) {
          const dx = enemy.container.x - other.container.x;
          const dy = enemy.container.y - other.container.y;
          if (dx * dx + dy * dy <= clusterRadiusSq) {
            score += 1;
            sumX += other.container.x;
            sumY += other.container.y;
          }
        }
        const x = score > 0 ? sumX / score : enemy.container.x;
        const y = score > 0 ? sumY / score : enemy.container.y;
        const distance = Phaser.Math.Distance.Between(playerX, playerY, x, y);
        return {
          x: Phaser.Math.Clamp(x, minX, maxX),
          y: Phaser.Math.Clamp(y, minY, maxY),
          score,
          priority: score * 120 - distance * 0.12,
        };
      }).sort((a, b) => b.priority - a.priority);

      const points = [];
      const minDistance = Math.max(CONFIG.thorMinStrikeDistance, radius * 2.05);
      const minDistanceSq = minDistance * minDistance;
      for (const candidate of candidates) {
        if (points.length >= count) break;
        const tooClose = points.some((point) => Phaser.Math.Distance.Squared(point.x, point.y, candidate.x, candidate.y) < minDistanceSq);
        if (!tooClose) points.push(candidate);
      }

      for (const candidate of candidates) {
        if (points.length >= count) break;
        if (!points.includes(candidate)) points.push(candidate);
      }

      return points.slice(0, count);
    }

    resolveThorStrike(strike) {
      strike.hit = true;
      const damaged = this.thorCycleHits.get(strike.cycleId) || new Set();
      this.thorCycleHits.set(strike.cycleId, damaged);

      for (const enemy of [...this.activeEnemies]) {
        if (!enemy.active || damaged.has(enemy)) continue;
        const distance = Phaser.Math.Distance.Between(strike.x, strike.y, enemy.container.x, enemy.container.y);
        if (distance <= strike.radius + enemy.radius) {
          damaged.add(enemy);
          if (enemy.takeDamage(strike.damage)) {
            this.killEnemy(enemy);
          }
        }
      }

      const effect = strike.effect;
      this.tweens.killTweensOf(effect);
      effect.clear();
      effect.setAlpha(1);
      effect.setScale(1);
      effect.fillStyle(0xd7b94d, 0.1);
      effect.fillCircle(0, 0, strike.radius);
      effect.lineStyle(2, 0xf0d778, 0.48);
      effect.strokeCircle(0, 0, strike.radius);
      const wave = this.add.graphics({ x: strike.x, y: strike.y });
      wave.setDepth(5);
      const pulse = { progress: 0 };
      strike.wave = wave;
      strike.pulse = pulse;
      this.tweens.add({
        targets: pulse,
        progress: 1,
        duration: 280,
        ease: "Sine.easeOut",
        onUpdate: () => {
          const progress = pulse.progress;
          const radius = Math.max(2, strike.radius * progress);
          const fade = 1 - progress;
          effect.setAlpha(0.36 + fade * 0.64);
          wave.clear();
          wave.fillStyle(0xffeaa0, 0.12 * fade);
          wave.fillCircle(0, 0, radius);
          wave.lineStyle(3, 0xffe58a, 0.52 * fade);
          wave.strokeCircle(0, 0, radius);
          wave.lineStyle(1, 0xfff4bd, 0.32 * fade);
          wave.strokeCircle(0, 0, Math.min(strike.radius, radius + strike.radius * 0.18));
        },
        onComplete: () => {
          strike.active = false;
          this.thorStrikes = this.thorStrikes.filter((item) => item !== strike);
          if (!this.thorStrikes.some((item) => item.cycleId === strike.cycleId)) {
            this.thorCycleHits.delete(strike.cycleId);
          }
          effect.destroy();
          wave.destroy();
        },
      });
    }

    clearThorEffects() {
      this.thorStrikes.forEach((strike) => {
        this.tweens.killTweensOf(strike.effect);
        if (strike.pulse) this.tweens.killTweensOf(strike.pulse);
        strike.effect.destroy();
        if (strike.wave) strike.wave.destroy();
      });
      this.thorStrikes = [];
      this.thorCycleHits.clear();
      this.nextThorAt = 0;
    }

    addExp(amount) {
      this.stats.exp = roundExpValue(this.stats.exp + amount);
      this.stats.totalExp = roundExpValue(this.stats.totalExp + amount);
      let levelsGained = 0;
      while (this.stats.exp >= this.stats.nextExp) {
        this.stats.exp = roundExpValue(this.stats.exp - this.stats.nextExp);
        this.stats.level += 1;
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 3 + (this.stats.aidKits || 0) * 2);
        if (this.stats.level % 3 === 0) {
          this.upgradeQueue.push(this.stats.level);
        }
        this.stats.nextExp = nextLevelExp(this.stats.level);
        levelsGained += 1;
      }
      if (levelsGained > 0) showLevelToast(levelsGained);
      if (this.upgradeQueue.length > 0 && this.state === "playing") {
        this.openUpgradeMenu();
      }
    }

    getSuperpowerLevel(id) {
      return this.superpowers[id] || 0;
    }

    buildUpgradeChoices() {
      const abilityChoices = SUPERPOWER_REGISTRY
        .filter((ability) => {
          const currentLevel = this.getSuperpowerLevel(ability.id);
          if (currentLevel >= ability.maxLevel) return false;
          return true;
        })
        .map((ability) => {
          const currentLevel = this.getSuperpowerLevel(ability.id);
          const nextLevel = currentLevel + 1;
          const masochismDescriptions = [
            "При получении урона выпускает 8 сильных снарядов во все стороны.",
            "Выпускает 10 сильных снарядов, замедляет и также немного отталкивает врагов.",
            "Выпускает 12 сильных снарядов, враги в небольшом радиусе от героя получат урон.",
          ];
          const description = ability.id === "masochism"
            ? masochismDescriptions[Math.max(0, nextLevel - 1)]
            : ability.descriptions[Math.max(0, nextLevel - 1)];
          const attackRateNote = ability.id === "shooter" && nextLevel >= 2 ? " Увеличивает частоту атаки." : "";
          return {
            type: "ability",
            id: ability.id,
            title: ability.title,
            styleId: ability.id,
            currentLevel,
            nextLevel,
            badge: currentLevel === 0 ? "Новое умение" : "Повышение уровня",
            description: `${description}${attackRateNote}`,
          };
        });

      const upgradeLevel = this.upgradeQueue[0] || this.stats.level;
      const makeAidChoice = () => ({
        type: "aidKit",
        id: `aid-kit-${Date.now()}-${Math.random()}`,
        title: "Aid kit",
        styleId: "aid",
        badge: "Бонус",
        description: "Добавляет 15% к запасу ХП, восстанавливает 20% ХП и увеличивает регенерацию за повышение уровня.",
      });
      const bonusChoices = upgradeLevel > 6 ? [makeAidChoice()] : [];
      const choices = shuffled([...abilityChoices, ...bonusChoices]).slice(0, 3);
      while (choices.length < 3 && upgradeLevel > 6) choices.push(makeAidChoice());
      return choices;
    }

    openUpgradeMenu() {
      if (this.state !== "playing" || this.upgradeQueue.length === 0) return;
      this.state = "upgrade";
      runtime.mode = "upgrade";
      this.clearJoystick();
      this.player.currentVelocity.set(0, 0);
      this.player.body.setVelocity(0, 0);
      this.player.resetVisual();
      this.physics.pause();
      this.tweens.pauseAll();
      hidePauseScreen();
      setPauseButtonVisible(false);
      this.currentUpgradeChoices = this.buildUpgradeChoices();
      showUpgradeScreen(this.currentUpgradeChoices);
    }

    chooseUpgrade(index) {
      if (this.state !== "upgrade") return;
      const choice = this.currentUpgradeChoices[index];
      if (!choice) return;
      this.applyUpgrade(choice);
      this.upgradeQueue.shift();
      this.currentUpgradeChoices = [];
      hideUpgradeScreen();

      if (this.upgradeQueue.length > 0) {
        this.currentUpgradeChoices = this.buildUpgradeChoices();
        showUpgradeScreen(this.currentUpgradeChoices);
        return;
      }

      this.state = "playing";
      runtime.mode = "playing";
      this.tweens.resumeAll();
      this.physics.resume();
      this.grantUpgradeInvulnerability();
      setPauseButtonVisible(true);
      setMusicPaused(false);
      updateHud(this.stats, this.waveDirector.wave);
    }

    applyUpgrade(choice) {
      if (choice.type === "aidKit") {
        const oldMaxHp = this.stats.maxHp;
        const newMaxHp = Math.round(oldMaxHp * 1.15);
        const gainedMaxHp = newMaxHp - oldMaxHp;
        this.stats.maxHp = newMaxHp;
        this.stats.aidKits = (this.stats.aidKits || 0) + 1;
        this.stats.hp = Math.min(newMaxHp, this.stats.hp + gainedMaxHp + newMaxHp * 0.2);
        return;
      }

      const currentLevel = this.getSuperpowerLevel(choice.id);
      const nextLevel = Math.min(choice.nextLevel, SUPERPOWER_REGISTRY.find((ability) => ability.id === choice.id)?.maxLevel || choice.nextLevel);
      this.superpowers[choice.id] = nextLevel;
      if (currentLevel === 0 && !this.ownedSuperpowers.includes(choice.id)) {
        this.ownedSuperpowers.push(choice.id);
      }

      if (choice.id === "razer") {
        this.rebuildRazerBlades(nextLevel);
      } else if (choice.id === "bazooka" && currentLevel === 0) {
        this.bazookaAttackCounter = 0;
      } else if (choice.id === "thor") {
        const cfg = THOR_CONFIG[nextLevel];
        this.nextThorAt = this.stats.survivalMs + (cfg?.intervalMs || 5000);
      }
    }

    grantUpgradeInvulnerability() {
      this.player.resetVisual();
      this.stats.invulnerableUntil = this.time.now + CONFIG.upgradeInvulnerabilityMs;
      this.player.body.setAlpha(0.82);
    }

    isPlayerInvulnerable() {
      return this.state === "playing" && this.time.now < (this.stats.invulnerableUntil || 0);
    }

    updatePlayerInvulnerability(time) {
      if (time < (this.stats.invulnerableUntil || 0)) {
        const pulse = 0.74 + Math.sin(time / 85) * 0.12;
        this.player.body.setAlpha(pulse);
        return;
      }

      if (this.player.body.alpha !== 1) this.player.body.setAlpha(1);
      this.stats.invulnerableUntil = 0;
    }

    damagePlayer(amount) {
      if (this.isPlayerInvulnerable()) return false;
      this.stats.hp = Math.max(0, this.stats.hp - amount);
      this.player.pulseDamage();
      this.cameras.main.shake(120, 0.00135, false);
      showDamageFeedback();
      this.triggerMasochism();
      if (this.stats.hp <= 0) {
        this.endGame();
      }
      return true;
    }

    leaderboardBuild() {
      return {
        skills: { ...this.superpowers },
        aidKits: this.stats.aidKits || 0,
      };
    }

    leaderboardSummary() {
      const score = Math.round(this.stats.totalExp);
      return {
        time: formatTime(this.stats.survivalMs),
        survivalTime: Math.floor(this.stats.survivalMs / 1000),
        score,
        level: this.stats.level,
        wave: this.waveDirector.wave,
        kills: this.stats.kills,
        exp: formatExpValue(this.stats.totalExp),
        expValue: roundExpValue(this.stats.totalExp),
        deviceType: isMobileViewport() ? "mobile" : "desktop",
        build: this.leaderboardBuild(),
      };
    }

    updateLeaderboardCheckpoint() {
      const tracking = runtime.leaderboardRun;
      if (!tracking || tracking.stopped || tracking.checkpointInFlight) return;
      const nextAt = tracking.nextCheckpointAt || 30000;
      if (this.stats.survivalMs < nextAt) return;
      if (!tracking.runId) {
        tracking.nextCheckpointAt = this.stats.survivalMs + 1000;
        return;
      }
      const service = leaderboards;
      if (!service?.submitCheckpoint) {
        tracking.nextCheckpointAt = this.stats.survivalMs + 30000;
        return;
      }
      tracking.checkpointInFlight = true;
      tracking.nextCheckpointAt = Math.max(nextAt + 30000, this.stats.survivalMs + 30000);
      service.submitCheckpoint(this.leaderboardSummary(), tracking.runId)
        .catch(() => false)
        .finally(() => {
          if (runtime.leaderboardRun === tracking) tracking.checkpointInFlight = false;
        });
    }

    endGame() {
      if (this.state !== "playing") return;
      this.state = "gameOver";
      runtime.mode = "gameOver";
      this.clearJoystick();
      this.physics.pause();
      this.stats.invulnerableUntil = 0;
      this.player.resetVisual();
      setPauseButtonVisible(false);
      stopRunMusic();
      hidePauseScreen();
      const summary = this.leaderboardSummary();
      runtime.lastSummary = summary;
      showGameOver(summary);
    }

    onWaveChanged() {
      const marker = this.add.text(this.player.body.x, this.player.body.y - 62, `ВОЛНА ${this.waveDirector.wave}`, {
        fontFamily: "Space Grotesk",
        fontSize: "20px",
        color: "#eee9df",
        fontStyle: "700",
      });
      marker.setOrigin(0.5);
      marker.setDepth(20);
      this.tweens.add({
        targets: marker,
        alpha: 0,
        y: marker.y - 34,
        duration: 900,
        ease: "Sine.easeOut",
        onComplete: () => marker.destroy(),
      });
    }

    cullFarObjects() {
      const px = this.player.body.x;
      const py = this.player.body.y;
      const maxDistanceSq = CONFIG.cullDistance * CONFIG.cullDistance;
      this.activeBullets.forEach((bullet) => {
        if (bullet.active && Phaser.Math.Distance.Squared(px, py, bullet.sprite.x, bullet.sprite.y) > maxDistanceSq) bullet.disable();
      });
      this.activeExp.forEach((pickup) => {
        if (pickup.active && Phaser.Math.Distance.Squared(px, py, pickup.container.x, pickup.container.y) > maxDistanceSq) pickup.disable();
      });
      this.activeEnemies.forEach((enemy) => {
        if (enemy.active && Phaser.Math.Distance.Squared(px, py, enemy.container.x, enemy.container.y) > maxDistanceSq * 2.8) enemy.disable();
      });
    }

    drawGrid() {
      if (!this.grid) return;
      const camera = this.cameras.main;
      const width = Math.ceil(camera.width);
      const height = Math.ceil(camera.height);
      const bleed = isMobileViewport() ? 12 : 0;
      const zoom = camera.zoom || 1;
      const cell = 48 * zoom;
      const major = cell * 4;
      const offsetX = -Phaser.Math.Wrap(camera.worldView.x * zoom, 0, cell);
      const offsetY = -Phaser.Math.Wrap(camera.worldView.y * zoom, 0, cell);
      const majorOffsetX = -Phaser.Math.Wrap(camera.worldView.x * zoom, 0, major);
      const majorOffsetY = -Phaser.Math.Wrap(camera.worldView.y * zoom, 0, major);

      this.grid.clear();
      this.grid.fillStyle(0x141311, 1);
      this.grid.fillRect(-bleed, -bleed, width + bleed * 2, height + bleed * 2);
      this.grid.lineStyle(1, 0xffffff, 0.035);
      for (let x = offsetX - bleed; x <= width + cell + bleed; x += cell) {
        this.grid.lineBetween(x, -bleed, x, height + bleed);
      }
      for (let y = offsetY - bleed; y <= height + cell + bleed; y += cell) {
        this.grid.lineBetween(-bleed, y, width + bleed, y);
      }
      this.grid.lineStyle(1, 0xffffff, 0.055);
      for (let x = majorOffsetX - bleed; x <= width + major + bleed; x += major) {
        this.grid.lineBetween(x, -bleed, x, height + bleed);
      }
      for (let y = majorOffsetY - bleed; y <= height + major + bleed; y += major) {
        this.grid.lineBetween(-bleed, y, width + bleed, y);
      }
    }

    handlePointerDown(pointer) {
      if (this.state !== "playing") return;
      this.updateCursorWorld(pointer);
      const mode = effectiveControlType();
      const pointerType = pointer.pointerType || pointer.event?.pointerType || "";
      const touchFallback = pointerType === "touch" || (pointer.event?.type || "").startsWith("touch");
      if (!isMobileViewport() && !touchFallback && mode !== "joystick" && mode !== "combined") return;
      if (this.controls.joystick.active) return;
      const rect = dom.shell.getBoundingClientRect();
      this.controls.joystick.active = true;
      this.controls.joystick.pointerId = pointer.id;
      this.controls.joystick.touchFallback = touchFallback;
      this.controls.joystick.originX = pointer.x;
      this.controls.joystick.originY = pointer.y;
      this.controls.joystick.x = 0;
      this.controls.joystick.y = 0;
      dom.joystick.style.left = `${pointer.x + rect.left}px`;
      dom.joystick.style.top = `${pointer.y + rect.top}px`;
      dom.joystick.classList.add("active");
      this.updateJoystickKnob(pointer.x, pointer.y);
    }

    handlePointerMove(pointer) {
      this.updateCursorWorld(pointer);
      const joystick = this.controls.joystick;
      if (!joystick.active || pointer.id !== joystick.pointerId) return;
      this.updateJoystickKnob(pointer.x, pointer.y);
    }

    handlePointerUp(pointer) {
      const joystick = this.controls.joystick;
      if (!joystick.active || pointer.id !== joystick.pointerId) return;
      this.clearJoystick();
    }

    clearJoystick() {
      const joystick = this.controls.joystick;
      joystick.active = false;
      joystick.pointerId = null;
      joystick.touchFallback = false;
      joystick.x = 0;
      joystick.y = 0;
      dom.joystick.classList.remove("active");
      dom.joystickKnob.style.transform = "translate(-50%, -50%)";
    }

    updateCursorWorld(pointer) {
      this.controls.cursor.inside = true;
      this.controls.cursor.screenX = pointer.x;
      this.controls.cursor.screenY = pointer.y;
      this.refreshCursorWorld();
    }

    refreshCursorWorld() {
      const cursor = this.controls.cursor;
      if (!cursor.inside) return;
      const camera = this.cameras.main;
      if (
        cursor.screenX < 0 ||
        cursor.screenY < 0 ||
        cursor.screenX > camera.width ||
        cursor.screenY > camera.height
      ) {
        cursor.inside = false;
        return;
      }
      const point = camera.getWorldPoint(cursor.screenX, cursor.screenY);
      cursor.worldX = point.x;
      cursor.worldY = point.y;
    }

    updateJoystickKnob(x, y) {
      const joystick = this.controls.joystick;
      const dx = x - joystick.originX;
      const dy = y - joystick.originY;
      const distance = Math.hypot(dx, dy);
      const max = 42;
      const clamped = Math.min(max, distance);
      const nx = distance > 0 ? dx / distance : 0;
      const ny = distance > 0 ? dy / distance : 0;
      joystick.x = nx * Math.min(1, distance / max);
      joystick.y = ny * Math.min(1, distance / max);
      dom.joystickKnob.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
    }

    textSnapshot() {
      const activeEnemyList = this.activeEnemies.filter((enemy) => enemy.active);
      let closestEnemyDistance = null;
      for (let i = 0; i < activeEnemyList.length; i += 1) {
        for (let j = i + 1; j < activeEnemyList.length; j += 1) {
          const distance = Phaser.Math.Distance.Between(
            activeEnemyList[i].container.x,
            activeEnemyList[i].container.y,
            activeEnemyList[j].container.x,
            activeEnemyList[j].container.y
          );
          if (closestEnemyDistance === null || distance < closestEnemyDistance) {
            closestEnemyDistance = distance;
          }
        }
      }

      const enemies = this.activeEnemies
        .filter((enemy) => enemy.active)
        .slice(0, 12)
        .map((enemy) => ({
          type: enemy.type.key,
          x: Math.round(enemy.container.x),
          y: Math.round(enemy.container.y),
          hp: enemy.hp,
        }));
      const pickups = this.activeExp
        .filter((pickup) => pickup.active)
        .slice(0, 12)
        .map((pickup) => ({
          x: Math.round(pickup.container.x),
          y: Math.round(pickup.container.y),
          value: roundExpValue(pickup.value),
        }));
      return {
        note: "World origin is the initial player position; x increases right, y increases down.",
        mode: runtime.mode,
        player: {
          x: Math.round(this.player.body.x),
          y: Math.round(this.player.body.y),
          vx: Math.round(this.player.body.body.velocity.x),
          vy: Math.round(this.player.body.body.velocity.y),
          hp: Math.round(this.stats.hp),
          level: this.stats.level,
          exp: roundExpValue(this.stats.exp),
          nextExp: this.stats.nextExp,
        },
        superpowers: { ...this.superpowers },
        ownedSuperpowers: [...this.ownedSuperpowers],
        musicEnabled: runtime.musicEnabled,
        music: {
          enabled: runtime.musicEnabled,
          runStarted: musicState.runStarted,
          paused: musicState.audio ? musicState.audio.paused : true,
          volume: musicState.audio ? Number(musicState.audio.volume.toFixed(3)) : 0,
        },
        settings: { ...runtime.settings, effectiveControlType: effectiveControlType() },
        upgradeQueue: [...this.upgradeQueue],
        upgradeChoices: this.currentUpgradeChoices.map((choice) => ({
          type: choice.type,
          id: choice.id,
          title: choice.title,
          badge: choice.badge,
        })),
        bazookaAttackCounter: this.bazookaAttackCounter,
        razerBlades: this.razerBlades.length,
        thorStrikes: this.thorStrikes.filter((strike) => strike.active).length,
        joystickActive: this.controls.joystick.active,
        wave: this.waveDirector.wave,
        time: formatTime(this.stats.survivalMs),
        kills: this.stats.kills,
        camera: {
          scrollX: Math.round(this.cameras.main.scrollX),
          scrollY: Math.round(this.cameras.main.scrollY),
          centerX: Math.round(this.cameras.main.midPoint.x),
          centerY: Math.round(this.cameras.main.midPoint.y),
          width: Math.round(this.cameras.main.width),
          height: Math.round(this.cameras.main.height),
          zoom: this.cameras.main.zoom,
        },
        invulnerable: this.isPlayerInvulnerable(),
        activeEnemies: activeEnemyList.length,
        targetableEnemies: activeEnemyList.filter((enemy) => this.isEnemyVisibleInCamera(enemy)).length,
        damagedEnemies: activeEnemyList.filter((enemy) => enemy.hp < enemy.maxHp).length,
        closestEnemyDistance: closestEnemyDistance === null ? null : Math.round(closestEnemyDistance),
        activeBullets: this.activeBullets.filter((bullet) => bullet.active).length,
        activeExp: this.activeExp.filter((pickup) => pickup.active).length,
        deathEffects: this.deathEffects.length,
        visibleEnemies: enemies,
        visibleExp: pickups,
      };
    }
  }

  function startLeaderboardTracking() {
    const tracking = {
      runId: "",
      promise: null,
      checkpointInFlight: false,
      nextCheckpointAt: 30000,
      stopped: false,
    };
    runtime.leaderboardRun = tracking;
    const service = leaderboards;
    if (!service?.startRun) return tracking;
    tracking.promise = service.startRun().then((runId) => {
      if (runtime.leaderboardRun === tracking) tracking.runId = runId || "";
      return tracking.runId;
    }).catch(() => "");
    return tracking;
  }

  function beginGame() {
    runtime.mode = "starting";
    startLeaderboardTracking();
    setMenuRainActive(false);
    hideScreens();
    dom.hud.classList.remove("hidden");
    startRunMusic();
    transitionTo(() => {
      hideScreens();
      if (runtime.scene) runtime.scene.startGame();
      else runtime.pendingStart = true;
    });
  }

  function returnToMenu() {
    resetLevelToast();
    hidePauseScreen();
    hideUpgradeScreen();
    setPauseButtonVisible(false);
    if (runtime.scene) {
      runtime.scene.resetGame();
      runtime.scene.pauseForMenu();
    }
    runtime.mode = "menu";
    runtime.leaderboardRun = null;
    dom.hud.classList.add("hidden");
    transitionTo(() => {
      hideScreens();
      dom.menu.classList.add("screen-active");
      setMenuRainActive(true, true);
    });
  }

  dom.playButton.addEventListener("click", beginGame);
  dom.restartButton.addEventListener("click", () => {
    submitPendingLeaderboardRun();
    beginGame();
  });
  dom.menuButton.addEventListener("click", () => {
    submitPendingLeaderboardRun();
    returnToMenu();
  });
  dom.leaderboardButton?.addEventListener("click", toggleLeaderboardPanel);
  dom.settingsButton.addEventListener("click", toggleSettingsPanel);
  dom.leaderboardCategoryButton?.addEventListener("click", () => {
    const open = !dom.leaderboardCategoryMenu.classList.contains("open");
    setLeaderboardCategoryMenuOpen(open);
  });
  dom.leaderboardCategoryMenu?.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      setLeaderboardCategoryMenuOpen(false);
      loadLeaderboard(button.dataset.category);
    });
  });
  dom.nicknameInput?.addEventListener("input", () => {
    sanitizeNicknameInput();
    updateNicknameButton();
  });
  ["keydown", "keypress", "keyup"].forEach((type) => {
    dom.nicknameInput?.addEventListener(type, (event) => event.stopPropagation());
  });
  dom.nicknameSaveButton?.addEventListener("click", saveNicknameFromInput);
  document.addEventListener("pointerdown", (event) => {
    if (!dom.leaderboardPanel?.contains(event.target)) setLeaderboardCategoryMenuOpen(false);
  });
  document.querySelectorAll(".settings-arrow").forEach((button) => {
    button.addEventListener("click", () => cycleSetting(button.dataset.setting, Number(button.dataset.dir)));
  });
  dom.pauseButton.addEventListener("click", () => runtime.scene?.togglePause());
  dom.musicButton?.addEventListener("click", toggleMusic);
  dom.resumeButton.addEventListener("click", () => runtime.scene?.resumeRun());
  dom.pauseMenuButton.addEventListener("click", returnToMenu);
  function forceResizeGame(force = false) {
    syncMenuRain();
    applySettings();
    syncNicknamePanelPosition();
    runtime.scene?.queueResize(force);
  }
  function scheduleForceResize() {
    forceResizeGame(true);
  }
  window.addEventListener("resize", () => forceResizeGame());
  window.addEventListener("orientationchange", scheduleForceResize);
  document.addEventListener("fullscreenchange", scheduleForceResize);
  document.addEventListener("webkitfullscreenchange", scheduleForceResize);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleForceResize();
  });
  runtime.settings = loadSettings();
  runtime.musicEnabled = loadMusicEnabled();
  updateMusicButton();
  applySettings();
  setNicknamePanelActive(false);
  if (document.fonts?.ready) {
    document.fonts.ready.then(syncSettingsPanelHeight).catch(() => {});
  }
  setMenuRainActive(true, true);

  const phaserConfig = {
    type: Phaser.CANVAS,
    parent: "game-container",
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#141311",
    render: {
      antialias: true,
      pixelArt: false,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene],
  };

  const game = new Phaser.Game(phaserConfig);
  if (Array.isArray(Phaser.GAMES)) {
    const gameIndex = Phaser.GAMES.indexOf(game);
    if (gameIndex >= 0) Phaser.GAMES.splice(gameIndex, 1);
  }

})();

})();

