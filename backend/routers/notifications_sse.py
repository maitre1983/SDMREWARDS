"""
SDM REWARDS - Server-Sent Events (SSE) for Real-time Notifications
==================================================================
Provides real-time push notifications to merchants using SSE.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Set
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import jwt
import os

logger = logging.getLogger(__name__)

router = APIRouter()

# Store active SSE connections per merchant
# Structure: {merchant_id: set of asyncio.Queue objects}
_merchant_connections: Dict[str, Set[asyncio.Queue]] = {}

# JWT secret for token verification
JWT_SECRET = os.environ.get("JWT_SECRET", "zpOcvItoNLxn5tFna5uu6I7BOKSJiwy6YZDAsVQADaQ_EVCELgzYKTSfc81iDE2I")


def verify_merchant_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "merchant":
            raise ValueError("Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")


async def push_notification_to_merchant(merchant_id: str, notification: dict):
    """
    Push a notification to all SSE connections for a merchant.
    Called by other services (e.g., payment processing) when events occur.
    """
    if merchant_id not in _merchant_connections:
        logger.debug(f"[SSE] No active connections for merchant {merchant_id[:8]}...")
        return 0
    
    connections = _merchant_connections[merchant_id]
    push_count = 0
    
    for queue in list(connections):  # Copy to avoid modification during iteration
        try:
            await queue.put(notification)
            push_count += 1
        except Exception as e:
            logger.error(f"[SSE] Error pushing to queue: {e}")
    
    if push_count > 0:
        logger.info(f"[SSE] Pushed notification to {push_count} connection(s) for merchant {merchant_id[:8]}...")
    
    return push_count


async def event_generator(request: Request, merchant_id: str, queue: asyncio.Queue):
    """
    Generate SSE events for a merchant connection.
    Runs until client disconnects.
    """
    try:
        # Send initial connection event
        yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'merchant_id': merchant_id, 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
        
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                logger.info(f"[SSE] Client disconnected for merchant {merchant_id[:8]}...")
                break
            
            try:
                # Wait for notification with timeout (30s heartbeat)
                notification = await asyncio.wait_for(queue.get(), timeout=30.0)
                
                # Format as SSE event
                event_type = notification.get("type", "notification")
                event_data = json.dumps(notification)
                
                yield f"event: {event_type}\ndata: {event_data}\n\n"
                
                logger.info(f"[SSE] Sent {event_type} event to merchant {merchant_id[:8]}...")
                
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                yield f"event: heartbeat\ndata: {json.dumps({'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
                
    except asyncio.CancelledError:
        logger.info(f"[SSE] Connection cancelled for merchant {merchant_id[:8]}...")
    except Exception as e:
        logger.error(f"[SSE] Error in event generator: {e}")
    finally:
        # Clean up connection
        if merchant_id in _merchant_connections:
            _merchant_connections[merchant_id].discard(queue)
            if not _merchant_connections[merchant_id]:
                del _merchant_connections[merchant_id]
        logger.info(f"[SSE] Cleaned up connection for merchant {merchant_id[:8]}...")


@router.get("/sse/merchant")
async def merchant_sse_stream(request: Request, token: str):
    """
    SSE endpoint for merchant notifications.
    
    Connect with: EventSource(`/api/notifications/sse/merchant?token=${token}`)
    
    Events:
    - connected: Initial connection confirmation
    - payment_received: New payment notification
    - heartbeat: Keep-alive every 30 seconds
    
    Example usage in frontend:
    ```javascript
    const eventSource = new EventSource(`${API_URL}/api/notifications/sse/merchant?token=${token}`);
    
    eventSource.addEventListener('payment_received', (e) => {
        const data = JSON.parse(e.data);
        showNotification(data.title, data.message);
    });
    
    eventSource.addEventListener('connected', (e) => {
        console.log('SSE connected');
    });
    
    eventSource.onerror = (e) => {
        console.error('SSE error, will auto-reconnect');
    };
    ```
    """
    # Verify token
    try:
        payload = verify_merchant_token(token)
        merchant_id = payload.get("merchant_id")
        if not merchant_id:
            raise HTTPException(status_code=401, detail="Invalid token: no merchant_id")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    
    logger.info(f"[SSE] New connection for merchant {merchant_id[:8]}...")
    
    # Create queue for this connection
    queue = asyncio.Queue()
    
    # Register connection
    if merchant_id not in _merchant_connections:
        _merchant_connections[merchant_id] = set()
    _merchant_connections[merchant_id].add(queue)
    
    # Return SSE stream
    return StreamingResponse(
        event_generator(request, merchant_id, queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Access-Control-Allow-Origin": "*",
        }
    )


@router.get("/sse/status")
async def sse_connection_status():
    """
    Get SSE connection status (for debugging).
    """
    return {
        "active_merchants": len(_merchant_connections),
        "total_connections": sum(len(conns) for conns in _merchant_connections.values()),
        "merchants": {
            mid[:8] + "...": len(conns) 
            for mid, conns in _merchant_connections.items()
        }
    }


# Helper function to be imported by other modules
async def notify_merchant_payment(merchant_id: str, payment_data: dict):
    """
    Send payment notification to merchant via SSE.
    Call this from payment processing after successful payment.
    
    Args:
        merchant_id: The merchant's ID
        payment_data: Dict with amount, client_name, cashback, transaction_id
    """
    notification = {
        "type": "payment_received",
        "title": "Payment Received!",
        "message": f"GHS {payment_data.get('amount', 0):.2f} from {payment_data.get('client_name', 'Customer')}",
        "data": {
            "amount": payment_data.get("amount"),
            "cashback": payment_data.get("cashback"),
            "client_name": payment_data.get("client_name"),
            "payment_method": payment_data.get("payment_method", "momo"),
            "transaction_id": payment_data.get("transaction_id"),
            "sound": "payment_success"
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    return await push_notification_to_merchant(merchant_id, notification)
