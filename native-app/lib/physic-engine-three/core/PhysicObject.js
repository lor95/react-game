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
    this.physicBody.addShape(
      new Box(
        new Vec3(
          geometry.parameters.width,
          geometry.parameters.height,
          geometry.parameters.depth
        )
      )
    );
    //this.physicBody.angularVelocity.set(0, 10, 0);
    //this.physicBody.angularDamping = 0.5;
  }
}
