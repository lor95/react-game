import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
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
import socketIoClient from "socket.io-client";
const ENDPOINT = "ws://192.168.1.220:4001";

export default function App() {
  const [response, setResponse] = useState("");
  const [error, setError] = useState(undefined);
  const [socket, setSocket] = useState(undefined);

  useEffect(() => {
    const socket_ = socketIoClient(ENDPOINT, {
      forceNode: true,
    });
    socket_.on("broadcast", (data) => {
      setResponse(data);
    });
    socket_.on("connect_error", () => {
      setError("Unable to connect to socket");
    });
    socket_.on("initialization", (data) => {
      setError(undefined);
    });
    setSocket(socket_);
  }, []);

  const playerInit = (position) => {
    socket.emit("player_init", { socketId: socket.id, position: position });
  };
  const handler = () => {
    socket.emit("player_move", { socketId: socket.id });
  };

  return (
    <View style={{ flex: 1 }}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      <Text onClick={handler}>{response}</Text>
      {Boolean(socket) && socket.connected && (
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
            const scene = new Scene();
            scene.add(new GridHelper(10, 10));
            // 2. Camera
            try {
              gl.canvas = {
                width: gl.drawingBufferWidth,
                height: gl.drawingBufferHeight,
              };
            } catch {}
            const camera = new PerspectiveCamera(
              75,
              gl.drawingBufferWidth / gl.drawingBufferHeight,
              0.1,
              1000
            );
            const geometry = new BoxBufferGeometry(1, 1, 1);
            const material = new MeshBasicMaterial({ color: "lightblue" });
            const cube = new Mesh(geometry, material);
            const renderer = new Renderer({ gl });

            renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
            const initX =
              (Math.round(Math.random()) * 2 - 1) *
              Math.floor(Math.random() * 5);
            const initZ =
              (Math.round(Math.random()) * 2 - 1) *
              Math.floor(Math.random() * 5);

            cube.position.x = initX;
            cube.position.z = initZ;

            camera.position.x = initX;
            camera.position.y = 2;
            camera.position.z = initZ - 5;
            camera.lookAt(cube.position);

            scene.add(cube);
            playerInit(cube.position);

            const animate = () => {
              requestAnimationFrame(animate);
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
