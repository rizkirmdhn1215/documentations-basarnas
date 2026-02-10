FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create temp_uploads directory
RUN mkdir -p temp_uploads

# Expose port
EXPOSE 4000

# Declare volume for temp uploads
VOLUME ["/app/temp_uploads"]

# Start the application
CMD ["npm", "start"]
