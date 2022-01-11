import React, { useState, useEffect } from "react";
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
import { default as CannonDebugRenderer } from "./lib/debug/CannonDebugRenderer";
import { CarObject } from "./lib/physic-engine-three/core";
import { Renderer, TextureLoader } from "expo-three";
import { GLView } from "expo-gl";
import socketIoClient from "socket.io-client";

const ENDPOINT = "ws://192.168.1.220:4001";

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
  defaultColors[Math.floor(Math.random() * defaultColors.length)],
  true,
  true
);

export default function App() {
  const [error, setError] = useState(undefined);
  const [socketId, setSocketId] = useState(undefined);
  const [socket, setSocket] = useState(undefined);

  useEffect(() => {
    const socket_ = socketIoClient(ENDPOINT, {
      forceNode: true,
      autoConnect: false,
      reconnection: false,
    });
    setSocket(socket_);
  }, []);

  useEffect(() => {
    if (Boolean(socket)) {
      player.enableBrowserStdControls(socket);
    }
  }, [socket]);

  if (Boolean(socket) && !socket.connected) {
    socket.on("connect_error", () => {
      setError("Unable to connect to socket");
    });
    socket.on("initialization", (playersInRoom) => {
      setError(undefined);
      setSocketId(socket.id);
      Object.keys(playersInRoom).forEach((socketId) => {
        const player = playersInRoom[socketId];
        const alreadySpawnedPlayer = new CarObject(player.color);
        alreadySpawnedPlayer.socketId = socketId;
        alreadySpawnedPlayer.position.x = player.position.x;
        alreadySpawnedPlayer.position.y = 0.25;
        alreadySpawnedPlayer.position.z = player.position.z;
        alreadySpawnedPlayer.rotation.y = player.rotation.y;
        alreadySpawnedPlayer.castShadow = true;
        alreadySpawnedPlayer.receiveShadow = true;
        scene.add(alreadySpawnedPlayer);
      });
    });
    socket.on("new_player_spawned", (player) => {
      if (Boolean(player)) {
        const spawnedPlayer = new CarObject(player.color);
        spawnedPlayer.socketId = player.socketId;
        spawnedPlayer.position.x = player.position.x;
        spawnedPlayer.position.y = 0.25;
        spawnedPlayer.position.z = player.position.z;
        spawnedPlayer.rotation.y = player.rotation.y;
        spawnedPlayer.castShadow = true;
        spawnedPlayer.receiveShadow = true;
        scene.add(spawnedPlayer);
      }
    });
    socket.on("player_despawned", (playerId) => {
      scene.children = scene.children.filter(
        (elem) => elem.socketId != playerId
      );
    });
    socket.on("player_moved", (player) => {
      if (Boolean(player)) {
        scene.children = scene.children.map((child) => {
          if (player.socketId === child.socketId) {
            child.position.x = player.position.x;
            child.position.z = player.position.z;
            child.rotation.y = player.rotation.y;
          }
          return child;
        });
      }
    });
    socket.connect();
  }
  const playerInit = (position, rotation, color) => {
    socket.emit("player_init", {
      position,
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
      color,
    });
  };

  const moveLogic = () => {
    if (Platform.OS === "web") {
      player.controls.performMove();
    }
  };
  //let helper, ikHelper, physicsHelper;
  //helper = new MMDAnimationHelper({
  //  afterglow: 2.0,
  //});

  //function createRigidBody(size, weight, position) {
  //  debugger;
  //  var shape = new Ammo.btBoxShape(
  //    new Ammo.btVector3(size[0], size[1], size[2])
  //  );
  //  var localInertia = new Ammo.btVector3(0, 0, 0);
  //  shape.calculateLocalInertia(weight, localInertia);
  //
  //  var form = new Ammo.btTransform();
  //  form.setIdentity();
  //  form.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
  //
  //  var state = new Ammo.btDefaultMotionState(form);
  //  var info = new Ammo.btRigidBodyConstructionInfo(
  //    weight,
  //    state,
  //    shape,
  //    localInertia
  //  );
  //
  //  return new Ammo.btRigidBody(info);
  //}
  //
  //function createGround() {
  //  var gridHelper = new GridHelper(1000, 500);
  //  gridHelper.position.y = -15;
  //
  //  var body = createRigidBody([1000, 1, 1000], 0, gridHelper.position);
  //  body.setRestitution(1);
  //  body.setFriction(1);
  //  body.setDamping(0, 0);
  //  body.setSleepingThresholds(0, 0);
  //  world.addRigidBody(body);
  //
  //  scene.add(gridHelper);
  //}
  //
  //function createBoxes() {
  //  var geometry = new BoxBufferGeometry(4, 4, 4);
  //  var material = new MeshPhongMaterial({ color: 0x444444 });
  //
  //  for (var i = 0; i < 20; i++) {
  //    for (var j = 0; j < 5; j++) {
  //      var mesh = new Mesh(geometry, material);
  //      mesh.position.x = -38 + i * 4;
  //      mesh.position.y = -13 + j * 4.1;
  //      mesh.position.z = 40;
  //
  //      var body = createRigidBody([2, 2, 2], 1.0, mesh.position);
  //      body.setSleepingThresholds(0, 0);
  //      world.addRigidBody(body);
  //
  //      mesh.body = body;
  //      mesh.ammoTransform = new Ammo.btTransform();
  //      mesh.ammoQuaternion = new Ammo.btQuaternion(0, 0, 0, 1);
  //
  //      boxes.push(mesh);
  //      scene.add(mesh);
  //    }
  //  }
  //}
  //
  //createGround();
  //createBoxes();

  return (
    <View style={{ flex: 1 }}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {Boolean(socket) && Boolean(socketId) && socket.connected && (
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
            world.quatNormalizeSkip = 0;
            world.quatNormalizeFast = false;

            var solver = new GSSolver();

            world.defaultContactMaterial.contactEquationStiffness = 1e9;
            world.defaultContactMaterial.contactEquationRelaxation = 4;

            solver.iterations = 7;
            solver.tolerance = 0.1;
            var split = true;
            if (split) world.solver = new SplitSolver(solver);
            else world.solver = solver;

            world.gravity.set(0, -9, 0);
            world.broadphase = new NaiveBroadphase();

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

            // Create a sphere

            // Create a plane
            var groundShape = new Plane();
            var groundBody = new Body({ mass: 0 });
            groundBody.addShape(groundShape);
            groundBody.quaternion.setFromAxisAngle(
              new Vec3(1, 0, 0),
              -Math.PI / 2
            );
            world.addBody(groundBody);
            var boxes = [];
            var boxMeshes = [];
            var boxShape = new Box(new Vec3(1, 1, 1));
            for (var i = 0; i < 7; i++) {
              var x = (Math.random() - 0.5) * 20;
              var y = 1 + (Math.random() - 0.5) * 1;
              var z = (Math.random() - 0.5) * 20;
              var boxBody = new Body({ mass: 1 });
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
            playerInit(player.position, player.rotation, player.material.color);
            world.addBody(player.physicBody);

            const debugRenderer = new CannonDebugRenderer(scene, world); // debug element

            const animate = () => {
              setTimeout(function () {
                requestAnimationFrame(animate);
              }, 1000 / 30);
              world.step(1 / 30);
              //player.position.copy(player.physicBody.position);
              //player.quaternion.copy(player.physicBody.quaternion);
              moveLogic();
              for (var i = 0; i < boxes.length; i++) {
                boxMeshes[i].position.copy(boxes[i].position);
                boxMeshes[i].quaternion.copy(boxes[i].quaternion);
              }
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
