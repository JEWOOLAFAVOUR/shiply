import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class HostsManager {
  private hostsFile = "C:\\Windows\\System32\\drivers\\etc\\hosts";
  private shiplyMarker = "# Shiply PaaS Platform";

  /**
   * Add local domain entries to Windows hosts file
   */
  async addShiplyDomains(): Promise<void> {
    try {
      // Check if we already have Shiply entries
      const hostsContent = await fs.readFile(this.hostsFile, "utf8");

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
      await fs.appendFile(this.hostsFile, shiplyEntries);
      console.log("✅ Added Shiply domains to hosts file");
    } catch (error) {
      console.error("❌ Failed to update hosts file:", error);
      console.log("🔧 Manual setup required:");
      console.log("1. Open Notepad as Administrator");
      console.log("2. Open: C:\\Windows\\System32\\drivers\\etc\\hosts");
      console.log("3. Add these lines:");
      console.log("   127.0.0.1 shiply.local");
      console.log("   127.0.0.1 api.shiply.local");
    }
  }

  /**
   * Remove Shiply domains from hosts file
   */
  async removeShiplyDomains(): Promise<void> {
    try {
      const hostsContent = await fs.readFile(this.hostsFile, "utf8");

      // Remove Shiply section
      const lines = hostsContent.split("\n");
      const filteredLines = [];
      let skipShiplySection = false;

      for (const line of lines) {
        if (line.includes(this.shiplyMarker)) {
          skipShiplySection = true;
          continue;
        }

        if (skipShiplySection && line.trim() === "") {
          skipShiplySection = false;
          continue;
        }

        if (!skipShiplySection) {
          filteredLines.push(line);
        }
      }

      await fs.writeFile(this.hostsFile, filteredLines.join("\n"));
      console.log("🗑️ Removed Shiply domains from hosts file");
    } catch (error) {
      console.error("❌ Failed to clean hosts file:", error);
    }
  }

  /**
   * Show manual setup instructions
   */
  showManualInstructions(): void {
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
