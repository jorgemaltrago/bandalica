import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const SUPABASE_URL = "https://urwtnfzgsdmpazcregyo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyd3RuZnpnc2RtcGF6Y3JlZ3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4OTc2MTQsImV4cCI6MjEwOTQ3MzYxNH0.ptmDqISRQZpxuOr4cze12TACJbmQxdsbSrAnxGPgRbs";

// Creamos un almacenamiento simulado (dummy) seguro para cuando se ejecuta en el servidor de compilación (SSR/Node)
const DummyStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
};

// Comprobamos si estamos corriendo en el entorno de compilación de Node.js de EAS
const isServer = Platform.OS === "web" && typeof window === "undefined";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: isServer ? DummyStorage : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
