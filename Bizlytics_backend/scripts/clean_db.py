from app.auth.models import RefreshToken, User
from app.auth.tenant_models import HRAccount
from app.database import SessionLocal

db = SessionLocal()

# Clear HR related data from public schema
db.query(RefreshToken).delete()
# db.query(HRAccount).delete()  # Skipping for now as it requires schema iteration
db.query(User).filter(User.role == "hr").delete()

db.commit()
print("Database cleaned: All HR accounts, refresh tokens, and HR users removed.")
