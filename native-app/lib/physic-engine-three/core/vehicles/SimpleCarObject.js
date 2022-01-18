import { Body, Box, Vec3, RaycastVehicle, Sphere, Quaternion } from "cannon";
import { SimpleCarControls } from "../../controls/SimpleCarControls";
import {
  PerspectiveCamera,
  Vector3,
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  ArrowHelper,
  Euler,
} from "three";
import { MeshObject } from "../MeshObject";

export class SimpleCarObject extends RaycastVehicle {
  constructor(
    initialPosition = { x: 0, y: 2, z: 0 },
    initialQuaternion = new Quaternion().setFromAxisAngle(
      new Vec3(1, 0, 0),
      Math.PI / 2
    ),
    chassisColor = "#ffffff",
    enableControls = false,
    isCameraObject = false,
    cameraDistanceCoeff = 16,
    dimensions = {
      width: 1.3,
      height: 0.6,
      depth: 0.4,
    },
    mass = 16,
    dynamicOptions = {
      directionLocal: new Vec3(0, 0, 1),
      suspensionStiffness: 30,
      suspensionRestLength: 0.6,
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
    }
  ) {
    super({ chassisBody: new Body({ mass }) });
    this.chassisBody.addShape(
      new Box(new Vec3(dimensions.width, dimensions.height, dimensions.depth))
    );
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
    this.chassisShape = new MeshObject(
      new BoxGeometry(
        dimensions.width * 2,
        dimensions.height * 2,
        dimensions.depth * 2
      ),
      new MeshStandardMaterial({ color: chassisColor }),
      this.chassisBody
    );

    const options = { ...dynamicOptions, radius: dimensions.height * 0.5 };

    options.chassisConnectionPointLocal.set(
      dimensions.width * 0.6,
      dimensions.height * 0.85,
      0
    );
    this.addWheel(options);

    options.chassisConnectionPointLocal.set(
      dimensions.width * 0.6,
      -dimensions.height * 0.85,
      0
    );
    this.addWheel(options);

    options.chassisConnectionPointLocal.set(
      -dimensions.width * 0.6,
      dimensions.height * 0.85,
      0
    );
    this.addWheel(options);

    options.chassisConnectionPointLocal.set(
      -dimensions.width * 0.6,
      -dimensions.height * 0.85,
      0
    );
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
        new MeshObject(
          new CylinderGeometry(wheel.radius, wheel.radius, wheel.radius, 30),
          new MeshStandardMaterial({ color: "#000000" }),
          wheelBody
        )
      );
    });

    this.score = 0;

    this.enableControls = enableControls;
    this.isCameraObject = isCameraObject;
    this.maxSteerVal = 0.5;
    this.maxForce = 50;
    this.brakeForce = 1;
    this.topSpeed = 13;
    this.topReverseSpeed = 6;

    this.forwardArrow = new ArrowHelper(
      new Vector3(1, 0, 0).normalize(),
      new Vector3(
        this.chassisShape.position.x,
        this.chassisShape.position.y,
        this.chassisShape.position.z
      ),
      2,
      "#ff0000"
    );
    this.velocityArrow = new ArrowHelper(
      new Vector3(1, 0, 0).normalize(),
      new Vector3(
        this.chassisBody.velocity.x,
        this.chassisBody.velocity.y,
        this.chassisBody.velocity.z
      ),
      2,
      "#0000ff"
    );

    this.linearSpeed = Math.sqrt(
      Math.pow(this.chassisBody.velocity.x, 2) +
        Math.pow(this.chassisBody.velocity.y, 2) +
        Math.pow(this.chassisBody.velocity.z, 2)
    );

    if (this.enableControls) {
      this.controls = new SimpleCarControls(this);
    }
    if (this.isCameraObject) {
      this.cameraDistanceCoeff = cameraDistanceCoeff;
      this.camera = new PerspectiveCamera(75, 1, 0.1, 1000);
      this.camera.position.set(
        this.chassisShape.position.x - this.cameraDistanceCoeff,
        this.cameraDistanceCoeff / 2,
        this.chassisShape.position.z
      );
      this.camera.lookAt(this.chassisShape.position);
    }
  }

  addToGame = (scene, world) => {
    scene.add(this.chassisShape);
    this.wheelShapes.forEach((wheelShape) => {
      scene.add(wheelShape);
    });
    this.addToWorld(world);
    this.wheelBodies.forEach((wheel) => {
      world.addBody(wheel);
    });
  };

  enableBrowserStdControls = () => {
    if (this.enableControls) {
      this.controls.enableBrowserStdControls();
    }
  };

  resetPosition = () => {
    // to fix
    this.chassisBody.position.set(
      this.chassisShape.position.x,
      2,
      this.chassisShape.position.z
    );
    this.chassisBody.quaternion.copy(new Quaternion(1, 0, 0, 1));
  };

  setCommonId(commonId) {
    this.commonId = commonId;
    this.chassisShape.commonId = commonId;
    this.chassisBody.commonId = commonId;
    this.wheelShapes.forEach((wheel) => (wheel.commonId = commonId));
    this.wheelBodies.forEach((wheel) => (wheel.commonId = commonId));
  }

  updatePosition = (callback = () => {}) => {
    this.linearSpeed = Math.sqrt(
      Math.pow(this.chassisBody.velocity.x, 2) +
        Math.pow(this.chassisBody.velocity.y, 2) +
        Math.pow(this.chassisBody.velocity.z, 2)
    );

    //const oldPosition = this.chassisShape.position.clone();

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

    if (this.isCameraObject) {
      this.camera.position.set(
        this.chassisShape.position.x - this.cameraDistanceCoeff,
        this.cameraDistanceCoeff / 2,
        this.chassisShape.position.z
      );
      this.camera.lookAt(this.chassisShape.position);
    }

    if (this.enableControls) {
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
      this.velocityArrow.setLength(this.linearSpeed / 3);

      this.controls.updateControls();
    }

    //if (
    //  oldPosition.x.toFixed(3) !== this.chassisShape.position.x.toFixed(3) ||
    //  oldPosition.y.toFixed(3) !== this.chassisShape.position.y.toFixed(3) ||
    //  oldPosition.z.toFixed(3) !== this.chassisShape.position.z.toFixed(3)
    //) {
    callback();
    //}
  };
}
