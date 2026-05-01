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
        joystick: { active: false, pointerId: null, originX: 0, originY: 0, x: 0, y: 0 },
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

      if ((mobile || mode === "joystick" || mode === "combined") && this.controls.joystick.active) {
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

    applyBloodyToEnemy(enemy, now) {
      const level = this.getSuperpowerLevel("bloody");
      const cfg = BLOODY_CONFIG[level];
      if (!cfg || !enemy.active) return;
      enemy.applyBleed(level, cfg.damagePerSecond, now + cfg.durationMs, now);
      if (cfg.slowMultiplier < 1) {
        enemy.applySlow(cfg.slowMultiplier, now + cfg.durationMs);
      }
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
      }

      if (level >= 3) {
        this.damageNearbyEnemies(originX, originY, CONFIG.masochismRadius, CONFIG.bulletDamage * 1.5);
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
      effect.lineStyle(1, 0xffffff, 0.1);
      effect.strokeCircle(0, 0, radius * 0.58);
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
      for (const enemy of [...this.activeEnemies]) {
        if (!enemy.active || damaged.has(enemy)) continue;
        const distance = Phaser.Math.Distance.Between(x, y, enemy.container.x, enemy.container.y);
        if (distance <= radius + enemy.radius) {
          damaged.add(enemy);
          if (enemy.takeDamage(CONFIG.bazookaDamage)) {
            this.killEnemy(enemy);
          }
        }
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
            if (enemy.takeDamage(cfg.damage)) {
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
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 3);
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
      const ownedCount = this.ownedSuperpowers.length;
      const abilityChoices = SUPERPOWER_REGISTRY
        .filter((ability) => {
          const currentLevel = this.getSuperpowerLevel(ability.id);
          if (currentLevel >= ability.maxLevel) return false;
          if (currentLevel === 0 && ownedCount >= 5) return false;
          return true;
        })
        .map((ability) => {
          const currentLevel = this.getSuperpowerLevel(ability.id);
          const nextLevel = currentLevel + 1;
          const masochismDescriptions = [
            "При получении урона выпускает 8 сильных снарядов во все стороны.",
            "Выпускает 10 сильных снарядов и замедляет врагов поблизости.",
            "Выпускает 12 сильных снарядов и наносит сильный урон по области.",
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
        description: "Увеличивает ХП на 15%, восстанавливает 20% ХП + полученные.",
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
      const score = Math.round(this.stats.totalExp);
      const summary = {
        time: formatTime(this.stats.survivalMs),
        survivalTime: Math.floor(this.stats.survivalMs / 1000),
        score,
        level: this.stats.level,
        wave: this.waveDirector.wave,
        kills: this.stats.kills,
        exp: formatExpValue(this.stats.totalExp),
        expValue: roundExpValue(this.stats.totalExp),
        deviceType: isMobileViewport() ? "mobile" : "desktop",
      };
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
      if (!isMobileViewport() && mode !== "joystick" && mode !== "combined") return;
      if (this.controls.joystick.active) return;
      const rect = dom.shell.getBoundingClientRect();
      this.controls.joystick.active = true;
      this.controls.joystick.pointerId = pointer.id;
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
    };
    runtime.leaderboardRun = tracking;
    const service = window.TimeKillerLeaderboards;
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
  dom.restartButton.addEventListener("click", async () => {
    if (await submitPendingLeaderboardRun() === "blocked") return;
    beginGame();
  });
  dom.menuButton.addEventListener("click", async () => {
    if (await submitPendingLeaderboardRun() === "blocked") return;
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
  let syntheticNow = performance.now();

  window.render_game_to_text = () => {
    if (!runtime.scene) {
      return JSON.stringify({ mode: runtime.mode, note: "Scene is still booting." });
    }
    return JSON.stringify(runtime.scene.textSnapshot());
  };

  window.advanceTime = (ms) => {
    if (!game.loop || !runtime.scene) return;
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      syntheticNow += 1000 / 60;
      game.loop.step(syntheticNow);
    }
  };

})();
