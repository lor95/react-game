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
  Cylinder,
  RaycastVehicle,
  SAPBroadphase,
  Heightfield,
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
import { SimpleCarObject } from "./lib/physic-engine-three/core";
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
var vehicle;
var maxSteerVal = 0.5;
var maxForce = -20;
var brakeForce = 100;
function handler(vehicle, event) {
  var up = event.type == "keyup";

  if (!up && event.type !== "keydown") {
    return;
  }

  vehicle.setBrake(0, 0);
  vehicle.setBrake(0, 1);
  vehicle.setBrake(0, 2);
  vehicle.setBrake(0, 3);

  switch (event.keyCode) {
    case 38: // forward
      vehicle.applyEngineForce(up ? 0 : -maxForce, 2);
      vehicle.applyEngineForce(up ? 0 : -maxForce, 3);
      break;

    case 40: // backward
      vehicle.applyEngineForce(up ? 0 : maxForce, 2);
      vehicle.applyEngineForce(up ? 0 : maxForce, 3);
      break;

    case 66: // b
      vehicle.setBrake(brakeForce, 0);
      vehicle.setBrake(brakeForce, 1);
      vehicle.setBrake(brakeForce, 2);
      vehicle.setBrake(brakeForce, 3);
      break;

    case 39: // right
      vehicle.setSteeringValue(up ? 0 : -maxSteerVal, 0);
      vehicle.setSteeringValue(up ? 0 : -maxSteerVal, 1);
      break;

    case 37: // left
      vehicle.setSteeringValue(up ? 0 : maxSteerVal, 0);
      vehicle.setSteeringValue(up ? 0 : maxSteerVal, 1);
      break;
  }
}
document.addEventListener("keydown", (evt) => handler(vehicle, evt));
document.addEventListener("keyup", (evt) => handler(vehicle, evt));

const scene = new Scene();
const world = new World();
const mass = 1.5;
const player = new SimpleCarObject(
  {
    x: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 5),
    y: 0.29,
    z: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 5),
  },
  new Quaternion(),
  mass,
  defaultColors[Math.floor(Math.random() * defaultColors.length)],
  false,
  true
);
//player.enableBrowserStdControls();
scene.add(player.forwardArrow);
scene.add(player.upArrow);

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
          mass,
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
        const spawnedPlayer = new SimpleCarObject(
          player.position,
          player.quaternion,
          mass,
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

            world.broadphase = new SAPBroadphase(world);
            world.gravity.set(0, -9, 0);
            world.defaultContactMaterial.friction = 0;

            // Create a slippery material (friction coefficient = 0.0)
            var slipperyMaterial = new Material("slipperyMaterial");

            // The ContactMaterial defines what happens when two materials meet.
            // In this case we want friction coefficient = 0.0 when the slippery material touches ground.
            var slippery_ground_cm = new ContactMaterial(
              slipperyMaterial,
              slipperyMaterial,
              {
                friction: 0,
                restitution: 0.3,
                contactEquationStiffness: 1e128,
                contactEquationRelaxation: 4,
              }
            );

            // We must add the contact materials to the world
            world.addContactMaterial(slippery_ground_cm);

            //var groundMaterial = new Material("groundMaterial");
            //var wheelMaterial = new Material("wheelMaterial");
            //var wheelGroundContactMaterial =
            //  (window.wheelGroundContactMaterial = new ContactMaterial(
            //    wheelMaterial,
            //    groundMaterial,
            //    {
            //      friction: 0.3,
            //      restitution: 0,
            //      contactEquationStiffness: 1000,
            //    }
            //  ));
            //
            //// We must add the contact materials to the world
            //world.addContactMaterial(wheelGroundContactMaterial);

            var chassisShape;
            chassisShape = new Box(new Vec3(2, 1, 0.5));
            var chassisBody = new Body({ mass: 40 });
            chassisBody.addShape(chassisShape);
            chassisBody.position.set(0, 0, 4);
            chassisBody.angularVelocity.set(0, 0, 0);

            var options = {
              radius: 0.5,
              directionLocal: new Vec3(0, 0, 1),
              suspensionStiffness: 30,
              suspensionRestLength: 0.3,
              frictionSlip: 5,
              dampingRelaxation: 2.3,
              dampingCompression: 4.4,
              maxSuspensionForce: 100000,
              rollInfluence: 0.01,
              axleLocal: new Vec3(0, 1, 0),
              chassisConnectionPointLocal: new Vec3(1, 1, 0),
              maxSuspensionTravel: 0.3,
              customSlidingRotationalSpeed: -30,
              useCustomSlidingRotationalSpeed: true,
            };

            // Create the vehicle
            vehicle = new RaycastVehicle({
              chassisBody: chassisBody,
            });

            options.chassisConnectionPointLocal.set(1, 1, 0);
            vehicle.addWheel(options);

            options.chassisConnectionPointLocal.set(1, -1, 0);
            vehicle.addWheel(options);

            options.chassisConnectionPointLocal.set(-1, 1, 0);
            vehicle.addWheel(options);

            options.chassisConnectionPointLocal.set(-1, -1, 0);
            vehicle.addWheel(options);

            vehicle.addToWorld(world);

            var wheelBodies = [];
            for (var i = 0; i < vehicle.wheelInfos.length; i++) {
              var wheel = vehicle.wheelInfos[i];
              var cylinderShape = new Sphere(wheel.radius);
              var wheelBody = new Body({
                mass: 0,
              });
              wheelBody.type = Body.KINEMATIC;
              wheelBody.collisionFilterGroup = 0; // turn off collisions
              var q = new Quaternion();
              q.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
              wheelBody.addShape(cylinderShape, new Vec3(), q);
              wheelBodies.push(wheelBody);
              world.addBody(wheelBody);
            }

            // Update wheels
            world.addEventListener("postStep", function () {
              for (var i = 0; i < vehicle.wheelInfos.length; i++) {
                vehicle.updateWheelTransform(i);
                var t = vehicle.wheelInfos[i].worldTransform;
                var wheelBody = wheelBodies[i];
                wheelBody.position.copy(t.position);
                wheelBody.quaternion.copy(t.quaternion);
              }
            });
            vehicle.chassisBody.quaternion.setFromAxisAngle(
              new Vec3(1, 0, 0),
              Math.PI / 2
            );

            var matrix = [];
            var sizeX = 64,
              sizeY = 64;

            for (var i = 0; i < sizeX; i++) {
              matrix.push([]);
              for (var j = 0; j < sizeY; j++) {
                var height =
                  Math.cos((i / sizeX) * Math.PI * 5) *
                    Math.cos((j / sizeY) * Math.PI * 5) *
                    2 +
                  2;
                if (i === 0 || i === sizeX - 1 || j === 0 || j === sizeY - 1)
                  height = 3;
                matrix[i].push(height);
              }
            }

            //var hfShape = new Heightfield(matrix, {
            //  elementSize: 100 / sizeX,
            //});
            //var hfBody = new Body({ mass: 0 });
            //hfBody.addShape(hfShape);
            //hfBody.position.set(
            //  (-sizeX * hfShape.elementSize) / 2,
            //  (-sizeY * hfShape.elementSize) / 2,
            //  -1
            //);
            //world.addBody(hfBody);

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
            //player.camera.aspect =
            //  gl.drawingBufferWidth / gl.drawingBufferHeight;
            //player.camera.updateProjectionMatrix();

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
              //moveLogic();
              //player.updatePosition(
              //  /*scene.children.filter(
              //    (elem) => Boolean(elem.socketId) && elem.socketId != socketId
              //  ),*/
              //  () => {
              //    socket.emit("player_move", {
              //      position: {
              //        x: player.position.x,
              //        y: player.position.y,
              //        z: player.position.z,
              //      },
              //      quaternion: {
              //        _x: player.quaternion._x,
              //        _y: player.quaternion._y,
              //        _z: player.quaternion._z,
              //        _w: player.quaternion._w,
              //      },
              //    });
              //  }
              //);
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
