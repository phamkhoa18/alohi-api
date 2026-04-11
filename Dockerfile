FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY . .

# Create directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 3000

# Start
CMD ["node", "server.js"]
