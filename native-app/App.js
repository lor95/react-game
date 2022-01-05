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
let brakeEngineTimeouts = {};
let speed = { x: 0, z: 0, y: 0 };
const availableColors = ["red", "cyan", "lightblue", "lime", "green", "orange"];
const color =
  availableColors[Math.floor(Math.random() * availableColors.length)];

const scene = new Scene();
const geometry = new BoxBufferGeometry(0.7, 0.55, 0.9);
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
      duration: 0.04,
      x: player.position.x + (data.x || 0),
      z: player.position.z + (data.z || 0),
      onComplete: () =>
        socket.emit("player_move", {
          position: {
            x: player.position.x,
            z: player.position.z,
          },
        }),
    });
    gsap.to(player.rotation, {
      duration: 0.02,
      y: player.rotation.y + (data.y || 0),
    });
    gsap.to(camera.position, {
      duration: 0.04,
      x: camera.position.x + (data.x || 0),
      z: camera.position.z + (data.z || 0),
    });
  };

  // browser event
  const handleKeyPress = (evt) => {
    const { code, type } = evt;
    const isKeyDown = type == "keydown";
    if (isKeyDown) {
      keys[code] = { pressed: true, type: "keydown" };
      clearTimeout(brakeEngineTimeouts[code]);
      brakeEngineTimeouts[code] = setTimeout(() => {
        keys[code] = { pressed: false, type: "keyup" };
      }, 2500);
    } else {
      keys[code].type = "released";
    }
  };

  const moveLogic = () => {
    if (Platform.OS === "web") {
      const accCoeff = 0.8;
      const brakeEngine = 0.4;
      const topSpeed = 0.24;
      const sinAngle = Math.sin(player.rotation.y);
      const cosAngle = Math.cos(player.rotation.y);
      let angleQuadrant;
      if (cosAngle > 0 && sinAngle > 0) angleQuadrant = 1;
      else if (cosAngle < 0 && sinAngle > 0) angleQuadrant = 2;
      else if (cosAngle < 0 && sinAngle < 0) angleQuadrant = 3;
      else if (cosAngle > 0 && sinAngle < 0) angleQuadrant = 4;

      if (keys["ArrowUp"]?.pressed && keys["ArrowLeft"]?.pressed) {
        //if (speed.y < 0.1) {
        //  speed.y += 0.002;
        //}
      } else if (keys["ArrowUp"]?.pressed && keys["ArrowRight"]?.pressed) {
        //if (speed.y > -0.1) {
        //  speed.y -= 0.002;
        //}
      } else if (keys["ArrowUp"]?.pressed) {
        if (
          Math.abs(speed.x) <=
            Math.abs(parseFloat(sinAngle).toFixed(12)) * topSpeed &&
          Math.abs(speed.x) >= 0
        ) {
          let sign = -1;
          if (
            angleQuadrant === 1 ||
            angleQuadrant === 2 ||
            (!Boolean(angleQuadrant) && sinAngle === 1)
          ) {
            sign = 1;
          }
          if (keys["ArrowUp"].type === "keydown") {
            speed.x += (sign * (accCoeff * Math.abs(sinAngle))) / 100;
            if (
              speed.x >
              Math.abs(parseFloat(sinAngle).toFixed(12)) * topSpeed
            ) {
              speed.x = Math.abs(parseFloat(sinAngle).toFixed(12)) * topSpeed;
            }
          } else if (keys["ArrowUp"].type === "released") {
            speed.x -=
              (sign * ((accCoeff - brakeEngine) * Math.abs(sinAngle))) / 100;
            if (speed.x < 0) {
              speed.x = 0;
            }
          }
        }
        if (
          Math.abs(speed.z) <=
            Math.abs(parseFloat(cosAngle).toFixed(12)) * topSpeed &&
          Math.abs(speed.z) >= 0
        ) {
          let sign = -1;
          if (
            angleQuadrant === 1 ||
            angleQuadrant === 4 ||
            (!Boolean(angleQuadrant) && cosAngle === 1)
          ) {
            sign = 1;
          }
          if (keys["ArrowUp"].type === "keydown") {
            speed.z += (sign * (accCoeff * Math.abs(cosAngle))) / 100;
            if (
              speed.z >
              Math.abs(parseFloat(cosAngle).toFixed(12)) * topSpeed
            ) {
              speed.z = Math.abs(parseFloat(cosAngle).toFixed(12)) * topSpeed;
            }
          } else if (keys["ArrowUp"].type === "released") {
            speed.z -=
              (sign * ((accCoeff - brakeEngine) * Math.abs(cosAngle))) / 100;
            if (speed.z < 0) {
              speed.z = 0;
            }
          }
        }
      } else if (keys["ArrowDown"]?.pressed) {
      }
      console.log(
        `actual speed: ${Math.sqrt(speed.x * speed.x + speed.z * speed.z)}`
      );
      console.log(speed);
      movePlayer(speed);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {Boolean(socket) && Boolean(socketId) && socket.connected && (
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
            scene.add(new GridHelper(10, 10));
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
            player.position.set(initX, 0, initZ);
            camera.position.set(initX, 2, initZ - 5);
            camera.lookAt(player.position);

            scene.add(player);
            playerInit(player.position, color);

            const animate = () => {
              setTimeout(function () {
                requestAnimationFrame(animate);
              }, 1000 / 40);
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
