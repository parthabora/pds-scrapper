FROM mcr.microsoft.com/playwright:v1.48.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Playwright browsers are already installed in the base image
# But we ensure chromium is available
RUN npx playwright install chromium --with-deps

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Expose port (Render uses PORT env variable)
EXPOSE 10000

# Start the application
CMD ["node", "app.js"]