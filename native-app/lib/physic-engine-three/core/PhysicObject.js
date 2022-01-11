import { Mesh } from "three";
import { Body, Box, Vec3 } from "cannon";

export class PhysicObject extends Mesh {
  constructor(geometry, material, mass) {
    super(geometry, material);
    this.castShadow = true;
    this.receiveShadow = true;
    this.physicBody = new Body({
      mass,
    });
    this.position.x =
      (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 5);
    this.position.y = 0.29;
    this.position.z =
      (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 5);
    this.physicBody.addShape(
      new Box(
        new Vec3(
          //geometry.parameters.width,
          //geometry.parameters.height,
          //geometry.parameters.depth
          0.4,
          0.3,
          0.5
        )
      )
    );
    this.physicBody.position.set(this.position);
    //this.physicBody.angularVelocity.set(0, 10, 0);
    //this.physicBody.angularDamping = 0.5;
  }
}
