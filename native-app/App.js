import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
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
    <View style={styles.container}>
      {Boolean(error) && <Text style={{ color: "red" }}>{error}</Text>}
      {!Boolean(error) && <Text>{connMessage}</Text>}
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
