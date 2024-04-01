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

# Copy app source last for faster rebuilds
COPY index.js ${LAMBDA_TASK_ROOT}/
