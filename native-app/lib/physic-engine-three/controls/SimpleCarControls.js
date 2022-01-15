export class SimpleCarControls {
  #obj = null;
  constructor(SimpleCarObject) {
    this.#obj = SimpleCarObject;
  }
  #handleControls = (evt) => {
    const { code, type } = evt;
    const up = type == "keyup";

    if (!up && type !== "keydown") {
      return;
    }

    this.#obj.setBrake(0, 0);
    this.#obj.setBrake(0, 1);
    this.#obj.setBrake(0, 2);
    this.#obj.setBrake(0, 3);
    
    switch (code) {
      case "ArrowUp":
        this.#obj.applyEngineForce(up ? 0 : this.#obj.maxForce, 2);
        this.#obj.applyEngineForce(up ? 0 : this.#obj.maxForce, 3);
        break;

      case "ArrowDown":
        this.#obj.applyEngineForce(up ? 0 : -this.#obj.maxForce, 2);
        this.#obj.applyEngineForce(up ? 0 : -this.#obj.maxForce, 3);
        break;

      case "KeyB":
        this.#obj.setBrake(this.#obj.brakeForce, 0);
        this.#obj.setBrake(this.#obj.brakeForce, 1);
        this.#obj.setBrake(this.#obj.brakeForce, 2);
        this.#obj.setBrake(this.#obj.brakeForce, 3);
        break;

      case "ArrowRight":
        this.#obj.setSteeringValue(up ? 0 : -this.#obj.maxSteerVal, 0);
        this.#obj.setSteeringValue(up ? 0 : -this.#obj.maxSteerVal, 1);
        break;

      case "ArrowLeft":
        this.#obj.setSteeringValue(up ? 0 : this.#obj.maxSteerVal, 0);
        this.#obj.setSteeringValue(up ? 0 : this.#obj.maxSteerVal, 1);
        break;
    }
  };

  enableBrowserStdControls = () => {
    document.addEventListener("keydown", this.#handleControls);
    document.addEventListener("keyup", this.#handleControls);
  };
}
