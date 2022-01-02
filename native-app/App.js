import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import io from "socket.io-client";
const ENDPOINT = "ws://192.168.1.220:4001";

export default function App() {
  const [response, setResponse] = useState("");

  useEffect(() => {
    const socket = io(ENDPOINT, {
      forceNode: true,
    });
    socket.on("FromAPI", (data) => {
      setResponse(data);
    });
    socket.on("connect_error", (err) => {console.log(err)});
  }, []);

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <Text>{response}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
