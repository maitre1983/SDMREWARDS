"""
SDM REWARDS - Notification Service
===================================
Handles notifications for merchants, clients, and admins
"""

from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db):
        self.db = db
    
    async def create_notification(
        self,
        recipient_type: str,  # "merchant", "client", "admin"
        recipient_id: str,
        notification_type: str,  # "payment_received", "cashback_earned", "withdrawal", etc.
        title: str,
        message: str,
        data: dict = None,
        priority: str = "normal"  # "low", "normal", "high", "urgent"
    ):
        """Create a new notification"""
        notification = {
            "id": str(uuid.uuid4()),
            "recipient_type": recipient_type,
            "recipient_id": recipient_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "data": data or {},
            "priority": priority,
            "read": False,
            "read_at": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.notifications.insert_one(notification)
        logger.info(f"📢 Notification created: {notification_type} for {recipient_type}:{recipient_id[:8]}...")
        
        return notification
    
    async def notify_merchant_payment_received(
        self,
        merchant_id: str,
        merchant_name: str,
        client_name: str,
        amount: float,
        cashback: float,
        payment_method: str,
        transaction_id: str
    ):
        """Notify merchant when they receive a payment"""
        
        # Create notification
        notification = await self.create_notification(
            recipient_type="merchant",
            recipient_id=merchant_id,
            notification_type="payment_received",
            title="💰 Payment Received!",
            message=f"GHS {amount:.2f} from {client_name or 'Customer'}",
            data={
                "amount": amount,
                "cashback": cashback,
                "payment_method": payment_method,
                "client_name": client_name,
                "transaction_id": transaction_id,
                "sound": "payment_success"  # Frontend will play this sound
            },
            priority="high"
        )
        
        # Update merchant's unread count
        await self.db.merchants.update_one(
            {"id": merchant_id},
            {"$inc": {"unread_notifications": 1}}
        )
        
        return notification
    
    async def notify_client_cashback_earned(
        self,
        client_id: str,
        amount: float,
        cashback: float,
        merchant_name: str,
        transaction_id: str
    ):
        """Notify client when they earn cashback"""
        
        notification = await self.create_notification(
            recipient_type="client",
            recipient_id=client_id,
            notification_type="cashback_earned",
            title="🎉 Cashback Earned!",
            message=f"You earned GHS {cashback:.2f} at {merchant_name}",
            data={
                "amount": amount,
                "cashback": cashback,
                "merchant_name": merchant_name,
                "transaction_id": transaction_id
            },
            priority="normal"
        )
        
        await self.db.clients.update_one(
            {"id": client_id},
            {"$inc": {"unread_notifications": 1}}
        )
        
        return notification
    
    async def get_notifications(
        self,
        recipient_type: str,
        recipient_id: str,
        limit: int = 20,
        unread_only: bool = False
    ):
        """Get notifications for a recipient"""
        query = {
            "recipient_type": recipient_type,
            "recipient_id": recipient_id
        }
        
        if unread_only:
            query["read"] = False
        
        notifications = await self.db.notifications.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return notifications
    
    async def get_unread_count(self, recipient_type: str, recipient_id: str):
        """Get count of unread notifications"""
        count = await self.db.notifications.count_documents({
            "recipient_type": recipient_type,
            "recipient_id": recipient_id,
            "read": False
        })
        return count
    
    async def mark_as_read(self, notification_id: str, recipient_id: str):
        """Mark a notification as read"""
        result = await self.db.notifications.update_one(
            {"id": notification_id, "recipient_id": recipient_id},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count > 0:
            # Get recipient type to update their unread count
            notification = await self.db.notifications.find_one({"id": notification_id})
            if notification:
                collection = self.db.merchants if notification["recipient_type"] == "merchant" else self.db.clients
                await collection.update_one(
                    {"id": recipient_id},
                    {"$inc": {"unread_notifications": -1}}
                )
        
        return result.modified_count > 0
    
    async def mark_all_as_read(self, recipient_type: str, recipient_id: str):
        """Mark all notifications as read for a recipient"""
        result = await self.db.notifications.update_many(
            {
                "recipient_type": recipient_type,
                "recipient_id": recipient_id,
                "read": False
            },
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Reset unread count
        collection = self.db.merchants if recipient_type == "merchant" else self.db.clients
        await collection.update_one(
            {"id": recipient_id},
            {"$set": {"unread_notifications": 0}}
        )
        
        return result.modified_count
    
    async def get_recent_payment_notifications(self, merchant_id: str, since_seconds: int = 30):
        """Get payment notifications from the last N seconds (for real-time alerts)"""
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(seconds=since_seconds)).isoformat()
        
        notifications = await self.db.notifications.find({
            "recipient_type": "merchant",
            "recipient_id": merchant_id,
            "type": "payment_received",
            "created_at": {"$gte": cutoff},
            "read": False
        }, {"_id": 0}).sort("created_at", -1).to_list(10)
        
        return notifications


# Singleton instance
_notification_service = None

def get_notification_service(db):
    global _notification_service
    if _notification_service is None or _notification_service.db != db:
        _notification_service = NotificationService(db)
    return _notification_service
