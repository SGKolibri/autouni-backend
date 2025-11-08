#!/bin/bash

# AutoUni Development Helper Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function show_help() {
    echo -e "${GREEN}AutoUni Development Helper${NC}"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start         - Start all services (DB + MQTT + App)"
    echo "  stop          - Stop all services"
    echo "  restart       - Restart all services"
    echo "  logs          - Show logs from all services"
    echo "  logs-app      - Show only app logs"
    echo "  logs-mqtt     - Show only MQTT logs"
    echo "  logs-db       - Show only database logs"
    echo "  mqtt-only     - Start only MQTT broker"
    echo "  db-only       - Start only database"
    echo "  test-mqtt     - Test MQTT connection"
    echo "  clean         - Stop and remove all containers"
    echo "  clean-all     - Stop, remove containers and volumes (WARNING: deletes data)"
    echo "  rebuild       - Rebuild and restart app"
    echo "  rebuild-all   - Rebuild and restart all services"
    echo "  status        - Show status of all services"
    echo ""
}

function start_services() {
    echo -e "${GREEN}Starting all services...${NC}"
    
    # Stop standalone containers if exist
    docker stop happy_tu musing_curie 2>/dev/null || true
    
    # Start with docker-compose
    docker-compose up -d
    
    echo -e "${GREEN}✓ Services started${NC}"
    echo ""
    show_status
}

function stop_services() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Services stopped${NC}"
}

function restart_services() {
    echo -e "${YELLOW}Restarting all services...${NC}"
    docker-compose restart
    echo -e "${GREEN}✓ Services restarted${NC}"
}

function show_logs() {
    docker-compose logs -f
}

function show_app_logs() {
    docker-compose logs -f app
}

function show_mqtt_logs() {
    docker-compose logs -f mqtt
}

function show_db_logs() {
    docker-compose logs -f db
}

function start_mqtt_only() {
    echo -e "${GREEN}Starting MQTT broker only...${NC}"
    docker-compose up -d mqtt
    echo -e "${GREEN}✓ MQTT broker started${NC}"
}

function start_db_only() {
    echo -e "${GREEN}Starting database only...${NC}"
    docker-compose up -d db
    echo -e "${GREEN}✓ Database started${NC}"
}

function test_mqtt() {
    echo -e "${GREEN}Testing MQTT connection...${NC}"
    echo -e "${YELLOW}Subscribing to devices/# topic (Ctrl+C to stop)${NC}"
    echo ""
    
    # Check if mosquitto-clients is installed
    if command -v mosquitto_sub &> /dev/null; then
        mosquitto_sub -h localhost -p 1883 -t 'devices/#' -v
    else
        echo -e "${YELLOW}mosquitto-clients not installed locally, using Docker...${NC}"
        docker run --rm -it --network autouni-network eclipse-mosquitto \
            mosquitto_sub -h mqtt -t 'devices/#' -v
    fi
}

function clean_services() {
    echo -e "${YELLOW}Cleaning services...${NC}"
    docker-compose down
    docker stop happy_tu musing_curie 2>/dev/null || true
    docker rm happy_tu musing_curie 2>/dev/null || true
    echo -e "${GREEN}✓ Cleaned${NC}"
}

function clean_all() {
    echo -e "${RED}WARNING: This will remove all data (volumes)!${NC}"
    read -p "Are you sure? (yes/no) " -n 3 -r
    echo
    if [[ $REPLY =~ ^yes$ ]]; then
        docker-compose down -v
        docker stop happy_tu musing_curie 2>/dev/null || true
        docker rm happy_tu musing_curie 2>/dev/null || true
        echo -e "${GREEN}✓ All cleaned (including volumes)${NC}"
    else
        echo -e "${YELLOW}Cancelled${NC}"
    fi
}

function rebuild_app() {
    echo -e "${GREEN}Rebuilding app...${NC}"
    docker-compose up --build -d app
    echo -e "${GREEN}✓ App rebuilt and restarted${NC}"
    echo ""
    show_app_logs
}

function rebuild_all() {
    echo -e "${GREEN}Rebuilding all services...${NC}"
    docker-compose up --build -d
    echo -e "${GREEN}✓ All services rebuilt and restarted${NC}"
    echo ""
    show_status
}

function show_status() {
    echo -e "${GREEN}Service Status:${NC}"
    echo ""
    docker-compose ps
    echo ""
    
    # Check if services are healthy
    if docker-compose ps | grep -q "autoUniPostgres.*Up"; then
        echo -e "Database:  ${GREEN}✓ Running${NC}"
    else
        echo -e "Database:  ${RED}✗ Not running${NC}"
    fi
    
    if docker-compose ps | grep -q "autoUniMqtt.*Up"; then
        echo -e "MQTT:      ${GREEN}✓ Running${NC}"
    else
        echo -e "MQTT:      ${RED}✗ Not running${NC}"
    fi
    
    if docker-compose ps | grep -q "autoUniApi.*Up"; then
        echo -e "API:       ${GREEN}✓ Running${NC}"
    else
        echo -e "API:       ${RED}✗ Not running${NC}"
    fi
    
    echo ""
}

# Main
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    logs-app)
        show_app_logs
        ;;
    logs-mqtt)
        show_mqtt_logs
        ;;
    logs-db)
        show_db_logs
        ;;
    mqtt-only)
        start_mqtt_only
        ;;
    db-only)
        start_db_only
        ;;
    test-mqtt)
        test_mqtt
        ;;
    clean)
        clean_services
        ;;
    clean-all)
        clean_all
        ;;
    rebuild)
        rebuild_app
        ;;
    rebuild-all)
        rebuild_all
        ;;
    status)
        show_status
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
