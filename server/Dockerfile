FROM public.ecr.aws/lambda/nodejs:20

COPY package.json ${LAMBDA_TASK_ROOT}/

# Install NPM dependencies
RUN npm install

# Set the CMD to your handler
CMD ["index.handler"]

# TODO support every circom version (well >=2 since that's what has github releases)
# Download the executable
RUN curl -Lo /tmp/circom https://github.com/iden3/circom/releases/latest/download/circom-linux-amd64

# Make the executable... well, executable
RUN chmod +x /tmp/circom

# Move the executable to a directory included in the PATH
RUN mv /tmp/circom /usr/local/bin

# Install solc too
RUN curl -Lo /tmp/solc https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.25+commit.b61c2a91
RUN chmod +x /tmp/solc
RUN mv /tmp/solc /usr/local/bin

# Copy app source last for faster rebuilds
COPY *.js ${LAMBDA_TASK_ROOT}/
