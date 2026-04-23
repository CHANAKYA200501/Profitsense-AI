from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import hashlib
from .db import find_user_by_email, add_user, update_last_login

router = APIRouter()

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(user: UserRegister):
    print(f"[AUTH] Register attempt for: {user.email}")
    try:
        existing_user = find_user_by_email(user.email)
        if existing_user:
            print(f"[AUTH] Register failed: {user.email} already exists")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        if len(user.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        new_user = add_user(user.email, user.password)
        print(f"[AUTH] Register success: {user.email} (ID: {new_user['id']})")
        return {
            "status": "success",
            "message": "User registered successfully",
            "user": {
                "id": new_user["id"],
                "email": new_user["email"],
                "role": new_user["role"]
            }
        }
    except Exception as e:
        print(f"[AUTH] SYSTEM ERROR DURING REGISTER: {e}")
        raise HTTPException(status_code=500, detail="Internal Registration Error")

@router.post("/login")
async def login(credentials: UserLogin):
    print(f"[AUTH] Login attempt for: {credentials.email}")
    user = find_user_by_email(credentials.email)
    if not user:
        print(f"[AUTH] Login failed: User {credentials.email} not found")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    pwd_hash = hashlib.sha256(credentials.password.encode()).hexdigest()
    if pwd_hash != user.get("password_hash"):
        print(f"[AUTH] Login failed: Incorrect password for {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    update_last_login(user["email"])
    print(f"[AUTH] Login success: {credentials.email}")
    
    return {
        "status": "success",
        "message": "Login successful",
        "token": f"mock-jwt-{user['id']}",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@router.get("/me")
async def get_me(token: str):
    return {"status": "success", "message": "Profile retrieved"}
