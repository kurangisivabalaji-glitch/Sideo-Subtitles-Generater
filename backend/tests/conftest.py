import pytest
from app.core.rate_limiter import limiter
from app.db.session import init_db

@pytest.fixture(autouse=True)
def disable_rate_limiting():
    limiter.enabled = False
    yield
    limiter.enabled = True
