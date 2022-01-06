import React, { useState, useEffect } from "react";
import { View, Text, Platform, TouchableWithoutFeedback } from "react-native";
import {
  Scene,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  BoxBufferGeometry,
  GridHelper,
  SpotLight,
  Fog,
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
const material = new MeshStandardMaterial({ color });
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
        const material = new MeshStandardMaterial({
          color: player.color,
        });
        const alreadySpawnedPlayer = new Mesh(geometry, material);
        alreadySpawnedPlayer.socketId = socketId;
        alreadySpawnedPlayer.position.x = player.position.x;
        alreadySpawnedPlayer.position.z = player.position.z;
        alreadySpawnedPlayer.rotation.y = player.rotation.y;
        scene.add(alreadySpawnedPlayer);
      });
    });
    socket.on("new_player_spawned", (player) => {
      if (Boolean(player)) {
        const material = new MeshStandardMaterial({
          color: player.color,
        });
        const spawnedPlayer = new Mesh(geometry, material);
        spawnedPlayer.socketId = player.socketId;
        spawnedPlayer.position.x = player.position.x;
        spawnedPlayer.position.z = player.position.z;
        spawnedPlayer.rotation.y = player.rotation.y;
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

  const movePlayer = (data) => {
    const latestPosition = player.position;
    const latestRotation = player.rotation;
    gsap.to(player.position, {
      duration: 0.04,
      x: player.position.x + (data.x || 0),
      z: player.position.z + (data.z || 0),
      onComplete: () => {
        if (
          data.x !== latestPosition.x ||
          data.z !== latestPosition.z ||
          data.y !== latestRotation.y
        )
          socket.emit("player_move", {
            position: {
              x: player.position.x,
              z: player.position.z,
            },
            rotation: {
              y: player.rotation.y,
            },
          });
      },
    });
    gsap.to(camera.position, {
      duration: 0.04,
      x: camera.position.x + (data.x || 0),
      z: camera.position.z + (data.z || 0),
    });
  };

  const getCodeInfo = (code) => {
    let retCode;
    let oppositeTimerLength;
    let timerLength;
    switch (code) {
      case "ArrowUp":
        retCode = "ArrowDown";
        oppositeTimerLength = 2500;
        timerLength = 5000;
        break;
      case "ArrowDown":
        retCode = "ArrowUp";
        oppositeTimerLength = 5000;
        timerLength = 2500;
        break;
      case "ArrowLeft":
        retCode = "ArrowRight";
        oppositeTimerLength = 1500;
        timerLength = 1500;
        break;
      case "ArrowRight":
        retCode = "ArrowLeft";
        oppositeTimerLength = 1500;
        timerLength = 1500;
        break;
    }
    return { oppositeCode: retCode, oppositeTimerLength, timerLength };
  };

  // browser event
  const handleKeyPress = (evt) => {
    const { code, type } = evt;
    const { oppositeCode, oppositeTimerLength, timerLength } =
      getCodeInfo(code);
    const isKeyDown = type == "keydown";
    if (isKeyDown) {
      if (brakeEngineTimeouts[oppositeCode]) {
        if (keys[oppositeCode]?.pressed) {
          clearTimeout(brakeEngineTimeouts[oppositeCode]);
          keys[oppositeCode].type = "released";
          brakeEngineTimeouts[oppositeCode] = setTimeout(() => {
            keys[oppositeCode] = { pressed: false, type: "keyup" };
          }, oppositeTimerLength);
        }
      }
      clearTimeout(brakeEngineTimeouts[code]);
      keys[code] = { pressed: true, type: "keydown" };
    } else {
      if (keys[code]?.type === "keydown") {
        keys[code].type = "released";
        brakeEngineTimeouts[code] = setTimeout(() => {
          keys[code] = { pressed: false, type: "keyup" };
        }, timerLength);
      }
    }
  };

  const moveLogic = () => {
    if (Platform.OS === "web") {
      const accCoeff = 0.8;
      const brakeEngine = 0.35;
      const topSpeed = 0.26;
      const brakeCoeff = 0.95;
      const reverseSpeed = 0.08;
      const steeringCoeff = 0.03;

      let execMove = false;

      if (keys["ArrowLeft"]?.pressed && keys["ArrowLeft"]?.type === "keydown") {
        player.rotation.y += steeringCoeff;
      } else if (
        keys["ArrowRight"]?.pressed &&
        keys["ArrowRight"]?.type === "keydown"
      ) {
        player.rotation.y -= steeringCoeff;
      }

      const sinAngle = Math.sin(player.rotation.y);
      const cosAngle = Math.cos(player.rotation.y);
      let angleQuadrant;
      if (cosAngle > 0 && sinAngle > 0) angleQuadrant = 1;
      else if (cosAngle < 0 && sinAngle > 0) angleQuadrant = 2;
      else if (cosAngle < 0 && sinAngle < 0) angleQuadrant = 3;
      else if (cosAngle > 0 && sinAngle < 0) angleQuadrant = 4;

      if (keys["ArrowUp"]?.pressed) {
        if (
          (Math.abs(speed.x) <=
            Math.abs(parseFloat(sinAngle).toFixed(12)) * topSpeed ||
            keys["ArrowLeft"]?.pressed ||
            keys["ArrowRight"]?.pressed) &&
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
              Math.abs(speed.x) >
                Math.abs(parseFloat(sinAngle).toFixed(12)) * topSpeed &&
              Math.sign(speed.x) === sign
            ) {
              speed.x =
                Math.abs(parseFloat(sinAngle).toFixed(12)) * sign * topSpeed;
            }
          } else if (keys["ArrowUp"].type === "released") {
            let coeff = brakeEngine;
            if (
              keys["ArrowDown"]?.pressed &&
              keys["ArrowDown"]?.type === "keydown"
            )
              coeff = brakeCoeff;
            speed.x -= (sign * (coeff * Math.abs(sinAngle))) / 100;
            if ((speed.x < 0 && sign > 0) || (speed.x > 0 && sign < 0)) {
              speed.x = 0;
            }
          }
          execMove = true;
        }
        if (
          (Math.abs(speed.z) <=
            Math.abs(parseFloat(cosAngle).toFixed(12)) * topSpeed ||
            keys["ArrowLeft"]?.pressed ||
            keys["ArrowRight"]?.pressed) &&
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
              Math.abs(speed.z) >
                Math.abs(parseFloat(cosAngle).toFixed(12)) * topSpeed &&
              Math.sign(speed.z) === sign
            ) {
              speed.z =
                Math.abs(parseFloat(cosAngle).toFixed(12)) * sign * topSpeed;
            }
          } else if (keys["ArrowUp"].type === "released") {
            let coeff = brakeEngine;
            if (
              keys["ArrowDown"]?.pressed &&
              keys["ArrowDown"]?.type === "keydown"
            )
              coeff = brakeCoeff;
            speed.z -= (sign * (coeff * Math.abs(cosAngle))) / 100;
            if ((speed.z < 0 && sign > 0) || (speed.z > 0 && sign < 0)) {
              speed.z = 0;
            }
          }
          execMove = true;
        }
        if (speed.x === 0 && speed.z === 0) {
          clearTimeout(brakeEngineTimeouts["ArrowUp"]);
          keys["ArrowUp"] = { pressed: false, type: "keyup" };
        }
      }
      if (keys["ArrowDown"]?.pressed && !keys["ArrowUp"]?.pressed) {
        if (
          (Math.abs(speed.x) <=
            Math.abs(parseFloat(sinAngle).toFixed(12)) * topSpeed ||
            keys["ArrowLeft"]?.pressed ||
            keys["ArrowRight"]?.pressed) &&
          Math.abs(speed.x) >= 0
        ) {
          let sign = 1;
          if (
            angleQuadrant === 1 ||
            angleQuadrant === 2 ||
            (!Boolean(angleQuadrant) && sinAngle === 1)
          ) {
            sign = -1;
          }
          if (keys["ArrowDown"].type === "keydown") {
            speed.x += (sign * (brakeCoeff * Math.abs(sinAngle))) / 100;
            if (
              Math.abs(speed.x) >
                Math.abs(parseFloat(sinAngle).toFixed(12)) * reverseSpeed &&
              Math.sign(speed.x) === sign
            ) {
              speed.x =
                Math.abs(parseFloat(sinAngle).toFixed(12)) *
                sign *
                reverseSpeed;
            }
          } else if (keys["ArrowDown"].type === "released") {
            let coeff = brakeEngine;
            if (keys["ArrowUp"]?.pressed && keys["ArrowUp"]?.type === "keydown")
              coeff = accCoeff;
            speed.x -= (sign * (coeff * Math.abs(sinAngle))) / 100;
            if ((speed.x < 0 && sign > 0) || (speed.x > 0 && sign < 0)) {
              speed.x = 0;
            }
          }
          execMove = true;
        }
        if (
          (Math.abs(speed.z) <=
            Math.abs(parseFloat(cosAngle).toFixed(12)) * topSpeed ||
            keys["ArrowLeft"]?.pressed ||
            keys["ArrowRight"]?.pressed) &&
          Math.abs(speed.z) >= 0
        ) {
          let sign = 1;
          if (
            angleQuadrant === 1 ||
            angleQuadrant === 4 ||
            (!Boolean(angleQuadrant) && cosAngle === 1)
          ) {
            sign = -1;
          }
          if (keys["ArrowDown"].type === "keydown") {
            speed.z += (sign * (brakeCoeff * Math.abs(cosAngle))) / 100;
            if (
              Math.abs(speed.z) >
                Math.abs(parseFloat(cosAngle).toFixed(12)) * reverseSpeed &&
              Math.sign(speed.z) === sign // this is because reverseSpeed < topSpeed by definition, so it prevents object to instantly go at top reverseSpeed
            ) {
              speed.z =
                Math.abs(parseFloat(cosAngle).toFixed(12)) *
                sign *
                reverseSpeed;
            }
          } else if (keys["ArrowDown"].type === "released") {
            let coeff = brakeEngine;
            if (keys["ArrowUp"]?.pressed && keys["ArrowUp"]?.type === "keydown")
              coeff = accCoeff;
            speed.z -= (sign * (coeff * Math.abs(cosAngle))) / 100;
            if ((speed.z < 0 && sign > 0) || (speed.z > 0 && sign < 0)) {
              speed.z = 0;
            }
          }
          execMove = true;
        }
        if (speed.x === 0 && speed.z === 0) {
          clearTimeout(brakeEngineTimeouts["ArrowDown"]);
          keys["ArrowDown"] = { pressed: false, type: "keyup" };
        }
      }
      //console.log(
      //  `actual speed: ${Math.sqrt(speed.x * speed.x + speed.z * speed.z)}`
      //);
      console.log(speed);
      console.log(keys["ArrowUp"]);
      //console.log(keys["ArrowLeft"]);
      //console.log(keys["ArrowRight"]);
      if (execMove) movePlayer({ ...speed, y: player.position.y });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {Boolean(socket) && Boolean(socketId) && socket.connected && (
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
            scene.add(new GridHelper(10000, 10000));

            scene.fog = new Fog("#3A96C4", 1, 10);

            const spotLight = new SpotLight(0xffffff);
            spotLight.position.set(-1000, 1000, -1000);

            //spotLight.castShadow = true;

            spotLight.shadow.mapSize.width = 1024;
            spotLight.shadow.mapSize.height = 1024;

            spotLight.shadow.camera.near = 500;
            spotLight.shadow.camera.far = 4000;
            spotLight.shadow.camera.fov = 30;

            scene.add(spotLight);
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
            player.rotation.y = 0;
            camera.lookAt(player.position);
            scene.add(player);
            playerInit(player.position, player.rotation, color);

            const animate = () => {
              setTimeout(function () {
                requestAnimationFrame(animate);
              }, 1000 / 30);
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
