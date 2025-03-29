import os
import sys

def check_database():
    try:
        # Get the database URL from environment variables
        db_url = os.environ.get('DATABASE_URL')
        
        if not db_url:
            print("DATABASE_URL environment variable not found!")
            return
        
        print(f"Database URL exists: {db_url[:10]}...")
        print("Other DB environment variables:")
        for var in ['PGUSER', 'PGHOST', 'PGPORT', 'PGDATABASE']:
            if os.environ.get(var):
                print(f"- {var}: exists")
            else:
                print(f"- {var}: not found")
        
        print("Database environment check completed!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Checking database environment...")
    check_database()
