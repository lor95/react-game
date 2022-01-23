import React, { useState, useEffect } from "react";
import { SimpleGameWindow } from "./lib/physic-engine-three/components";
import { SOCKET_ENDPOINT } from "./config/socketConfig";
import { View, Text } from "react-native";
import { Scene, Quaternion } from "three";
import { World, Vec3 } from "cannon";
import { RefereeObject, SimpleCarObject } from "./lib/physic-engine-three/core";
//import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import socketIoClient from "socket.io-client";

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

//const loader = new OBJLoader();
//loader.load(
//  require("./lib/physic-engine-three/resources/models/test.obj"),
//  function (object) {
//    scene.add(object);
//  },
//  function (xhr) {
//    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
//  },
//  function (error) {
//    console.log("An error happened");
//  }
//);

const player = new SimpleCarObject(
  {
    x: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 15),
    y: 2,
    z: (Math.round(Math.random()) * 2 - 1) * Math.floor(Math.random() * 15),
  },
  new Quaternion().setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2),
  defaultColors[Math.floor(Math.random() * defaultColors.length)],
  true,
  true,
  14
);

const referee = new RefereeObject(player);
referee.target.addToGame(scene, world);

let players = [];

export default function App() {
  const [error, setError] = useState(undefined);
  const [socketId, setSocketId] = useState(undefined);
  const [socket, setSocket] = useState(undefined);
  const [viewWidth, setViewWidth] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);

  const setDimensions = (layout) => {
    setViewWidth(layout.width);
    setViewHeight(layout.height);
  };

  useEffect(() => {
    const socket_ = socketIoClient(SOCKET_ENDPOINT, {
      forceNode: true,
      autoConnect: false,
      reconnection: false,
    });
    setSocket(socket_);
  }, []);

  useEffect(() => {
    if (Boolean(socketId)) {
      player.setCommonId(socketId);
      referee.setCommonId(socketId);
      referee.setCallback((targetObject, isNewTarget) => {
        socket.emit("new_target_position", {
          position: {
            x: targetObject.target.shape.position.x,
            y: targetObject.target.shape.position.y,
            z: targetObject.target.shape.position.z,
          },
          isNewTarget,
        });
      });
      referee.executeCallback();
    }
  }, [socketId]);

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
        alreadySpawnedPlayer.addToGame(scene, world);
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
        spawnedPlayer.addToGame(scene, world);
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

    socket.on("new_target_spawned", (data) => {
      referee.target.setPosition(data.position);
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
    <View
      style={{ flex: 1 }}
      onLayout={(event) => setDimensions(event.nativeEvent.layout)}
    >
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {Boolean(socket) && Boolean(socketId) && socket.connected && (
        <SimpleGameWindow
          debugWindow={true}
          mainPlayer={player}
          mainPlayerInit={playerInit}
          randomBoxes={false}
          scene={scene}
          updateMainPlayer={(player) => {
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
          }}
          world={world}
        />
      )}
    </View>
  );
}
