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
exports.DockerfileGenerator = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class DockerfileGenerator {
    /**
     * Detect framework based on package.json and file structure
     */
    static detectFramework(projectPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const packageJsonPath = path_1.default.join(projectPath, "package.json");
            if (!(yield fs_extra_1.default.pathExists(packageJsonPath))) {
                throw new Error("No package.json found in project");
            }
            const packageJson = yield fs_extra_1.default.readJson(packageJsonPath);
            const dependencies = Object.assign(Object.assign({}, packageJson.dependencies), packageJson.devDependencies);
            const scripts = packageJson.scripts || {};
            // Detect React
            if (dependencies.react) {
                // Create React App
                if (dependencies["react-scripts"]) {
                    return {
                        name: "react-cra",
                        buildCommand: "npm run build",
                        startCommand: "serve -s build -l 3000",
                        port: 3000,
                        buildDir: "build",
                        installCommand: "npm ci --only=production",
                        packageManager: "npm",
                    };
                }
                // Vite React
                if (dependencies.vite || dependencies["@vitejs/plugin-react"]) {
                    return {
                        name: "react-vite",
                        buildCommand: "npm run build",
                        startCommand: "serve -s dist -l 3000",
                        port: 3000,
                        buildDir: "dist",
                        installCommand: "npm ci --only=production",
                        packageManager: "npm",
                    };
                }
            }
            // Detect Next.js
            if (dependencies.next) {
                return {
                    name: "nextjs",
                    buildCommand: "npm run build",
                    startCommand: "npm start",
                    port: 3000,
                    buildDir: ".next",
                    installCommand: "npm ci --only=production",
                    packageManager: "npm",
                };
            }
            // Detect Vue
            if (dependencies.vue) {
                // Vue CLI
                if (dependencies["@vue/cli-service"]) {
                    return {
                        name: "vue-cli",
                        buildCommand: "npm run build",
                        startCommand: "serve -s dist -l 3000",
                        port: 3000,
                        buildDir: "dist",
                        installCommand: "npm ci --only=production",
                        packageManager: "npm",
                    };
                }
                // Vite Vue
                if (dependencies.vite || dependencies["@vitejs/plugin-vue"]) {
                    return {
                        name: "vue-vite",
                        buildCommand: "npm run build",
                        startCommand: "serve -s dist -l 3000",
                        port: 3000,
                        buildDir: "dist",
                        installCommand: "npm ci --only=production",
                        packageManager: "npm",
                    };
                }
            }
            // Detect Nuxt.js
            if (dependencies.nuxt) {
                return {
                    name: "nuxt",
                    buildCommand: "npm run build",
                    startCommand: "npm start",
                    port: 3000,
                    buildDir: ".nuxt",
                    installCommand: "npm ci --only=production",
                    packageManager: "npm",
                };
            }
            // Detect Express/Node.js
            if (dependencies.express || scripts.start) {
                const port = this.extractPortFromPackageJson(packageJson) || 3000;
                return {
                    name: "nodejs",
                    buildCommand: 'echo "No build step required"',
                    startCommand: scripts.start || "node index.js",
                    port: port,
                    buildDir: "",
                    installCommand: "npm install --only=production", // Use npm install instead of npm ci
                    packageManager: "npm",
                };
            }
            // Default to static site
            return {
                name: "static",
                buildCommand: 'echo "No build step required"',
                startCommand: "serve -s . -l 3000",
                port: 3000,
                buildDir: "",
                installCommand: "npm install && npm install -g serve", // More flexible install
                packageManager: "npm",
            };
        });
    }
    /**
     * Extract port from package.json scripts or common environment variables
     */
    static extractPortFromPackageJson(packageJson) {
        const scripts = packageJson.scripts || {};
        // Look for PORT in start script
        const startScript = scripts.start || "";
        const portMatch = startScript.match(/PORT[=\s]+(\d+)/i);
        if (portMatch) {
            return parseInt(portMatch[1], 10);
        }
        return null;
    }
    /**
     * Generate Dockerfile based on detected framework
     */
    static generateDockerfile(config) {
        switch (config.name) {
            case "react-cra":
            case "react-vite":
            case "vue-cli":
            case "vue-vite":
                return this.generateStaticDockerfile(config);
            case "nextjs":
            case "nuxt":
                return this.generateSSRDockerfile(config);
            case "nodejs":
                return this.generateNodeDockerfile(config);
            case "static":
                return this.generateStaticSiteDockerfile();
            default:
                return this.generateNodeDockerfile(config);
        }
    }
    /**
     * Generate Dockerfile for static React/Vue apps
     */
    static generateStaticDockerfile(config) {
        return `# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN ${config.installCommand}

# Copy source code
COPY . .

# Build the application
RUN ${config.buildCommand}

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/${config.buildDir} /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
`;
    }
    /**
     * Generate Dockerfile for SSR apps (Next.js, Nuxt.js)
     */
    static generateSSRDockerfile(config) {
        return `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN ${config.installCommand}

# Copy source code
COPY . .

# Build the application
RUN ${config.buildCommand}

# Expose port
EXPOSE ${config.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${config.port}/health || exit 1

# Start the application
CMD ["${config.startCommand}"]
`;
    }
    /**
     * Generate Dockerfile for Node.js backend apps
     */
    static generateNodeDockerfile(config) {
        return `FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN ${config.installCommand}

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
USER nodejs

# Expose port
EXPOSE ${config.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${config.port}/health || exit 1

# Start the application
CMD [${config.startCommand
            .split(" ")
            .map((cmd) => `"${cmd}"`)
            .join(", ")}]
`;
    }
    /**
     * Generate Dockerfile for static sites (HTML/CSS/JS)
     */
    static generateStaticSiteDockerfile() {
        return `FROM nginx:alpine

# Copy static files
COPY . /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
`;
    }
    /**
     * Generate nginx configuration for static sites
     */
    static generateNginxConfig() {
        return `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html index.htm;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Cache static assets
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;
    }
    /**
     * Generate .dockerignore file
     */
    static generateDockerignore() {
        return `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.DS_Store
*.log
coverage
.nyc_output
.vscode
.idea
dist
build
.next
.nuxt
`;
    }
}
exports.DockerfileGenerator = DockerfileGenerator;
