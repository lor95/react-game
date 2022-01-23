import React, { useState } from "react";
import { Platform, View, Text } from "react-native";
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
import { Renderer } from "expo-three";
import { GLView } from "expo-gl";
import { getTexture } from "../core";
import { osName } from "expo-device";
import { SimplePhoneControls } from "./SimplePhoneControls";

const SimpleGameWindow = (props) => {
  const [score, setScore] = useState(props.mainPlayer.score);
  return (
    <>
      <View
        style={{
          textAlign: "center",
          paddingTop: 8,
          paddingBottom: 8,
          background: "transparent",
        }}
      >
        <Text>Score: {score}</Text>
      </View>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={async (gl) => {
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

          props.mainPlayer.addToGame(props.scene, props.world);

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
            const groundTexture = await getTexture("ground.png");
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
          props.mainPlayer.setScoreUpdateFunction(() => {
            props.mainPlayer.score += 1;
            setScore(props.mainPlayer.score);
          });

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
      {(Platform.OS !== "web" ||
        osName.toLowerCase() === "android" ||
        osName.toLowerCase() === "ios") && (
        <SimplePhoneControls mainPlayer={props.mainPlayer} dimension={240} />
      )}
    </>
  );
};

export default SimpleGameWindow;
