import React, { useState, useEffect } from "react";
import { SOCKET_ENDPOINT } from "./config/socketConfig";
import { View, Text, Platform, TouchableWithoutFeedback } from "react-native";
import {
  Scene,
  Mesh,
  MeshStandardMaterial,
  GridHelper,
  HemisphereLight,
  SpotLight,
  RepeatWrapping,
  sRGBEncoding,
  PlaneBufferGeometry,
  PCFShadowMap,
  Fog,
  Color,
  Quaternion,
  BoxGeometry,
} from "three";
import {
  World,
  Body,
  Box,
  Vec3,
  Plane,
  Material,
  ContactMaterial,
} from "cannon";
import { default as CannonDebugRenderer } from "./lib/physic-engine-three/debug/CannonDebugRenderer";
import { SimpleCarObject } from "./lib/physic-engine-three/core";
import { Renderer, TextureLoader } from "expo-three";
import { GLView } from "expo-gl";
import socketIoClient from "socket.io-client";

const defaultColors = [
  "#ff6666",
  "#ffb366",
  "#66ff66",
  "#66d9ff",
  "#b366ff",
  "#ff6666",
];

const debug = false;
const randomBoxes = true;

const scene = new Scene();
const world = new World();
let players = [];

const player = new SimpleCarObject(
  {
    x: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 15),
    y: 2,
    z: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 15),
  },
  new Quaternion().setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2),
  defaultColors[Math.floor(Math.random() * defaultColors.length)],
  true,
  true
);

export default function App() {
  const [error, setError] = useState(undefined);
  const [socketId, setSocketId] = useState(undefined);
  const [socket, setSocket] = useState(undefined);

  useEffect(() => {
    const socket_ = socketIoClient(SOCKET_ENDPOINT, {
      forceNode: true,
      autoConnect: false,
      reconnection: false,
    });
    setSocket(socket_);
  }, []);

  if (Boolean(socket) && !socket.connected) {
    socket.on("connect_error", () => {
      setError("Unable to connect to socket");
    });

    socket.on("initialization", (playersInRoom) => {
      setError(undefined);
      setSocketId(socket.id);
      Object.keys(playersInRoom).forEach((socketId) => {
        const _player = playersInRoom[socketId];
        const alreadySpawnedPlayer = new SimpleCarObject(
          _player.position,
          _player.quaternion,
          _player.color
        );
        alreadySpawnedPlayer.setCommonId(socketId);
        scene.add(alreadySpawnedPlayer.chassisShape);
        alreadySpawnedPlayer.wheelShapes.forEach((wheelShape) => {
          scene.add(wheelShape);
        });

        alreadySpawnedPlayer.addToWorld(world);
        alreadySpawnedPlayer.wheelBodies.forEach((wheel) => {
          world.addBody(wheel);
        });
        alreadySpawnedPlayer.updatePosition();
        players.push(alreadySpawnedPlayer);
      });
    });

    socket.on("new_player_spawned", (player) => {
      if (Boolean(player)) {
        const spawnedPlayer = new SimpleCarObject(
          player.position,
          player.quaternion,
          player.color
        );
        spawnedPlayer.setCommonId(player.socketId);
        scene.add(spawnedPlayer.chassisShape);
        spawnedPlayer.wheelShapes.forEach((wheelShape) => {
          scene.add(wheelShape);
        });

        spawnedPlayer.addToWorld(world);
        spawnedPlayer.wheelBodies.forEach((wheel) => {
          world.addBody(wheel);
        });
        spawnedPlayer.updatePosition();
        players.push(spawnedPlayer);
      }
    });

    socket.on("player_despawned", (playerId) => {
      scene.children = scene.children.filter(
        (elem) => !elem.commonId || elem.commonId != playerId
      );
      world.bodies = world.bodies.filter((elem) => elem.commonId != playerId);
      players.filter((player) => player.commonId != playerId);
    });

    socket.on("player_moved", (player) => {
      if (Boolean(player)) {
        players.forEach((_player) => {
          if (player.socketId === _player.commonId) {
            _player.chassisBody.position.set(
              player.position.x,
              player.position.y,
              player.position.z
            );
            _player.chassisBody.quaternion.set(
              player.quaternion._x,
              player.quaternion._y,
              player.quaternion._z,
              player.quaternion._w
            );
          }
          _player.updatePosition();
        });
      }
    });

    socket.connect();
  }

  const playerInit = (position, quaternion, color) => {
    socket.emit("player_init", {
      position,
      quaternion,
      color,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {Boolean(socket) && Boolean(socketId) && socket.connected && (
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
            world.quatNormalizeSkip = 0;
            world.quatNormalizeFast = false;
            world.defaultContactMaterial.contactEquationStiffness = 1e128;
            world.defaultContactMaterial.contactEquationRelaxation = 4;
            world.gravity.set(0, -9.82, 0);
            world.solver.iterations = 20;
            world.solver.tolerance = 0.0;

            // Create a slippery material (friction coefficient = 0.0)
            var physicsMaterial = new Material("slipperyMaterial");
            var physicsContactMaterial = new ContactMaterial(
              physicsMaterial,
              physicsMaterial,
              0.0, // friction coefficient
              0.3 // restitution
            );
            world.addContactMaterial(physicsContactMaterial);

            // Create a plane
            const groundShape = new Plane();
            const groundBody = new Body({ mass: 0 });
            groundBody.addShape(groundShape);
            groundBody.quaternion.setFromAxisAngle(
              new Vec3(1, 0, 0),
              -Math.PI / 2
            );
            world.addBody(groundBody);

            let boxes = [];
            let boxMeshes = [];
            if (randomBoxes) {
              var boxShape = new Box(new Vec3(1, 1, 1));
              for (var i = 0; i < 7; i++) {
                var x = (Math.random() - 0.5) * 30;
                var y = 1 + (Math.random() - 0.5) * 1;
                var z = (Math.random() - 0.5) * 30;
                var boxBody = new Body({ mass: 0.1 });
                boxBody.addShape(boxShape);
                var boxMesh = new Mesh(
                  new BoxGeometry(2, 2, 2),
                  new MeshStandardMaterial({ color: "blue" })
                );
                world.addBody(boxBody);
                scene.add(boxMesh);
                boxBody.position.set(x, y, z);
                boxMesh.position.set(x, y, z);
                boxMesh.castShadow = true;
                boxMesh.receiveShadow = true;
                boxes.push(boxBody);
                boxMeshes.push(boxMesh);
              }
            }

            var hemilight = new HemisphereLight(0xffeeb1, 0x080820, 1);
            scene.add(hemilight);
            var light = new SpotLight(0xffa95c, 1);
            light.position.set(-50, 50, 50);
            light.castShadow = true;
            light.shadow.bias = 0.001;
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            scene.add(light);

            try {
              gl.canvas = {
                width: gl.drawingBufferWidth,
                height: gl.drawingBufferHeight,
              };
            } catch {}

            const renderer = new Renderer({ gl });
            let debugRenderer;

            renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = PCFShadowMap;

            player.camera.aspect =
              gl.drawingBufferWidth / gl.drawingBufferHeight;
            player.camera.updateProjectionMatrix();

            scene.add(player.chassisShape);
            player.wheelShapes.forEach((wheelShape) => {
              scene.add(wheelShape);
            });
            player.addToWorld(world);
            player.wheelBodies.forEach((wheel) => {
              world.addBody(wheel);
            });
            player.setCommonId(socketId);

            player.enableBrowserStdControls();

            playerInit(
              player.chassisShape.position,
              player.chassisShape.quaternion,
              player.chassisShape.material.color
            );

            if (debug) {
              scene.add(new GridHelper(1000, 1000));
              scene.add(player.forwardArrow);
              scene.add(player.velocityArrow);
              debugRenderer = new CannonDebugRenderer(scene, world); // debug element
            } else {
              scene.fog = new Fog("#87ceeb", 1, 30);
              scene.background = new Color("#87ceeb");
              const groundTexture = new TextureLoader().load(
                require("./resources/textures/ground.png")
              );
              groundTexture.wrapS = RepeatWrapping;
              groundTexture.wrapT = RepeatWrapping;
              groundTexture.repeat.set(10000, 10000);
              groundTexture.anisotropy = 16;
              groundTexture.encoding = sRGBEncoding;
              const groundMaterial = new MeshStandardMaterial({
                map: groundTexture,
              });
              const groundMesh = new Mesh(
                new PlaneBufferGeometry(10000, 10000),
                groundMaterial
              );
              groundMesh.position.y = 0;
              groundMesh.rotation.x = -Math.PI / 2;
              groundMesh.receiveShadow = true;
              scene.add(groundMesh);
            }

            const animate = () => {
              setTimeout(function () {
                requestAnimationFrame(animate);
                world.step(1 / 30);
              }, 1000 / 30);
              player.updatePosition(() => {
                socket.emit("player_move", {
                  position: {
                    x: player.chassisShape.position.x,
                    y: player.chassisShape.position.y,
                    z: player.chassisShape.position.z,
                  },
                  quaternion: {
                    _x: player.chassisShape.quaternion._x,
                    _y: player.chassisShape.quaternion._y,
                    _z: player.chassisShape.quaternion._z,
                    _w: player.chassisShape.quaternion._w,
                  },
                });
              });

              if (randomBoxes) {
                for (var i = 0; i < boxes.length; i++) {
                  boxMeshes[i].position.copy(boxes[i].position);
                  boxMeshes[i].quaternion.copy(boxes[i].quaternion);
                }
              }

              Boolean(debugRenderer) && debugRenderer.update();

              renderer.render(scene, player.camera);
              gl.endFrameEXP();
            };
            animate();
          }}
        />
      )}
    </View>
  );
}
