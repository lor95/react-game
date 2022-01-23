import React from "react";
import { View, Animated, PanResponder, StyleSheet } from "react-native";

const styles = StyleSheet.create({
  pointer: {
    position: "absolute",
    backgroundColor: "#000",
    opacity: 0.3,
    borderRadius: 200,
    borderColor: "#fff",
    borderWidth: 3,
  },
  pointerContainer: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 45,
  },
});

export const SimplePhoneControls = (props) => {
  const touchWidthArea = props.dimension;
  const touchHeightArea = props.dimension;
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
  );
};
