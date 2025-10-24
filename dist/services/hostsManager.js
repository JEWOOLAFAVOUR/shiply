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
exports.HostsManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class HostsManager {
    constructor() {
        this.hostsFile = "C:\\Windows\\System32\\drivers\\etc\\hosts";
        this.shiplyMarker = "# Shiply PaaS Platform";
    }
    /**
     * Add local domain entries to Windows hosts file
     */
    addShiplyDomains() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if we already have Shiply entries
                const hostsContent = yield fs_extra_1.default.readFile(this.hostsFile, 'utf8');
                if (hostsContent.includes(this.shiplyMarker)) {
                    console.log("✅ Shiply domains already configured in hosts file");
                    return;
                }
                const shiplyEntries = `
${this.shiplyMarker}
127.0.0.1 shiply.local
127.0.0.1 api.shiply.local
127.0.0.1 *.shiply.local
`;
                // Append to hosts file (requires admin privileges)
                yield fs_extra_1.default.appendFile(this.hostsFile, shiplyEntries);
                console.log("✅ Added Shiply domains to hosts file");
            }
            catch (error) {
                console.error("❌ Failed to update hosts file:", error);
                console.log("🔧 Manual setup required:");
                console.log("1. Open Notepad as Administrator");
                console.log("2. Open: C:\\Windows\\System32\\drivers\\etc\\hosts");
                console.log("3. Add these lines:");
                console.log("   127.0.0.1 shiply.local");
                console.log("   127.0.0.1 api.shiply.local");
            }
        });
    }
    /**
     * Remove Shiply domains from hosts file
     */
    removeShiplyDomains() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const hostsContent = yield fs_extra_1.default.readFile(this.hostsFile, 'utf8');
                // Remove Shiply section
                const lines = hostsContent.split('\n');
                const filteredLines = [];
                let skipShiplySection = false;
                for (const line of lines) {
                    if (line.includes(this.shiplyMarker)) {
                        skipShiplySection = true;
                        continue;
                    }
                    if (skipShiplySection && line.trim() === '') {
                        skipShiplySection = false;
                        continue;
                    }
                    if (!skipShiplySection) {
                        filteredLines.push(line);
                    }
                }
                yield fs_extra_1.default.writeFile(this.hostsFile, filteredLines.join('\n'));
                console.log("🗑️ Removed Shiply domains from hosts file");
            }
            catch (error) {
                console.error("❌ Failed to clean hosts file:", error);
            }
        });
    }
    /**
     * Show manual setup instructions
     */
    showManualInstructions() {
        console.log("\n🔧 MANUAL SETUP REQUIRED (Run as Administrator):");
        console.log("1. Open Command Prompt as Administrator");
        console.log("2. Run: notepad C:\\Windows\\System32\\drivers\\etc\\hosts");
        console.log("3. Add these lines at the bottom:");
        console.log("   127.0.0.1 shiply.local");
        console.log("   127.0.0.1 api.shiply.local");
        console.log("4. Save and close");
        console.log("5. Restart your browser\n");
    }
}
exports.HostsManager = HostsManager;
