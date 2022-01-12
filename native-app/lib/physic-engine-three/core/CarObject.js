import { PhysicObject } from ".";
import { CarControls } from "../controls/CarControls";
import {
  BoxBufferGeometry,
  MeshStandardMaterial,
  PerspectiveCamera,
} from "three";

export class CarObject extends PhysicObject {
  constructor(
    position,
    yAngle,
    mass,
    color,
    enableControls = false,
    isCameraObject = false
  ) {
    super(
      new BoxBufferGeometry(0.7, 0.55, 0.9),
      new MeshStandardMaterial({ color }),
      position,
      yAngle,
      mass
    );
    this.yAngle = yAngle;
    this.enableControls = enableControls;
    this.isCameraObject = isCameraObject;
    if (enableControls) {
      this.accCoeff = 1.2;
      this.brakeEngine = 0.35;
      this.tireGrip = 0.25;
      this.topSpeed = 0.35;
      this.brakeCoeff = 1.9;
      this.reverseSpeed = 0.1;
      this.steeringCoeff = 0.05;
      this.actualSpeed = 0;
      this.components = { vx: 0, vy: 0, vz: 0 };
      this.controls = new CarControls(this);
    }
    if (isCameraObject) {
      this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
      this.camera.position.set(this.position.x, 2, this.position.z - 5);
      this.camera.lookAt(this.position);
    }
  }

  enableBrowserStdControls = () => {
    if (this.enableControls) {
      this.controls.enableBrowserStdControls();
    }
  };

  updatePosition = (callback) => {
    this.position.copy(this.physicBody.position);
    this.quaternion.copy(this.physicBody.quaternion);
    this.camera.position.set(this.position.x, 2, this.position.z - 5);
    callback();
  };
}
