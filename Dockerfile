FROM node:lts-alpine
ENV NODE_ENV=dev
WORKDIR /todo
COPY package*.json ./
COPY tsconfig.json ./
COPY . .
RUN npm i -f
# RUN npx prisma generate
RUN npm run build
CMD ["npm" , "run", "start:prod"]