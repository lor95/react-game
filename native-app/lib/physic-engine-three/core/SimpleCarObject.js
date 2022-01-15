import { Body, Box, Vec3, RaycastVehicle, Sphere, Quaternion } from "cannon";
import { SimpleCarControls } from "../controls/SimpleCarControls";
import {
  PerspectiveCamera,
  Vector3,
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  ArrowHelper,
  Euler,
} from "three";
import { PhysicObject } from ".";

export class SimpleCarObject extends RaycastVehicle {
  constructor(
    initialPosition = { x: 0, y: 2, z: 0 },
    initialQuaternion = new Quaternion().setFromAxisAngle(
      new Vec3(1, 0, 0),
      Math.PI / 2
    ),
    chassisColor = "#ffffff",
    enableControls = false,
    isCameraObject = false
  ) {
    super({ chassisBody: new Body({ mass: 25 }) });
    this.chassisBody.addShape(new Box(new Vec3(2, 1, 0.5)));
    this.chassisBody.position.set(
      initialPosition.x,
      initialPosition.y,
      initialPosition.z
    );
    this.chassisBody.quaternion.set(
      initialQuaternion._x,
      initialQuaternion._y,
      initialQuaternion._z,
      initialQuaternion._w
    );
    this.chassisShape = new PhysicObject(
      new BoxGeometry(4, 2, 1),
      new MeshStandardMaterial({ color: chassisColor }),
      this.chassisBody
    );

    var options = {
      radius: 0.5,
      directionLocal: new Vec3(0, 0, 1),
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      frictionSlip: 3,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      maxSuspensionForce: 200,
      rollInfluence: 0.01,
      axleLocal: new Vec3(0, 1, 0),
      chassisConnectionPointLocal: new Vec3(1, 1, 0),
      maxSuspensionTravel: 0.4,
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
      this.forwardArrow = new ArrowHelper(
        new Vector3(1, 0, 0).normalize(),
        new Vector3(
          this.chassisShape.position.x,
          this.chassisShape.position.y,
          this.chassisShape.position.z
        ),
        5,
        "#ff0000"
      );
      this.velocityArrow = new ArrowHelper(
        new Vector3(1, 0, 0).normalize(),
        new Vector3(
          this.chassisBody.velocity.x,
          this.chassisBody.velocity.y,
          this.chassisBody.velocity.z
        ),
        5,
        "#0000ff"
      );
      this.controls = new SimpleCarControls(this);
    }
    if (isCameraObject) {
      this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
      console.log(this.chassisBody.position);
      this.camera.position.set(
        this.chassisShape.position.x - 8,
        4,
        this.chassisShape.position.z
      );
      this.camera.lookAt(this.chassisShape.position);
    }
  }
  enableBrowserStdControls = () => {
    if (this.enableControls) {
      this.controls.enableBrowserStdControls();
    }
  };
  customAction = (callback = () => {}) => {
    callback();
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

    this.forwardArrow.setDirection(
      new Vector3(1, 0, 0)
        .applyEuler(
          new Euler(
            this.chassisShape.rotation.x,
            this.chassisShape.rotation.y,
            this.chassisShape.rotation.z,
            "XYZ"
          )
        )
        .normalize()
    );
    this.velocityArrow.setDirection(
      new Vector3(
        this.chassisBody.velocity.x,
        this.chassisBody.velocity.y,
        this.chassisBody.velocity.z
      )
    );
    this.forwardArrow.position.copy(this.chassisShape.position);
    this.velocityArrow.position.copy(this.chassisShape.position);

    this.camera.position.set(
      this.chassisShape.position.x - 8,
      4,
      this.chassisShape.position.z
    );
    callback();
  };
}
