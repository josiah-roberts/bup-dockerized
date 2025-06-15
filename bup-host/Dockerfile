FROM debian:stable-slim

RUN apt-get update && apt-get install -y \
    openssh-server \
    bup \
    git \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Create backup user
RUN groupadd -g 1001 bupuser && \
    useradd -m -u 1001 -g 1001 -s /bin/bash bupuser && \
    usermod -p '*' bupuser

# Create SSH run directory
RUN mkdir -p /var/run/sshd

# Store default config in a different location
RUN mkdir -p /defaults && \
    echo "Port 22\n\
PermitRootLogin no\n\
PasswordAuthentication no\n\
PubkeyAuthentication yes\n\
ChallengeResponseAuthentication no\n\
UsePAM yes\n\
X11Forwarding no\n\
PrintMotd no\n\
AcceptEnv LANG LC_*\n\
Subsystem sftp /usr/lib/openssh/sftp-server" > /defaults/sshd_config

# Create startup script
COPY <<'EOF' /startup.sh
#!/bin/bash
set -e

echo "Initializing SSH configuration..."

# Copy default config if it doesn't exist
if [ ! -f /etc/ssh/sshd_config ]; then
    echo "Creating sshd_config..."
    cp /defaults/sshd_config /etc/ssh/sshd_config
fi

# Generate host keys if they don't exist
if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
    echo "Generating SSH host keys..."
    ssh-keygen -A
fi

# Ensure .ssh directory exists with correct permissions
mkdir -p /home/bupuser/.ssh
chmod 700 /home/bupuser/.ssh
chown bupuser:bupuser /home/bupuser/.ssh

# Fix backup directory permissions
mkdir -p /backup
chown -R bupuser:bupuser /backup

# Start SSH daemon
echo "Starting SSH daemon..."
exec /usr/sbin/sshd -D
EOF

RUN chmod +x /startup.sh

EXPOSE 22
CMD ["/startup.sh"]