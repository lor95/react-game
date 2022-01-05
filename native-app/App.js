import React, { useState, useEffect } from "react";
import { View, Text, Platform, TouchableWithoutFeedback } from "react-native";
import {
  Scene,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  BoxBufferGeometry,
  GridHelper,
} from "three";
import { Renderer } from "expo-three";
import { GLView } from "expo-gl";
import gsap from "gsap";
import socketIoClient from "socket.io-client";
const ENDPOINT = "ws://192.168.1.220:4001";

let keys = {};
const availableColors = ["red", "cyan", "lightblue", "lime", "green", "orange"];
const color =
  availableColors[Math.floor(Math.random() * availableColors.length)];

const scene = new Scene();
const geometry = new BoxBufferGeometry(1, 1, 1);
const material = new MeshBasicMaterial({ color });
const player = new Mesh(geometry, material);
const camera = new PerspectiveCamera(75, 1, 0.1, 1000);

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
      document.addEventListener("keydown", handleKeyPress);
      document.addEventListener("keyup", handleKeyPress);
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
        const material = new MeshBasicMaterial({ color: player.color });
        const alreadySpawnedPlayer = new Mesh(geometry, material);
        alreadySpawnedPlayer.socketId = socketId;
        alreadySpawnedPlayer.position.x = player.position.x;
        alreadySpawnedPlayer.position.z = player.position.z;
        scene.add(alreadySpawnedPlayer);
      });
    });
    socket.on("new_player_spawned", (player) => {
      if (Boolean(player)) {
        const material = new MeshBasicMaterial({ color: player.color });
        const spawnedPlayer = new Mesh(geometry, material);
        spawnedPlayer.socketId = player.socketId;
        spawnedPlayer.position.x = player.position.x;
        spawnedPlayer.position.z = player.position.z;
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
          }
          return child;
        });
      }
    });
    socket.connect();
  }
  const playerInit = (position, color) => {
    socket.emit("player_init", { position, color });
  };

  const movePlayer = (data) => {
    gsap.to(player.position, {
      duration: 0.09,
      x: player.position.x + (data.x || 0),
      z: player.position.z + (data.z || 0),
      onUpdate: () =>
        socket.emit("player_move", {
          position: {
            x: player.position.x,
            z: player.position.z,
          },
        }),
      onComplete: () =>
        socket.emit("player_move", {
          position: {
            x: player.position.x,
            z: player.position.z,
          },
        }),
    });
    gsap.to(camera.position, {
      duration: 0.09,
      x: camera.position.x + (data.x || 0),
      z: camera.position.z + (data.z || 0),
    });
  };

  // browser event
  const handleKeyPress = (evt) => {
    let { code, type } = evt;
    let isKeyDown = type == "keydown";
    keys[code] = isKeyDown;
  };

  const moveLogic = () => {
    if (Platform.OS === "web") {
      if (keys["ArrowUp"] && keys["ArrowLeft"]) {
        movePlayer({ x: 0.1, z: 0.1 });
      } else if (keys["ArrowUp"] && keys["ArrowRight"]) {
        movePlayer({ x: -0.1, z: 0.1 });
      } else if (keys["ArrowUp"]) {
        movePlayer({ z: 0.18 });
      } else if (keys["ArrowDown"]) {
        movePlayer({ z: -0.18 });
      }
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
            try {
              gl.canvas = {
                width: gl.drawingBufferWidth,
                height: gl.drawingBufferHeight,
              };
            } catch {}
            const renderer = new Renderer({ gl });

            renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
            camera.aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
            camera.updateProjectionMatrix();

            const initX =
              (Math.round(Math.random()) * 2 - 1) *
              Math.floor(Math.random() * 5);
            const initZ =
              (Math.round(Math.random()) * 2 - 1) *
              Math.floor(Math.random() * 5);

            player.socketId = socketId;
            player.position.x = initX;
            player.position.z = initZ;
            camera.position.set(initX, 2, initZ - 5);
            camera.lookAt(player.position);

            scene.add(player);
            playerInit(player.position, color);

            const animate = () => {
              setTimeout(function () {
                requestAnimationFrame(animate);
              }, 1000 / 60);
              moveLogic();
              renderer.render(scene, camera);
              gl.endFrameEXP();
            };
            animate();
          }}
        />
      )}
    </View>
  );
}
