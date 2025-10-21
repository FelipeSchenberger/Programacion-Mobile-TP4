FROM confluentinc/cp-kafka:7.4.0

# Install netcat for the healthcheck
USER root
RUN microdnf install -y nc && microdnf clean all