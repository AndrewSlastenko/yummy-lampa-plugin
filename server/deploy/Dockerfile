FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY index.js alloha-session.js wrapper.js ./
USER pwuser
CMD ["node", "index.js"]
