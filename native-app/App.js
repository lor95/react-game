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
  PCFShadowMap,
  Fog,
  Color,
} from "three";
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

  return (
    <View style={{ flex: 1 }}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {Boolean(socket) && Boolean(socketId) && socket.connected && (
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
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

            const initX =
              (Math.round(Math.random()) * 2 - 1) *
              Math.floor(Math.random() * 5);
            const initZ =
              (Math.round(Math.random()) * 2 - 1) *
              Math.floor(Math.random() * 5);
            player.socketId = socketId;
            player.position.set(initX, 0.25, initZ);
            player.camera.position.set(initX, 2, initZ - 5);
            player.camera.lookAt(player.position);
            scene.add(player);
            playerInit(player.position, player.rotation, player.material.color);

            const animate = () => {
              setTimeout(function () {
                requestAnimationFrame(animate);
              }, 1000 / 30);
              moveLogic();
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
