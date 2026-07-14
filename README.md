Create a .env file with below variables :

# Database Configuration
DB_HOST=db  
DB_USER=root  
DB_PASSWORD="Test*9999"  
DB_NAME=myDB  

# Server Configuration
PORT=5500  
NODE_ENV=Production  

# Test User
USER_NAME="Test1"  
USER_PASSWORD="HelloMom#2K26"  


# Once created use below command to deploy application:
docker-compose up -d
