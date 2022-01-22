import { Mesh } from "three";

export class MeshObject extends Mesh {
  constructor(geometry, material, referralBody) {
    super(geometry, material);
    this.castShadow = true;
    this.position.copy(referralBody.position);
    this.quaternion.copy(referralBody.quaternion);
  }
}
