import { Mesh } from "three";

export class PhysicObject extends Mesh {
  constructor(geometry, material) {
    super(geometry, material);
    this.castShadow = true;
    this.receiveShadow = true;
  }
}
