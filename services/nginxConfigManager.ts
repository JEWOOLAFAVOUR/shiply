import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface AppRoute {
  appName: string;
  subdomain: string;
  port: number;
  containerName: string;
}

export class NginxConfigManager {
  private configPath: string;
  private baseConfigPath: string;
  
  /**
   * Name of the nginx container to control. Can be overridden with env var NGINX_CONTAINER_NAME
   */
  private getNginxContainerName(): string {
    return process.env.NGINX_CONTAINER_NAME || "shiply-proxy";
  }

  constructor() {
    this.configPath = path.join(process.cwd(), "nginx", "sites");
    this.baseConfigPath = path.join(process.cwd(), "nginx", "default.conf");
  }

  /**
   * Add a new app route to nginx configuration
   */
  async addAppRoute(route: AppRoute): Promise<void> {
    try {
      console.log(
        `🌐 Adding nginx route: ${route.subdomain}.shiply.local -> localhost:${route.port}`
      );

      // Ensure sites directory exists
      await fs.ensureDir(this.configPath);

      // Generate app-specific nginx config
      const appConfig = this.generateAppConfig(route);
      const configFile = path.join(this.configPath, `${route.appName}.conf`);

      // Write config file
      await fs.writeFile(configFile, appConfig);
      console.log(`✅ Created nginx config: ${configFile}`);

      // Regenerate main nginx config
      await this.regenerateMainConfig();

      // Reload nginx
      await this.reloadNginx();

      console.log(
        `🚀 App accessible at: http://${route.subdomain}.shiply.local`
      );
    } catch (error: any) {
      console.error("❌ Failed to add nginx route:", error.message);
      throw error;
    }
  }

  /**
   * Remove an app route from nginx configuration
   */
  async removeAppRoute(appName: string): Promise<void> {
    try {
      console.log(`🗑️ Removing nginx route for app: ${appName}`);

      const configFile = path.join(this.configPath, `${appName}.conf`);

      if (await fs.pathExists(configFile)) {
        await fs.remove(configFile);
        console.log(`✅ Removed nginx config: ${configFile}`);
      }

      // Regenerate main nginx config
      await this.regenerateMainConfig();

      // Reload nginx
      await this.reloadNginx();
    } catch (error: any) {
      console.error("❌ Failed to remove nginx route:", error.message);
      throw error;
    }
  }

  /**
   * Generate nginx configuration for a specific app
   */
  private generateAppConfig(route: AppRoute): string {
    return `# ${route.appName} - Auto-generated configuration
server {
    listen 80;
    server_name ${route.subdomain}.shiply.local;
    
    # Add custom headers for debugging
    add_header X-Shiply-App "${route.appName}" always;
    add_header X-Shiply-Container "${route.containerName}" always;
    
    location / {
        proxy_pass http://host.docker.internal:${route.port};
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
  private async regenerateMainConfig(): Promise<void> {
    try {
      // Read base configuration
      const baseConfig = await fs.readFile(this.baseConfigPath, "utf8");

      // Read all app configurations
      const sitesDir = this.configPath;
      const appConfigs: string[] = [];

      if (await fs.pathExists(sitesDir)) {
        const configFiles = await fs.readdir(sitesDir);

        for (const file of configFiles) {
          if (file.endsWith(".conf")) {
            const configContent = await fs.readFile(
              path.join(sitesDir, file),
              "utf8"
            );
            appConfigs.push(configContent);
          }
        }
      }

      // Combine configurations
      const fullConfig = baseConfig + "\n\n" + appConfigs.join("\n\n");

      // Write updated configuration
      const outputPath = path.join(process.cwd(), "nginx", "full.conf");
      await fs.writeFile(outputPath, fullConfig);

      console.log(`📝 Updated nginx configuration: ${outputPath}`);
    } catch (error: any) {
      console.error("❌ Failed to regenerate nginx config:", error.message);
      throw error;
    }
  }

  /**
   * Reload nginx configuration
   */
  private async reloadNginx(): Promise<void> {
    try {
      // Update the docker container with new config
      const fullConfigPath = path.join(process.cwd(), "nginx", "full.conf");

      console.log("🔄 Reloading nginx configuration...");

  // Copy new config to container and reload
  const nginxContainer = this.getNginxContainerName();
  await execAsync(`docker exec ${nginxContainer} nginx -s reload`);

      console.log("✅ Nginx configuration reloaded");
    } catch (error: any) {
      console.error(
        "⚠️ Failed to reload nginx, attempting to restart container...",
        error.message
      );

      try {
        const nginxContainer = this.getNginxContainerName();
        // Try a safe restart of the existing container (compose-managed)
        await execAsync(`docker restart ${nginxContainer}`);
        console.log("✅ Nginx container restarted with new configuration");
      } catch (restartError: any) {
        console.error("❌ Failed to restart nginx:", restartError.message);
        throw restartError;
      }
    }
  }

  /**
   * Add host entry for local development
   */
  async addHostEntry(subdomain: string): Promise<void> {
    try {
      console.log(`🔗 Host entry needed: ${subdomain}.shiply.local`);
      console.log(`📝 Add to C:\\Windows\\System32\\drivers\\etc\\hosts:`);
      console.log(`   127.0.0.1 ${subdomain}.shiply.local`);
    } catch (error: any) {
      console.error("❌ Failed to add host entry:", error.message);
    }
  }

  /**
   * List all configured app routes
   */
  async listRoutes(): Promise<AppRoute[]> {
    try {
      const routes: AppRoute[] = [];
      const sitesDir = this.configPath;

      if (await fs.pathExists(sitesDir)) {
        const configFiles = await fs.readdir(sitesDir);

        for (const file of configFiles) {
          if (file.endsWith(".conf")) {
            const appName = file.replace(".conf", "");
            const configContent = await fs.readFile(
              path.join(sitesDir, file),
              "utf8"
            );

            // Parse config to extract details (simplified)
            const serverNameMatch = configContent.match(
              /server_name\s+(\S+)\.shiply\.local/
            );
            const proxyPassMatch = configContent.match(
              /proxy_pass\s+http:\/\/host\.docker\.internal:(\d+)/
            );
            const containerMatch = configContent.match(
              /X-Shiply-Container\s+"([^"]+)"/
            );

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
    } catch (error: any) {
      console.error("❌ Failed to list routes:", error.message);
      return [];
    }
  }
}
