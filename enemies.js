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
