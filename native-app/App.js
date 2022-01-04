import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import {
  Scene,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  BoxBufferGeometry,
} from "three";
import { Renderer } from "expo-three";
import { GLView } from "expo-gl";
import { StatusBar } from "expo-status-bar";
import socketIoClient from "socket.io-client";
const ENDPOINT = "ws://192.168.1.220:4001";

export default function App() {
  const [response, setResponse] = useState("");
  const [error, setError] = useState(undefined);
  const [connMessage, setConnMessage] = useState("");

  useEffect(() => {
    const socket = socketIoClient(ENDPOINT, {
      forceNode: true,
    });
    socket.on("broadcast", (data) => {
      setResponse(data);
    });
    socket.on("connect_error", () => {
      setError("Unable to connect to socket");
    });
    socket.on("initialization", (data) => {
      setError(undefined);
      setConnMessage(data);
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {!Boolean(error) && <Text>{connMessage}</Text>}
      <Text>{response}</Text>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={(gl) => {
          // Create a WebGLRenderer without a DOM element
          var scene = new Scene();
          // 2. Camera
          const camera = new PerspectiveCamera(
            75,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.1,
            1000
          );
          try {
            gl.canvas = {
              width: gl.drawingBufferWidth,
              height: gl.drawingBufferHeight,
            };
          } catch {}
          const renderer = new Renderer({ gl });
          renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
          const geometry = new BoxBufferGeometry(1, 1, 1);
          const material = new MeshBasicMaterial({ color: 'lightblue' });
          const cube = new Mesh(geometry, material);
          scene.add(cube);

          camera.position.z = 5;

          //scene.add(cube);

          const animate = () => {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
            gl.endFrameEXP();
          };
          animate();
        }}
      />
    </View>
  );
}
