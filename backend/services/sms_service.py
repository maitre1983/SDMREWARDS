"""
SDM REWARDS - SMS Notification Service
======================================
Sends SMS notifications via Hubtel SMS API
This module re-exports the Hubtel SMS service for backward compatibility
"""

# Re-export everything from the new Hubtel SMS service
from services.hubtel_sms_service import (
    HubtelSMSService,
    get_sms_service,
    get_sms,
    get_hubtel_sms,
    SMS_TEST_MODE
)

# Alias for backward compatibility
SMSService = HubtelSMSService
