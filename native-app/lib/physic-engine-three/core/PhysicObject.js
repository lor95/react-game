import { Mesh } from "three";
import { Body, Box, Vec3 } from "cannon";

export class PhysicObject extends Mesh {
  constructor(geometry, material, position, yAngle, mass) {
    super(geometry, material);
    this.castShadow = true;
    this.receiveShadow = true;
    this.physicBody = new Body({
      mass,
    });
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
    this.physicBody.position.set(position.x, position.y, position.z);
    this.position.copy(this.physicBody.position);
    this.physicBody.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), yAngle);
    this.quaternion.copy(this.physicBody.quaternion);
  }
}
