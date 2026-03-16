"""
Pytest configuration for async tests
"""
import pytest

# Configure pytest-asyncio to use function scope by default
pytest_plugins = ('pytest_asyncio',)


def pytest_configure(config):
    """Configure pytest-asyncio mode"""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
