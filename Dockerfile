FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the app
COPY . .

# Ensure data folder exists and is writable
RUN mkdir -p /app/data
RUN chmod -R 777 /app/data

# Expose port
EXPOSE 3000

# Default command
CMD ["node", "index.js"]