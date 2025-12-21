import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as Crypto from "expo-crypto";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SettingsProvider } from "../contexts/SettingsContext";
import { ToastProvider } from "../contexts/ToastContext";
import { db } from "../db/client";
import migrations from "../drizzle/migrations";
import "../global.css"; // Ensure NativeWind styles load

// This creates the global.crypto object that Drizzle expects
if (typeof global.crypto === "undefined") {
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: () => Crypto.randomUUID(),
    },
  });
}

export default function RootLayout() {
  // 1. Run migrations automatically to ensure t  ables exist
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (error) {
      console.error("Database migration failed: ", error);
    }
  }, [error]);

  // 2. Show a loading state until the database is ready
  if (!success) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-slate-950">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // 3. Render the app stack once the DB is ready
  return (
    <SettingsProvider>
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="index" />
          {/* presentation: 'modal' makes the Create Goal screen slide up from bottom */}
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen name="goal/[id]" />
          <Stack.Screen
            name="goal/edit/[id]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="settings" options={{ presentation: "modal" }} />
        </Stack>
      </ToastProvider>
    </SettingsProvider>
  );
}
