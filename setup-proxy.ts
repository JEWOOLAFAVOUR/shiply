import { NginxManager } from "./services/nginxManager";
import { HostsManager } from "./services/hostsManager";

async function setupReverseProxy() {
  console.log("🚀 Setting up Shiply Reverse Proxy...\n");

  const nginxManager = new NginxManager();
  const hostsManager = new HostsManager();

  try {
    // Step 1: Setup hosts file
    console.log("📝 Step 1: Configuring local domains...");
    await hostsManager.addShiplyDomains();

    // Step 2: Start Nginx proxy
    console.log("\n🐳 Step 2: Starting Nginx reverse proxy...");
    await nginxManager.startProxy();

    console.log("\n✅ Reverse proxy setup complete!");
    console.log("\n🌐 Available URLs:");
    console.log("- Main API: http://shiply.local");
    console.log("- API Alt:  http://api.shiply.local");
    console.log("- Apps:     http://[app-name].shiply.local");

    console.log("\n🎯 Next Steps:");
    console.log("1. Deploy a project via API");
    console.log("2. Access it via custom domain");
    console.log("3. Example: http://test-backend-project-1.shiply.local");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    hostsManager.showManualInstructions();
  }
}

// Run setup
setupReverseProxy().catch(console.error);
