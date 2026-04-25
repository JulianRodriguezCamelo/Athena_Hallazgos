FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
