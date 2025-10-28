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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NginxConfigManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class NginxConfigManager {
    constructor() {
        this.configPath = path_1.default.join(process.cwd(), "nginx", "sites");
        this.baseConfigPath = path_1.default.join(process.cwd(), "nginx", "default.conf");
    }
    getNginxContainerName() {
        return process.env.NGINX_CONTAINER_NAME || "shiply-proxy";
    }
    /**
     * Add a new app route to nginx configuration
     */
    addAppRoute(route) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🌐 Adding nginx route: ${route.subdomain}.shiply.local -> localhost:${route.port}`);
                // Ensure sites directory exists
                yield fs_extra_1.default.ensureDir(this.configPath);
                // Generate app-specific nginx config
                const appConfig = this.generateAppConfig(route);
                const configFile = path_1.default.join(this.configPath, `${route.appName}.conf`);
                // Write config file
                yield fs_extra_1.default.writeFile(configFile, appConfig);
                console.log(`✅ Created nginx config: ${configFile}`);
                // Regenerate main nginx config
                yield this.regenerateMainConfig();
                // Reload nginx
                yield this.reloadNginx();
                console.log(`🚀 App accessible at: http://${route.subdomain}.shiply.local`);
            }
            catch (error) {
                console.error("❌ Failed to add nginx route:", error.message);
                throw error;
            }
        });
    }
    /**
     * Remove an app route from nginx configuration
     */
    removeAppRoute(appName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🗑️ Removing nginx route for app: ${appName}`);
                const configFile = path_1.default.join(this.configPath, `${appName}.conf`);
                if (yield fs_extra_1.default.pathExists(configFile)) {
                    yield fs_extra_1.default.remove(configFile);
                    console.log(`✅ Removed nginx config: ${configFile}`);
                }
                // Regenerate main nginx config
                yield this.regenerateMainConfig();
                // Reload nginx
                yield this.reloadNginx();
            }
            catch (error) {
                console.error("❌ Failed to remove nginx route:", error.message);
                throw error;
            }
        });
    }
    /**
     * Generate nginx configuration for a specific app
     */
    generateAppConfig(route) {
        return `# ${route.appName} - Auto-generated configuration
server {
    listen 80;
    server_name ${route.subdomain}.shiply.local;
    
    # Add custom headers for debugging
    add_header X-Shiply-App "${route.appName}" always;
    add_header X-Shiply-Container "${route.containerName}" always;
    
    location / {
        proxy_pass http://${route.containerName}:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Handle WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
`;
    }
    /**
     * Regenerate the main nginx configuration by combining base config with app configs
     */
    regenerateMainConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Read base configuration
                const baseConfig = yield fs_extra_1.default.readFile(this.baseConfigPath, "utf8");
                // Read all app configurations
                const sitesDir = this.configPath;
                const appConfigs = [];
                if (yield fs_extra_1.default.pathExists(sitesDir)) {
                    const configFiles = yield fs_extra_1.default.readdir(sitesDir);
                    for (const file of configFiles) {
                        if (file.endsWith(".conf")) {
                            const configContent = yield fs_extra_1.default.readFile(path_1.default.join(sitesDir, file), "utf8");
                            appConfigs.push(configContent);
                        }
                    }
                }
                // Combine configurations
                const fullConfig = baseConfig + "\n\n" + appConfigs.join("\n\n");
                // Write updated configuration
                const outputPath = path_1.default.join(process.cwd(), "nginx", "full.conf");
                yield fs_extra_1.default.writeFile(outputPath, fullConfig);
                console.log(`📝 Updated nginx configuration: ${outputPath}`);
            }
            catch (error) {
                console.error("❌ Failed to regenerate nginx config:", error.message);
                throw error;
            }
        });
    }
    /**
     * Reload nginx configuration
     */
    reloadNginx() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Update the docker container with new config
                const fullConfigPath = path_1.default.join(process.cwd(), "nginx", "full.conf");
                console.log("🔄 Reloading nginx configuration...");
                // Copy new config to container and reload
                const nginxContainer = this.getNginxContainerName();
                yield execAsync(`docker exec ${nginxContainer} nginx -s reload`);
                console.log("✅ Nginx configuration reloaded");
            }
            catch (error) {
                console.error("⚠️ Failed to reload nginx, attempting to restart container...", error.message);
                try {
                    const nginxContainer = this.getNginxContainerName();
                    // Try a safe restart of the existing container (compose-managed)
                    yield execAsync(`docker restart ${nginxContainer}`);
                    console.log("✅ Nginx container restarted with new configuration");
                }
                catch (restartError) {
                    console.error("❌ Failed to restart nginx:", restartError.message);
                    throw restartError;
                }
            }
        });
    }
    /**
     * Add host entry for local development
     */
    addHostEntry(subdomain) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔗 Host entry needed: ${subdomain}.shiply.local`);
                console.log(`📝 Add to C:\\Windows\\System32\\drivers\\etc\\hosts:`);
                console.log(`   127.0.0.1 ${subdomain}.shiply.local`);
            }
            catch (error) {
                console.error("❌ Failed to add host entry:", error.message);
            }
        });
    }
    /**
     * List all configured app routes
     */
    listRoutes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const routes = [];
                const sitesDir = this.configPath;
                if (yield fs_extra_1.default.pathExists(sitesDir)) {
                    const configFiles = yield fs_extra_1.default.readdir(sitesDir);
                    for (const file of configFiles) {
                        if (file.endsWith(".conf")) {
                            const appName = file.replace(".conf", "");
                            const configContent = yield fs_extra_1.default.readFile(path_1.default.join(sitesDir, file), "utf8");
                            // Parse config to extract details (simplified)
                            const serverNameMatch = configContent.match(/server_name\s+(\S+)\.shiply\.local/);
                            const proxyPassMatch = configContent.match(/proxy_pass\s+http:\/\/host\.docker\.internal:(\d+)/);
                            const containerMatch = configContent.match(/X-Shiply-Container\s+"([^"]+)"/);
                            if (serverNameMatch && proxyPassMatch) {
                                routes.push({
                                    appName,
                                    subdomain: serverNameMatch[1],
                                    port: parseInt(proxyPassMatch[1]),
                                    containerName: containerMatch ? containerMatch[1] : "",
                                });
                            }
                        }
                    }
                }
                return routes;
            }
            catch (error) {
                console.error("❌ Failed to list routes:", error.message);
                return [];
            }
        });
    }
}
exports.NginxConfigManager = NginxConfigManager;
