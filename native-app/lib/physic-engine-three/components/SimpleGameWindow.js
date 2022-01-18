import React from "react";
import {
  View,
  Animated,
  StyleSheet,
  PanResponder,
  Platform,
} from "react-native";
import { Material, ContactMaterial, Plane, Body, Box, Vec3 } from "cannon";
import { default as CannonDebugRenderer } from "../debug/CannonDebugRenderer";
//import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
  Mesh,
  MeshStandardMaterial,
  GridHelper,
  HemisphereLight,
  SpotLight,
  RepeatWrapping,
  sRGBEncoding,
  PlaneBufferGeometry,
  BasicShadowMap,
  PCFShadowMap,
  Fog,
  Color,
  BoxGeometry,
} from "three";
import { Renderer, TextureLoader } from "expo-three";
import { GLView } from "expo-gl";

const styles = StyleSheet.create({
  pointer: { position: "absolute", backgroundColor: "red", borderRadius: 200 },
  pointerContainer: {
    position: "absolute",
    backgroundColor: "#000",
    opacity: 0.15,
  },
});

const SimpleGameWindow = (props) => {
  const touchWidthArea = 240;
  const touchHeightArea = 240;
  const rightMargin = 10;
  const bottomMargin = 10;
  const pointerPanel = new Animated.ValueXY();
  pointerPanel.setValue({
    x: touchWidthArea / 3,
    y: touchHeightArea / 3,
  });

  const pointerPanelResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pointerPanel.setOffset({
        x: pointerPanel.x._value,
        y: pointerPanel.y._value,
      });
      pointerPanel.setValue({
        x: 0,
        y: 0,
      });
    },
    onPanResponderMove: (e, gesture) => {
      pointerPanel.setValue({
        x:
          gesture.dx >= -touchWidthArea / 3 && gesture.dx <= touchWidthArea / 3
            ? gesture.dx
            : pointerPanel.x._value,
        y:
          gesture.dy >= -touchHeightArea / 3 &&
          gesture.dy <= touchHeightArea / 3
            ? gesture.dy
            : pointerPanel.y._value,
      });
      props.mainPlayer.controls.mobileControls({
        x: pointerPanel.x._value,
        y: pointerPanel.y._value,
        width: touchWidthArea,
        height: touchHeightArea,
      });
    },
    onPanResponderRelease: () => {
      pointerPanel.setValue({
        x: 0,
        y: 0,
      });
      props.mainPlayer.controls.mobileControls({
        x: 0,
        y: 0,
        width: touchWidthArea,
        height: touchHeightArea,
      });
      pointerPanel.flattenOffset();
    },
  });

  return (
    <>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={(gl) => {
          props.world.quatNormalizeSkip = 0;
          props.world.quatNormalizeFast = false;
          props.world.defaultContactMaterial.contactEquationStiffness = 1e128;
          props.world.defaultContactMaterial.contactEquationRelaxation = 4;
          props.world.gravity.set(0, -9.82, 0);
          props.world.solver.iterations = 20;
          props.world.solver.tolerance = 0.0;

          // Create a slippery material (friction coefficient = 0.0)
          var physicsMaterial = new Material("slipperyMaterial");
          var physicsContactMaterial = new ContactMaterial(
            physicsMaterial,
            physicsMaterial,
            0.0, // friction coefficient
            0.3 // restitution
          );
          props.world.addContactMaterial(physicsContactMaterial);

          // Create a plane
          const groundShape = new Plane();
          const groundBody = new Body({ mass: 0 });
          groundBody.addShape(groundShape);
          groundBody.quaternion.setFromAxisAngle(
            new Vec3(1, 0, 0),
            -Math.PI / 2
          );
          props.world.addBody(groundBody);

          let boxes = [];
          let boxMeshes = [];
          if (props.randomBoxes) {
            for (var i = 0; i < 7; i++) {
              var boxBody = new Body({ mass: 0.1 });
              boxBody.addShape(new Box(new Vec3(1, 1, 1)));
              var boxMesh = new Mesh(
                new BoxGeometry(2, 2, 2),
                new MeshStandardMaterial({ color: "blue" })
              );
              props.world.addBody(boxBody);
              props.scene.add(boxMesh);
              boxBody.position.set(
                (Math.random() - 0.5) * 30,
                1 + (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 30
              );
              boxMesh.position.copy(boxBody.position);
              boxMesh.castShadow = true;
              boxMesh.receiveShadow = true;
              boxes.push(boxBody);
              boxMeshes.push(boxMesh);
            }
          }

          var hemilight = new HemisphereLight(0xffeeb1, 0x080820, 1);
          props.scene.add(hemilight);
          var light = new SpotLight(0xffa95c, 1);
          light.position.set(-50, 50, 50);
          light.castShadow = true;
          light.shadow.bias = 0.001;
          light.shadow.mapSize.width = 2048;
          light.shadow.mapSize.height = 2048;
          props.scene.add(light);

          try {
            gl.canvas = {
              width: gl.drawingBufferWidth,
              height: gl.drawingBufferHeight,
            };
          } catch {}

          const renderer = new Renderer({ gl });
          let debugRenderer;

          renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
          renderer.shadowMap.enabled = true;
          if (Platform.OS === "web") {
            renderer.shadowMap.type = PCFShadowMap;
          } else {
            renderer.shadowMap.type = BasicShadowMap;
          }

          props.mainPlayer.camera.aspect =
            gl.drawingBufferWidth / gl.drawingBufferHeight;
          props.mainPlayer.camera.updateProjectionMatrix();

          props.scene.add(props.mainPlayer.chassisShape);
          props.mainPlayer.wheelShapes.forEach((wheelShape) => {
            props.scene.add(wheelShape);
          });
          props.mainPlayer.addToWorld(props.world);
          props.mainPlayer.wheelBodies.forEach((wheel) => {
            props.world.addBody(wheel);
          });

          props.mainPlayer.enableBrowserStdControls();

          props.mainPlayerInit(
            props.mainPlayer.chassisShape.position,
            props.mainPlayer.chassisShape.quaternion,
            props.mainPlayer.chassisShape.material.color
          );

          if (props.debugWindow) {
            props.scene.add(new GridHelper(1000, 1000));
            props.scene.add(props.mainPlayer.forwardArrow);
            props.scene.add(props.mainPlayer.velocityArrow);
            debugRenderer = new CannonDebugRenderer(props.scene, props.world); // props.debugWindow element
          } else {
            props.scene.fog = new Fog("#87ceeb", 1, 70);
            props.scene.background = new Color("#87ceeb");
            const groundTexture = new TextureLoader().load(
              require("../resources/textures/ground.png")
            );
            groundTexture.wrapS = RepeatWrapping;
            groundTexture.wrapT = RepeatWrapping;
            groundTexture.repeat.set(1000, 1000);
            groundTexture.anisotropy = 8;
            groundTexture.encoding = sRGBEncoding;
            const groundMaterial = new MeshStandardMaterial({
              map: groundTexture,
            });
            const groundMesh = new Mesh(
              new PlaneBufferGeometry(1000, 1000),
              groundMaterial
            );
            groundMesh.position.y = 0;
            groundMesh.rotation.x = -Math.PI / 2;
            groundMesh.receiveShadow = true;
            props.scene.add(groundMesh);
          }
          
          //const controls = new OrbitControls(
          //  props.mainPlayer.camera,
          //  renderer.domElement
          //);

          const animate = () => {
            setTimeout(function () {
              requestAnimationFrame(animate);
              props.world.step(1 / 30);
            }, 1000 / 30);
            props.mainPlayer.updatePosition(props.updateMainPlayer);

            if (props.randomBoxes) {
              for (var i = 0; i < boxes.length; i++) {
                boxMeshes[i].position.copy(boxes[i].position);
                boxMeshes[i].quaternion.copy(boxes[i].quaternion);
              }
            }

            Boolean(debugRenderer) && debugRenderer.update();
            //controls.update();
            renderer.render(props.scene, props.mainPlayer.camera);
            gl.endFrameEXP();
          };
          animate();
        }}
      />
      {Platform.OS !== "web" && (
        <View
          style={[
            styles.pointerContainer,
            {
              right: rightMargin,
              bottom: bottomMargin,
              height: touchHeightArea,
              width: touchWidthArea,
            },
          ]}
        >
          <Animated.View
            {...pointerPanelResponder.panHandlers}
            style={[
              pointerPanel.getLayout(),
              styles.pointer,
              {
                height: touchHeightArea / 3,
                width: touchWidthArea / 3,
              },
            ]}
          />
        </View>
      )}
    </>
  );
};

export default SimpleGameWindow;
