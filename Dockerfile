# 锋锋の小站 生产镜像
FROM node:20-alpine

WORKDIR /app

# 先装依赖（利用 Docker 层缓存）
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 再拷贝源码
COPY server.js ./
COPY public ./public

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# 数据目录默认挂载点（Sealos 持久卷挂到 /data，通过 DATA_PATH 指向）
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

CMD ["npm", "start"]
