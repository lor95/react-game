import { PhysicObject } from ".";
import { SimpleCarControls } from "../controls/SimpleCarControls";
import {
  BoxGeometry,
  MeshStandardMaterial,
  PerspectiveCamera,
  ArrowHelper,
  Euler,
  Vector3,
  Raycaster,
} from "three";
import { Vec3 } from "cannon";

//const rays = [
//  new Vector3(0, 0, 1),
//  new Vector3(1, 0, 1),
//  new Vector3(1, 0, 0),
//  new Vector3(1, 0, -1),
//  new Vector3(0, 0, -1),
//  new Vector3(-1, 0, -1),
//  new Vector3(-1, 0, 0),
//  new Vector3(-1, 0, 1),
//];
//
//const caster = new Raycaster();

export class SimpleCarObject extends PhysicObject {
  constructor(
    position,
    quaternion,
    mass,
    color,
    enableControls = false,
    isCameraObject = false
  ) {
    super(
      new BoxGeometry(0.7, 0.55, 0.9),
      new MeshStandardMaterial({ color }),
      position,
      quaternion,
      mass
    );

    this.enableControls = enableControls;
    this.isCameraObject = isCameraObject;
    if (enableControls) {
      this.topSpeed = 0.25;
      this.topReverseSpeed = -0.1;
      this.actualSpeed = 0;
      this.accCoeff = 0.012;
      this.brakeCoeff = 0.024;
      this.brakeEngine = 0.008;
      this.tireGrip = 0.75; // percentage
      this.steeringCoeff = 0.05;
      this.forwardArrow = new ArrowHelper(
        new Vector3(0, 0, 1).normalize(),
        new Vector3(this.position.x, this.position.y, this.position.z),
        0,
        "#ff0000"
      );
      this.upArrow = new ArrowHelper(
        new Vector3(0, 1, 0).normalize(),
        new Vector3(this.position.x, this.position.y, this.position.z),
        2,
        "#0000ff"
      );
      this.controls = new SimpleCarControls(this);
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

  updatePosition = (/*objects, */ callback) => {
    //var collisions, i;
    //for (i = 0; i < rays.length; i += 1) {
    //  caster.set(this.position, rays[i]);
    //  collisions = caster.intersectObjects(objects);
    //}
    //console.log(collisions);
    //this.physicBody.applyForce(new Vec3(1999,9,9))

    this.forwardArrow.setDirection(
      new Vector3(0, 0, 1)
        .applyEuler(
          new Euler(this.rotation.x, this.rotation.y, this.rotation.z, "XYZ")
        )
        .normalize()
    );
    this.forwardArrow.setLength((3 * this.actualSpeed) / this.topSpeed);
    this.forwardArrow.position.copy(this.position);

    this.upArrow.setDirection(
      new Vector3(0, 1, 0)
        .applyEuler(
          new Euler(this.rotation.x, this.rotation.y, this.rotation.z, "XYZ")
        )
        .normalize()
    );
    this.upArrow.position.copy(this.position);

    this.position.copy(this.physicBody.position);
    this.quaternion.copy(this.physicBody.quaternion);

    this.camera.position.set(this.position.x, 2, this.position.z - 5);
    callback();
  };
}
