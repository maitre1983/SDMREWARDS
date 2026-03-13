"""
SDM REWARDS - Webhook Service
=============================
Handles sending webhook notifications to registered endpoints.
Includes retry logic, signature verification, and failure tracking.
"""

import os
import hmac
import json
import hashlib
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Webhook configuration
WEBHOOK_TIMEOUT = 10  # seconds
WEBHOOK_MAX_RETRIES = 3
WEBHOOK_RETRY_DELAYS = [1, 5, 30]  # seconds between retries


class WebhookService:
    """Service for managing and sending webhooks"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def generate_signature(self, secret: str, payload: str) -> str:
        """Generate HMAC-SHA256 signature for webhook payload"""
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    async def send_webhook(
        self,
        webhook_id: str,
        url: str,
        secret_hash: str,
        event: str,
        payload: Dict[str, Any]
    ) -> bool:
        """
        Send a webhook notification to the registered URL.
        Returns True if successful, False otherwise.
        """
        # Prepare payload
        webhook_payload = {
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "webhook_id": webhook_id,
            "data": payload
        }
        
        payload_json = json.dumps(webhook_payload, default=str)
        
        # Generate signature using a temp secret derived from hash (for demo)
        # In production, store the actual secret encrypted
        signature = hashlib.sha256(f"{secret_hash}:{payload_json}".encode()).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "X-SDM-Event": event,
            "X-SDM-Signature": signature,
            "X-SDM-Timestamp": datetime.now(timezone.utc).isoformat(),
            "X-SDM-Webhook-ID": webhook_id,
            "User-Agent": "SDM-Rewards-Webhook/1.0"
        }
        
        # Attempt delivery with retries
        for attempt, delay in enumerate(WEBHOOK_RETRY_DELAYS + [0], 1):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        url,
                        content=payload_json,
                        headers=headers,
                        timeout=WEBHOOK_TIMEOUT
                    )
                
                if response.status_code >= 200 and response.status_code < 300:
                    # Success! Update webhook stats
                    await self.db.webhooks.update_one(
                        {"webhook_id": webhook_id},
                        {
                            "$set": {"last_triggered": datetime.now(timezone.utc).isoformat()},
                            "$inc": {"success_count": 1}
                        }
                    )
                    
                    # Log the delivery
                    await self.log_delivery(webhook_id, event, "success", response.status_code)
                    
                    logger.info(f"Webhook {webhook_id} delivered successfully for {event}")
                    return True
                else:
                    logger.warning(f"Webhook {webhook_id} returned {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Webhook {webhook_id} delivery attempt {attempt} failed: {e}")
            
            # Wait before retry (except on last attempt)
            if attempt < len(WEBHOOK_RETRY_DELAYS):
                await asyncio.sleep(delay)
        
        # All retries failed
        await self.db.webhooks.update_one(
            {"webhook_id": webhook_id},
            {
                "$set": {"last_failed_at": datetime.now(timezone.utc).isoformat()},
                "$inc": {"failure_count": 1}
            }
        )
        
        await self.log_delivery(webhook_id, event, "failed", None)
        
        return False
    
    async def log_delivery(
        self,
        webhook_id: str,
        event: str,
        status: str,
        response_code: Optional[int]
    ):
        """Log webhook delivery attempt"""
        log_entry = {
            "webhook_id": webhook_id,
            "event": event,
            "status": status,
            "response_code": response_code,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.webhook_logs.insert_one(log_entry)
    
    async def trigger_event(
        self,
        merchant_id: str,
        event: str,
        payload: Dict[str, Any]
    ):
        """
        Trigger webhooks for a specific event.
        Finds all active webhooks subscribed to this event and sends notifications.
        """
        # Find all active webhooks for this merchant that subscribe to this event
        webhooks = await self.db.webhooks.find({
            "merchant_id": merchant_id,
            "events": event,
            "is_active": True
        }).to_list(length=100)
        
        if not webhooks:
            return
        
        logger.info(f"Triggering {len(webhooks)} webhook(s) for event {event}")
        
        # Send webhooks in parallel (with some concurrency limit)
        tasks = []
        for webhook in webhooks:
            task = self.send_webhook(
                webhook_id=webhook["webhook_id"],
                url=webhook["url"],
                secret_hash=webhook["secret_hash"],
                event=event,
                payload=payload
            )
            tasks.append(task)
        
        # Run all webhook deliveries
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def trigger_points_earned(
        self,
        merchant_id: str,
        customer_phone: str,
        points: int,
        new_balance: int,
        transaction_id: str,
        reference: Optional[str] = None
    ):
        """Trigger points_earned event"""
        await self.trigger_event(merchant_id, "points_earned", {
            "customer_phone": customer_phone,
            "points": points,
            "new_balance": new_balance,
            "transaction_id": transaction_id,
            "reference": reference
        })
    
    async def trigger_points_redeemed(
        self,
        merchant_id: str,
        customer_phone: str,
        points: int,
        new_balance: int,
        transaction_id: str,
        reference: Optional[str] = None
    ):
        """Trigger points_redeemed event"""
        await self.trigger_event(merchant_id, "points_redeemed", {
            "customer_phone": customer_phone,
            "points": points,
            "new_balance": new_balance,
            "transaction_id": transaction_id,
            "reference": reference
        })
    
    async def trigger_customer_registered(
        self,
        merchant_id: str,
        customer_phone: str,
        customer_name: str
    ):
        """Trigger customer_registered event"""
        await self.trigger_event(merchant_id, "customer_registered", {
            "customer_phone": customer_phone,
            "customer_name": customer_name
        })


# Singleton instance
_webhook_service: Optional[WebhookService] = None


def get_webhook_service(db: AsyncIOMotorDatabase) -> WebhookService:
    """Get or create the webhook service instance"""
    global _webhook_service
    if _webhook_service is None:
        _webhook_service = WebhookService(db)
    return _webhook_service
