import { Vec3 } from "cannon";

export class CarControls {
  #expectedTurn = 0;
  #keys = {};
  #brakeEngineTimeouts = {};
  #obj = null;

  constructor(PhysicObject) {
    this.#obj = PhysicObject;
    this.positionToUpdate = false;
  }

  #getControlCodeInfo = (code) => {
    let retCode;
    let oppositeTimerLength;
    let timerLength;
    switch (code) {
      case "ArrowUp":
        retCode = "ArrowDown";
        oppositeTimerLength = 2500;
        timerLength = 5000;
        break;
      case "ArrowDown":
        retCode = "ArrowUp";
        oppositeTimerLength = 5000;
        timerLength = 2500;
        break;
      case "ArrowLeft":
        retCode = "ArrowRight";
        oppositeTimerLength = 1500;
        timerLength = 1500;
        break;
      case "ArrowRight":
        retCode = "ArrowLeft";
        oppositeTimerLength = 1500;
        timerLength = 1500;
        break;
    }
    return { oppositeCode: retCode, oppositeTimerLength, timerLength };
  };

  #handleControls = (evt) => {
    const { code, type } = evt;
    const { oppositeCode, oppositeTimerLength, timerLength } =
      this.#getControlCodeInfo(code);
    const isKeyDown = type == "keydown";
    if (isKeyDown) {
      if (this.#brakeEngineTimeouts[oppositeCode]) {
        if (this.#keys[oppositeCode]?.pressed) {
          clearTimeout(this.#brakeEngineTimeouts[oppositeCode]);
          this.#keys[oppositeCode].type = "released";
          this.#brakeEngineTimeouts[oppositeCode] = setTimeout(() => {
            this.#keys[oppositeCode] = { pressed: false, type: "keyup" };
          }, oppositeTimerLength);
        }
      }
      clearTimeout(this.#brakeEngineTimeouts[code]);
      this.#keys[code] = { pressed: true, type: "keydown" };
    } else {
      if (this.#keys[code]?.type === "keydown") {
        this.#keys[code].type = "released";
        this.#brakeEngineTimeouts[code] = setTimeout(() => {
          this.#keys[code] = { pressed: false, type: "keyup" };
        }, timerLength);
      }
    }
  };

  //setSocket = (socketToEnable) => {
  //  this.#socket = socketToEnable;
  //};

  enableBrowserStdControls = () => {
    document.addEventListener("keydown", this.#handleControls);
    document.addEventListener("keyup", this.#handleControls);
  };

  #moveObject = (data) => {
    const latestPosition = this.#obj.position;
    const nextPositionX = latestPosition.x + data.vx;
    const nextPositionZ = latestPosition.z + data.vz;
    const latestYAngle = this.#obj.yAngle;
    this.#obj.yAngle += data.vy;
    if (
      nextPositionX !== latestPosition.x ||
      nextPositionZ !== latestPosition.z ||
      this.#obj.yAngle !== latestYAngle
    ) {
      this.#obj.translateZ(Math.sqrt(data.vx * data.vx + data.vz * data.vz));
      //this.#obj.physicBody.position.set(
      //  nextPositionX,
      //  this.#obj.position.y,
      //  nextPositionZ
      //);
      this.#obj.physicBody.quaternion.setFromAxisAngle(
        new Vec3(0, 1, 0),
        this.#obj.yAngle
      );
    }
  };

  performMove = () => {
    this.#obj.actualSpeed = Math.sqrt(
      Math.pow(this.#obj.components.vx, 2) +
        Math.pow(this.#obj.components.vz, 2)
    );
    if (
      this.#keys["ArrowLeft"]?.pressed &&
      this.#keys["ArrowLeft"]?.type === "keydown"
    ) {
      if (this.#expectedTurn + this.#obj.steeringCoeff <= 0.1)
        this.#expectedTurn +=
          this.#obj.steeringCoeff *
          ((this.#obj.actualSpeed + 0.01) / this.#obj.topSpeed);
    }
    if (
      this.#keys["ArrowRight"]?.pressed &&
      this.#keys["ArrowRight"]?.type === "keydown"
    ) {
      if (this.#expectedTurn - this.#obj.steeringCoeff >= -0.1)
        this.#expectedTurn -=
          this.#obj.steeringCoeff *
          ((this.#obj.actualSpeed + 0.01) / this.#obj.topSpeed);
    }
    if (
      (this.#keys["ArrowUp"]?.pressed || this.#keys["ArrowDown"]?.pressed) &&
      this.#obj.actualSpeed > 0
    ) {
      this.#obj.components.vy = this.#expectedTurn;
      this.#expectedTurn = 0;
    } else {
      this.#obj.components.vy = 0;
    }
    const sinAngle = Math.sin(this.#obj.yAngle + this.#obj.components.vy);
    const cosAngle = Math.cos(this.#obj.yAngle + this.#obj.components.vy);
    let angleQuadrant;
    if (cosAngle > 0 && sinAngle > 0) angleQuadrant = 1;
    else if (cosAngle < 0 && sinAngle > 0) angleQuadrant = 2;
    else if (cosAngle < 0 && sinAngle < 0) angleQuadrant = 3;
    else if (cosAngle > 0 && sinAngle < 0) angleQuadrant = 4;

    if (this.#keys["ArrowUp"]?.pressed) {
      if (
        (Math.abs(this.#obj.components.vx) <=
          Math.abs(parseFloat(sinAngle).toFixed(12)) * this.#obj.topSpeed ||
          this.#keys["ArrowLeft"]?.pressed ||
          this.#keys["ArrowRight"]?.pressed) &&
        Math.abs(this.#obj.components.vx) >= 0
      ) {
        let sign = -1;
        if (
          angleQuadrant === 1 ||
          angleQuadrant === 2 ||
          (!Boolean(angleQuadrant) && sinAngle === 1)
        ) {
          sign = 1;
        }
        if (this.#keys["ArrowUp"].type === "keydown") {
          this.#obj.components.vx +=
            (sign * (this.#obj.accCoeff * Math.abs(sinAngle))) / 100;
          if (
            Math.abs(this.#obj.components.vx) >
              Math.abs(parseFloat(sinAngle).toFixed(12)) * this.#obj.topSpeed &&
            Math.sign(this.#obj.components.vx) === sign
          ) {
            this.#obj.components.vx =
              Math.abs(parseFloat(sinAngle).toFixed(12)) *
              sign *
              this.#obj.topSpeed;
          }
        } else if (this.#keys["ArrowUp"].type === "released") {
          let coeff = this.#obj.brakeEngine + this.#obj.tireGrip;
          if (
            this.#keys["ArrowDown"]?.pressed &&
            this.#keys["ArrowDown"]?.type === "keydown"
          )
            coeff = this.#obj.brakeCoeff + this.#obj.tireGrip;
          this.#obj.components.vx -=
            (sign * (coeff * Math.abs(sinAngle))) / 100;
          if (
            (this.#obj.components.vx < 0 && sign > 0) ||
            (this.#obj.components.vx > 0 && sign < 0)
          ) {
            this.#obj.components.vx = 0;
          }
        }
      }
      if (
        (Math.abs(this.#obj.components.vz) <=
          Math.abs(parseFloat(cosAngle).toFixed(12)) * this.#obj.topSpeed ||
          this.#keys["ArrowLeft"]?.pressed ||
          this.#keys["ArrowRight"]?.pressed) &&
        Math.abs(this.#obj.components.vz) >= 0
      ) {
        let sign = -1;
        if (
          angleQuadrant === 1 ||
          angleQuadrant === 4 ||
          (!Boolean(angleQuadrant) && cosAngle === 1)
        ) {
          sign = 1;
        }
        if (this.#keys["ArrowUp"].type === "keydown") {
          this.#obj.components.vz +=
            (sign * (this.#obj.accCoeff * Math.abs(cosAngle))) / 100;
          if (
            Math.abs(this.#obj.components.vz) >
              Math.abs(parseFloat(cosAngle).toFixed(12)) * this.#obj.topSpeed &&
            Math.sign(this.#obj.components.vz) === sign
          ) {
            this.#obj.components.vz =
              Math.abs(parseFloat(cosAngle).toFixed(12)) *
              sign *
              this.#obj.topSpeed;
          }
        } else if (this.#keys["ArrowUp"].type === "released") {
          let coeff = this.#obj.brakeEngine + this.#obj.tireGrip;
          if (
            this.#keys["ArrowDown"]?.pressed &&
            this.#keys["ArrowDown"]?.type === "keydown"
          )
            coeff = this.#obj.brakeCoeff + this.#obj.tireGrip;
          this.#obj.components.vz -=
            (sign * (coeff * Math.abs(cosAngle))) / 100;
          if (
            (this.#obj.components.vz < 0 && sign > 0) ||
            (this.#obj.components.vz > 0 && sign < 0)
          ) {
            this.#obj.components.vz = 0;
          }
        }
      }
      if (this.#obj.components.vx === 0 && this.#obj.components.vz === 0) {
        clearTimeout(this.#brakeEngineTimeouts["ArrowUp"]);
        this.#keys["ArrowUp"] = { pressed: false, type: "keyup" };
      }
    }
    if (this.#keys["ArrowDown"]?.pressed && !this.#keys["ArrowUp"]?.pressed) {
      if (
        (Math.abs(this.#obj.components.vx) <=
          Math.abs(parseFloat(sinAngle).toFixed(12)) * this.#obj.topSpeed ||
          this.#keys["ArrowLeft"]?.pressed ||
          this.#keys["ArrowRight"]?.pressed) &&
        Math.abs(this.#obj.components.vx) >= 0
      ) {
        let sign = 1;
        if (
          angleQuadrant === 1 ||
          angleQuadrant === 2 ||
          (!Boolean(angleQuadrant) && sinAngle === 1)
        ) {
          sign = -1;
        }
        if (this.#keys["ArrowDown"].type === "keydown") {
          this.#obj.components.vx +=
            (sign * (this.#obj.brakeCoeff * Math.abs(sinAngle))) / 100;
          if (
            Math.abs(this.#obj.components.vx) >
              Math.abs(parseFloat(sinAngle).toFixed(12)) *
                this.#obj.reverseSpeed &&
            Math.sign(this.#obj.components.vx) === sign
          ) {
            this.#obj.components.vx =
              Math.abs(parseFloat(sinAngle).toFixed(12)) *
              sign *
              this.#obj.reverseSpeed;
          }
        } else if (this.#keys["ArrowDown"].type === "released") {
          let coeff = this.#obj.brakeEngine + this.#obj.tireGrip;
          if (
            this.#keys["ArrowUp"]?.pressed &&
            this.#keys["ArrowUp"]?.type === "keydown"
          )
            coeff = this.#obj.accCoeff + this.#obj.tireGrip;
          this.#obj.components.vx -=
            (sign * (coeff * Math.abs(sinAngle))) / 100;
          if (
            (this.#obj.components.vx < 0 && sign > 0) ||
            (this.#obj.components.vx > 0 && sign < 0)
          ) {
            this.#obj.components.vx = 0;
          }
        }
      }
      if (
        (Math.abs(this.#obj.components.vz) <=
          Math.abs(parseFloat(cosAngle).toFixed(12)) * this.#obj.topSpeed ||
          this.#keys["ArrowLeft"]?.pressed ||
          this.#keys["ArrowRight"]?.pressed) &&
        Math.abs(this.#obj.components.vz) >= 0
      ) {
        let sign = 1;
        if (
          angleQuadrant === 1 ||
          angleQuadrant === 4 ||
          (!Boolean(angleQuadrant) && cosAngle === 1)
        ) {
          sign = -1;
        }
        if (this.#keys["ArrowDown"].type === "keydown") {
          this.#obj.components.vz +=
            (sign * (this.#obj.brakeCoeff * Math.abs(cosAngle))) / 100;
          if (
            Math.abs(this.#obj.components.vz) >
              Math.abs(parseFloat(cosAngle).toFixed(12)) *
                this.#obj.reverseSpeed &&
            Math.sign(this.#obj.components.vz) === sign // this is because reverseSpeed < topSpeed by definition, so it prevents object to instantly go at top reverseSpeed
          ) {
            this.#obj.components.vz =
              Math.abs(parseFloat(cosAngle).toFixed(12)) *
              sign *
              this.#obj.reverseSpeed;
          }
        } else if (this.#keys["ArrowDown"].type === "released") {
          let coeff = this.#obj.brakeEngine + this.#obj.tireGrip;
          if (
            this.#keys["ArrowUp"]?.pressed &&
            this.#keys["ArrowUp"]?.type === "keydown"
          )
            coeff = this.#obj.accCoeff + this.#obj.tireGrip;
          this.#obj.components.vz -=
            (sign * (coeff * Math.abs(cosAngle))) / 100;
          if (
            (this.#obj.components.vz < 0 && sign > 0) ||
            (this.#obj.components.vz > 0 && sign < 0)
          ) {
            this.#obj.components.vz = 0;
          }
        }
      }
      if (this.#obj.components.vx === 0 && this.#obj.components.vz === 0) {
        clearTimeout(this.#brakeEngineTimeouts["ArrowDown"]);
        this.#keys["ArrowDown"] = { pressed: false, type: "keyup" };
      }
    }
    this.#moveObject(this.#obj.components);
  };
}
