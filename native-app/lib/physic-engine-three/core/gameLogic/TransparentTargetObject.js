import { BoxGeometry, MeshStandardMaterial } from "three";
import { Box, Body, Vec3 } from "cannon";
import { MeshObject } from "../MeshObject";

export class TransparentTargetObject {
  constructor(
    position = {
      x: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 15),
      y: 0.4,
      z: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 15),
    }
  ) {
    this.body = new Body({
      shape: new Box(new Vec3(0.25, 0.25, 0.25)),
    });

    this.body.position.set(position.x, position.y, position.z);
    this.body.collisionResponse = 0;

    this.shape = new MeshObject(
      new BoxGeometry(0.5, 0.5, 0.5),
      new MeshStandardMaterial({ color: "yellow" }),
      this.body
    );
  }

  addToGame = (scene, world) => {
    scene.add(this.shape);
    world.addBody(this.body);
  };

  setPosition = (position) => {
    this.body.position.set(position.x, position.y, position.z);
    this.shape.position.copy(this.body.position);
  };
}
