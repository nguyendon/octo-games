import Phaser from "phaser";

const SIZE = 36;

export class HideSpot extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, SIZE, SIZE, 0x2a3550);
    this.setStrokeStyle(2, 0x6c84b8);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
