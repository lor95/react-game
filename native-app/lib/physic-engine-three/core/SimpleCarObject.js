import { Body, Box, Vec3, RaycastVehicle, Sphere, Quaternion } from "cannon";
import { SimpleCarControls } from "../controls/SimpleCarControls";
import {
  PerspectiveCamera,
  Vector3,
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
} from "three";
import { PhysicObject } from ".";

export class SimpleCarObject extends RaycastVehicle {
  constructor(enableControls = false, isCameraObject = false) {
    super({ chassisBody: new Body({ mass: 40 }) });
    this.chassisBody.addShape(new Box(new Vec3(2, 1, 0.5)));
    this.chassisBody.position.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
    this.chassisBody.quaternion.setFromAxisAngle(
      new Vec3(1, 0, 0),
      Math.PI / 2
    );
    this.chassisShape = new PhysicObject(
      new BoxGeometry(4, 2, 1),
      new MeshStandardMaterial({ color: "#ffbb00" }),
      this.chassisBody
    );

    var options = {
      radius: 0.5,
      directionLocal: new Vec3(0, 0, 1),
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      frictionSlip: 5,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new Vec3(0, 1, 0),
      chassisConnectionPointLocal: new Vec3(1, 1, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    options.chassisConnectionPointLocal.set(1, 1, 0);
    this.addWheel(options);

    options.chassisConnectionPointLocal.set(1, -1, 0);
    this.addWheel(options);

    options.chassisConnectionPointLocal.set(-1, 1, 0);
    this.addWheel(options);

    options.chassisConnectionPointLocal.set(-1, -1, 0);
    this.addWheel(options);

    this.wheelBodies = [];
    this.wheelShapes = [];
    this.wheelInfos.forEach((wheel) => {
      const wheelBody = new Body({
        mass: 0,
        type: Body.KINEMATIC,
        collisionFilterGroup: 0,
        shape: new Sphere(wheel.radius),
      });
      wheelBody.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
      this.wheelBodies.push(wheelBody);
      this.wheelShapes.push(
        new PhysicObject(
          new CylinderGeometry(wheel.radius, wheel.radius, wheel.radius, 30),
          new MeshStandardMaterial({ color: "#000000" }),
          wheelBody
        )
      );
    });

    this.enableControls = enableControls;
    this.isCameraObject = isCameraObject;

    if (enableControls) {
      this.maxSteerVal = 0.5;
      this.maxForce = 40;
      this.brakeForce = 3;
      this.controls = new SimpleCarControls(this);
    }
    if (isCameraObject) {
      this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
      console.log(this.chassisBody.position);
      this.camera.position.set(this.chassisShape.position.x, 2, this.chassisShape.position.z - 5);
      this.camera.lookAt(this.chassisShape.position);
    }
  }
  enableBrowserStdControls = () => {
    if (this.enableControls) {
      this.controls.enableBrowserStdControls();
    }
  };
  updatePosition = (callback = () => {}) => {
    this.chassisShape.position.copy(this.chassisBody.position);
    this.chassisShape.quaternion.copy(this.chassisBody.quaternion);
    this.wheelInfos.forEach((wheel) => {
      this.updateWheelTransform(this.wheelInfos.indexOf(wheel));
      const wheelBody = this.wheelBodies[this.wheelInfos.indexOf(wheel)];
      wheelBody.position.copy(wheel.worldTransform.position);
      wheelBody.quaternion.copy(wheel.worldTransform.quaternion);
    });
    this.wheelShapes.forEach((wheelShape) => {
      const index = this.wheelShapes.indexOf(wheelShape);
      wheelShape.position.copy(this.wheelBodies[index].position);
      wheelShape.quaternion.copy(this.wheelBodies[index].quaternion);
    });
    this.camera.position.set(this.chassisShape.position.x, 2, this.chassisShape.position.z - 5);
    callback();
  };
}
