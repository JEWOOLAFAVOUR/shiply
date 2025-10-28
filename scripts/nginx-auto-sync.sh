#!/bin/bash

# Nginx Auto-Sync Script - Permanent Solution for Automatic Nginx Configuration
# This script automatically creates nginx configurations for new deployed containers

NGINX_CONF_DIR="/opt/shiply/nginx/conf.d"
SHIPLY_NETWORK="shiply_shiply-network"
NGINX_CONTAINER="shiply-proxy"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to create nginx config for a container
create_nginx_config() {
    local container_name=$1
    local app_name=$(echo $container_name | sed 's/-cmhatrzwl0000nw0ib5kx08w5.*$//')
    local config_file="$NGINX_CONF_DIR/${app_name}.conf"
    
    # Skip if config already exists
    if [ -f "$config_file" ]; then
        return 0
    fi
    
    log "Creating nginx config for $app_name -> $container_name"
    
    # Create nginx configuration
    cat > "$config_file" << EOF
# $app_name - Auto-generated configuration
server {
    listen 80;
    server_name ${app_name}.shiply.local;

    # Add custom headers for debugging
    add_header X-Shiply-App "$app_name" always;
    add_header X-Shiply-Container "$container_name" always;

    location / {
        proxy_pass http://${container_name}:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Handle WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
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
EOF

    log "Created nginx config: $config_file"
    return 1  # Return 1 to indicate config was created
}

# Function to reload nginx
reload_nginx() {
    log "Reloading nginx configuration..."
    if docker exec $NGINX_CONTAINER nginx -s reload; then
        log "Nginx reloaded successfully"
    else
        log "Failed to reload nginx, trying restart..."
        docker restart $NGINX_CONTAINER
    fi
}

# Main sync function
sync_nginx_configs() {
    local configs_created=0
    
    # Get all containers connected to the shiply network
    local containers=$(docker network inspect $SHIPLY_NETWORK --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null)
    
    for container in $containers; do
        # Skip system containers
        if [[ $container =~ ^(shiply-api|shiply-proxy|shiply-db)$ ]]; then
            continue
        fi
        
        # Process app containers (they should match pattern: fresh-backend-X-...)
        if [[ $container =~ ^fresh-backend-[0-9]+-cmhatrzwl0000nw0ib5kx08w5 ]]; then
            if create_nginx_config "$container"; then
                configs_created=$((configs_created + 1))
            fi
        fi
    done
    
    # Reload nginx if any configs were created
    if [ $configs_created -gt 0 ]; then
        reload_nginx
        log "Sync completed: $configs_created new configurations created"
    fi
}

# Run sync
log "Starting nginx auto-sync..."
sync_nginx_configs
log "Nginx auto-sync completed"