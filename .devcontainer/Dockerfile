FROM mcr.microsoft.com/devcontainers/typescript-node:18

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/cli/install.sh | bash

# Install additional development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Set up Git configuration for container
RUN git config --global init.defaultBranch main

# Install global TypeScript tools
RUN npm install -g \
    typescript \
    @types/node \
    ts-node \
    nodemon

# Create workspace directory
WORKDIR /workspace

# Copy package files for dependency installation
COPY package*.json ./
RUN npm install

# Set up Claude Code authentication (placeholder)
ENV CLAUDE_API_KEY=""

# Configure development environment
ENV NODE_ENV=development
ENV FORCE_COLOR=true

# Expose development ports
EXPOSE 3000 8080

CMD ["bash"]