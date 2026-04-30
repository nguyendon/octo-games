import Phaser from "phaser";
import { BootScene } from "./scenes/Boot";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 800,
  height: 600,
  backgroundColor: "#1a1a1a",
  scene: [BootScene],
});
