import { TransparentTargetObject } from "./TransparentTargetObject";

export class RefereeObject {
  #triggerCollide = true;

  constructor(referralPlayer) {
    this.target = new TransparentTargetObject();
    this.#resetTargetPosition();

    this.target.body.addEventListener("collide", (e) => {
      if (this.#triggerCollide && e.contact.bj.commonId === this.commonId) {
        referralPlayer.updateScore();
        this.#resetTargetPosition();
        this.executeCallback(true);
        this.#triggerCollide = false;
        setTimeout(() => {
          this.#triggerCollide = !this.#triggerCollide;
        }, 100);
      }
    });
  }

  executeCallback = (isNewTarget = false) => {
    this.mainCallback(this, isNewTarget);
  };

  #resetTargetPosition = () => {
    this.target.setPosition({
      x: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 40),
      y: 0.4,
      z: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 40),
    });
  };

  setCallback = (callback) => {
    this.mainCallback = callback;
  };

  setCommonId = (commonId) => {
    this.commonId = commonId;
  };
}
