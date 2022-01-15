import { Mesh } from "three";

export class PhysicObject extends Mesh {
  constructor(geometry, material, referralBody) {
    super(geometry, material);
    this.castShadow = true;
    this.receiveShadow = true;
    this.position.copy(referralBody.position);
    this.quaternion.copy(referralBody.quaternion);

    //this.physicBody = new Body({
    //  mass,
    //  shape: new Box(
    //    new Vec3(
    //      geometry.parameters.width * 0.55,
    //      geometry.parameters.height * 0.5,
    //      geometry.parameters.depth * 0.6
    //      //0.4,
    //      //0.3,
    //      //0.5
    //    )
    //  ),
    //});

    //this.physicBody.addEventListener("collide", (e) => {});
    //this.physicBody.position.set(position.x, position.y, position.z);
    //this.position.copy(this.physicBody.position);
    //this.physicBody.quaternion.set(
    //  quaternion._x,
    //  quaternion._y,
    //  quaternion._z,
    //  quaternion._w
    //);
    //this.quaternion.copy(this.physicBody.quaternion);
  }
}
