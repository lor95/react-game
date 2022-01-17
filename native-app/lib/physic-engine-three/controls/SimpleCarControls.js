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
        case "ArrowUp":
          this.#keys["ArrowUp"] = true;
          break;
        case "ArrowDown":
          this.#keys["ArrowDown"] = true;
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
          this.#keys[code] = false;
      }
    }
  };

  mobileControls = (data, isMoving) => {
    if (data.y < -40) {
      this.#keys["ArrowDown"] = false;
      this.#keys["ArrowUp"] = true;
    } else if (data.y > 40) {
      this.#keys["ArrowUp"] = false;
      this.#keys["ArrowDown"] = true;
    } else {
      this.#keys["ArrowUp"] = false;
      this.#keys["ArrowDown"] = false;
    }
    if (data.x < -40) {
      this.#handleControls({ code: "ArrowLeft", type: "keydown" });
    } else if (data.x > 40) {
      this.#handleControls({ code: "ArrowRight", type: "keydown" });
    } else {
      this.#handleControls({ code: "ArrowLeft", type: "keyup" });
      this.#handleControls({ code: "ArrowRight", type: "keyup" });
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

    //if (this.#keys["ArrowUp"]?.pressed) {
    //  if (this.#keys["ArrowUp"]?.type === "keydown") {
    //    if (
    //      !this.#keys["ArrowDown"]?.pressed ||
    //      this.#keys["ArrowDown"]?.type === "released"
    //    ) {
    //      if (this.#obj.linearSpeed <= this.#obj.topSpeed) {
    //        this.#keys["ArrowDown"] = { pressed: false, type: "keyup" };
    //        this.#obj.applyEngineForce(this.#obj.maxForce, 2);
    //        this.#obj.applyEngineForce(this.#obj.maxForce, 3); // acceleration
    //      } else {
    //        this.#keys["ArrowUp"] = { pressed: false, type: "keyup" };
    //        this.#keys["ArrowDown"] = { pressed: false, type: "keyup" };
    //        this.#obj.applyEngineForce(0, 2);
    //        this.#obj.applyEngineForce(0, 3);
    //      }
    //    }
    //  } else if (this.#keys["ArrowUp"]?.type === "released") {
    //    if (
    //      !this.#keys["ArrowDown"]?.pressed ||
    //      this.#keys["ArrowDown"]?.type === "released"
    //    ) {
    //      if (this.#obj.linearSpeed >= 0 && this.#angle < Math.PI / 2) {
    //        this.#obj.applyEngineForce(-this.#obj.maxForce / 2, 2);
    //        this.#obj.applyEngineForce(-this.#obj.maxForce / 2, 3); // acc pedal is up and brake pedal is up
    //      } else {
    //        this.#keys["ArrowUp"] = { pressed: false, type: "keyup" };
    //        this.#keys["ArrowDown"] = { pressed: false, type: "keyup" };
    //        this.#obj.applyEngineForce(0, 2);
    //        this.#obj.applyEngineForce(0, 3);
    //      }
    //    } else if (this.#keys["ArrowDown"]?.type === "keydown") {
    //      if (this.#obj.linearSpeed > 0.03) {
    //        this.#obj.setBrake(this.#obj.brakeForce, 0);
    //        this.#obj.setBrake(this.#obj.brakeForce, 1);
    //        this.#obj.setBrake(this.#obj.brakeForce, 2);
    //        this.#obj.setBrake(this.#obj.brakeForce, 3); // braking with no acc pedal down
    //      } else {
    //        this.#keys["ArrowUp"] = { pressed: false, type: "keyup" };
    //        this.#keys["ArrowDown"] = { pressed: false, type: "keyup" };
    //        this.#obj.applyEngineForce(0, 2);
    //        this.#obj.applyEngineForce(0, 3); // vehicle stops
    //      }
    //    }
    //  }
    //} else if (this.#keys["ArrowDown"]?.pressed) {
    //  console.log("no1")
    //  if (this.#keys["ArrowDown"]?.type === "keydown") {
    //    if (this.#obj.linearSpeed <= this.#obj.topReverseSpeed) {
    //      this.#obj.applyEngineForce(-this.#obj.maxForce / 2, 2);
    //      this.#obj.applyEngineForce(-this.#obj.maxForce / 2, 3); // acceleration
    //    } else {
    //      this.#keys["ArrowUp"] = { pressed: false, type: "keyup" };
    //      this.#keys["ArrowDown"] = { pressed: false, type: "keyup" };
    //      this.#obj.applyEngineForce(0, 2);
    //      this.#obj.applyEngineForce(0, 3); // vehicle stops
    //    }
    //    // reverse acceleration
    //  } else {
    //    // slowly stop
    //    if (this.#obj.linearSpeed >= 0 && this.#angle > Math.PI / 2) {
    //      this.#obj.applyEngineForce(this.#obj.maxForce / 2, 2);
    //      this.#obj.applyEngineForce(this.#obj.maxForce / 2, 3); // reverse pedal is up and brake pedal is up
    //    } else {
    //      this.#keys["ArrowUp"] = { pressed: false, type: "keyup" };
    //      this.#keys["ArrowDown"] = { pressed: false, type: "keyup" };
    //      this.#obj.applyEngineForce(0, 2);
    //      this.#obj.applyEngineForce(0, 3);
    //    }
    //  }
    //}
    //console.log(this.#keys["ArrowUp"]);
    //console.log(this.#keys["ArrowDown"]);
    if (this.#keys["ArrowUp"]) {
      if (this.#obj.linearSpeed <= this.#obj.topSpeed) {
        this.#obj.applyEngineForce(this.#obj.maxForce, 2);
        this.#obj.applyEngineForce(this.#obj.maxForce, 3);
      } // acceleration
      else {
        {
          this.#obj.applyEngineForce(0, 2);
          this.#obj.applyEngineForce(0, 3);
        } // acceleration
      }
    } else if (this.#keys["ArrowDown"]) {
      this.#obj.setBrake(this.#obj.brakeForce, 0);
      this.#obj.setBrake(this.#obj.brakeForce, 1);
      this.#obj.setBrake(this.#obj.brakeForce, 2);
      this.#obj.setBrake(this.#obj.brakeForce, 3); // braking with no acc pedal down
    } else {
      this.#obj.applyEngineForce(0, 2);
      this.#obj.applyEngineForce(0, 3);
    }
  };

  enableBrowserStdControls = () => {
    document.addEventListener("keydown", this.#handleControls);
    document.addEventListener("keyup", this.#handleControls);
  };
}
