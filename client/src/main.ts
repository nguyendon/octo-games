import Phaser from "phaser";
import { BootScene } from "./scenes/Boot";
import { Level1Scene } from "./scenes/Level1";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 600,
  backgroundColor: "#0f0f10",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, Level1Scene],
});
