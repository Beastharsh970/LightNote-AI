import dns from "dns";
import mongoose from "mongoose";
import { env } from "./env";

// On Windows or certain ISP/Wi-Fi networks, default DNS servers fail or refuse
// SRV record queries (querySrv ECONNREFUSED). Using public DNS (Google/Cloudflare)
// ensures mongodb+srv:// records resolve reliably.
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (err) {
  console.warn("Could not set custom DNS servers, using system default:", err);
}

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: "lightnoteai",
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}

