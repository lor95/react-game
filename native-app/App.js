import React, { useState, useEffect } from "react";
import { SOCKET_ENDPOINT } from "./config/socketConfig";
import { View, Text, Platform, TouchableWithoutFeedback } from "react-native";
import {
  Scene,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  BoxBufferGeometry,
  GridHelper,
  DirectionalLight,
  HemisphereLight,
  MeshLambertMaterial,
  SpotLight,
  RepeatWrapping,
  sRGBEncoding,
  PlaneBufferGeometry,
  BoxGeometry,
  PCFShadowMap,
  Fog,
  Color,
} from "three";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader";
//import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper";
//import Ammo from "./lib/kripken/ammo";
import {
  World,
  GSSolver,
  SplitSolver,
  Body,
  Box,
  Sphere,
  Vec3,
  Plane,
  NaiveBroadphase,
  Material,
  ContactMaterial,
} from "cannon";
import { default as CannonDebugRenderer } from "./lib/physic-engine-three/debug/CannonDebugRenderer";
import { CarObject } from "./lib/physic-engine-three/core";
import { Renderer, TextureLoader } from "expo-three";
import { GLView } from "expo-gl";
import socketIoClient from "socket.io-client";
import { Quaternion } from "three";

const defaultColors = [
  "#ff6666",
  "#ffb366",
  "#66ff66",
  "#66d9ff",
  "#b366ff",
  "#ff6666",
];

const scene = new Scene();
const world = new World();
const player = new CarObject(
  {
    x: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 5),
    y: 0.29,
    z: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 5),
  },
  new Quaternion(),
  1,
  defaultColors[Math.floor(Math.random() * defaultColors.length)],
  true,
  true
);
player.enableBrowserStdControls();
scene.add(player.forwardArrow);
scene.add(player.upArrow)

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
        const alreadySpawnedPlayer = new CarObject(
          _player.position,
          _player.quaternion,
          1,
          _player.color
        );
        alreadySpawnedPlayer.socketId = socketId;
        alreadySpawnedPlayer.physicBody.socketId = socketId;
        world.addBody(alreadySpawnedPlayer.physicBody);
        scene.add(alreadySpawnedPlayer);
      });
    });
    socket.on("new_player_spawned", (player) => {
      if (Boolean(player)) {
        const spawnedPlayer = new CarObject(
          player.position,
          player.quaternion,
          1,
          player.color
        );
        spawnedPlayer.socketId = player.socketId;
        spawnedPlayer.physicBody.socketId = player.socketId;
        world.addBody(spawnedPlayer.physicBody);
        scene.add(spawnedPlayer);
      }
    });
    socket.on("player_despawned", (playerId) => {
      scene.children = scene.children.filter(
        (elem) => elem.socketId != playerId
      );
      world.bodies = world.bodies.filter((elem) => elem.socketId != playerId);
    });
    socket.on("player_moved", (player) => {
      if (Boolean(player)) {
        scene.children = scene.children.map((child) => {
          if (player.socketId === child.socketId) {
            child.physicBody.position.set(
              player.position.x,
              player.position.y,
              player.position.z
            );
            child.position.copy(child.physicBody.position);
            child.physicBody.quaternion.set(
              player.quaternion._x,
              player.quaternion._y,
              player.quaternion._z,
              player.quaternion._w
            );
            child.quaternion.copy(child.physicBody.quaternion);
          }
          return child;
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

  const moveLogic = () => {
    if (Platform.OS === "web") {
      player.controls.performMove();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {Boolean(socket) && Boolean(socketId) && socket.connected && (
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {

            scene.add(new GridHelper(1000, 1000));

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
            // We must add the contact materials to the world
            world.addContactMaterial(physicsContactMaterial);

            // Create a plane
            var groundShape = new Plane();
            var groundBody = new Body({ mass: 0 });
            groundBody.addShape(groundShape);
            groundBody.quaternion.setFromAxisAngle(
              new Vec3(1, 0, 0),
              -Math.PI / 2
            );
            world.addBody(groundBody);

            //var boxes = [];
            //var boxMeshes = [];
            //var boxShape = new Box(new Vec3(1, 1, 1));
            //for (var i = 0; i < 7; i++) {
            //  var x = (Math.random() - 0.5) * 20;
            //  var y = 1 + (Math.random() - 0.5) * 1;
            //  var z = (Math.random() - 0.5) * 20;
            //  var boxBody = new Body({ mass: 1 });
            //  boxBody.addShape(boxShape);
            //  var boxMesh = new Mesh(
            //    new BoxGeometry(2, 2, 2),
            //    new MeshStandardMaterial({ color: "blue" })
            //  );
            //  world.addBody(boxBody);
            //  scene.add(boxMesh);
            //  boxBody.position.set(x, y, z);
            //  boxMesh.position.set(x, y, z);
            //  boxMesh.castShadow = true;
            //  boxMesh.receiveShadow = true;
            //  boxes.push(boxBody);
            //  boxMeshes.push(boxMesh);
            //}

            scene.fog = new Fog("#87ceeb", 1, 30);

            //scene.background = new Color("#87ceeb");
            //const groundTexture = new TextureLoader().load(
            //  require("./resources/textures/ground.png")
            //);
            //groundTexture.wrapS = RepeatWrapping;
            //groundTexture.wrapT = RepeatWrapping;
            //groundTexture.repeat.set(10000, 10000);
            //groundTexture.anisotropy = 16;
            //groundTexture.encoding = sRGBEncoding;
            //const groundMaterial = new MeshStandardMaterial({
            //  map: groundTexture,
            //});
            //const groundMesh = new Mesh(
            //  new PlaneBufferGeometry(10000, 10000),
            //  groundMaterial
            //);
            //groundMesh.position.y = 0;
            //groundMesh.rotation.x = -Math.PI / 2;
            //groundMesh.receiveShadow = true;
            //scene.add(groundMesh);

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

            renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = PCFShadowMap;
            player.camera.aspect =
              gl.drawingBufferWidth / gl.drawingBufferHeight;
            player.camera.updateProjectionMatrix();

            player.socketId = socketId;
            scene.add(player);

            playerInit(
              player.position,
              player.quaternion,
              player.material.color
            );
            world.addBody(player.physicBody);

            const debugRenderer = new CannonDebugRenderer(scene, world); // debug element

            const animate = () => {
              setTimeout(function () {
                requestAnimationFrame(animate);
                world.step(1 / 30);
              }, 1000 / 30);
              moveLogic();
              player.updatePosition(() => {
                socket.emit("player_move", {
                  position: {
                    x: player.position.x,
                    y: player.position.y,
                    z: player.position.z,
                  },
                  quaternion: {
                    _x: player.quaternion._x,
                    _y: player.quaternion._y,
                    _z: player.quaternion._z,
                    _w: player.quaternion._w,
                  },
                });
              });
              //for (var i = 0; i < boxes.length; i++) {
              //  boxMeshes[i].position.copy(boxes[i].position);
              //  boxMeshes[i].quaternion.copy(boxes[i].quaternion);
              //}
              debugRenderer.update();
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