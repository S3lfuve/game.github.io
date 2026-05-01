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
  bazookaDamage: 12,
  bazookaBaseRadius: 54,
  masochismRadius: 108,
  masochismSlowMs: 2000,
  masochismSlowMultiplier: 0.65,
  thorWarningMs: 1000,
  thorClusterRadius: 150,
  thorMinStrikeDistance: 88,
};

const SHOOTER_BULLET_COUNTS = [1, 2, 3, 5];
const SHOOTER_FIRE_RATE_BONUS = [0, 0, 0.05, 0.15];
const ARROW_PIERCE_LIMITS = [0, 2, 4, 6];
const MASOCHISM_BULLET_COUNTS = [0, 8, 10, 12];
const MASOCHISM_BULLET_DAMAGE = [0, 4, 4, 5];
const BAZOOKA_ATTACK_INTERVALS = [0, 10, 7, 5];
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
  1: { count: 1, damage: 3, radius: 75, hitRadius: 14.5, rotationsPerSecond: 0.65, color: 0xa94e59, stroke: 0xd58a85 },
  2: { count: 2, damage: 4, radius: 79, hitRadius: 15.0, rotationsPerSecond: 0.86, color: 0xb65b61, stroke: 0xe0a09a },
  3: { count: 3, damage: 6, radius: 83, hitRadius: 15.5, rotationsPerSecond: 1.1, color: 0x8d5aa6, stroke: 0xd1aae3 },
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
      "Уровень 2: выстрел каждые 7 атак, увеличенный радиус.",
      "Уровень 3: выстрел каждые 5 атак, увеличенный радиус.",
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
      "При получении урона выпускает 6 сильных снарядов во все стороны.",
      "Выпускает 8 сильных снарядов и замедляет врагов поблизости.",
      "Выпускает 10 сильных снарядов и наносит сильный урон по области.",
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
