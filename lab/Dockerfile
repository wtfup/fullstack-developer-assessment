FROM node:22-bookworm-slim
WORKDIR /app
ENV CI=1
COPY package.json package-lock.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium
COPY . .
CMD ["sleep", "infinity"]
