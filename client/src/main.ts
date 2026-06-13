import Phaser from "phaser";
import { BootScene } from "./scenes/Boot";
import { Level1Scene, Level2Scene, Level3Scene } from "./scenes/Level1";
import { WinScene } from "./scenes/Win";
import { CaughtModalScene } from "./scenes/CaughtModal";
import { PauseMenuScene } from "./scenes/PauseMenu";
import { StatsScene } from "./scenes/Stats";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 600,
  backgroundColor: "#0f0f10",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, Level1Scene, Level2Scene, Level3Scene, WinScene, CaughtModalScene, PauseMenuScene, StatsScene],
});
