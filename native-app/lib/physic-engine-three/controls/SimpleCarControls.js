import { Vector3, Euler } from "three";

export class SimpleCarControls {
  #obj = null;
  #keys = {};
  #angle = 0;

  constructor(SimpleCarObject) {
    this.#obj = SimpleCarObject;
  }

  #handleControls = (evt) => {
    const { code, type } = evt;
    const isKeyDown = type == "keydown";
    if (isKeyDown) {
      switch (code) {
        case "ArrowLeft":
          this.#obj.setSteeringValue(this.#obj.maxSteerVal, 0);
          this.#obj.setSteeringValue(this.#obj.maxSteerVal, 1);
          break;
        case "ArrowRight":
          this.#obj.setSteeringValue(-this.#obj.maxSteerVal, 0);
          this.#obj.setSteeringValue(-this.#obj.maxSteerVal, 1);
          break;
        default:
          this.#keys[code] = { pressed: true, type: "keydown" };
      }
    } else {
      switch (code) {
        case "ArrowLeft":
          this.#obj.setSteeringValue(0, 0);
          this.#obj.setSteeringValue(0, 1);
          break;
        case "ArrowRight":
          this.#obj.setSteeringValue(0, 0);
          this.#obj.setSteeringValue(0, 1);
          break;
        default:
          if (this.#keys[code]?.type === "keydown") {
            this.#keys[code].type = "released";
          }
      }
    }
  };

  updateControls = () => {
    this.#obj.setBrake(0, 0);
    this.#obj.setBrake(0, 1);
    this.#obj.setBrake(0, 2);
    this.#obj.setBrake(0, 3);

    this.#angle = new Vector3(
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

    if (this.#keys["ArrowUp"]?.pressed) {
      if (this.#keys["ArrowUp"]?.type === "keydown") {
        if (
          !this.#keys["ArrowDown"]?.pressed ||
          this.#keys["ArrowDown"]?.type === "released"
        ) {
          if (this.#obj.linearSpeed <= this.#obj.topSpeed) {
            this.#keys["ArrowDown"] = { pressed: false, type: "keyup" };
            this.#obj.applyEngineForce(this.#obj.maxForce, 2);
            this.#obj.applyEngineForce(this.#obj.maxForce, 3); // acceleration
          } else {
            this.#obj.applyEngineForce(0, 2);
            this.#obj.applyEngineForce(0, 3); // acceleration
          }
        }
      } else if (this.#keys["ArrowUp"]?.type === "released") {
        if (
          !this.#keys["ArrowDown"]?.pressed ||
          this.#keys["ArrowDown"]?.type === "released"
        ) {
          if (this.#obj.linearSpeed >= 0 && this.#angle < Math.PI / 2) {
            this.#obj.applyEngineForce(-this.#obj.maxForce / 2, 2);
            this.#obj.applyEngineForce(-this.#obj.maxForce / 2, 3); // acc pedal is up and brake pedal is up
          } else {
            this.#keys["ArrowUp"] = { pressed: false, type: "keyup" }; // vehicle stop with brake engine; acc pedal is definitely up
            this.#obj.applyEngineForce(0, 2);
            this.#obj.applyEngineForce(0, 3);
          }
        } else if (this.#keys["ArrowDown"]?.type === "keydown") {
          if (this.#obj.linearSpeed > 0.03) {
            this.#obj.setBrake(this.#obj.brakeForce, 0);
            this.#obj.setBrake(this.#obj.brakeForce, 1);
            this.#obj.setBrake(this.#obj.brakeForce, 2);
            this.#obj.setBrake(this.#obj.brakeForce, 3); // braking with no acc pedal down
          } else {
            this.#keys["ArrowUp"] = { pressed: false, type: "keyup" };
            this.#obj.applyEngineForce(0, 2);
            this.#obj.applyEngineForce(0, 3); // vehicle stops
          }
        }
      }
    } else if (this.#keys["ArrowDown"]?.pressed) {
      if (this.#keys["ArrowDown"]?.type === "keydown") {
        if (this.#obj.linearSpeed <= this.#obj.topReverseSpeed) {
          this.#obj.applyEngineForce(-this.#obj.maxForce / 2, 2);
          this.#obj.applyEngineForce(-this.#obj.maxForce / 2, 3); // acceleration
        } else {
          this.#obj.applyEngineForce(0, 2);
          this.#obj.applyEngineForce(0, 3); // vehicle stops
        }
        // reverse acceleration
      } else {
        // slowly stop
        if (this.#obj.linearSpeed >= 0 && this.#angle > Math.PI / 2) {
          this.#obj.applyEngineForce(this.#obj.maxForce / 2, 2);
          this.#obj.applyEngineForce(this.#obj.maxForce / 2, 3); // reverse pedal is up and brake pedal is up
        } else {
          this.#keys["ArrowDown"] = { pressed: false, type: "keyup" }; // vehicle stop with brake engine; acc pedal is definitely up
          this.#obj.applyEngineForce(0, 2);
          this.#obj.applyEngineForce(0, 3);
        }
      }
    }
  };

  enableBrowserStdControls = () => {
    document.addEventListener("keydown", this.#handleControls);
    document.addEventListener("keyup", this.#handleControls);
  };
}
