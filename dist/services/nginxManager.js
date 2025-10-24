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
exports.NginxManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class NginxManager {
    constructor() {
        this.nginxConfDir = path_1.default.join(process.cwd(), "nginx", "conf.d");
        this.nginxContainer = "shiply-proxy";
    }
    /**
     * Add a new app route to Nginx
     */
    addAppRoute(subdomain, targetPort) {
        return __awaiter(this, void 0, void 0, function* () {
            const configContent = `
server {
    listen 80;
    server_name ${subdomain}.shiply.local;
    
    location / {
        proxy_pass http://host.docker.internal:${targetPort};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Enable WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://host.docker.internal:${targetPort}/health;
        proxy_set_header Host $host;
    }
}
`;
            const configFile = path_1.default.join(this.nginxConfDir, `${subdomain}.conf`);
            yield fs_extra_1.default.writeFile(configFile, configContent);
            console.log(`✅ Created Nginx config for ${subdomain}.shiply.local → localhost:${targetPort}`);
            // Reload Nginx
            yield this.reloadNginx();
        });
    }
    /**
     * Remove app route from Nginx
     */
    removeAppRoute(subdomain) {
        return __awaiter(this, void 0, void 0, function* () {
            const configFile = path_1.default.join(this.nginxConfDir, `${subdomain}.conf`);
            if (yield fs_extra_1.default.pathExists(configFile)) {
                yield fs_extra_1.default.remove(configFile);
                console.log(`🗑️  Removed Nginx config for ${subdomain}.shiply.local`);
                // Reload Nginx
                yield this.reloadNginx();
            }
        });
    }
    /**
     * Reload Nginx configuration
     */
    reloadNginx() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield execAsync(`docker exec ${this.nginxContainer} nginx -s reload`);
                console.log("🔄 Nginx configuration reloaded");
            }
            catch (error) {
                console.error("❌ Failed to reload Nginx:", error);
            }
        });
    }
    /**
     * Start Nginx proxy
     */
    startProxy() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure conf.d directory exists
                yield fs_extra_1.default.ensureDir(this.nginxConfDir);
                // Check if already running
                try {
                    yield execAsync(`docker inspect ${this.nginxContainer}`);
                    console.log("✅ Nginx proxy already running");
                    return;
                }
                catch (_a) {
                    // Container doesn't exist, will start with docker-compose
                }
                // Start with docker-compose
                yield execAsync("docker-compose up -d nginx-proxy");
                console.log("🚀 Started Nginx reverse proxy");
                // Wait a moment for startup
                yield new Promise((resolve) => setTimeout(resolve, 2000));
            }
            catch (error) {
                console.error("❌ Failed to start Nginx proxy:", error);
                throw error;
            }
        });
    }
    /**
     * Stop Nginx proxy
     */
    stopProxy() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield execAsync("docker-compose down nginx-proxy");
                console.log("🛑 Stopped Nginx reverse proxy");
            }
            catch (error) {
                console.error("❌ Failed to stop Nginx proxy:", error);
            }
        });
    }
    /**
     * Generate app URL
     */
    generateAppUrl(projectName) {
        const subdomain = projectName
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        return `http://${subdomain}.shiply.local`;
    }
}
exports.NginxManager = NginxManager;
