# MongoDB Setup Instructions

## How to Get MongoDB URI

### Step 1: Create MongoDB Atlas Account
1. Go to https://cloud.mongodb.com/
2. Click "Sign Up" to create a free account
3. Choose "M For Free" (Free tier with 512MB storage)

### Step 2: Create a Cluster
1. After logging in, click "Build a Database"
2. Select "M0 Free" tier
3. Choose a cloud provider and region (choose closest to you)
4. Give your cluster a name (e.g., "SignSync-Cluster")
5. Click "Create"

### Step 3: Create Database User
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these!)
5. Under "Database User Privileges", select "Atlas admin"
6. Click "Add User"

### Step 4: Whitelist Your IP
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development) OR add your specific IP
4. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Choose "Node.js" as driver
5. Copy the connection string
6. It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
7. Replace `<password>` with your actual password

### Step 6: Add to Your Project

**Option 1: Create `.env` file**
Create a file named `.env` in the root directory (`E:\Original Project\.env`) with:
```
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/signsync?retryWrites=true&w=majority
```

**Option 2: Modify `start.bat`**
Uncomment the MongoDB line in `start.bat` and add your URI:
```batch
set MONGODB_URI=mongodb+srv://your-username:шpassword@cluster0.xxxxx.mongodb.net/signsync?retryWrites=true&w=majority
```

### Example MongoDB URI
```
MONGODB_URI=mongodb+srv://signsync-user:MySecurePassword123@signsync-cluster.xtczetv.mongodb.net/signsync?retryWrites=true&w=majority
```

### Important Notes
- Never commit your `.env` file to Git!
- The `.env` file should be in `.gitignore`
- Keep your MongoDB password secure
- The free tier has limitations but is enough for development

### Troubleshooting
- **Connection Error**: Check if your IP is whitelisted in MongoDB Atlas
- **Authentication Failed**: Verify your username and password
- **Timeout**: Try using the full connection string with IP whitelist
- **Monitoring Paused**: This is normal when no connections are active

### Free Tier Limits
- 512MB storage
- 512MB RAM
- Shared CPU
- Limited connections (500 per server)

