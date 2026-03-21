"""
SDM REWARDS - WebSocket Real-time Synchronization
==================================================
Provides bidirectional real-time communication for all dashboards.
Supports: Merchants, Clients, and Admin.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from starlette.websockets import WebSocketState
import jwt
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])

# JWT secret for token verification
JWT_SECRET = os.environ.get("JWT_SECRET", "zpOcvItoNLxn5tFna5uu6I7BOKSJiwy6YZDAsVQADaQ_EVCELgzYKTSfc81iDE2I")


class ConnectionManager:
    """
    Manages WebSocket connections for all user types.
    Provides pub/sub functionality for real-time updates.
    """
    
    def __init__(self):
        # Active connections by user type and ID
        # Structure: {user_type: {user_id: set of WebSocket connections}}
        self._connections: Dict[str, Dict[str, Set[WebSocket]]] = {
            "merchant": {},
            "client": {},
            "admin": {}
        }
        
        # Connection metadata
        self._metadata: Dict[WebSocket, dict] = {}
        
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, user_type: str, user_id: str, metadata: dict = None):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        
        async with self._lock:
            if user_type not in self._connections:
                self._connections[user_type] = {}
            
            if user_id not in self._connections[user_type]:
                self._connections[user_type][user_id] = set()
            
            self._connections[user_type][user_id].add(websocket)
            self._metadata[websocket] = {
                "user_type": user_type,
                "user_id": user_id,
                "connected_at": datetime.now(timezone.utc).isoformat(),
                **(metadata or {})
            }
        
        logger.info(f"[WS] {user_type} {user_id[:8]}... connected. Total connections: {self.total_connections}")
        
        # Send connection confirmation
        await self.send_personal(websocket, {
            "type": "connected",
            "user_type": user_type,
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        async with self._lock:
            if websocket in self._metadata:
                meta = self._metadata.pop(websocket)
                user_type = meta["user_type"]
                user_id = meta["user_id"]
                
                if user_type in self._connections and user_id in self._connections[user_type]:
                    self._connections[user_type][user_id].discard(websocket)
                    
                    # Clean up empty sets
                    if not self._connections[user_type][user_id]:
                        del self._connections[user_type][user_id]
                
                logger.info(f"[WS] {user_type} {user_id[:8]}... disconnected. Total connections: {self.total_connections}")
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send a message to a specific WebSocket connection."""
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(message)
                return True
        except Exception as e:
            logger.error(f"[WS] Error sending personal message: {e}")
        return False
    
    async def send_to_user(self, user_type: str, user_id: str, message: dict) -> int:
        """Send a message to all connections of a specific user."""
        count = 0
        
        if user_type in self._connections and user_id in self._connections[user_type]:
            connections = list(self._connections[user_type][user_id])
            
            for ws in connections:
                if await self.send_personal(ws, message):
                    count += 1
        
        if count > 0:
            logger.info(f"[WS] Sent to {count} connection(s) of {user_type} {user_id[:8]}...")
        
        return count
    
    async def broadcast_to_type(self, user_type: str, message: dict) -> int:
        """Broadcast a message to all users of a specific type."""
        count = 0
        
        if user_type in self._connections:
            for user_id, connections in self._connections[user_type].items():
                for ws in list(connections):
                    if await self.send_personal(ws, message):
                        count += 1
        
        if count > 0:
            logger.info(f"[WS] Broadcast to {count} {user_type}(s)")
        
        return count
    
    async def broadcast_all(self, message: dict) -> int:
        """Broadcast a message to all connected users."""
        count = 0
        
        for user_type in self._connections.values():
            for connections in user_type.values():
                for ws in list(connections):
                    if await self.send_personal(ws, message):
                        count += 1
        
        return count
    
    @property
    def total_connections(self) -> int:
        """Get total number of active connections."""
        return sum(
            len(connections)
            for user_type in self._connections.values()
            for connections in user_type.values()
        )
    
    def get_stats(self) -> dict:
        """Get connection statistics."""
        return {
            "total_connections": self.total_connections,
            "by_type": {
                user_type: {
                    "users": len(users),
                    "connections": sum(len(conns) for conns in users.values())
                }
                for user_type, users in self._connections.items()
            }
        }


# Global connection manager instance
manager = ConnectionManager()


def verify_token(token: str, expected_type: str = None) -> dict:
    """Verify JWT token and optionally check user type."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        if expected_type and payload.get("type") != expected_type:
            raise ValueError(f"Invalid token type. Expected {expected_type}")
        
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")


# ============== WEBSOCKET ENDPOINTS ==============

@router.websocket("/merchant")
async def merchant_websocket(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for merchant real-time updates.
    
    Events received:
    - connected: Connection confirmed
    - payment_received: New payment notification
    - payout_update: Payout status change
    - dashboard_refresh: Dashboard data updated
    - heartbeat: Keep-alive ping
    
    Events you can send:
    - ping: Request heartbeat response
    - subscribe: Subscribe to specific events
    - refresh_request: Request fresh dashboard data
    """
    try:
        payload = verify_token(token, "merchant")
        merchant_id = payload.get("merchant_id")
        if not merchant_id:
            await websocket.close(code=4001, reason="Invalid token: no merchant_id")
            return
    except ValueError as e:
        await websocket.accept()
        await websocket.close(code=4001, reason=str(e))
        return
    
    await manager.connect(websocket, "merchant", merchant_id, {
        "business_name": payload.get("business_name", "Unknown")
    })
    
    try:
        while True:
            try:
                # Wait for messages from client with timeout for heartbeat
                data = await asyncio.wait_for(websocket.receive_json(), timeout=45.0)
                
                # Handle client messages
                msg_type = data.get("type", "unknown")
                
                if msg_type == "ping":
                    await manager.send_personal(websocket, {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
                elif msg_type == "refresh_request":
                    # Client is requesting fresh data - they should fetch via API
                    await manager.send_personal(websocket, {
                        "type": "refresh_ack",
                        "message": "Please fetch latest data from API"
                    })
                
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                await manager.send_personal(websocket, {
                    "type": "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[WS] Merchant connection error: {e}")
    finally:
        await manager.disconnect(websocket)


@router.websocket("/client")
async def client_websocket(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for client real-time updates.
    
    Events received:
    - connected: Connection confirmed
    - balance_update: Cashback balance changed
    - payment_confirmed: Payment to merchant confirmed
    - cashback_earned: New cashback earned
    - mission_update: Mission progress changed
    - heartbeat: Keep-alive ping
    """
    try:
        payload = verify_token(token, "client")
        client_id = payload.get("client_id")
        if not client_id:
            await websocket.close(code=4001, reason="Invalid token: no client_id")
            return
    except ValueError as e:
        await websocket.accept()
        await websocket.close(code=4001, reason=str(e))
        return
    
    await manager.connect(websocket, "client", client_id, {
        "username": payload.get("username", "Unknown")
    })
    
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=45.0)
                
                msg_type = data.get("type", "unknown")
                
                if msg_type == "ping":
                    await manager.send_personal(websocket, {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
            except asyncio.TimeoutError:
                await manager.send_personal(websocket, {
                    "type": "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[WS] Client connection error: {e}")
    finally:
        await manager.disconnect(websocket)


@router.websocket("/admin")
async def admin_websocket(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for admin real-time updates.
    
    Events received:
    - connected: Connection confirmed
    - new_merchant: New merchant registered
    - new_client: New client registered
    - payment_processed: Payment completed
    - withdrawal_request: Client withdrawal request
    - system_alert: System notifications
    - heartbeat: Keep-alive ping
    """
    try:
        payload = verify_token(token, "admin")
        admin_id = payload.get("admin_id") or payload.get("id", "admin")
    except ValueError as e:
        await websocket.accept()
        await websocket.close(code=4001, reason=str(e))
        return
    
    await manager.connect(websocket, "admin", admin_id)
    
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=45.0)
                
                msg_type = data.get("type", "unknown")
                
                if msg_type == "ping":
                    await manager.send_personal(websocket, {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
                elif msg_type == "broadcast":
                    # Admin can broadcast to all users of a type
                    target_type = data.get("target_type")
                    message = data.get("message", {})
                    if target_type:
                        count = await manager.broadcast_to_type(target_type, message)
                        await manager.send_personal(websocket, {
                            "type": "broadcast_result",
                            "sent_to": count
                        })
                
            except asyncio.TimeoutError:
                await manager.send_personal(websocket, {
                    "type": "heartbeat",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[WS] Admin connection error: {e}")
    finally:
        await manager.disconnect(websocket)


@router.get("/status")
async def websocket_status():
    """Get WebSocket connection statistics."""
    return {
        "status": "operational",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **manager.get_stats()
    }


# ============== NOTIFICATION HELPERS ==============
# These functions are imported by other modules to send real-time updates

async def notify_merchant(merchant_id: str, event_type: str, data: dict) -> int:
    """Send a notification to a merchant via WebSocket."""
    message = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    return await manager.send_to_user("merchant", merchant_id, message)


async def notify_client(client_id: str, event_type: str, data: dict) -> int:
    """Send a notification to a client via WebSocket."""
    message = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    return await manager.send_to_user("client", client_id, message)


async def notify_admins(event_type: str, data: dict) -> int:
    """Broadcast a notification to all admins."""
    message = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    return await manager.broadcast_to_type("admin", message)


async def notify_merchant_payment(merchant_id: str, payment_data: dict) -> int:
    """
    Send payment notification to merchant via WebSocket.
    Compatible with the SSE notification function signature.
    """
    return await notify_merchant(merchant_id, "payment_received", {
        "title": "Payment Received!",
        "message": f"GHS {payment_data.get('amount', 0):.2f} from {payment_data.get('client_name', 'Customer')}",
        "amount": payment_data.get("amount"),
        "cashback": payment_data.get("cashback"),
        "client_name": payment_data.get("client_name"),
        "payment_method": payment_data.get("payment_method", "momo"),
        "transaction_id": payment_data.get("transaction_id"),
        "sound": "payment_success"
    })


async def notify_client_balance_update(client_id: str, new_balance: float, change: float, reason: str) -> int:
    """Send balance update notification to client."""
    return await notify_client(client_id, "balance_update", {
        "new_balance": new_balance,
        "change": change,
        "reason": reason
    })


async def notify_dashboard_refresh(user_type: str, user_id: str = None) -> int:
    """
    Tell dashboard(s) to refresh their data.
    If user_id is None, broadcasts to all users of that type.
    """
    message = {
        "type": "dashboard_refresh",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if user_id:
        return await manager.send_to_user(user_type, user_id, message)
    else:
        return await manager.broadcast_to_type(user_type, message)
