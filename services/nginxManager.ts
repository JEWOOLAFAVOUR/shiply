import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class NginxManager {
  private nginxConfDir = path.join(process.cwd(), "nginx", "conf.d");
  private nginxContainer = "shiply-proxy";

  /**
   * Add a new app route to Nginx
   */
  async addAppRoute(subdomain: string, targetPort: number): Promise<void> {
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

    const configFile = path.join(this.nginxConfDir, `${subdomain}.conf`);
    await fs.writeFile(configFile, configContent);

    console.log(
      `✅ Created Nginx config for ${subdomain}.shiply.local → localhost:${targetPort}`
    );

    // Reload Nginx
    await this.reloadNginx();
  }

  /**
   * Remove app route from Nginx
   */
  async removeAppRoute(subdomain: string): Promise<void> {
    const configFile = path.join(this.nginxConfDir, `${subdomain}.conf`);

    if (await fs.pathExists(configFile)) {
      await fs.remove(configFile);
      console.log(`🗑️  Removed Nginx config for ${subdomain}.shiply.local`);

      // Reload Nginx
      await this.reloadNginx();
    }
  }

  /**
   * Reload Nginx configuration
   */
  private async reloadNginx(): Promise<void> {
    try {
      await execAsync(`docker exec ${this.nginxContainer} nginx -s reload`);
      console.log("🔄 Nginx configuration reloaded");
    } catch (error) {
      console.error("❌ Failed to reload Nginx:", error);
    }
  }

  /**
   * Start Nginx proxy
   */
  async startProxy(): Promise<void> {
    try {
      // Ensure conf.d directory exists
      await fs.ensureDir(this.nginxConfDir);

      // Check if already running
      try {
        await execAsync(`docker inspect ${this.nginxContainer}`);
        console.log("✅ Nginx proxy already running");
        return;
      } catch {
        // Container doesn't exist, will start with docker-compose
      }

      // Start with docker-compose
      await execAsync("docker-compose up -d nginx-proxy");
      console.log("🚀 Started Nginx reverse proxy");

      // Wait a moment for startup
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("❌ Failed to start Nginx proxy:", error);
      throw error;
    }
  }

  /**
   * Stop Nginx proxy
   */
  async stopProxy(): Promise<void> {
    try {
      await execAsync("docker-compose down nginx-proxy");
      console.log("🛑 Stopped Nginx reverse proxy");
    } catch (error) {
      console.error("❌ Failed to stop Nginx proxy:", error);
    }
  }

  /**
   * Generate app URL
   */
  generateAppUrl(projectName: string): string {
    const subdomain = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return `http://${subdomain}.shiply.local`;
  }
}
