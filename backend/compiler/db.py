import os
import secrets
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime, timedelta

# Fetch MongoDB URI from environment variables or default to cloud Atlas instance
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://kshatriyasarkar214_db_user:LTJABvdoOtFngy86@cluster0.avvn8rc.mongodb.net/?appName=Cluster0")
DB_NAME = os.getenv("MONGO_DB_NAME", "latex_lab")

_client = None

def get_db():
    """
    Initializes and returns the MongoDB database instance.
    """
    global _client
    if _client is None:
        # 3 second timeout for quick failure detection if local MongoDB is not running
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    return _client[DB_NAME]

# ==================== DOCUMENT OPERATIONS ====================

def save_document(doc_id=None, title="Untitled Document", source_code="", user_id=None):
    """
    Creates or updates a LaTeX document associated with a specific user.
    """
    db = get_db()
    collection = db["documents"]
    
    document_data = {
        "title": title,
        "source_code": source_code,
        "updated_at": datetime.utcnow()
    }
    
    if user_id:
        document_data["user_id"] = user_id
    
    if doc_id:
        # If updating, ensure user owns the document (if user_id is provided)
        query = {"_id": ObjectId(doc_id)}
        if user_id:
            query["user_id"] = user_id
            
        collection.update_one(
            query,
            {"$set": document_data}
        )
        return str(doc_id)
    else:
        # Create new document
        document_data["created_at"] = datetime.utcnow()
        result = collection.insert_one(document_data)
        return str(result.inserted_id)

def get_document(doc_id, user_id=None):
    """
    Retrieves a single document. Optionally checks user ownership.
    """
    db = get_db()
    query = {"_id": ObjectId(doc_id)}
    if user_id:
        query["user_id"] = user_id
        
    doc = db["documents"].find_one(query)
    if doc:
        doc["_id"] = str(doc["_id"])
        if "user_id" in doc:
            doc["user_id"] = str(doc["user_id"])
    return doc

def list_documents(user_id=None):
    """
    Lists documents. Filters by user_id if provided.
    """
    db = get_db()
    query = {}
    if user_id:
        query["user_id"] = user_id
        
    docs = list(db["documents"].find(query, {"source_code": 0}).sort("updated_at", -1))
    for doc in docs:
        doc["_id"] = str(doc["_id"])
        if "user_id" in doc:
            doc["user_id"] = str(doc["user_id"])
    return docs


# ==================== AUTHENTICATION OPERATIONS ====================

def create_user(username, email, password_hash):
    """
    Creates a new user document in MongoDB.
    Raises ValueError if username or email is already registered.
    """
    db = get_db()
    collection = db["users"]
    
    # Check if username exists
    if collection.find_one({"username": username}):
        raise ValueError("Username is already taken.")
        
    # Check if email exists
    if collection.find_one({"email": email}):
        raise ValueError("Email is already registered.")
        
    user_data = {
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "created_at": datetime.utcnow()
    }
    
    result = collection.insert_one(user_data)
    return str(result.inserted_id)

def find_user_by_username_or_email(username_or_email):
    """
    Looks up a user document by username or email.
    """
    db = get_db()
    collection = db["users"]
    user = collection.find_one({
        "$or": [
            {"username": username_or_email},
            {"email": username_or_email}
        ]
    })
    return user

def create_session(user_id):
    """
    Generates a secure login token, inserts it into active sessions, and returns it.
    """
    db = get_db()
    collection = db["sessions"]
    
    token = secrets.token_hex(32)
    session_data = {
        "token": token,
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=30)
    }
    
    collection.insert_one(session_data)
    return token

def validate_session(token):
    """
    Validates a session token. Returns the associated user document (without password hash) or None.
    """
    db = get_db()
    session_col = db["sessions"]
    user_col = db["users"]
    
    session = session_col.find_one({"token": token})
    if not session:
        return None
        
    # Check if session has expired
    if session.get("expires_at") < datetime.utcnow():
        session_col.delete_one({"token": token}) # Clean up expired session
        return None
        
    user = user_col.find_one({"_id": ObjectId(session["user_id"])})
    if user:
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None) # Strip password hash for security
        return user
        
    return None

def delete_session(token):
    """
    Removes the session document representing a user logout.
    """
    db = get_db()
    collection = db["sessions"]
    collection.delete_one({"token": token})
