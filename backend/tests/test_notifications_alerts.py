"""
Test suite for SDM Notification System and Float Alerts
Tests the new features for:
1. Admin notification management (create, list, delete)
2. User notification viewing and read status
3. Float alert system (history, acknowledge, test)
"""
import pytest
import requests
import os
from datetime import datetime

# Get the public URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminNotifications:
    """Test Admin notification management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        self.session = requests.Session()
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "Gerard0103@"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_create_notification_all_recipients(self):
        """POST /api/sdm/admin/notifications - Create notification to all users"""
        payload = {
            "recipient_type": "all",
            "title": "TEST System Update",
            "message": "This is a test notification for all users",
            "notification_type": "system",
            "priority": "normal"
        }
        response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create notification failed: {response.text}"
        data = response.json()
        assert "notification_id" in data
        assert data["recipient_type"] == "all"
        assert data["recipient_count"] >= 0
        print(f"✓ Created notification to 'all': {data['notification_id']}, recipients: {data['recipient_count']}")
    
    def test_create_notification_clients_only(self):
        """POST /api/sdm/admin/notifications - Create notification to clients only"""
        payload = {
            "recipient_type": "clients",
            "title": "TEST Client Promo",
            "message": "Special promotion for our valued clients!",
            "notification_type": "promo",
            "priority": "high"
        }
        response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["recipient_type"] == "clients"
        print(f"✓ Created notification to 'clients': {data['notification_id']}")
    
    def test_create_notification_merchants_only(self):
        """POST /api/sdm/admin/notifications - Create notification to merchants only"""
        payload = {
            "recipient_type": "merchants",
            "title": "TEST Merchant Alert",
            "message": "Important update for all merchants",
            "notification_type": "alert",
            "priority": "urgent"
        }
        response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["recipient_type"] == "merchants"
        print(f"✓ Created notification to 'merchants': {data['notification_id']}")
    
    def test_create_notification_info_type(self):
        """POST /api/sdm/admin/notifications - Create info type notification"""
        payload = {
            "recipient_type": "all",
            "title": "TEST Info Update",
            "message": "General information for all platform users",
            "notification_type": "info",
            "priority": "low"
        }
        response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "notification_id" in data
        print(f"✓ Created 'info' type notification: {data['notification_id']}")
    
    def test_list_notifications(self):
        """GET /api/sdm/admin/notifications - List all notifications"""
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/notifications",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} notifications")
        
        # Verify notification structure if any exist
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif
            assert "title" in notif
            assert "message" in notif
            assert "notification_type" in notif
            assert "priority" in notif
            assert "recipient_type" in notif
            print(f"  First notification: '{notif['title']}' ({notif['notification_type']}, {notif['priority']})")
    
    def test_list_notifications_filter_by_type(self):
        """GET /api/sdm/admin/notifications?notification_type=promo - Filter by type"""
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/notifications?notification_type=promo",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify all returned notifications are promo type
        for notif in data:
            assert notif["notification_type"] == "promo"
        print(f"✓ Filtered {len(data)} 'promo' notifications")
    
    def test_delete_notification(self):
        """DELETE /api/sdm/admin/notifications/{id} - Delete notification"""
        # First create a notification to delete
        create_response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json={
                "recipient_type": "all",
                "title": "TEST To Delete",
                "message": "This notification will be deleted",
                "notification_type": "system",
                "priority": "low"
            },
            headers=self.headers
        )
        assert create_response.status_code == 200
        notification_id = create_response.json()["notification_id"]
        
        # Now delete it
        delete_response = self.session.delete(
            f"{BASE_URL}/api/sdm/admin/notifications/{notification_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json()["message"].lower()
        print(f"✓ Deleted notification: {notification_id}")
        
        # Verify it's deleted (try to get all and check it's not there)
        list_response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/notifications",
            headers=self.headers
        )
        notifications = list_response.json()
        for notif in notifications:
            assert notif["id"] != notification_id, "Notification should be deleted"
    
    def test_delete_nonexistent_notification(self):
        """DELETE /api/sdm/admin/notifications/{id} - 404 for non-existent"""
        response = self.session.delete(
            f"{BASE_URL}/api/sdm/admin/notifications/nonexistent-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404
        print("✓ 404 returned for non-existent notification")


class TestFloatAlerts:
    """Test Float Alert system endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "Gerard0103@"
        })
        assert response.status_code == 200
        self.admin_token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_float_alerts_history(self):
        """GET /api/sdm/admin/float-alerts - Get alert history"""
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/float-alerts",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Float alert history: {len(data)} alerts")
        
        # Verify structure if any alerts exist
        if len(data) > 0:
            alert = data[0]
            assert "id" in alert
            assert "alert_type" in alert
            assert "float_balance" in alert
            assert "threshold" in alert
            assert "is_acknowledged" in alert
            print(f"  First alert: type={alert['alert_type']}, balance={alert['float_balance']}, acknowledged={alert['is_acknowledged']}")
    
    def test_get_float_alerts_filter_unacknowledged(self):
        """GET /api/sdm/admin/float-alerts?acknowledged=false - Filter unacknowledged"""
        response = self.session.get(
            f"{BASE_URL}/api/sdm/admin/float-alerts?acknowledged=false",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        for alert in data:
            assert alert["is_acknowledged"] == False
        print(f"✓ Filtered {len(data)} unacknowledged alerts")
    
    def test_test_float_alert_no_config(self):
        """POST /api/sdm/admin/float-alerts/test - Test alert (may fail without config)"""
        response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/float-alerts/test",
            headers=self.headers
        )
        # Either success or 400 if not configured
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Test alert sent - webhook: {data.get('webhook_sent')}, email: {data.get('email_sent')}")
        else:
            data = response.json()
            print(f"✓ Test alert returned 400 (expected if no webhook/email configured): {data.get('detail')}")
    
    def test_configure_alert_webhook_and_test(self):
        """Configure webhook URL and test alert"""
        # First configure webhook URL
        config_response = self.session.put(
            f"{BASE_URL}/api/sdm/admin/config",
            json={
                "float_alert_webhook_url": "https://httpbin.org/post"  # Test webhook endpoint
            },
            headers=self.headers
        )
        assert config_response.status_code == 200, f"Config update failed: {config_response.text}"
        print("✓ Configured test webhook URL")
        
        # Now test the alert
        test_response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/float-alerts/test",
            headers=self.headers
        )
        assert test_response.status_code == 200
        data = test_response.json()
        assert data["webhook_configured"] == True
        print(f"✓ Test alert with webhook: sent={data.get('webhook_sent')}")
        
        # Clean up - remove webhook URL
        self.session.put(
            f"{BASE_URL}/api/sdm/admin/config",
            json={"float_alert_webhook_url": None},
            headers=self.headers
        )
    
    def test_acknowledge_float_alert(self):
        """POST /api/sdm/admin/float-alerts/{id}/acknowledge - Acknowledge alert"""
        # First configure and trigger a test alert
        self.session.put(
            f"{BASE_URL}/api/sdm/admin/config",
            json={"float_alert_webhook_url": "https://httpbin.org/post"},
            headers=self.headers
        )
        
        # Send test alert
        test_response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/float-alerts/test",
            headers=self.headers
        )
        
        if test_response.status_code == 200:
            # Get alerts and find the test one
            alerts_response = self.session.get(
                f"{BASE_URL}/api/sdm/admin/float-alerts",
                headers=self.headers
            )
            alerts = alerts_response.json()
            
            # Find an unacknowledged test alert
            test_alert = None
            for alert in alerts:
                if alert["alert_type"] == "test" and not alert["is_acknowledged"]:
                    test_alert = alert
                    break
            
            if test_alert:
                # Acknowledge it
                ack_response = self.session.post(
                    f"{BASE_URL}/api/sdm/admin/float-alerts/{test_alert['id']}/acknowledge",
                    headers=self.headers
                )
                assert ack_response.status_code == 200
                assert "acknowledged" in ack_response.json()["message"].lower()
                print(f"✓ Acknowledged alert: {test_alert['id']}")
                
                # Verify it's now acknowledged
                verify_response = self.session.get(
                    f"{BASE_URL}/api/sdm/admin/float-alerts",
                    headers=self.headers
                )
                for alert in verify_response.json():
                    if alert["id"] == test_alert["id"]:
                        assert alert["is_acknowledged"] == True
                        assert "acknowledged_by" in alert
                        print(f"  Verified acknowledged by: {alert.get('acknowledged_by')}")
                        break
            else:
                print("✓ No unacknowledged test alert found to acknowledge")
        else:
            print("✓ Skipped acknowledge test (test alert not sent)")
        
        # Clean up
        self.session.put(
            f"{BASE_URL}/api/sdm/admin/config",
            json={"float_alert_webhook_url": None},
            headers=self.headers
        )


class TestUserNotifications:
    """Test User notification viewing endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get user token before each test"""
        self.session = requests.Session()
        
        # First get admin token to create test notifications
        admin_response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "Gerard0103@"
        })
        self.admin_token = admin_response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Login as test user
        # Send OTP
        otp_response = self.session.post(f"{BASE_URL}/api/sdm/auth/send-otp", json={
            "phone": "+233000000000"
        })
        assert otp_response.status_code == 200
        
        # Verify OTP
        verify_response = self.session.post(f"{BASE_URL}/api/sdm/auth/verify-otp", json={
            "phone": "+233000000000",
            "otp_code": "000000"
        })
        assert verify_response.status_code == 200
        self.user_token = verify_response.json()["access_token"]
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
        self.user_id = verify_response.json()["user"]["id"]
    
    def test_get_user_notifications(self):
        """GET /api/sdm/user/notifications - Get user's notifications"""
        response = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications",
            headers=self.user_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ User has {len(data)} notifications")
        
        # Verify structure
        if len(data) > 0:
            notif = data[0]
            assert "id" in notif
            assert "title" in notif
            assert "is_read" in notif  # User-specific read status
            print(f"  First: '{notif['title']}', is_read={notif['is_read']}")
    
    def test_get_user_notifications_unread_only(self):
        """GET /api/sdm/user/notifications?unread_only=true - Filter unread"""
        response = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications?unread_only=true",
            headers=self.user_headers
        )
        assert response.status_code == 200
        data = response.json()
        for notif in data:
            assert notif["is_read"] == False
        print(f"✓ User has {len(data)} unread notifications")
    
    def test_get_unread_count(self):
        """GET /api/sdm/user/notifications/unread-count - Get unread count"""
        response = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications/unread-count",
            headers=self.user_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        print(f"✓ Unread count: {data['unread_count']}")
    
    def test_mark_notification_as_read(self):
        """POST /api/sdm/user/notifications/{id}/read - Mark as read"""
        # First create a notification for clients
        create_response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json={
                "recipient_type": "clients",
                "title": "TEST Read Status",
                "message": "Testing read status tracking",
                "notification_type": "info",
                "priority": "normal"
            },
            headers=self.admin_headers
        )
        assert create_response.status_code == 200
        notification_id = create_response.json()["notification_id"]
        print(f"  Created test notification: {notification_id}")
        
        # Get notifications and verify it appears as unread
        list_response = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications",
            headers=self.user_headers
        )
        notifications = list_response.json()
        test_notif = None
        for n in notifications:
            if n["id"] == notification_id:
                test_notif = n
                break
        
        if test_notif:
            assert test_notif["is_read"] == False, "New notification should be unread"
            
            # Mark as read
            read_response = self.session.post(
                f"{BASE_URL}/api/sdm/user/notifications/{notification_id}/read",
                headers=self.user_headers
            )
            assert read_response.status_code == 200
            print(f"✓ Marked notification as read")
            
            # Verify it's now read
            verify_response = self.session.get(
                f"{BASE_URL}/api/sdm/user/notifications",
                headers=self.user_headers
            )
            for n in verify_response.json():
                if n["id"] == notification_id:
                    assert n["is_read"] == True
                    print(f"  Verified is_read=True")
                    break
        else:
            print(f"  Notification not visible to user (may have delivery constraints)")
        
        # Cleanup
        self.session.delete(
            f"{BASE_URL}/api/sdm/admin/notifications/{notification_id}",
            headers=self.admin_headers
        )
    
    def test_user_sees_clients_notifications(self):
        """Verify user can see notifications sent to 'clients' recipient type"""
        # Create notification for clients
        create_response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json={
                "recipient_type": "clients",
                "title": "TEST Client Visibility",
                "message": "This should be visible to clients",
                "notification_type": "system",
                "priority": "normal"
            },
            headers=self.admin_headers
        )
        assert create_response.status_code == 200
        notification_id = create_response.json()["notification_id"]
        
        # User should see it
        user_notifs = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications",
            headers=self.user_headers
        ).json()
        
        found = any(n["id"] == notification_id for n in user_notifs)
        assert found, "User should see 'clients' recipient type notification"
        print(f"✓ User can see 'clients' notification: {notification_id}")
        
        # Cleanup
        self.session.delete(
            f"{BASE_URL}/api/sdm/admin/notifications/{notification_id}",
            headers=self.admin_headers
        )
    
    def test_user_sees_all_notifications(self):
        """Verify user can see notifications sent to 'all' recipient type"""
        # Create notification for all
        create_response = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json={
                "recipient_type": "all",
                "title": "TEST All Users",
                "message": "This should be visible to everyone",
                "notification_type": "info",
                "priority": "normal"
            },
            headers=self.admin_headers
        )
        assert create_response.status_code == 200
        notification_id = create_response.json()["notification_id"]
        
        # User should see it
        user_notifs = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications",
            headers=self.user_headers
        ).json()
        
        found = any(n["id"] == notification_id for n in user_notifs)
        assert found, "User should see 'all' recipient type notification"
        print(f"✓ User can see 'all' notification: {notification_id}")
        
        # Cleanup
        self.session.delete(
            f"{BASE_URL}/api/sdm/admin/notifications/{notification_id}",
            headers=self.admin_headers
        )


class TestNotificationEndToEnd:
    """End-to-end tests for the notification workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens"""
        self.session = requests.Session()
        
        # Admin token
        admin_response = self.session.post(f"{BASE_URL}/api/admin/login", json={
            "username": "admin",
            "password": "Gerard0103@"
        })
        self.admin_token = admin_response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # User token
        self.session.post(f"{BASE_URL}/api/sdm/auth/send-otp", json={"phone": "+233000000000"})
        verify = self.session.post(f"{BASE_URL}/api/sdm/auth/verify-otp", json={
            "phone": "+233000000000",
            "otp_code": "000000"
        })
        self.user_token = verify.json()["access_token"]
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
    
    def test_full_notification_workflow(self):
        """Test complete workflow: create -> view -> read -> delete"""
        print("\n=== Full Notification Workflow Test ===")
        
        # 1. Admin creates notification
        create_resp = self.session.post(
            f"{BASE_URL}/api/sdm/admin/notifications",
            json={
                "recipient_type": "all",
                "title": "TEST E2E Notification",
                "message": "Testing end-to-end notification flow",
                "notification_type": "promo",
                "priority": "high"
            },
            headers=self.admin_headers
        )
        assert create_resp.status_code == 200
        notif_id = create_resp.json()["notification_id"]
        print(f"1. ✓ Admin created notification: {notif_id}")
        
        # 2. User sees notification as unread
        user_notifs = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications",
            headers=self.user_headers
        ).json()
        notif = next((n for n in user_notifs if n["id"] == notif_id), None)
        assert notif is not None, "User should see notification"
        assert notif["is_read"] == False
        print(f"2. ✓ User sees notification as unread")
        
        # 3. Check unread count includes this notification
        count_before = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications/unread-count",
            headers=self.user_headers
        ).json()["unread_count"]
        print(f"3. ✓ Unread count: {count_before}")
        
        # 4. User marks as read
        read_resp = self.session.post(
            f"{BASE_URL}/api/sdm/user/notifications/{notif_id}/read",
            headers=self.user_headers
        )
        assert read_resp.status_code == 200
        print(f"4. ✓ User marked notification as read")
        
        # 5. Verify is_read changed
        user_notifs_after = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications",
            headers=self.user_headers
        ).json()
        notif_after = next((n for n in user_notifs_after if n["id"] == notif_id), None)
        assert notif_after["is_read"] == True
        print(f"5. ✓ Notification now shows as read")
        
        # 6. Admin sees it in list
        admin_notifs = self.session.get(
            f"{BASE_URL}/api/sdm/admin/notifications",
            headers=self.admin_headers
        ).json()
        found = any(n["id"] == notif_id for n in admin_notifs)
        assert found
        print(f"6. ✓ Admin can see notification in list")
        
        # 7. Admin deletes notification
        delete_resp = self.session.delete(
            f"{BASE_URL}/api/sdm/admin/notifications/{notif_id}",
            headers=self.admin_headers
        )
        assert delete_resp.status_code == 200
        print(f"7. ✓ Admin deleted notification")
        
        # 8. User no longer sees it
        user_notifs_final = self.session.get(
            f"{BASE_URL}/api/sdm/user/notifications",
            headers=self.user_headers
        ).json()
        found_final = any(n["id"] == notif_id for n in user_notifs_final)
        assert not found_final
        print(f"8. ✓ Notification no longer visible to user")
        
        print("=== Full Notification Workflow Complete ===\n")


# Cleanup fixture for the entire module
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_notifications():
    """Clean up test notifications after all tests"""
    yield
    
    # After all tests, clean up notifications with TEST in title
    session = requests.Session()
    admin_response = session.post(f"{BASE_URL}/api/admin/login", json={
        "username": "admin",
        "password": "Gerard0103@"
    })
    if admin_response.status_code == 200:
        token = admin_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        notifs = session.get(f"{BASE_URL}/api/sdm/admin/notifications?limit=100", headers=headers).json()
        for notif in notifs:
            if "TEST" in notif.get("title", ""):
                session.delete(f"{BASE_URL}/api/sdm/admin/notifications/{notif['id']}", headers=headers)
        print("\n[Cleanup] Removed test notifications")
