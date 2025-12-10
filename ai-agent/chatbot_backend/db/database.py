from pymongo import MongoClient
from ingestion.pipeline import pipeline
import pprint
from dotenv import load_dotenv
import os

load_dotenv()

# --- MongoDB Config ---
MONGO_URI = os.getenv("MONGO_ATLAS_URI")
DB_NAME = "CVProject"
COLLECTION_NAME = "cvs"

def ensure_db_and_collection(client, db_name, collection_name):
    # List existing databases
    db_list = client.list_database_names()

    if db_name in db_list:
        print(f"Database '{db_name}' exists.")
    else:
        print(f"Database '{db_name}' does not exist. It will be created when data is inserted.")

    db = client[db_name]

    # List collections in the selected database
    collection_list = db.list_collection_names()

    if collection_name in collection_list:
        print(f"Collection '{collection_name}' exists.")
    else:
        print(f"Collection '{collection_name}' does not exist. It will be created when data is inserted.")
        # Create by inserting an empty placeholder doc (then delete it)
        db[collection_name].insert_one({"_init": True})
        db[collection_name].delete_many({"_init": True})
        print(f"Collection '{collection_name}' created.")

    return db[collection_name]  # Return reference to collection


def store_resume_for_user(collection, user_id, parsed_output):
    """
    Store or update a user's resume in MongoDB.
    This enforces 'one resume per user'.
    """
    parsed_output["user_id"] = user_id
    result = collection.update_one(
        {"user_id": user_id},  # filter
        {"$set": parsed_output},  # update
        upsert=True  # create if not exists
    )
    if result.matched_count > 0:
        print(f"Updated existing resume for user_id={user_id}")
    else:
        print(f"Inserted new resume for user_id={user_id}")

def main():
    # --- Example Input ---
    PDF_PATH = r"C:\Users\Daryn Bang\Desktop\PersonalProject\Ha-Quan-TopCV.vn-290625.143326.pdf"
    user_id = "user_123"  # Placeholder until authentication is implemented

    # --- Run ingestion pipeline ---
    text, parsed_output = pipeline(PDF_PATH)

    print("\n--- Processed Text ---")
    print(text)
    print("\n--- Parsed Output ---")
    pprint.pprint(parsed_output)

    # --- Connect to MongoDB ---
    cluster = MongoClient(MONGO_URI)
    collection = ensure_db_and_collection(cluster, DB_NAME, COLLECTION_NAME)

    # --- Store resume ---
    store_resume_for_user(collection, user_id, parsed_output)


if __name__ == "__main__":
    main()

