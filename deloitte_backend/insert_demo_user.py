from ai_analyzer.services.database import SessionLocal
from ai_analyzer.services.db_models import User
from ai_analyzer.services.auth import get_password_hash

def main():
    session = SessionLocal()
    email = "arshitasinha2005@gmail.com"
    password = "DemoPass!23"  # CHANGE THIS for production

    existing = session.query(User).filter(User.email == email).first()
    if existing:
        print(f"User already exists: {existing.email}")
    else:
        hashed = get_password_hash(password)
        new_user = User(email=email, hashed_password=hashed)
        session.add(new_user)
        session.commit()
        print(f"Inserted demo user: {email} with password: {password}")
    session.close()

if __name__ == '__main__':
    main()
