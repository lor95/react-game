import { Mesh } from "three";
import { Body, Box, Vec3 } from "cannon";

export class PhysicObject extends Mesh {
  constructor(geometry, material, position, quaternion, mass) {
    super(geometry, material);
    this.castShadow = true;
    this.receiveShadow = true;
    this.physicBody = new Body({
      mass,
      shape: new Box(
        new Vec3(
          geometry.parameters.width * 0.5,
          geometry.parameters.height * 0.5,
          geometry.parameters.depth * 0.5
          //0.4,
          //0.3,
          //0.5
        )
      )
    });
    this.physicBody.position.set(position.x, position.y, position.z);
    this.position.copy(this.physicBody.position);
    this.physicBody.quaternion.set(
      quaternion._x,
      quaternion._y,
      quaternion._z,
      quaternion._w
    );
    this.quaternion.copy(this.physicBody.quaternion);
  }
}
