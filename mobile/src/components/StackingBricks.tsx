import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { brand } from '../theme';
import { Brick } from './Brick';

const COLORS = [brand.red, brand.yellow, brand.blue];
const BODY = 18; // height of each brick's face; studs tuck under the brick above
const DEPTH = 4; // the dark bottom strip of a "sm" brick
const STEP = BODY + DEPTH;
const DROP = 70;

/** Three little bricks that drop and stack on top of each other, over and over. */
export function StackingBricks() {
  const drops = useRef(COLORS.map(() => new Animated.Value(0))).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const dropIn = (v: Animated.Value) =>
      Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.bounce, useNativeDriver: true });

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          ...drops.map((v) => Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })),
          Animated.timing(fade, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.stagger(380, drops.map(dropIn)),
        Animated.delay(450),
        Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.delay(150),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drops, fade]);

  return (
    <Animated.View style={[styles.stage, { opacity: fade }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {COLORS.map((color, i) => {
        const translateY = drops[i].interpolate({ inputRange: [0, 1], outputRange: [-DROP - i * STEP, 0] });
        const opacity = drops[i].interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] });
        return (
          <Animated.View key={color} style={[styles.brick, { bottom: i * STEP, opacity, transform: [{ translateY }] }]}>
            <Brick color={color} studs={2} size="sm" style={{ width: 56 }} contentStyle={{ height: BODY }} />
          </Animated.View>
        );
      })}
      <View style={styles.floor} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 80,
    height: STEP * 3 + 14,
    alignSelf: 'center',
  },
  brick: {
    position: 'absolute',
    left: 12,
  },
  floor: {
    position: 'absolute',
    bottom: -4,
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
});
