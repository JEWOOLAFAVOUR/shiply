"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const nginxManager_1 = require("./services/nginxManager");
const hostsManager_1 = require("./services/hostsManager");
function setupReverseProxy() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🚀 Setting up Shiply Reverse Proxy...\n");
        const nginxManager = new nginxManager_1.NginxManager();
        const hostsManager = new hostsManager_1.HostsManager();
        try {
            // Step 1: Setup hosts file
            console.log("📝 Step 1: Configuring local domains...");
            yield hostsManager.addShiplyDomains();
            // Step 2: Start Nginx proxy
            console.log("\n🐳 Step 2: Starting Nginx reverse proxy...");
            yield nginxManager.startProxy();
            console.log("\n✅ Reverse proxy setup complete!");
            console.log("\n🌐 Available URLs:");
            console.log("- Main API: http://shiply.local");
            console.log("- API Alt:  http://api.shiply.local");
            console.log("- Apps:     http://[app-name].shiply.local");
            console.log("\n🎯 Next Steps:");
            console.log("1. Deploy a project via API");
            console.log("2. Access it via custom domain");
            console.log("3. Example: http://test-backend-project-1.shiply.local");
        }
        catch (error) {
            console.error("❌ Setup failed:", error);
            hostsManager.showManualInstructions();
        }
    });
}
// Run setup
setupReverseProxy().catch(console.error);
