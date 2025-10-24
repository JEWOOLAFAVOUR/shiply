import Docker from "dockerode";
import { EventEmitter } from "events";

export interface ContainerConfig {
  imageId: string;
  imageName: string;
  containerName: string;
  port: number;
  envVars?: Record<string, string>;
  memoryLimit?: number; // in MB
  cpuLimit?: number; // CPU shares
}

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  state: string;
  ports: Docker.Port[];
  created: Date;
  image: string;
  uptime?: string;
}

export interface ContainerStats {
  cpuPercentage: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercentage: number;
  networkRx: number;
  networkTx: number;
}

export class ContainerManager extends EventEmitter {
  private docker: Docker;
  private containers: Map<string, Docker.Container> = new Map();

  constructor() {
    super();
    this.docker = new Docker();
  }

  /**
   * Deploy a container from built image
   */
  async deployContainer(config: ContainerConfig): Promise<ContainerInfo> {
    try {
      // Check if container with same name exists and remove it
      await this.removeContainerByName(config.containerName);

      // Create container configuration
      const containerConfig: Docker.ContainerCreateOptions = {
        Image: config.imageName,
        name: config.containerName,
        ExposedPorts: {
          [`${config.port}/tcp`]: {},
        },
        HostConfig: {
          PortBindings: {
            [`${config.port}/tcp`]: [{ HostPort: "0" }], // Let Docker assign a random host port
          },
          Memory: config.memoryLimit
            ? config.memoryLimit * 1024 * 1024
            : 512 * 1024 * 1024, // Default 512MB
          CpuShares: config.cpuLimit || 1024, // Default CPU shares
          RestartPolicy: {
            Name: "unless-stopped",
          },
        },
        Env: config.envVars
          ? Object.entries(config.envVars).map(
              ([key, value]) => `${key}=${value}`
            )
          : [],
        Labels: {
          "shiply.project": "true",
          "shiply.container-name": config.containerName,
        },
      };

      // Create container
      const container = await this.docker.createContainer(containerConfig);
      this.containers.set(config.containerName, container);

      // Start container
      await container.start();

      // Get container info
      const containerInfo = await this.getContainerInfo(config.containerName);

      this.emit("containerDeployed", containerInfo);

      return containerInfo;
    } catch (error: any) {
      this.emit("containerError", {
        containerName: config.containerName,
        error: error.message,
      });
      throw new Error(`Failed to deploy container: ${error.message}`);
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(containerName: string): Promise<boolean> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) {
        return false;
      }

      await container.stop();
      this.emit("containerStopped", containerName);
      return true;
    } catch (error: any) {
      this.emit("containerError", { containerName, error: error.message });
      return false;
    }
  }

  /**
   * Start a stopped container
   */
  async startContainer(containerName: string): Promise<boolean> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) {
        return false;
      }

      await container.start();
      this.emit("containerStarted", containerName);
      return true;
    } catch (error: any) {
      this.emit("containerError", { containerName, error: error.message });
      return false;
    }
  }

  /**
   * Restart a container
   */
  async restartContainer(containerName: string): Promise<boolean> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) {
        return false;
      }

      await container.restart();
      this.emit("containerRestarted", containerName);
      return true;
    } catch (error: any) {
      this.emit("containerError", { containerName, error: error.message });
      return false;
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(containerName: string): Promise<boolean> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) {
        return false;
      }

      // Stop container first if running
      try {
        await container.stop();
      } catch (stopError) {
        // Container might already be stopped
      }

      // Remove container
      await container.remove({ force: true });
      this.containers.delete(containerName);

      this.emit("containerRemoved", containerName);
      return true;
    } catch (error: any) {
      this.emit("containerError", { containerName, error: error.message });
      return false;
    }
  }

  /**
   * Get container information
   */
  async getContainerInfo(containerName: string): Promise<ContainerInfo> {
    const container = await this.getContainer(containerName);
    if (!container) {
      throw new Error(`Container ${containerName} not found`);
    }

    const inspect = await container.inspect();

    return {
      id: inspect.Id,
      name: inspect.Name.replace("/", ""), // Remove leading slash
      status: inspect.State.Status,
      state: inspect.State.Running ? "running" : "stopped",
      ports: inspect.NetworkSettings.Ports
        ? Object.entries(inspect.NetworkSettings.Ports).map(([key, value]) => ({
            PrivatePort: parseInt(key.split("/")[0]),
            PublicPort: value && value[0] ? parseInt(value[0].HostPort) : 0,
            Type: key.split("/")[1] as "tcp" | "udp",
            IP: value && value[0] ? value[0].HostIp || "0.0.0.0" : "0.0.0.0",
          }))
        : [],
      created: new Date(inspect.Created),
      image: inspect.Config.Image,
      uptime: inspect.State.StartedAt
        ? this.calculateUptime(new Date(inspect.State.StartedAt))
        : undefined,
    };
  }

  /**
   * Get container logs
   */
  async getContainerLogs(
    containerName: string,
    tail: number = 100
  ): Promise<string[]> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) {
        return [];
      }

      const logs = await container.logs({
        stdout: true,
        stderr: true,
        timestamps: true,
        tail: tail,
      });

      // Parse logs (Docker logs come with 8-byte headers)
      const logString = logs.toString();
      const lines = logString.split("\n").filter(Boolean);

      return lines.map((line) => {
        // Remove Docker log headers (first 8 bytes)
        if (line.length > 8) {
          return line.substring(8);
        }
        return line;
      });
    } catch (error: any) {
      return [`Error fetching logs: ${error.message}`];
    }
  }

  /**
   * Get container statistics
   */
  async getContainerStats(
    containerName: string
  ): Promise<ContainerStats | null> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) {
        return null;
      }

      const stats = await container.stats({ stream: false });

      // Calculate CPU percentage
      const cpuPercent = this.calculateCpuPercent(stats);

      // Calculate memory usage
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 0;
      const memoryPercent =
        memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

      // Calculate network I/O
      const networks = stats.networks || {};
      let networkRx = 0;
      let networkTx = 0;

      Object.values(networks).forEach((network: any) => {
        networkRx += network.rx_bytes || 0;
        networkTx += network.tx_bytes || 0;
      });

      return {
        cpuPercentage: cpuPercent,
        memoryUsage: Math.round(memoryUsage / 1024 / 1024), // Convert to MB
        memoryLimit: Math.round(memoryLimit / 1024 / 1024), // Convert to MB
        memoryPercentage: Math.round(memoryPercent * 100) / 100,
        networkRx: Math.round(networkRx / 1024 / 1024), // Convert to MB
        networkTx: Math.round(networkTx / 1024 / 1024), // Convert to MB
      };
    } catch (error: any) {
      console.error("Error getting container stats:", error);
      return null;
    }
  }

  /**
   * List all Shiply containers
   */
  async listShiplyContainers(): Promise<ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ["shiply.project=true"],
        },
      });

      const containerInfos: ContainerInfo[] = [];

      for (const containerData of containers) {
        const containerName = containerData.Names[0].replace("/", "");
        try {
          const info = await this.getContainerInfo(containerName);
          containerInfos.push(info);
        } catch (error) {
          // Skip containers that can't be inspected
          console.warn(
            `Could not get info for container ${containerName}:`,
            error
          );
        }
      }

      return containerInfos;
    } catch (error: any) {
      console.error("Error listing containers:", error);
      return [];
    }
  }

  /**
   * Health check for a container
   */
  async healthCheck(containerName: string): Promise<boolean> {
    try {
      const container = await this.getContainer(containerName);
      if (!container) {
        return false;
      }

      const inspect = await container.inspect();
      return inspect.State.Running;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get container by name
   */
  private async getContainer(
    containerName: string
  ): Promise<Docker.Container | null> {
    try {
      // Try to get from cache first
      if (this.containers.has(containerName)) {
        return this.containers.get(containerName)!;
      }

      // Search for container by name
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          name: [containerName],
        },
      });

      if (containers.length === 0) {
        return null;
      }

      const container = this.docker.getContainer(containers[0].Id);
      this.containers.set(containerName, container);
      return container;
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove container by name if exists
   */
  private async removeContainerByName(containerName: string): Promise<void> {
    try {
      const existingContainer = await this.getContainer(containerName);
      if (existingContainer) {
        try {
          await existingContainer.stop();
        } catch (stopError) {
          // Ignore if already stopped
        }
        await existingContainer.remove({ force: true });
        this.containers.delete(containerName);
      }
    } catch (error) {
      // Ignore errors when removing non-existent containers
    }
  }

  /**
   * Calculate CPU percentage from Docker stats
   */
  private calculateCpuPercent(stats: any): number {
    let cpuPercent = 0.0;

    const cpuUsage = stats.cpu_stats.cpu_usage.total_usage;
    const prevCpuUsage = stats.precpu_stats.cpu_usage.total_usage;
    const systemUsage = stats.cpu_stats.system_cpu_usage;
    const prevSystemUsage = stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus;

    if (systemUsage > prevSystemUsage && cpuUsage > prevCpuUsage) {
      cpuPercent =
        ((cpuUsage - prevCpuUsage) / (systemUsage - prevSystemUsage)) *
        cpuCount *
        100.0;
    }

    return Math.round(cpuPercent * 100) / 100;
  }

  /**
   * Calculate uptime from start date
   */
  private calculateUptime(startDate: Date): string {
    const now = new Date();
    const uptimeMs = now.getTime() - startDate.getTime();

    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}
