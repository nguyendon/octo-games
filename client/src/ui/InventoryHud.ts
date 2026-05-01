import Phaser from "phaser";
import { INGREDIENT_IDS, type IngredientId } from "@octo/shared";

const SLOT_COLORS: Record<IngredientId, number> = {
  dough: 0xf3d9a4,
  sauce: 0xc4422c,
  cheese: 0xf2c94c,
  pepperoni: 0xa83232,
  basil: 0x4caf50,
};

const SLOTS_RIGHT_X = 770;
const SLOTS_Y = 28;
const SLOT_GAP = 32;
const SLOT_RADIUS = 12;
const FILL_RADIUS = 9;
const PROMPT_Y = 568;

export class InventoryHud {
  private readonly fills = new Map<IngredientId, Phaser.GameObjects.Arc>();
  private readonly moneyText: Phaser.GameObjects.Text;
  private readonly promptText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    INGREDIENT_IDS.forEach((id, i) => {
      const x = SLOTS_RIGHT_X - (INGREDIENT_IDS.length - 1 - i) * SLOT_GAP;
      scene.add.circle(x, SLOTS_Y, SLOT_RADIUS).setStrokeStyle(2, 0x666666);
      const fill = scene.add.circle(x, SLOTS_Y, FILL_RADIUS, SLOT_COLORS[id]);
      fill.setVisible(false);
      this.fills.set(id, fill);
    });

    this.moneyText = scene.add
      .text(SLOTS_RIGHT_X + SLOT_RADIUS, SLOTS_Y + 24, "$0", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        color: "#f6c84a",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);

    this.promptText = scene.add
      .text(400, PROMPT_Y, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        color: "#cfd8dc",
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  update(
    collected: ReadonlySet<IngredientId>,
    money: number,
    isHidden: boolean,
    onHideSpot: boolean,
    onStove: boolean,
    allIngredients: boolean,
  ) {
    for (const [id, fill] of this.fills) {
      fill.setVisible(collected.has(id));
    }
    this.moneyText.setText(`$${money}`);

    let text = "";
    let color = "#cfd8dc";
    if (isHidden) {
      text = "hidden — press SPACE to come out";
      color = "#9ad17a";
    } else if (onStove) {
      if (allIngredients) {
        text = "hold SPACE to cook the pizza";
        color = "#9ad17a";
      } else {
        const missing = INGREDIENT_IDS.length - collected.size;
        text = `stove ready, but missing ${missing} ingredient${missing === 1 ? "" : "s"}`;
        color = "#e07b7b";
      }
    } else if (onHideSpot) {
      text = "press SPACE to hide";
      color = "#cfd8dc";
    }

    if (text) {
      this.promptText.setText(text).setColor(color).setVisible(true);
    } else {
      this.promptText.setVisible(false);
    }
  }
}
