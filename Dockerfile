# Use Node.js LTS version for development
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for development
RUN apk add --no-cache git

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port for development server
EXPOSE 3000

# Default command for development
CMD ["npm", "run", "dev"]