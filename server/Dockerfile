FROM public.ecr.aws/lambda/nodejs:20

COPY package.json ${LAMBDA_TASK_ROOT}/

# Install NPM dependencies
RUN npm install

# Set the CMD to your handler
CMD ["index.handler"]

# Copy app source last for faster rebuilds
COPY *.js ${LAMBDA_TASK_ROOT}/
COPY modifiers/*.js ${LAMBDA_TASK_ROOT}/modifiers/
