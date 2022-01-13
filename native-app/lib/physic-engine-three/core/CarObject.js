import { PhysicObject } from ".";
import { CarControls } from "../controls/CarControls";
import {
  BoxBufferGeometry,
  MeshStandardMaterial,
  PerspectiveCamera,
  ArrowHelper,
  Euler,
  Vector3,
} from "three";

//function getAxisAndAngelFromQuaternion(q) {
//  const angle = 2 * Math.acos(q.w);
//  var s;
//  if (1 - q.w * q.w < 0.000001) {
//    // test to avoid divide by zero, s is always positive due to sqrt
//    // if s close to zero then direction of axis not important
//    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/
//    s = 1;
//  } else {
//    s = Math.sqrt(1 - q.w * q.w);
//  }
//  return { axis: new Vector3(q.x / s, q.y / s, q.z / s), angle };
//}
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
      this.accCoeff = 0.02;
      this.brakeEngine = 0.008;
      this.tireGrip = 0.25;
      this.topSpeed = 0.35;
      this.brakeCoeff = 0.05;
      this.reverseSpeed = 0.1;
      this.steeringCoeff = 0.05;
      this.actualSpeed = 0;
      this.isReverse = false;
      this.components = { vx: 0, vy: 0, vz: 0 };
      this.forwardArrow = new ArrowHelper(
        new Vector3(0, 0, 1).normalize(),
        new Vector3(this.position.x, this.position.y, this.position.z),
        1,
        "#ff0000"
      );
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
    //this.position.copy(this.physicBody.position);
    this.physicBody.position.copy(this.position);
    this.quaternion.copy(this.physicBody.quaternion);
    //this.yAngle = getAxisAndAngelFromQuaternion(this.quaternion).angle;
    //console.log(getAxisAndAngelFromQuaternion(this.quaternion).angle);
    //console.log(this.physicBody.velocity);
    const a = new Euler(
      this.rotation.x,
      this.rotation.y,
      this.rotation.z,
      "XYZ"
    );
    const b = new Vector3(0, 0, 1);
    b.applyEuler(a);
    this.forwardArrow.setDirection(b.normalize());
    this.forwardArrow.position.copy(this.position);
    this.camera.position.set(this.position.x, 2, this.position.z - 5);
    callback();
  };
}
