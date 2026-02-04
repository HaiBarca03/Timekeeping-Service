FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/dist ./dist

RUN yarn install --frozen-lockfile --production && yarn cache clean

EXPOSE 3000

CMD ["node", "dist/main"]