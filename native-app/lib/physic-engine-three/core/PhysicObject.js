import { Mesh } from "three";

export class PhysicObject extends Mesh {
  constructor(geometry, material, referralBody) {
    super(geometry, material);
    this.castShadow = true;
    //this.receiveShadow = true;
    this.position.copy(referralBody.position);
    this.quaternion.copy(referralBody.quaternion);
  }
}
