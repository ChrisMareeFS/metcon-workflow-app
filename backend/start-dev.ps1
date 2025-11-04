$env:MONGODB_URI = "mongodb+srv://ChrisMaree:Rasper270@metconflowsapp.duojvmx.mongodb.net/metcon?retryWrites=true&w=majority&appName=MetConFlowsapp"
$env:NODE_ENV = "development"
$env:PORT = "3000"
$env:JWT_SECRET = "dev_jwt_secret_min_32_characters_change_in_production_please"
$env:JWT_EXPIRY = "1h"
$env:CORS_ORIGIN = "http://localhost:5173"

npm run dev

