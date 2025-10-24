import Docker from "dockerode";
import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import { Readable } from "stream";
import { DockerfileGenerator, FrameworkConfig } from "./dockerBuilder";

export interface BuildOptions {
  projectId: string;
  userId: string;
  projectPath: string;
  imageName: string;
  imageTag?: string;
}

export interface BuildResult {
  success: boolean;
  imageId?: string;
  imageName: string;
  buildLogs: string[];
  error?: string;
}

export class DockerBuildService {
  private docker: Docker;

  constructor() {
    // Initialize Docker connection
    this.docker = new Docker();
  }

  /**
   * Build Docker image from project
   */
  async buildProject(options: BuildOptions): Promise<BuildResult> {
    const buildLogs: string[] = [];

    try {
      buildLogs.push(`🚀 Starting build for project: ${options.projectId}`);

      // Step 0: Check Docker connection
      console.log("🔍 Checking Docker connection...");
      const dockerAvailable = await this.checkDockerConnection();
      if (!dockerAvailable) {
        throw new Error(
          "Docker is not available. Please ensure Docker Desktop is running."
        );
      }
      console.log("✅ Docker connection successful");
      buildLogs.push(`🐳 Docker connection verified`);

      // Step 1: Detect framework and generate Dockerfile
      console.log("🔍 Detecting framework...");
      const framework = await DockerfileGenerator.detectFramework(
        options.projectPath
      );
      console.log("📦 Framework detected:", framework.name);
      buildLogs.push(`📦 Detected framework: ${framework.name}`);

      // Step 2: Generate necessary files
      console.log("📝 Generating Docker files...");
      await this.generateDockerFiles(options.projectPath, framework);
      console.log("✅ Docker files generated");
      buildLogs.push(`📝 Generated Docker configuration files`);

      // Step 3: Create build context (tar archive)
      console.log("📚 Creating build context...");
      const buildContext = await this.createBuildContext(options.projectPath);
      console.log("✅ Build context created");
      buildLogs.push(`📚 Created build context`);

      // Step 4: Build Docker image
      const imageName = `${options.imageName}:${options.imageTag || "latest"}`;
      console.log("🔨 Starting Docker image build:", imageName);
      buildLogs.push(`🔨 Building Docker image: ${imageName}`);

      const buildResult = await this.buildDockerImage(
        buildContext,
        imageName,
        buildLogs
      );

      if (buildResult.success) {
        console.log("✅ Docker build completed successfully!");
        buildLogs.push(`✅ Build completed successfully`);
        buildLogs.push(`🏷️  Image ID: ${buildResult.imageId}`);
      } else {
        console.error("❌ Docker build failed:", buildResult.error);
      }

      return {
        success: buildResult.success,
        imageId: buildResult.imageId,
        imageName: imageName,
        buildLogs: buildLogs,
        error: buildResult.error,
      };
    } catch (error: any) {
      console.error("❌ Build process failed:", error);
      buildLogs.push(`❌ Build failed: ${error.message}`);
      return {
        success: false,
        imageName: `${options.imageName}:${options.imageTag || "latest"}`,
        buildLogs: buildLogs,
        error: error.message,
      };
    }
  }

  /**
   * Generate Docker-related files
   */
  private async generateDockerFiles(
    projectPath: string,
    framework: FrameworkConfig
  ): Promise<void> {
    const dockerDir = path.join(projectPath, "docker");
    await fs.ensureDir(dockerDir);

    // Generate Dockerfile
    const dockerfile = DockerfileGenerator.generateDockerfile(framework);
    await fs.writeFile(path.join(projectPath, "Dockerfile"), dockerfile);

    // Generate .dockerignore
    const dockerignore = DockerfileGenerator.generateDockerignore();
    await fs.writeFile(path.join(projectPath, ".dockerignore"), dockerignore);

    // Generate nginx config for static sites
    if (
      ["react-cra", "react-vite", "vue-cli", "vue-vite", "static"].includes(
        framework.name
      )
    ) {
      const nginxConfig = DockerfileGenerator.generateNginxConfig();
      await fs.writeFile(path.join(dockerDir, "nginx.conf"), nginxConfig);
    }
  }

  /**
   * Create build context as a tar stream
   */
  private async createBuildContext(projectPath: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      const archive = archiver("tar", {
        gzip: false,
      });

      const stream = new Readable();
      stream._read = () => {};

      archive.on("data", (chunk) => {
        stream.push(chunk);
      });

      archive.on("end", () => {
        stream.push(null);
      });

      archive.on("error", (err) => {
        reject(err);
      });

      // Add all files except those in .dockerignore
      archive.directory(projectPath, false);
      archive.finalize();

      resolve(stream);
    });
  }

  /**
   * Build Docker image using Docker API
   */
  private async buildDockerImage(
    buildContext: Readable,
    imageName: string,
    buildLogs: string[]
  ): Promise<{ success: boolean; imageId?: string; error?: string }> {
    return new Promise((resolve) => {
      console.log("🐳 Starting Docker build process...");
      console.log("Image name:", imageName);

      // Set a timeout for the build process (5 minutes)
      const buildTimeout = setTimeout(() => {
        console.error("❌ Docker build timeout after 5 minutes");
        buildLogs.push("❌ Build timeout after 5 minutes");
        resolve({ success: false, error: "Build timeout after 5 minutes" });
      }, 5 * 60 * 1000); // 5 minutes

      this.docker.buildImage(
        buildContext,
        {
          t: imageName,
          dockerfile: "Dockerfile",
          rm: true, // Remove intermediate containers
          forcerm: true, // Always remove intermediate containers
          pull: false, // Don't pull base image unless necessary (much faster!)
          nocache: false, // Use build cache for faster builds
        },
        (err, stream) => {
          if (err) {
            console.error("❌ Docker build error:", err);
            buildLogs.push(`❌ Docker build error: ${err.message}`);
            return resolve({ success: false, error: err.message });
          }

          if (!stream) {
            console.error("❌ No build stream received from Docker");
            buildLogs.push("❌ No build stream received from Docker");
            return resolve({
              success: false,
              error: "No build stream received",
            });
          }

          let imageId: string | undefined;
          let buildCompleted = false;

          console.log("📜 Monitoring Docker build stream...");

          // Parse build output
          stream.on("data", (chunk) => {
            const chunkStr = chunk.toString();
            console.log("📝 Docker build chunk:", chunkStr);

            const lines = chunkStr.split("\n").filter(Boolean);

            for (const line of lines) {
              try {
                const data = JSON.parse(line);

                if (data.stream) {
                  const logMsg = data.stream.trim();
                  console.log("🐳 Docker:", logMsg);
                  buildLogs.push(logMsg);
                }

                if (data.aux && data.aux.ID) {
                  imageId = data.aux.ID;
                  console.log("🏷️  Image ID received:", imageId);
                }

                if (data.error) {
                  console.error("❌ Docker build error in stream:", data.error);
                  buildLogs.push(`❌ ${data.error}`);
                  return resolve({ success: false, error: data.error });
                }

                if (data.stream && data.stream.includes("Successfully built")) {
                  buildCompleted = true;
                  console.log("✅ Docker build completed successfully");
                }
              } catch (parseErr) {
                console.log("⚠️  Failed to parse JSON line:", line);
                // Still add raw line to logs
                buildLogs.push(line);
              }
            }
          });

          stream.on("end", () => {
            clearTimeout(buildTimeout); // Clear the timeout
            console.log("📜 Docker build stream ended");
            console.log("Build completed:", buildCompleted);
            console.log("Image ID:", imageId);

            if (imageId || buildCompleted) {
              console.log("✅ Build successful with image ID:", imageId);
              resolve({ success: true, imageId });
            } else {
              console.error("❌ Build completed but no image ID received");
              resolve({
                success: false,
                error: "Build completed but no image ID received",
              });
            }
          });

          stream.on("error", (streamErr) => {
            clearTimeout(buildTimeout); // Clear the timeout
            console.error("❌ Docker stream error:", streamErr);
            buildLogs.push(`❌ Stream error: ${streamErr.message}`);
            resolve({ success: false, error: streamErr.message });
          });
        }
      );
    });
  }

  /**
   * List Docker images
   */
  async listImages(): Promise<Docker.ImageInfo[]> {
    return await this.docker.listImages();
  }

  /**
   * Remove Docker image
   */
  async removeImage(imageId: string): Promise<boolean> {
    try {
      const image = this.docker.getImage(imageId);
      await image.remove({ force: true });
      return true;
    } catch (error) {
      console.error("Error removing image:", error);
      return false;
    }
  }

  /**
   * Get image details
   */
  async inspectImage(imageId: string): Promise<Docker.ImageInspectInfo | null> {
    try {
      const image = this.docker.getImage(imageId);
      return await image.inspect();
    } catch (error) {
      console.error("Error inspecting image:", error);
      return null;
    }
  }

  /**
   * Check if Docker is available
   */
  async checkDockerConnection(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error("Docker connection failed:", error);
      return false;
    }
  }
}
