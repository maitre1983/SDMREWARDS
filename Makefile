# =============================================================================
# SDM REWARDS - Makefile
# =============================================================================
# Shortcuts for common development and deployment tasks
#
# Usage:
#   make help           - Show available commands
#   make mobile-deploy  - Full mobile deployment
#   make mobile-quick   - Quick mobile update
#   make backend-restart - Restart backend server
#   make logs           - Show recent logs
# =============================================================================

.PHONY: help mobile-deploy mobile-quick mobile-clean backend-restart frontend-restart logs backend-logs frontend-logs test

# Default target
help:
	@echo ""
	@echo "SDM REWARDS - Available Commands"
	@echo "================================="
	@echo ""
	@echo "Mobile:"
	@echo "  make mobile-deploy   - Full mobile deployment (clean build)"
	@echo "  make mobile-quick    - Quick mobile update (for small changes)"
	@echo "  make mobile-clean    - Clean mobile build artifacts"
	@echo ""
	@echo "Server:"
	@echo "  make backend-restart - Restart backend server"
	@echo "  make frontend-restart- Restart frontend server"
	@echo "  make restart-all     - Restart all services"
	@echo ""
	@echo "Logs:"
	@echo "  make logs            - Show all recent logs"
	@echo "  make backend-logs    - Show backend logs"
	@echo "  make frontend-logs   - Show frontend logs"
	@echo ""
	@echo "Testing:"
	@echo "  make test-api        - Test API health"
	@echo "  make test-mobile     - Test mobile app URL"
	@echo ""

# Mobile deployment
mobile-deploy:
	@echo "Starting full mobile deployment..."
	@/app/scripts/deploy_mobile.sh --verbose

mobile-quick:
	@echo "Starting quick mobile update..."
	@/app/scripts/quick_mobile_update.sh

mobile-clean:
	@echo "Cleaning mobile build artifacts..."
	@rm -rf /app/mobile/dist /app/mobile/web-build /app/mobile/.expo
	@echo "Done!"

# Server management
backend-restart:
	@echo "Restarting backend..."
	@sudo supervisorctl restart backend
	@sleep 2
	@sudo supervisorctl status backend

frontend-restart:
	@echo "Restarting frontend..."
	@sudo supervisorctl restart frontend
	@sleep 2
	@sudo supervisorctl status frontend

restart-all:
	@echo "Restarting all services..."
	@sudo supervisorctl restart all
	@sleep 3
	@sudo supervisorctl status

# Logs
logs:
	@echo "=== Backend Logs ==="
	@tail -n 30 /var/log/supervisor/backend.err.log
	@echo ""
	@echo "=== Frontend Logs ==="
	@tail -n 30 /var/log/supervisor/frontend.err.log 2>/dev/null || echo "No frontend logs"

backend-logs:
	@tail -n 50 /var/log/supervisor/backend.err.log

frontend-logs:
	@tail -n 50 /var/log/supervisor/frontend.err.log 2>/dev/null || echo "No frontend logs"

# Testing
test-api:
	@echo "Testing API health..."
	@BACKEND_URL=$$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2); \
	curl -s "$$BACKEND_URL/api/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ API Status:', d.get('status', 'unknown'))"

test-mobile:
	@echo "Testing mobile app..."
	@BACKEND_URL=$$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2); \
	HTTP_CODE=$$(curl -s -o /dev/null -w "%{http_code}" "$$BACKEND_URL/api/mobile"); \
	if [ "$$HTTP_CODE" = "200" ]; then \
		echo "✅ Mobile app accessible (HTTP $$HTTP_CODE)"; \
		echo "   URL: $$BACKEND_URL/api/mobile"; \
	else \
		echo "❌ Mobile app not accessible (HTTP $$HTTP_CODE)"; \
	fi
