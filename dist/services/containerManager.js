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
exports.ContainerManager = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
const events_1 = require("events");
class ContainerManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.containers = new Map();
        this.docker = new dockerode_1.default();
    }
    /**
     * Deploy a container from built image
     */
    deployContainer(config) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if container with same name exists and remove it
                yield this.removeContainerByName(config.containerName);
                // Create container configuration
                const containerConfig = {
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
                        ? Object.entries(config.envVars).map(([key, value]) => `${key}=${value}`)
                        : [],
                    Labels: {
                        "shiply.project": "true",
                        "shiply.container-name": config.containerName,
                    },
                };
                // Create container
                const container = yield this.docker.createContainer(containerConfig);
                this.containers.set(config.containerName, container);
                // Start container
                yield container.start();
                // Get container info
                const containerInfo = yield this.getContainerInfo(config.containerName);
                this.emit("containerDeployed", containerInfo);
                return containerInfo;
            }
            catch (error) {
                this.emit("containerError", {
                    containerName: config.containerName,
                    error: error.message,
                });
                throw new Error(`Failed to deploy container: ${error.message}`);
            }
        });
    }
    /**
     * Stop a container
     */
    stopContainer(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = yield this.getContainer(containerName);
                if (!container) {
                    return false;
                }
                yield container.stop();
                this.emit("containerStopped", containerName);
                return true;
            }
            catch (error) {
                this.emit("containerError", { containerName, error: error.message });
                return false;
            }
        });
    }
    /**
     * Start a stopped container
     */
    startContainer(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = yield this.getContainer(containerName);
                if (!container) {
                    return false;
                }
                yield container.start();
                this.emit("containerStarted", containerName);
                return true;
            }
            catch (error) {
                this.emit("containerError", { containerName, error: error.message });
                return false;
            }
        });
    }
    /**
     * Restart a container
     */
    restartContainer(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = yield this.getContainer(containerName);
                if (!container) {
                    return false;
                }
                yield container.restart();
                this.emit("containerRestarted", containerName);
                return true;
            }
            catch (error) {
                this.emit("containerError", { containerName, error: error.message });
                return false;
            }
        });
    }
    /**
     * Remove a container
     */
    removeContainer(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = yield this.getContainer(containerName);
                if (!container) {
                    return false;
                }
                // Stop container first if running
                try {
                    yield container.stop();
                }
                catch (stopError) {
                    // Container might already be stopped
                }
                // Remove container
                yield container.remove({ force: true });
                this.containers.delete(containerName);
                this.emit("containerRemoved", containerName);
                return true;
            }
            catch (error) {
                this.emit("containerError", { containerName, error: error.message });
                return false;
            }
        });
    }
    /**
     * Get container information
     */
    getContainerInfo(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            const container = yield this.getContainer(containerName);
            if (!container) {
                throw new Error(`Container ${containerName} not found`);
            }
            const inspect = yield container.inspect();
            return {
                id: inspect.Id,
                name: inspect.Name.replace("/", ""), // Remove leading slash
                status: inspect.State.Status,
                state: inspect.State.Running ? "running" : "stopped",
                ports: inspect.NetworkSettings.Ports
                    ? Object.entries(inspect.NetworkSettings.Ports).map(([key, value]) => ({
                        PrivatePort: parseInt(key.split("/")[0]),
                        PublicPort: value && value[0] ? parseInt(value[0].HostPort) : 0,
                        Type: key.split("/")[1],
                        IP: value && value[0] ? value[0].HostIp || "0.0.0.0" : "0.0.0.0",
                    }))
                    : [],
                created: new Date(inspect.Created),
                image: inspect.Config.Image,
                uptime: inspect.State.StartedAt
                    ? this.calculateUptime(new Date(inspect.State.StartedAt))
                    : undefined,
            };
        });
    }
    /**
     * Get container logs
     */
    getContainerLogs(containerName_1) {
        return __awaiter(this, arguments, void 0, function* (containerName, tail = 100) {
            try {
                const container = yield this.getContainer(containerName);
                if (!container) {
                    return [];
                }
                const logs = yield container.logs({
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
            }
            catch (error) {
                return [`Error fetching logs: ${error.message}`];
            }
        });
    }
    /**
     * Get container statistics
     */
    getContainerStats(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = yield this.getContainer(containerName);
                if (!container) {
                    return null;
                }
                const stats = yield container.stats({ stream: false });
                // Calculate CPU percentage
                const cpuPercent = this.calculateCpuPercent(stats);
                // Calculate memory usage
                const memoryUsage = stats.memory_stats.usage || 0;
                const memoryLimit = stats.memory_stats.limit || 0;
                const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;
                // Calculate network I/O
                const networks = stats.networks || {};
                let networkRx = 0;
                let networkTx = 0;
                Object.values(networks).forEach((network) => {
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
            }
            catch (error) {
                console.error("Error getting container stats:", error);
                return null;
            }
        });
    }
    /**
     * List all Shiply containers
     */
    listShiplyContainers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const containers = yield this.docker.listContainers({
                    all: true,
                    filters: {
                        label: ["shiply.project=true"],
                    },
                });
                const containerInfos = [];
                for (const containerData of containers) {
                    const containerName = containerData.Names[0].replace("/", "");
                    try {
                        const info = yield this.getContainerInfo(containerName);
                        containerInfos.push(info);
                    }
                    catch (error) {
                        // Skip containers that can't be inspected
                        console.warn(`Could not get info for container ${containerName}:`, error);
                    }
                }
                return containerInfos;
            }
            catch (error) {
                console.error("Error listing containers:", error);
                return [];
            }
        });
    }
    /**
     * Health check for a container
     */
    healthCheck(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const container = yield this.getContainer(containerName);
                if (!container) {
                    return false;
                }
                const inspect = yield container.inspect();
                return inspect.State.Running;
            }
            catch (error) {
                return false;
            }
        });
    }
    /**
     * Get container by name
     */
    getContainer(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Try to get from cache first
                if (this.containers.has(containerName)) {
                    return this.containers.get(containerName);
                }
                // Search for container by name
                const containers = yield this.docker.listContainers({
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
            }
            catch (error) {
                return null;
            }
        });
    }
    /**
     * Remove container by name if exists
     */
    removeContainerByName(containerName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const existingContainer = yield this.getContainer(containerName);
                if (existingContainer) {
                    try {
                        yield existingContainer.stop();
                    }
                    catch (stopError) {
                        // Ignore if already stopped
                    }
                    yield existingContainer.remove({ force: true });
                    this.containers.delete(containerName);
                }
            }
            catch (error) {
                // Ignore errors when removing non-existent containers
            }
        });
    }
    /**
     * Calculate CPU percentage from Docker stats
     */
    calculateCpuPercent(stats) {
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
    calculateUptime(startDate) {
        const now = new Date();
        const uptimeMs = now.getTime() - startDate.getTime();
        const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        }
        else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        else {
            return `${minutes}m`;
        }
    }
}
exports.ContainerManager = ContainerManager;
