import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";

interface FireworksOverlayProps {
  seed: number;
  onComplete?: () => void;
}

interface FireworkParticle {
  id: string;
  dx: number;
  dy: number;
  color: string;
  size: number;
}

interface FireworkBurst {
  id: string;
  x: number;
  y: number;
  particles: FireworkParticle[];
}

interface FireworkWave {
  id: string;
  bursts: FireworkBurst[];
}

const WAVE_COUNT = 4;
const BURSTS_PER_WAVE = 2;
const PARTICLES_PER_BURST = 14;
const FIREWORK_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#facc15",
];

export function FireworksOverlay({
  seed,
  onComplete,
}: FireworksOverlayProps) {
  const waveAnimations = useRef(
    Array.from({ length: WAVE_COUNT }, () => new Animated.Value(0))
  ).current;
  const { width, height } = Dimensions.get("window");

  const waves = useMemo(
    () => createFireworkWaves({ width, height, seed }),
    [height, seed, width]
  );

  useEffect(() => {
    waveAnimations.forEach((animation) => {
      animation.stopAnimation();
      animation.setValue(0);
    });

    const fireworksAnimation = Animated.stagger(
      280,
      waveAnimations.map((animation) =>
        Animated.timing(animation, {
          toValue: 1,
          duration: 1150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );

    fireworksAnimation.start(({ finished }) => {
      if (finished) {
        onComplete?.();
      }
    });

    return () => {
      fireworksAnimation.stop();
    };
  }, [onComplete, seed, waveAnimations]);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID="fireworks-overlay"
    >
      {waves.map((wave, waveIndex) => {
        const animation = waveAnimations[waveIndex];

        return wave.bursts.map((burst) => (
          <View
            key={burst.id}
            pointerEvents="none"
            style={[styles.burstContainer, { left: burst.x, top: burst.y }]}
          >
            <Animated.View
              style={[
                styles.flash,
                {
                  opacity: animation.interpolate({
                    inputRange: [0, 0.08, 0.2, 1],
                    outputRange: [0, 0.95, 0.35, 0],
                  }),
                  transform: [
                    {
                      scale: animation.interpolate({
                        inputRange: [0, 0.08, 0.35, 1],
                        outputRange: [0.2, 1.45, 0.82, 0.1],
                      }),
                    },
                  ],
                },
              ]}
            />
            {burst.particles.map((particle) => (
              <Animated.View
                key={particle.id}
                style={[
                  styles.particle,
                  {
                    backgroundColor: particle.color,
                    width: particle.size,
                    height: particle.size * 2.5,
                    borderRadius: particle.size,
                    opacity: animation.interpolate({
                      inputRange: [0, 0.08, 0.75, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                    transform: [
                      {
                        translateX: animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, particle.dx],
                        }),
                      },
                      {
                        translateY: animation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, particle.dy],
                        }),
                      },
                      {
                        scale: animation.interpolate({
                          inputRange: [0, 0.12, 1],
                          outputRange: [0.2, 1, 0.35],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        ));
      })}
    </View>
  );
}

function createFireworkWaves({
  width,
  height,
  seed,
}: {
  width: number;
  height: number;
  seed: number;
}): FireworkWave[] {
  const random = createSeededRandom(seed);

  return Array.from({ length: WAVE_COUNT }, (_, waveIndex) => ({
    id: `wave-${seed}-${waveIndex}`,
    bursts: Array.from({ length: BURSTS_PER_WAVE }, (_, burstIndex) => {
      const x = width * (0.1 + random() * 0.8);
      const y = height * (0.12 + random() * 0.46);

      const particles = Array.from(
        { length: PARTICLES_PER_BURST },
        (_, particleIndex) => {
          const angle =
            (Math.PI * 2 * particleIndex) / PARTICLES_PER_BURST +
            random() * 0.32;
          const distance = 42 + random() * 58;
          return {
            id: `${waveIndex}-${burstIndex}-${particleIndex}`,
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance,
            color: FIREWORK_COLORS[
              Math.floor(random() * FIREWORK_COLORS.length)
            ] as string,
            size: 4 + random() * 3,
          };
        }
      );

      return {
        id: `burst-${seed}-${waveIndex}-${burstIndex}`,
        x,
        y,
        particles,
      };
    }),
  }));
}

function createSeededRandom(seed: number) {
  let value = seed || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const styles = StyleSheet.create({
  burstContainer: {
    position: "absolute",
    width: 0,
    height: 0,
  },
  flash: {
    position: "absolute",
    left: -18,
    top: -18,
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  particle: {
    position: "absolute",
    left: -3,
    top: -8,
  },
});
