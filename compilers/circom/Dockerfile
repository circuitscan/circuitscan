FROM public.ecr.aws/lambda/nodejs:20

COPY package.json ${LAMBDA_TASK_ROOT}/

# Install NPM dependencies
RUN npm install

# Set the CMD to your handler
CMD ["index.handler"]

# Download circom executables
RUN curl -Lo /tmp/circom-v2.0.8 https://github.com/iden3/circom/releases/download/v2.0.8/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.0.9 https://github.com/iden3/circom/releases/download/v2.0.9/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.0 https://github.com/iden3/circom/releases/download/v2.1.0/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.1 https://github.com/iden3/circom/releases/download/v2.1.1/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.2 https://github.com/iden3/circom/releases/download/v2.1.2/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.3 https://github.com/iden3/circom/releases/download/v2.1.3/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.4 https://github.com/iden3/circom/releases/download/v2.1.4/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.5 https://github.com/iden3/circom/releases/download/v2.1.5/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.6 https://github.com/iden3/circom/releases/download/v2.1.6/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.7 https://github.com/iden3/circom/releases/download/v2.1.7/circom-linux-amd64
RUN curl -Lo /tmp/circom-v2.1.8 https://github.com/iden3/circom/releases/download/v2.1.8/circom-linux-amd64

# Make the executables... well, executable
RUN chmod +x /tmp/circom-*

# Move the executable to a directory included in the PATH
RUN mv /tmp/circom-* /usr/local/bin

# Install solc too
RUN curl -Lo /tmp/solc https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.25+commit.b61c2a91
RUN chmod +x /tmp/solc
RUN mv /tmp/solc /usr/local/bin

# Copy app source last for faster rebuilds
COPY *.js ${LAMBDA_TASK_ROOT}/
