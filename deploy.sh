#!/bin/bash

# =============================================================================
# EVACHATBOT LICENSING SERVER - DEPLOYMENT SCRIPT
# =============================================================================
# This script helps you deploy the licensing server with different configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [ENVIRONMENT] [ACTION]"
    echo ""
    echo "ENVIRONMENTS:"
    echo "  local     - Deploy for local development (localhost)"
    echo "  server    - Deploy for server (modify .env.server first!)"
    echo "  server2   - Deploy for second server instance"
    echo "  custom    - Use existing .env file"
    echo ""
    echo "ACTIONS:"
    echo "  up        - Start services (default)"
    echo "  down      - Stop services"
    echo "  restart   - Restart services"
    echo "  logs      - Show logs"
    echo "  status    - Show service status"
    echo "  build     - Build and start services"
    echo ""
    echo "Examples:"
    echo "  $0 local up          # Start local development"
    echo "  $0 server build      # Build and deploy on server"
    echo "  $0 server2 restart   # Restart second server instance"
    echo "  $0 custom logs       # Show logs using existing .env"
}

# Function to copy environment file
setup_environment() {
    local env_type=$1
    
    case $env_type in
        "local")
            if [ -f ".env.local" ]; then
                cp .env.local .env
                print_success "Using local development environment"
            else
                print_error ".env.local file not found!"
                exit 1
            fi
            ;;
        "server")
            if [ -f ".env.server" ]; then
                cp .env.server .env
                print_success "Using server deployment environment"
                print_warning "Make sure to update HOST_IP and SECRET_KEY in .env.server!"
            else
                print_error ".env.server file not found!"
                exit 1
            fi
            ;;
        "server2")
            if [ -f ".env.server2" ]; then
                cp .env.server2 .env
                print_success "Using second server deployment environment"
                print_warning "Make sure to update HOST_IP and SECRET_KEY in .env.server2!"
            else
                print_error ".env.server2 file not found!"
                exit 1
            fi
            ;;
        "custom")
            if [ -f ".env" ]; then
                print_success "Using existing .env file"
            else
                print_error ".env file not found! Create one or use another environment."
                exit 1
            fi
            ;;
        *)
            print_error "Unknown environment: $env_type"
            show_usage
            exit 1
            ;;
    esac
}

# Function to perform actions
perform_action() {
    local action=$1
    
    case $action in
        "up")
            print_info "Starting services..."
            docker-compose up -d
            print_success "Services started!"
            ;;
        "down")
            print_info "Stopping services..."
            docker-compose down
            print_success "Services stopped!"
            ;;
        "restart")
            print_info "Restarting services..."
            docker-compose down
            docker-compose up -d
            print_success "Services restarted!"
            ;;
        "logs")
            print_info "Showing logs..."
            docker-compose logs -f
            ;;
        "status")
            print_info "Service status:"
            docker-compose ps
            ;;
        "build")
            print_info "Building and starting services..."
            docker-compose up --build -d
            print_success "Services built and started!"
            ;;
        *)
            print_error "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac
}

# Main script
main() {
    local environment=${1:-"local"}
    local action=${2:-"up"}
    
    # Show help if requested
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    print_info "Evachatbot Licensing Server Deployment"
    print_info "Environment: $environment"
    print_info "Action: $action"
    echo ""
    
    # Setup environment
    setup_environment "$environment"
    
    # Perform action
    perform_action "$action"
    
    # Show final status for up/build actions
    if [ "$action" = "up" ] || [ "$action" = "build" ] || [ "$action" = "restart" ]; then
        echo ""
        print_info "Final service status:"
        docker-compose ps
        echo ""
        
        # Load environment variables to show access URLs
        source .env
        print_success "Deployment complete!"
        echo ""
        echo "Access URLs:"
        echo "  Frontend:  http://${HOST_IP}:${FRONTEND_PORT}"
        echo "  Backend:   http://${HOST_IP}:${BACKEND_PORT}"
        echo "  API Docs:  http://${HOST_IP}:${BACKEND_PORT}/docs"
        echo "  Database:  ${HOST_IP}:${DATABASE_PORT}"
        echo ""
        echo "Admin Login:"
        echo "  Email:     admin@ecogo.com"
        echo "  Password:  admin123"
    fi
}

# Run main function
main "$@"
