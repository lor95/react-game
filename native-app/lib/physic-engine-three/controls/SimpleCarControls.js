import { Vector3, Euler } from "three";

export class SimpleCarControls {
  #obj = null;
  #brakeTrigger = 1;

  constructor(SimpleCarObject) {
    this.#obj = SimpleCarObject;
  }
  #handleControls = (evt) => {
    const { code, type } = evt;
    const up = type == "keyup";

    if (!up && type !== "keydown") {
      return;
    }

    this.#brakeTrigger = new Vector3(
      this.#obj.chassisBody.velocity.x,
      this.#obj.chassisBody.velocity.y,
      this.#obj.chassisBody.velocity.z
    )
      .normalize()
      .angleTo(
        new Vector3(1, 0, 0)
          .applyEuler(
            new Euler(
              this.#obj.chassisShape.rotation.x,
              this.#obj.chassisShape.rotation.y,
              this.#obj.chassisShape.rotation.z,
              "XYZ"
            )
          )
          .normalize()
      );

    this.#obj.setBrake(0, 0);
    this.#obj.setBrake(0, 1);
    this.#obj.setBrake(0, 2);
    this.#obj.setBrake(0, 3);
    
    switch (code) {
      case "ArrowUp":
        //  if (this.#brakeTrigger === 1) {
        this.#obj.applyEngineForce(up ? 0 : this.#obj.maxForce, 2);
        this.#obj.applyEngineForce(up ? 0 : this.#obj.maxForce, 3);
        //  } else {
        //    this.#obj.setBrake(this.#obj.brakeForce, 0);
        //    this.#obj.setBrake(this.#obj.brakeForce, 1);
        //    this.#obj.setBrake(this.#obj.brakeForce, 2);
        //    this.#obj.setBrake(this.#obj.brakeForce, 3);
        //  }
        break;

      case "ArrowDown":
        if (this.#brakeTrigger > Math.PI / 2) {
          this.#obj.applyEngineForce(up ? 0 : -this.#obj.maxForce / 2, 2);
          this.#obj.applyEngineForce(up ? 0 : -this.#obj.maxForce / 2, 3);
        } else {
          this.#obj.setBrake(this.#obj.brakeForce, 0);
          this.#obj.setBrake(this.#obj.brakeForce, 1);
          this.#obj.setBrake(this.#obj.brakeForce, 2);
          this.#obj.setBrake(this.#obj.brakeForce, 3);
        }
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
