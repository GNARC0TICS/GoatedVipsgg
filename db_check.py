import os
import sys

def check_database():
    """Check database connection information."""
    print("Database Connection Check")
    print("=========================")
    
    # Check for DATABASE_URL environment variable
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        print("✓ DATABASE_URL is set")
        # Print a masked version for security
        masked_url = db_url[:10] + "..." + db_url[-5:] if len(db_url) > 15 else "***"
        print(f"  Connection string: {masked_url}")
    else:
        print("✗ DATABASE_URL is not set")
    
    # Check for PostgreSQL environment variables
    pg_vars = ['PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']
    for var in pg_vars:
        value = os.environ.get(var)
        if value:
            # Mask password for security
            if var == 'PGPASSWORD':
                print(f"✓ {var} is set (value hidden)")
            else:
                print(f"✓ {var} is set to: {value}")
        else:
            print(f"✗ {var} is not set")
    
    print("\nNote: If DATABASE_URL is set but individual PG* variables are not,")
    print("the connection will still work using the connection string.")

if __name__ == "__main__":
    check_database()