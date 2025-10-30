# Stage 1: Build the React app
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose default Nginx port
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]
