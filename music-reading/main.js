$(window).on("load", function() {

  /**
   *
   * Backbone Game Engine - An elementary HTML5 canvas game engine using Backbone.
   *
   * Copyright (c) 2014 Martin Drapeau
   * https://github.com/martindrapeau/backbone-game-engine
   *
   */

  var NOTE_POOL = ["E4", "F4", "G4", "A4", "B4", "C5", "D5"];
  var SOLFEGE = {
    C: "Do",
    D: "Re",
    E: "Mi",
    F: "Fa",
    G: "Sol",
    A: "La",
    B: "Si"
  };
  var NOTE_STEPS = {
    E4: 0,
    F4: 1,
    G4: 2,
    A4: 3,
    B4: 4,
    C5: 5,
    D5: 6
  };
  if (!_.classify) {
    _.classify = function(str) {
      if (str == null) return "";
      return String(str).replace(/[\W_]/g, " ").replace(/\s+(\w)/g, function(match, chr) {
        return chr.toUpperCase();
      }).replace(/^\w/, function(chr) {
        return chr.toUpperCase();
      }).replace(/\s/g, "");
    };
  }
  if (!_.deepClone) {
    _.deepClone = function(object) {
      return JSON.parse(JSON.stringify(object));
    };
  }
  if (!_.minNotNull) {
    _.minNotNull = function(values) {
      var min = null;
      for (var i = 0; i < values.length; i++) {
        var value = values[i];
        if (_.isNumber(value) && (min == null || value < min)) min = value;
      }
      return min;
    };
  }
  if (!_.maxNotNull) {
    _.maxNotNull = function(values) {
      var max = null;
      for (var i = 0; i < values.length; i++) {
        var value = values[i];
        if (_.isNumber(value) && (max == null || value > max)) max = value;
      }
      return max;
    };
  }
  if (!_.sum) {
    _.sum = function(values) {
      var total = 0;
      for (var i = 0; i < values.length; i++) total += values[i];
      return total;
    };
  }
  if (!_.average) {
    _.average = function(values) {
      return values.length ? _.sum(values) / values.length : 0;
    };
  }

  Backbone.MusicMario = Backbone.Hero.extend({
    defaults: _.extend({}, Backbone.Hero.prototype.defaults, {
      name: "mario",
      spriteSheet: "mario"
    })
  });

  Backbone.NoteBlock = Backbone.Sprite.extend({
    defaults: _.extend({}, Backbone.Sprite.prototype.defaults, {
      name: "note-block",
      type: "tile",
      width: 80,
      height: 56,
      collision: true,
      static: true,
      persist: false,
      note: "C4",
      label: "Do"
    }),
    initialize: function(attributes, options) {
      options || (options = {});
      this.world = options.world;
      this.lastHitTime = 0;
      this.on("hit", this.onHit, this);
    },
    onHit: function(hero, side) {
      if (side !== "bottom") return;
      var now = _.now();
      if (now - this.lastHitTime < 300) return;
      this.lastHitTime = now;
      if (this.world && this.world.game)
        this.world.game.handleNoteHit(this.get("note"));
    },
    draw: function(context, options) {
      options || (options = {});
      var x = Math.round(this.get("x") + (options.offsetX || 0)),
          y = Math.round(this.get("y") + (options.offsetY || 0)),
          width = this.get("width"),
          height = this.get("height");

      drawRect(context, x, y, width, height, "#f8fafc", "#111827");
      drawRect(context, x, y, width, 8, "#111827");
      context.save();
      context.fillStyle = "#2b2b2b";
      context.font = "16px Georgia, serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(this.get("label"), x + width / 2, y + height / 2 + 6);
      context.restore();
    }
  });

  Backbone.GroundStrip = Backbone.Sprite.extend({
    defaults: _.extend({}, Backbone.Sprite.prototype.defaults, {
      name: "ground",
      type: "tile",
      width: 960,
      height: 64,
      collision: true,
      static: true,
      persist: false
    }),
    initialize: function() {
      this.tilesImg = document.getElementById("tiles");
    },
    draw: function(context, options) {
      options || (options = {});
      var x = Math.round(this.get("x") + (options.offsetX || 0)),
          y = Math.round(this.get("y") + (options.offsetY || 0)),
          width = this.get("width"),
          height = this.get("height"),
          tileSize = 32;

      if (this.tilesImg && this.tilesImg.complete) {
        for (var yy = 0; yy < height; yy += tileSize) {
          for (var xx = 0; xx < width; xx += tileSize) {
            context.drawImage(
              this.tilesImg,
              0, 0, tileSize, tileSize,
              x + xx, y + yy, tileSize, tileSize
            );
          }
        }
      } else {
        drawRect(context, x, y, width, height, "#16a34a", "#0f172a");
        drawRect(context, x, y, width, 10, "#14532d");
      }
    }
  });

  function buildMarioBackdrop(world, groundTopY) {
    // Decorado simple estilo SMB (sin colisiones): nubes + arbustos.
    // Nota: estos sprites vienen de `super-mario-bros/tiles.js`.
    var decor = [
      {cls: "Cloud1", x: 96, y: 96},
      {cls: "Cloud2", x: 128, y: 96},
      {cls: "Cloud3", x: 160, y: 96},

      {cls: "Cloud1", x: 640, y: 128},
      {cls: "Cloud2", x: 672, y: 128},
      {cls: "Cloud3", x: 704, y: 128},

      {cls: "CloudHappy1", x: 384, y: 72},
      {cls: "CloudHappy2", x: 416, y: 72},
      {cls: "CloudHappy3", x: 448, y: 72}
    ];

    for (var i = 0; i < decor.length; i++) {
      var d = decor[i];
      if (!Backbone[d.cls]) continue;
      world.add(new Backbone[d.cls]({
        x: d.x,
        y: d.y,
        collision: false,
        static: true,
        persist: false
      }, {world: world}));
    }
  }

  function buildMarioGround(world, groundTopY, widthPx) {
    var tileSize = 32;
    var groundRows = 2;

    for (var row = 0; row < groundRows; row++) {
      for (var x = 0; x < widthPx; x += tileSize) {
        world.add(new Backbone.Ground({
          x: x,
          y: groundTopY + row * tileSize,
          persist: false
        }, {world: world}));
      }
    }
  }

  Backbone.MusicHud = Backbone.Model.extend({
    initialize: function(attributes, options) {
      options || (options = {});
      this.game = options.game;
    },
    update: function() {
      return true;
    },
    draw: function(context) {
      var game = this.game,
          staffWidth = 420,
          lineSpacing = 20,
          staffLeft = Math.round((context.canvas.width - staffWidth) / 2),
          staffTop = 50,
          targetNote = game.targetNote,
          noteY = noteToY(targetNote, staffTop, lineSpacing),
          noteX = staffLeft + 260,
          now = _.now();

      context.save();
      context.fillStyle = "rgba(15, 23, 42, 0.75)";
      drawRoundRect(context, staffLeft - 40, 20, staffWidth + 80, 170, 12, "rgba(15, 23, 42, 0.75)", "rgba(248, 244, 231, 0.3)");

      context.strokeStyle = "#e2e8f0";
      context.lineWidth = 1;
      for (var i = 0; i < 5; i++) {
        var y = staffTop + i * lineSpacing;
        context.beginPath();
        context.moveTo(staffLeft, y);
        context.lineTo(staffLeft + staffWidth, y);
        context.stroke();
      }

      if (targetNote) {
        drawNote(context, noteX, noteY);
      }

      context.fillStyle = "#f8f4e7";
      context.font = "16px 'Courier New', monospace";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText("Golpea con la cabeza la tecla correcta.", staffLeft - 24, 24);

      context.font = "14px 'Courier New', monospace";
      context.fillText("Puntos: " + game.score + " / Intentos: " + game.attempts, staffLeft + staffWidth - 120, 24);

      if (game.lastResult && now - game.lastResultTime < 1200) {
        context.font = "16px 'Courier New', monospace";
        context.fillStyle = game.lastResult == "Correcto" ? "#a7f3d0" : "#fecaca";
        context.fillText(game.lastResult, staffLeft + staffWidth - 120, 52);
      }
      context.restore();
    }
  });

  function solfegeLabel(note) {
    if (!note) return "";
    var letter = note.charAt(0);
    return SOLFEGE[letter] + " (" + letter + ")";
  }

  function noteToY(note, staffTop, lineSpacing) {
    var step = NOTE_STEPS[note];
    if (!_.isNumber(step)) return staffTop + 4 * lineSpacing;
    return staffTop + 4 * lineSpacing - (step * lineSpacing / 2);
  }

  function drawNote(context, x, y) {
    context.save();
    context.fillStyle = "#f8f4e7";
    context.strokeStyle = "#f8f4e7";
    context.lineWidth = 2;

    context.save();
    context.translate(x, y);
    context.scale(1.6, 1.2);
    context.beginPath();
    context.arc(0, 0, 9, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.beginPath();
    context.moveTo(x + 10, y);
    context.lineTo(x + 10, y - 40);
    context.stroke();
    context.restore();
  }

  function buildNoteBlocks(world) {
    var startX = 90,
        gap = 12,
        blockY = 320;
    for (var i = 0; i < NOTE_POOL.length; i++) {
      var note = NOTE_POOL[i],
          letter = note.charAt(0),
          label = SOLFEGE[letter];
      world.add(new Backbone.NoteBlock({
        x: startX + i * (96 + gap),
        y: blockY,
        note: note,
        label: label
      }, {world: world}));
    }
  }

  function spawnBadEnemy(world, mario) {
    if (!world) return;
    var floorY = mario && _.isNumber(mario.get("floor")) ? mario.get("floor") : null;
    var dir = Math.random() > 0.5 ? "left" : "right",
        startX = Math.floor(Math.random() * 860) + 40,
        enemy = new Backbone.Mushroom({
          x: startX,
          y: _.isNumber(floorY) ? (floorY - 64) : 520,
          floor: _.isNumber(floorY) ? floorY : 600,
          state: "walk-" + dir
        });
    world.add(enemy);
    world.setTimeout(function() {
      if (enemy && enemy.world) enemy.world.remove(enemy);
    }, 4500);
  }

  var game = {
    targetNote: null,
    score: 0,
    attempts: 0,
    lastResult: null,
    lastResultTime: 0,
    world: null,
    mario: null,
    nextNote: function() {
      var next = this.targetNote,
          tries = 0;
      while (next == this.targetNote && tries < 10) {
        next = NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)];
        tries++;
      }
      this.targetNote = next;
    },
    handleNoteHit: function(note) {
      this.attempts += 1;
      if (note === this.targetNote) {
        this.score += 1;
        this.lastResult = "Correcto";
        this.lastResultTime = _.now();
        this.nextNote();
      } else {
        this.lastResult = "Intenta otra";
        this.lastResultTime = _.now();
        spawnBadEnemy(this.world, this.mario);
      }
    }
  };

  var canvas = document.getElementById("foreground");
  adjustViewport(canvas);

  // `viewportBottom` recorta una franja inferior del canvas para UI/touchpad.
  // Si ponemos el suelo por debajo de ese límite, no se verá.
  var viewportBottom = 156;
  var groundHeightPx = 64; // 2 filas de tiles de 32px
  var visibleWorldHeight = Math.max(0, canvas.height - viewportBottom);
  var groundTopY = Math.max(0, visibleWorldHeight - groundHeightPx);

  var spriteSheets = new Backbone.SpriteSheetCollection([{
    id: "mario",
    img: "#mario",
    tileWidth: 32,
    tileHeight: 64,
    tileColumns: 21,
    tileRows: 6
  }, {
    id: "tiles",
    img: "#tiles",
    tileWidth: 32,
    tileHeight: 32,
    tileColumns: 29,
    tileRows: 28
  }, {
    id: "enemies",
    img: "#enemies",
    tileWidth: 32,
    tileHeight: 64,
    tileColumns: 51,
    tileRows: 3
  }]).attachToSpriteClasses();

  var input = new Backbone.Input({
    drawTouchpad: true,
    drawPause: true
  });

  var mario = new Backbone.MusicMario({
    x: 120, y: 160, floor: groundTopY
  }, {
    input: input
  });

  var world = new Backbone.World({
    width: 30, height: 20,
    tileWidth: 32, tileHeight: 32,
    viewportBottom: viewportBottom,
    backgroundColor: "#5c94fc"
  }, {
    input: input
  });
  buildMarioBackdrop(world, groundTopY);
  buildMarioGround(world, groundTopY, 960);
  world.add(mario);
  buildNoteBlocks(world);
  world.game = game;
  game.world = world;
  game.mario = mario;
  game.nextNote();

  var hud = new Backbone.MusicHud({}, {game: game});

  var engine = new Backbone.Engine({}, {
    canvas: canvas,
    input: input
  });
  engine.add([
    world,
    input,
    hud
  ]);

  _.extend(window, {
    canvas: canvas,
    engine: engine,
    world: world,
    mario: mario,
    game: game
  });

});
