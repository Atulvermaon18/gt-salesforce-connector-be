# Use Node.js image
FROM node:18

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port (adjust if your BE uses something else)
EXPOSE 4000

# Start the backend
CMD ["npm", "start"]
