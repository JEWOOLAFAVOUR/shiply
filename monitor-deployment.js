// Simple deployment monitor script
const deploymentId = process.argv[2];

if (!deploymentId) {
  console.log("Usage: node monitor-deployment.js <deployment-id>");
  process.exit(1);
}

async function checkDeployment() {
  try {
    const response = await fetch(
      `http://localhost:3000/api/v1/${deploymentId}/deploy`
    );
    const data = await response.json();

    console.log("\n=== DEPLOYMENT STATUS ===");
    console.log("ID:", data.data.id);
    console.log("Status:", data.data.status);
    console.log("Image Name:", data.data.dockerImageName);
    console.log("Container:", data.data.containerName);
    console.log("Deploy URL:", data.data.deployUrl);

    if (data.data.buildLogs) {
      console.log("\n=== BUILD LOGS ===");
      console.log(data.data.buildLogs);
    }

    return data.data.status;
  } catch (error) {
    console.error("Error checking deployment:", error.message);
    return "ERROR";
  }
}

async function monitor() {
  console.log(`Monitoring deployment: ${deploymentId}`);

  while (true) {
    const status = await checkDeployment();

    if (status === "SUCCESS") {
      console.log("\n🎉 Deployment completed successfully!");
      break;
    } else if (status === "FAILED") {
      console.log("\n❌ Deployment failed!");
      break;
    } else if (status === "ERROR") {
      console.log("\n💥 Error checking deployment status");
      break;
    }

    // Wait 5 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

monitor();
